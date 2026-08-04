"""Knowledge services."""

import hashlib
import json

from apps.activity_logs.decorators import log_content_action
from django.db import transaction

from apps.tags.resource_sync import (
    apply_resource_tag_changes,
    build_resource_update_plan,
    pop_resource_tag_payload,
)
from core.base_service import BaseService

from .models import Knowledge, KnowledgeRevision
from .selectors import get_knowledge_by_id


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
    @log_content_action(
        'knowledge',
        'create',
        '',
        group='知识文档',
        label='创建知识文档',
    )
    def create(self, data: dict) -> Knowledge:
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
        '',
        group='知识文档',
        label='更新知识文档',
    )
    def update(self, pk: int, data: dict) -> Knowledge:
        knowledge = self.get_by_id(pk)

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
        '',
        group='知识文档',
        label='删除知识文档',
    )
    def delete(self, pk: int) -> Knowledge:
        knowledge = self.get_by_id(pk)
        revisions = list(knowledge.revisions.all())
        knowledge.delete()
        KnowledgeRevision.objects.filter(
            id__in=[revision.id for revision in revisions],
            knowledge_tasks__isnull=True,
        ).delete()
        return knowledge

    def increment_view_count(self, pk: int) -> int:
        return self.get_by_id(pk).increment_view_count()
