from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Optional

from core.exceptions import BusinessError, ErrorCodes

from .models import Tag

TagScope = Literal['knowledge', 'question']

_TAG_SCOPE_CONFIG: dict[TagScope, tuple[Literal['allow_knowledge', 'allow_question'], str]] = {
    'knowledge': ('allow_knowledge', '包含无效的知识标签ID'),
    'question': ('allow_question', '包含无效的题目标签ID'),
}


@dataclass(frozen=True)
class ResourceTagPayload:
    space_tag_id: Optional[int]
    tag_ids: list[int]
    space_tag_provided: bool
    tag_ids_provided: bool


@dataclass(frozen=True)
class ResourceUpdatePlan:
    changed_fields: dict
    space_tag_id: Optional[int]
    tag_ids: list[int]
    space_tag_provided: bool
    tag_ids_provided: bool
    space_changed: bool
    tags_changed: bool
    has_changes: bool


def pop_resource_tag_payload(
    data: dict,
    *,
    scope: TagScope,
    default_space_tag_id: Optional[int] = None,
    default_tag_ids: Optional[list[int]] = None,
) -> ResourceTagPayload:
    space_tag_provided = 'space_tag_id' in data
    tag_ids_provided = 'tag_ids' in data
    space_tag_id = (
        data.pop('space_tag_id')
        if space_tag_provided
        else default_space_tag_id
    )
    raw_tag_ids = (
        data.pop('tag_ids')
        if tag_ids_provided
        else list(default_tag_ids or [])
    )
    return ResourceTagPayload(
        space_tag_id=space_tag_id,
        tag_ids=_validate_tag_ids(raw_tag_ids or [], scope=scope),
        space_tag_provided=space_tag_provided,
        tag_ids_provided=tag_ids_provided,
    )


def build_resource_update_plan(
    resource,
    data: dict,
    *,
    scope: TagScope,
    current_tag_ids: list[int],
) -> ResourceUpdatePlan:
    payload = pop_resource_tag_payload(
        data,
        scope=scope,
        default_space_tag_id=resource.space_tag_id,
        default_tag_ids=current_tag_ids,
    )
    changed_fields = {
        key: value
        for key, value in data.items()
        if getattr(resource, key, None) != value
    }
    space_changed = (
        payload.space_tag_provided
        and payload.space_tag_id != resource.space_tag_id
    )
    tags_changed = (
        payload.tag_ids_provided
        and set(payload.tag_ids) != set(current_tag_ids)
    )
    return ResourceUpdatePlan(
        changed_fields=changed_fields,
        space_tag_id=payload.space_tag_id,
        tag_ids=payload.tag_ids,
        space_tag_provided=payload.space_tag_provided,
        tag_ids_provided=payload.tag_ids_provided,
        space_changed=space_changed,
        tags_changed=tags_changed,
        has_changes=bool(changed_fields or space_changed or tags_changed),
    )


def apply_resource_tag_changes(
    resource,
    *,
    space_tag_id: Optional[int],
    tag_ids: list[int],
    space_tag_provided: bool,
    tag_ids_provided: bool,
) -> None:
    if space_tag_provided:
        _assign_space_tag(resource, space_tag_id, clear_when_none=True)
    if tag_ids_provided:
        resource.tags.set(tag_ids)


def _validate_space_tag_id(space_tag_id: int) -> Tag:
    space_tag = Tag.objects.filter(
        id=space_tag_id,
        tag_type='SPACE',
    ).first()
    if not space_tag:
        raise BusinessError(
            code=ErrorCodes.VALIDATION_ERROR,
            message='无效的 space ID',
        )
    return space_tag


def _validate_tag_ids(tag_ids: list[int], *, scope: TagScope) -> list[int]:
    if not tag_ids:
        return []

    applicable_field, invalid_message = _TAG_SCOPE_CONFIG[scope]
    valid_tag_ids = set(
        Tag.objects.filter(
            id__in=tag_ids,
            tag_type='TAG',
            **{applicable_field: True},
        ).values_list('id', flat=True)
    )
    invalid_tag_ids = [tag_id for tag_id in tag_ids if tag_id not in valid_tag_ids]
    if invalid_tag_ids:
        raise BusinessError(
            code=ErrorCodes.VALIDATION_ERROR,
            message=f'tag_ids {invalid_message}',
            details={'invalid_tag_ids': invalid_tag_ids},
        )

    deduped_tag_ids = []
    seen_ids = set()
    for tag_id in tag_ids:
        if tag_id in seen_ids:
            continue
        seen_ids.add(tag_id)
        deduped_tag_ids.append(tag_id)
    return deduped_tag_ids


def _assign_space_tag(resource, space_tag_id: Optional[int], *, clear_when_none: bool = False) -> None:
    if space_tag_id is None:
        if not clear_when_none or resource.space_tag_id is None:
            return
        resource.space_tag = None
        resource.save(update_fields=['space_tag'])
        return

    resource.space_tag = _validate_space_tag_id(space_tag_id)
    resource.save(update_fields=['space_tag'])
