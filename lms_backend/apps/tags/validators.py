from typing import Literal, Optional

from core.exceptions import BusinessError, ErrorCodes

from .models import Tag

TagScope = Literal['knowledge', 'question']

TAG_SCOPE_CONFIG: dict[TagScope, tuple[Literal['allow_knowledge', 'allow_question'], str, str]] = {
    'knowledge': ('allow_knowledge', 'tag_ids', '包含无效的知识标签ID'),
    'question': ('allow_question', 'tag_ids', '包含无效的题目标签ID'),
}


def get_space_tag_or_error(space_tag_id: int) -> Tag:
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


def get_tag_ids_or_error(
    tag_ids: list[int],
    *,
    applicable_field: Literal['allow_knowledge', 'allow_question'],
    invalid_message: str,
) -> list[int]:
    if not tag_ids:
        return []

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
            message=invalid_message,
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


def get_scoped_tag_ids_or_error(tag_ids: list[int], *, scope: TagScope) -> list[int]:
    applicable_field, field_name, invalid_message = TAG_SCOPE_CONFIG[scope]
    return get_tag_ids_or_error(
        tag_ids,
        applicable_field=applicable_field,
        invalid_message=f'{field_name} {invalid_message}',
    )


def assign_space_tag(resource, space_tag_id: Optional[int], *, clear_when_none: bool = False) -> None:
    if space_tag_id is None:
        if not clear_when_none or resource.space_tag_id is None:
            return
        resource.space_tag = None
        resource.save(update_fields=['space_tag'])
        return

    resource.space_tag = get_space_tag_or_error(space_tag_id)
    resource.save(update_fields=['space_tag'])


def assign_scoped_tags(resource, tag_ids: list[int], *, scope: TagScope) -> list[int]:
    normalized_tag_ids = get_scoped_tag_ids_or_error(tag_ids, scope=scope)
    resource.tags.set(normalized_tag_ids)
    return normalized_tag_ids
