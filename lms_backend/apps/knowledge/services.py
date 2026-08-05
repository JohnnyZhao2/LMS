"""Knowledge services."""

import hashlib
import json
from collections import defaultdict

from apps.activity_logs.decorators import log_content_action
from django.db import transaction

from apps.tags.resource_sync import (
    apply_resource_tag_changes,
    build_resource_update_plan,
    pop_resource_tag_payload,
)
from core.base_service import BaseService

from .doc_url import extract_doc_id
from .models import Knowledge, KnowledgeRevision
from .selectors import get_knowledge_by_id


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
        'content': knowledge.content,
        'external_doc_url': knowledge.external_doc_url,
        'related_links': knowledge.related_links,
        'space_tag_name': knowledge.space_tag.name if knowledge.space_tag else '',
        'tags_json': [
            {'id': tag.id, 'name': tag.name, 'tag_type': tag.tag_type}
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
        content=payload['content'],
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
        current_tag_ids = list(knowledge.tags.values_list('id', flat=True))
        update_plan = build_resource_update_plan(
            knowledge, data, scope='knowledge', current_tag_ids=current_tag_ids,
        )
        if not update_plan.has_changes:
            return knowledge, False

        changed_fields = dict(update_plan.changed_fields)
        changed_fields['updated_by'] = self.user
        for key, value in changed_fields.items():
            setattr(knowledge, key, value)
        # update_fields 必须显式带上 updated_at，否则 auto_now 不生效
        knowledge.save(update_fields=[*changed_fields.keys(), 'updated_at'])
        apply_resource_tag_changes(
            knowledge,
            space_tag_id=update_plan.space_tag_id,
            tag_ids=update_plan.tag_ids,
            space_tag_provided=update_plan.space_changed,
            tag_ids_provided=update_plan.tags_changed,
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

    def _build_doc_index(self) -> dict[str, list[tuple[int, str]]]:
        """文档 id → [(knowledge_id, title), ...]。"""
        index: dict[str, list[tuple[int, str]]] = defaultdict(list)
        rows = Knowledge.objects.exclude(external_doc_url='').values_list(
            'id', 'title', 'external_doc_url',
        )
        for knowledge_id, title, url in rows:
            doc_id = extract_doc_id(url)
            if doc_id:
                index[doc_id].append((knowledge_id, title or ''))
        return index

    def _match_doc_row(
        self,
        *,
        row_number: int,
        title: str,
        url: str,
        doc_index: dict[str, list[tuple[int, str]]],
        seen: dict[str, tuple[int, str]],
        require_match: bool,
    ):
        """按文档 id 匹配一行 → (knowledge_id|None, doc_id|None, failure|None)。"""
        doc_id = extract_doc_id(url)
        label = _knowledge_label(title, doc_id or '')

        if not doc_id:
            if not require_match:
                return None, None, None
            prefix = _knowledge_label(title, fallback='')
            reason = f'{prefix}文档链接缺少 id 参数' if prefix else '文档链接缺少 id 参数'
            return None, None, _row_fail(row_number, reason)

        if doc_id in seen:
            first_row, first_title = seen[doc_id]
            return None, doc_id, _row_fail(
                row_number,
                f'表格内{label}与第 {first_row} 行{_knowledge_label(first_title, doc_id)}重复',
            )
        seen[doc_id] = (row_number, title)

        matches = doc_index.get(doc_id, [])
        if len(matches) > 1:
            names = '、'.join(f'《{t}》' if (t or '').strip() else f'#{kid}' for kid, t in matches)
            return None, doc_id, _row_fail(row_number, f'{label}在库中对应多条知识：{names}')
        if not matches:
            if require_match:
                return None, doc_id, _row_fail(row_number, f'未找到{label}')
            return None, doc_id, None
        return matches[0][0], doc_id, None

    @transaction.atomic
    @log_content_action('knowledge', 'import', '', group='知识文档', label='批量导入知识文档')
    def bulk_import(self, items: list[dict]) -> dict:
        """按文档链接 query.id 批量 upsert。"""
        doc_index = self._build_doc_index()
        seen: dict[str, tuple[int, str]] = {}
        created = updated = unchanged = 0
        failures: list[dict] = []

        for item in items:
            row_number = item['row_number']
            payload = {k: v for k, v in item.items() if k != 'row_number'}
            knowledge_id, doc_id, failure = self._match_doc_row(
                row_number=row_number,
                title=str(payload.get('title') or ''),
                url=str(payload.get('external_doc_url') or ''),
                doc_index=doc_index,
                seen=seen,
                require_match=False,
            )
            if failure:
                failures.append(failure)
                continue
            if knowledge_id is not None:
                _knowledge, changed = self._update_record(knowledge_id, dict(payload))
                if changed:
                    updated += 1
                else:
                    unchanged += 1
                continue

            knowledge = self._create_record(dict(payload))
            created += 1
            if doc_id:
                doc_index[doc_id] = [(knowledge.id, knowledge.title or '')]

        return {
            'created': created,
            'updated': updated,
            'unchanged': unchanged,
            'failures': failures,
        }

    @transaction.atomic
    @log_content_action('knowledge', 'bulk_delete', '', group='知识文档', label='批量删除知识文档')
    def bulk_delete(self, items: list[dict]) -> dict:
        """按文档链接 query.id 批量删除。"""
        doc_index = self._build_doc_index()
        seen: dict[str, tuple[int, str]] = {}
        deleted = 0
        failures: list[dict] = []

        for item in items:
            knowledge_id, doc_id, failure = self._match_doc_row(
                row_number=item['row_number'],
                title=str(item.get('title') or ''),
                url=str(item.get('external_doc_url') or ''),
                doc_index=doc_index,
                seen=seen,
                require_match=True,
            )
            if failure:
                failures.append(failure)
                continue
            self._delete_record(knowledge_id)
            doc_index.pop(doc_id, None)
            deleted += 1

        return {'deleted': deleted, 'failures': failures}
