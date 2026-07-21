from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from .validators import assign_space_tag, get_scoped_tag_ids_or_error


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
    scope: str,
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
    tag_ids = get_scoped_tag_ids_or_error(raw_tag_ids or [], scope=scope)
    return ResourceTagPayload(
        space_tag_id=space_tag_id,
        tag_ids=tag_ids,
        space_tag_provided=space_tag_provided,
        tag_ids_provided=tag_ids_provided,
    )


def build_resource_update_plan(
    resource,
    data: dict,
    *,
    scope: str,
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
        assign_space_tag(resource, space_tag_id, clear_when_none=True)
    if tag_ids_provided:
        resource.tags.set(tag_ids)
