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
