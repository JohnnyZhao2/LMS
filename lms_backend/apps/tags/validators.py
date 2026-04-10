from typing import Literal

from core.exceptions import BusinessError, ErrorCodes

from .models import Tag


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
