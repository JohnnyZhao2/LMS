"""Knowledge services."""

from collections import defaultdict
import hashlib
import json
from typing import Optional

from apps.activity_logs.decorators import log_content_action
from django.db import transaction
from django.utils import timezone

from apps.authorization.engine import get_engine
from apps.tags.models import Tag
from apps.tags.resource_sync import (
    apply_resource_tag_changes,
    pop_resource_tag_payload,
)
from apps.tags.services import TagService
from apps.tags.validators import get_scoped_tag_ids_or_error, get_space_tag_or_error
from core.base_service import BaseService

from .doc_url import extract_doc_id
from .models import Knowledge, KnowledgeRevision
from .selectors import get_knowledge_by_id


SPACE_IMPORT_COLORS = (
    '#FFE45C',
    '#7A38D6',
    '#F0444F',
    '#63EEB1',
    '#BDC0CF',
    '#FF86A3',
    '#0A0A0A',
    '#28A3D1',
    '#23BE73',
    '#F6D4C8',
    '#2A6CE5',
    '#C8FF00',
    '#FF9966',
    '#B8A9DB',
    '#9DD3DC',
    '#C89AAA',
)


def _knowledge_label(title: str = '', doc_id: str = '', *, fallback: str = '该知识') -> str:
    """错误信息：标题 + 文档 id。"""
    title = (title or '').strip()
    label = (f'《{title}》' if title else '') + (f'文档id「{doc_id}」' if doc_id else '')
    return label or fallback


def _row_fail(row_number: int, reason: str) -> dict:
    return {'row_number': row_number, 'reason': reason}


def build_knowledge_revision_payload(knowledge: Knowledge) -> dict:
    return {
        'title': knowledge.title,
        'section': knowledge.section,
        'summary': knowledge.summary,
        'content': knowledge.content,
        'extra_fields': knowledge.extra_fields,
        'external_doc_url': knowledge.external_doc_url,
        'related_links': knowledge.related_links,
        'space_tag_name': knowledge.space_tag.name if knowledge.space_tag else '',
        'tags_json': [
            {'id': tag.id, 'name': tag.name, 'tag_type': tag.tag_type, 'category': tag.category}
            for tag in knowledge.tags.order_by('id')
        ],
    }


def build_knowledge_revision_hash(payload: dict) -> str:
    normalized = json.dumps(payload, sort_keys=True, ensure_ascii=False, default=str)
    return hashlib.sha256(normalized.encode('utf-8')).hexdigest()


def ensure_knowledge_revision(knowledge: Knowledge, *, actor) -> KnowledgeRevision:
    payload = build_knowledge_revision_payload(knowledge)
    content_hash = build_knowledge_revision_hash(payload)
    latest = KnowledgeRevision.objects.filter(source_knowledge=knowledge).order_by('-revision_number').first()
    if latest and latest.content_hash == content_hash:
        return latest

    next_revision_number = (latest.revision_number if latest else 0) + 1
    return KnowledgeRevision.objects.create(
        source_knowledge=knowledge,
        revision_number=next_revision_number,
        title=payload['title'],
        section=payload['section'],
        summary=payload['summary'],
        content=payload['content'],
        extra_fields=payload['extra_fields'],
        external_doc_url=payload['external_doc_url'],
        related_links=payload['related_links'],
        space_tag_name=payload['space_tag_name'],
        tags_json=payload['tags_json'],
        content_hash=content_hash,
        created_by=actor,
    )


class KnowledgeService(BaseService):
    """知识文档应用服务。"""

    def get_by_id(self, pk: int) -> Knowledge:
        knowledge = get_knowledge_by_id(pk)
        self.validate_not_none(knowledge, f'知识文档 {pk} 不存在')
        return knowledge

    @transaction.atomic
    @log_content_action('knowledge', 'create', '', group='知识文档', label='创建知识文档')
    def create(self, data: dict) -> Knowledge:
        return self._create_record(data)

    @transaction.atomic
    @log_content_action('knowledge', 'update', '', group='知识文档', label='更新知识文档')
    def update(self, pk: int, data: dict) -> Knowledge:
        knowledge, _changed = self._update_record(pk, data)
        return knowledge

    @transaction.atomic
    @log_content_action('knowledge', 'delete', '', group='知识文档', label='删除知识文档')
    def delete(self, pk: int) -> Knowledge:
        return self._delete_record(pk)

    def increment_view_count(self, pk: int) -> int:
        return self.get_by_id(pk).increment_view_count()

    def _create_record(self, data: dict) -> Knowledge:
        payload = dict(data)
        payload['created_by'] = self.user
        payload['updated_by'] = self.user
        tag_payload = pop_resource_tag_payload(payload, scope='knowledge')
        knowledge = Knowledge.objects.create(**payload)
        apply_resource_tag_changes(
            knowledge,
            space_tag_id=tag_payload.space_tag_id,
            tag_ids=tag_payload.tag_ids,
            space_tag_provided=tag_payload.space_tag_provided,
            tag_ids_provided=True,
        )
        return knowledge

    def _update_record(self, pk: int, data: dict) -> tuple:
        """返回 (knowledge, changed)。"""
        knowledge = self.get_by_id(pk)
        data = dict(data)
        if 'is_pinned' in data:
            want_pinned = bool(data.pop('is_pinned'))
            if want_pinned != bool(knowledge.pinned_at):
                data['pinned_at'] = timezone.now() if want_pinned else None

        current_tag_ids = list(knowledge.tags.values_list('id', flat=True))
        payload = pop_resource_tag_payload(
            data,
            scope='knowledge',
            default_space_tag_id=knowledge.space_tag_id,
            default_tag_ids=current_tag_ids,
        )
        changed_fields = {
            key: value
            for key, value in data.items()
            if getattr(knowledge, key, None) != value
        }
        space_changed = (
            payload.space_tag_provided
            and payload.space_tag_id != knowledge.space_tag_id
        )
        tags_changed = (
            payload.tag_ids_provided
            and set(payload.tag_ids) != set(current_tag_ids)
        )
        if not changed_fields and not space_changed and not tags_changed:
            return knowledge, False

        pin_only = set(changed_fields.keys()) == {'pinned_at'} and not space_changed and not tags_changed
        if not pin_only:
            changed_fields['updated_by'] = self.user
        for key, value in changed_fields.items():
            setattr(knowledge, key, value)
        update_fields = list(changed_fields.keys())
        if not pin_only:
            # update_fields 必须显式带上 updated_at，否则 auto_now 不生效
            update_fields.append('updated_at')
        knowledge.save(update_fields=update_fields)
        apply_resource_tag_changes(
            knowledge,
            space_tag_id=payload.space_tag_id,
            tag_ids=payload.tag_ids,
            space_tag_provided=space_changed,
            tag_ids_provided=tags_changed,
        )
        return knowledge, True

    def _delete_record(self, pk: int) -> Knowledge:
        knowledge = self.get_by_id(pk)
        revisions = list(knowledge.revisions.all())
        knowledge.delete()
        KnowledgeRevision.objects.filter(
            id__in=[revision.id for revision in revisions],
            knowledge_tasks__isnull=True,
        ).delete()
        return knowledge

    @transaction.atomic
    @log_content_action('knowledge', 'import', '', group='知识文档', label='批量导入知识文档')
    def bulk_import(self, items: list[dict]) -> dict:
        """按知识 ID 或 (space, 标题) 批量 upsert（允许同文档链接拆多条），并按名称自动解析/创建 space 与标签。"""
        created = updated = unchanged = 0
        failures: list[dict] = []

        space_by_name = {t.name.strip(): t for t in Tag.objects.filter(tag_type='SPACE')}
        tag_by_name = {t.name.strip(): t for t in Tag.objects.filter(tag_type='TAG')}
        existing_ids: set[int] = set()
        by_natural_key: dict[tuple[Optional[int], str, str], list[int]] = defaultdict(list)
        for kid, space_id, sec, ttl in Knowledge.objects.values_list('id', 'space_tag_id', 'section', 'title'):
            existing_ids.add(kid)
            if ttl:
                by_natural_key[(space_id, sec or '', ttl)].append(kid)

        space_color_idx = len(space_by_name)
        tag_service = TagService(self.request)
        tag_perm_checked = False
        tag_change_perm_checked = False
        knowledge_change_perm_checked = False
        seen_ids: dict[int, int] = {}
        seen_keys: dict[tuple[str, str, str], int] = {}

        def ensure_tag_create_perm() -> None:
            nonlocal tag_perm_checked
            if not tag_perm_checked:
                get_engine(self.request).enforce('tags.add_tag', error_message='无权创建标签')
                tag_perm_checked = True

        def ensure_tag_change_perm() -> None:
            nonlocal tag_change_perm_checked
            if not tag_change_perm_checked:
                get_engine(self.request).enforce('tags.change_tag', error_message='无权修改标签分类')
                tag_change_perm_checked = True

        def ensure_knowledge_change_perm() -> None:
            nonlocal knowledge_change_perm_checked
            if not knowledge_change_perm_checked:
                get_engine(self.request).enforce('knowledge.change_knowledge', error_message='无权更新已有知识文档')
                knowledge_change_perm_checked = True

        for item in items:
            row_number = item['row_number']
            payload = {k: v for k, v in item.items() if k != 'row_number'}
            row_id = payload.pop('id', None)
            space_name = payload.pop('space_name', '')
            tag_names = payload.pop('tag_names', [])
            raw_tag_items = payload.pop('tag_items', [])

            title = str(payload.get('title') or '').strip()
            section = str(payload.get('section') or '').strip()
            summary = str(payload.get('summary') or '').strip()
            url = str(payload.get('external_doc_url') or '').strip()
            content = str(payload.get('content') or '').strip()
            extra_fields = payload.get('extra_fields') or []
            if not title and not summary and not url and not content and not extra_fields:
                failures.append(_row_fail(row_number, '标题、适用场景、文档链接、简洁执行步骤、扩展属性都为空'))
                continue

            # 合并带分类的 tag_items 与旧格式 tag_names，以及分组 section
            resolved_tag_specs: list[tuple[str, str]] = []
            seen_tag_names: set[str] = set()
            for spec in raw_tag_items:
                t_name = str(spec.get('name') or '').strip()
                t_cat = str(spec.get('category') or '').strip()
                if t_name and t_name not in seen_tag_names:
                    seen_tag_names.add(t_name)
                    resolved_tag_specs.append((t_name, t_cat))
            if section and section not in seen_tag_names:
                seen_tag_names.add(section)
                resolved_tag_specs.insert(0, (section, '所属系统'))
            for name in tag_names:
                t_name = str(name or '').strip()
                if t_name and t_name not in seen_tag_names:
                    seen_tag_names.add(t_name)
                    resolved_tag_specs.append((t_name, ''))

            if row_id is not None:
                if row_id in seen_ids:
                    failures.append(_row_fail(row_number, f'知识 ID「{row_id}」与第 {seen_ids[row_id]} 行重复'))
                    continue
                seen_ids[row_id] = row_number
                if row_id not in existing_ids:
                    failures.append(_row_fail(row_number, f'未找到知识 ID「{row_id}」'))
                    continue
            elif title:
                dedup_key = (space_name, section, title)
                if dedup_key in seen_keys:
                    failures.append(_row_fail(row_number, f'「{title}」与第 {seen_keys[dedup_key]} 行重复'))
                    continue
                seen_keys[dedup_key] = row_number

            if not space_name:
                payload['space_tag_id'] = None
            else:
                space_tag = space_by_name.get(space_name) or Tag.objects.filter(
                    name=space_name, tag_type='SPACE',
                ).first()
                if not space_tag:
                    ensure_tag_create_perm()
                    space_tag = tag_service.create({
                        'name': space_name,
                        'tag_type': 'SPACE',
                        'color': SPACE_IMPORT_COLORS[space_color_idx % len(SPACE_IMPORT_COLORS)],
                    })
                    space_color_idx += 1
                space_by_name[space_name] = space_tag
                payload['space_tag_id'] = space_tag.id

            tag_ids: list[int] = []
            for name, category in resolved_tag_specs:
                tag = tag_by_name.get(name) or Tag.objects.filter(name=name, tag_type='TAG').first()
                if not tag or not tag.allow_knowledge:
                    ensure_tag_create_perm()
                    tag = tag_service.create({
                        'name': name,
                        'tag_type': 'TAG',
                        'category': category,
                        'current_module': 'knowledge',
                        'allow_knowledge': True,
                        'extend_scope': True,
                    })
                elif category and not tag.category:
                    ensure_tag_change_perm()
                    tag.category = category
                    tag.save(update_fields=['category'])
                tag_by_name[name] = tag
                tag_ids.append(tag.id)
            payload['tag_ids'] = tag_ids

            target_id = row_id
            if target_id is None and title:
                matched_ids = by_natural_key.get((payload['space_tag_id'], section, title), [])
                if len(matched_ids) == 1:
                    target_id = matched_ids[0]

            if target_id is not None:
                ensure_knowledge_change_perm()
                _knowledge, changed = self._update_record(target_id, dict(payload))
                if changed:
                    updated += 1
                else:
                    unchanged += 1
                continue

            knowledge = self._create_record(dict(payload))
            existing_ids.add(knowledge.id)
            if title:
                by_natural_key[(payload['space_tag_id'], section, title)].append(knowledge.id)
            created += 1

        return {
            'created': created,
            'updated': updated,
            'unchanged': unchanged,
            'failures': failures,
        }

    @transaction.atomic
    @log_content_action('knowledge', 'bulk_update', '', group='知识文档', label='批量更新知识文档')
    def bulk_update(
        self,
        *,
        ids: list[int],
        update_space: bool = False,
        space_tag_id: Optional[int] = None,
        add_tag_ids: Optional[list[int]] = None,
    ) -> dict:
        """批量更新选中知识的空间与标签。"""
        unique_ids = list(dict.fromkeys(ids))
        if update_space and space_tag_id is not None:
            get_space_tag_or_error(space_tag_id)
        validated_add_tag_ids = get_scoped_tag_ids_or_error(
            add_tag_ids or [],
            scope='knowledge',
        )
        valid_add_tags = (
            list(Tag.objects.filter(id__in=validated_add_tag_ids))
            if validated_add_tag_ids
            else []
        )
        knowledge_list = list(
            Knowledge.objects.filter(id__in=unique_ids).prefetch_related('tags')
        )
        updated_count = 0
        for knowledge in knowledge_list:
            update_fields: list[str] = []
            if update_space and knowledge.space_tag_id != space_tag_id:
                knowledge.space_tag_id = space_tag_id
                update_fields.append('space_tag')
            tags_added = False
            if valid_add_tags:
                existing_ids = {t.id for t in knowledge.tags.all()}
                new_tags = [tag for tag in valid_add_tags if tag.id not in existing_ids]
                if new_tags:
                    knowledge.tags.add(*new_tags)
                    tags_added = True
            if update_fields or tags_added:
                knowledge.updated_by = self.user
                update_fields.extend(['updated_by', 'updated_at'])
                knowledge.save(update_fields=update_fields)
                updated_count += 1
        return {'updated': updated_count}

    def _build_doc_index(self) -> dict[str, list[tuple[int, str, str]]]:
        """文档 id → [(knowledge_id, title, section), ...]。"""
        index: dict[str, list[tuple[int, str, str]]] = defaultdict(list)
        rows = Knowledge.objects.exclude(external_doc_url='').values_list(
            'id', 'title', 'section', 'external_doc_url',
        )
        for knowledge_id, title, section, url in rows:
            doc_id = extract_doc_id(url)
            if doc_id:
                index[doc_id].append((knowledge_id, (title or '').strip(), (section or '').strip()))
        return index

    def _match_delete_row(
        self,
        *,
        row_number: int,
        row_id: Optional[int],
        title: str,
        section: str,
        url: str,
        existing_ids: set[int],
        doc_index: dict[str, list[tuple[int, str, str]]],
        seen_ids: dict[int, int],
    ):
        """匹配单行表格删除目标（支持同文档多条按标题/分组精确匹配）→ (knowledge_id|None, doc_id|None, failure|None)。"""
        clean_title = (title or '').strip()
        clean_section = (section or '').strip()

        if row_id is not None:
            if row_id in seen_ids:
                return None, None, _row_fail(row_number, f'知识 ID「{row_id}」与第 {seen_ids[row_id]} 行重复')
            if row_id not in existing_ids:
                return None, None, _row_fail(row_number, f'未找到知识 ID「{row_id}」')
            seen_ids[row_id] = row_number
            return row_id, None, None

        doc_id = extract_doc_id(url)
        label = _knowledge_label(clean_title, doc_id or '')
        if not doc_id:
            prefix = _knowledge_label(clean_title, fallback='')
            reason = f'{prefix}文档链接缺少 id 参数' if prefix else '文档链接缺少 id 参数'
            return None, None, _row_fail(row_number, reason)

        matches = doc_index.get(doc_id, [])
        if not matches:
            return None, doc_id, _row_fail(row_number, f'未找到{label}')

        if len(matches) == 1:
            target_id = matches[0][0]
            if target_id in seen_ids:
                return None, doc_id, _row_fail(
                    row_number,
                    f'表格内{label}与第 {seen_ids[target_id]} 行重复',
                )
            seen_ids[target_id] = row_number
            return target_id, doc_id, None

        # 同文档拆多条时，按标题（以及可选分组）精确消歧
        if not clean_title:
            names = '、'.join(f'《{t}》' if t else f'#{kid}' for kid, t, _ in matches)
            return None, doc_id, _row_fail(row_number, f'{label}在库中对应多条知识（{names}），请保留标题列精确匹配')

        narrowed = [
            m for m in matches
            if m[1] == clean_title and (not clean_section or m[2] == clean_section)
        ]
        if not narrowed and clean_section:
            narrowed = [m for m in matches if m[1] == clean_title]

        if not narrowed:
            return None, doc_id, _row_fail(row_number, f'未找到{label}')
        if len(narrowed) > 1:
            names = '、'.join(f'《{t}》' if t else f'#{kid}' for kid, t, _ in narrowed)
            return None, doc_id, _row_fail(row_number, f'{label}在库中对应多条同名知识：{names}')

        target_id = narrowed[0][0]
        if target_id in seen_ids:
            return None, doc_id, _row_fail(
                row_number,
                f'表格内{label}与第 {seen_ids[target_id]} 行重复',
            )
        seen_ids[target_id] = row_number
        return target_id, doc_id, None

    @transaction.atomic
    @log_content_action('knowledge', 'bulk_delete', '', group='知识文档', label='批量删除知识文档')
    def bulk_delete(
        self,
        *,
        ids: Optional[list[int]] = None,
        items: Optional[list[dict]] = None,
    ) -> dict:
        """支持按知识 ID 列表或按表格（ID / 文档链接+标题）批量删除。"""
        if ids:
            unique_ids = list(dict.fromkeys(ids))
            existing_ids = list(
                Knowledge.objects.filter(id__in=unique_ids).values_list('id', flat=True)
            )
            if not existing_ids:
                return {'deleted': 0, 'failures': []}
            revision_ids = list(
                KnowledgeRevision.objects.filter(
                    source_knowledge_id__in=existing_ids,
                ).values_list('id', flat=True)
            )
            Knowledge.objects.filter(id__in=existing_ids).delete()
            if revision_ids:
                KnowledgeRevision.objects.filter(
                    id__in=revision_ids,
                    knowledge_tasks__isnull=True,
                ).delete()
            return {'deleted': len(existing_ids), 'failures': []}

        existing_ids = set(Knowledge.objects.values_list('id', flat=True))
        doc_index = self._build_doc_index()
        seen_ids: dict[int, int] = {}
        deleted = 0
        failures: list[dict] = []

        for item in items or []:
            knowledge_id, doc_id, failure = self._match_delete_row(
                row_number=item['row_number'],
                row_id=item.get('id'),
                title=str(item.get('title') or ''),
                section=str(item.get('section') or ''),
                url=str(item.get('external_doc_url') or ''),
                existing_ids=existing_ids,
                doc_index=doc_index,
                seen_ids=seen_ids,
            )
            if failure:
                failures.append(failure)
                continue
            self._delete_record(knowledge_id)
            existing_ids.discard(knowledge_id)
            if doc_id and doc_id in doc_index:
                remaining = [m for m in doc_index[doc_id] if m[0] != knowledge_id]
                if remaining:
                    doc_index[doc_id] = remaining
                else:
                    doc_index.pop(doc_id, None)
            deleted += 1

        return {'deleted': deleted, 'failures': failures}
