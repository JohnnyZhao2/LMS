"""Knowledge services: CRUD and immutable revision snapshots."""

from __future__ import annotations

import hashlib
import json

from django.db import IntegrityError, transaction
from django.utils.html import strip_tags

from apps.activity_logs.decorators import log_content_action
from apps.authorization.engine import enforce
from apps.tags.resource_tags import (
    apply_resource_tag_changes,
    build_resource_update_plan,
    pop_resource_tag_payload,
)
from core.base_service import BaseService
from core.exceptions import BusinessError, ErrorCodes

from .models import Knowledge, KnowledgeRevision
from .selectors import get_knowledge_by_id


def build_knowledge_revision_payload(knowledge: Knowledge) -> dict:
    return {
        'title': knowledge.title,
        'content': knowledge.content,
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


@transaction.atomic
def ensure_knowledge_revision(knowledge: Knowledge, *, actor) -> KnowledgeRevision:
    """生成任务引用快照；同内容复用，并对源知识行加锁避免版本号竞争。"""
    locked = (
        Knowledge.objects.select_for_update()
        .select_related('space_tag')
        .prefetch_related('tags')
        .filter(pk=knowledge.pk)
        .first()
    )
    if locked is None:
        raise BusinessError(
            code=ErrorCodes.RESOURCE_NOT_FOUND,
            message=f'知识文档 {knowledge.pk} 不存在',
        )

    payload = build_knowledge_revision_payload(locked)
    content_hash = build_knowledge_revision_hash(payload)
    latest = (
        KnowledgeRevision.objects.filter(source_knowledge_id=locked.pk)
        .order_by('-revision_number')
        .first()
    )
    if latest and latest.content_hash == content_hash:
        return latest

    next_revision_number = (latest.revision_number if latest else 0) + 1
    try:
        return KnowledgeRevision.objects.create(
            source_knowledge=locked,
            revision_number=next_revision_number,
            title=payload['title'],
            content=payload['content'],
            related_links=payload['related_links'],
            space_tag_name=payload['space_tag_name'],
            tags_json=payload['tags_json'],
            content_hash=content_hash,
            created_by=actor,
        )
    except IntegrityError:
        existing = (
            KnowledgeRevision.objects.filter(
                source_knowledge_id=locked.pk,
                content_hash=content_hash,
            )
            .order_by('-revision_number')
            .first()
        )
        if existing:
            return existing
        raise


class KnowledgeService(BaseService):
    """知识文档应用服务。"""

    def get_by_id(self, pk: int) -> Knowledge:
        knowledge = get_knowledge_by_id(pk)
        self.validate_not_none(knowledge, f'知识文档 {pk} 不存在')
        return knowledge

    @transaction.atomic
    @log_content_action(
        'knowledge',
        'create',
        group='知识文档',
        label='创建知识文档',
    )
    def create(self, data: dict) -> Knowledge:
        self._validate_knowledge_data(data)
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

    @transaction.atomic
    @log_content_action(
        'knowledge',
        'update',
        group='知识文档',
        label='更新知识文档',
    )
    def update(self, pk: int, data: dict) -> Knowledge:
        knowledge = self.get_by_id(pk)
        # owner gate：资源所有权
        enforce('knowledge.update', self.request, resource=knowledge, error_message='无权更新知识文档')
        self._validate_knowledge_data(data=data, fallback_content=knowledge.content)

        current_tag_ids = list(knowledge.tags.values_list('id', flat=True))
        update_plan = build_resource_update_plan(
            knowledge,
            data,
            scope='knowledge',
            current_tag_ids=current_tag_ids,
        )
        if not update_plan.has_changes:
            return knowledge

        changed_fields = dict(update_plan.changed_fields)
        changed_fields['updated_by'] = self.user
        for key, value in changed_fields.items():
            setattr(knowledge, key, value)
        knowledge.save(update_fields=list(changed_fields.keys()))
        apply_resource_tag_changes(
            knowledge,
            space_tag_id=update_plan.space_tag_id,
            tag_ids=update_plan.tag_ids,
            space_tag_provided=update_plan.space_changed,
            tag_ids_provided=update_plan.tags_changed,
        )
        return knowledge

    @transaction.atomic
    @log_content_action(
        'knowledge',
        'delete',
        group='知识文档',
        label='删除知识文档',
    )
    def delete(self, pk: int) -> Knowledge:
        knowledge = self.get_by_id(pk)
        # owner gate：资源所有权
        enforce('knowledge.delete', self.request, resource=knowledge, error_message='无权删除知识文档')
        revision_ids = list(knowledge.revisions.values_list('id', flat=True))
        knowledge.delete()
        KnowledgeRevision.objects.filter(
            id__in=revision_ids,
            knowledge_tasks__isnull=True,
        ).delete()
        return knowledge

    def increment_view_count(self, pk: int) -> int:
        return self.get_by_id(pk).increment_view_count()

    def _validate_knowledge_data(
        self,
        data: dict,
        fallback_content: str | None = None,
    ) -> None:
        effective_content = data.get('content', fallback_content or '')
        if not strip_tags(str(effective_content)).strip():
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='知识文档必须填写正文内容',
            )
