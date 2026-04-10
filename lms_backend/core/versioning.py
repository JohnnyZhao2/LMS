"""
版本化资源通用工具。
"""
import uuid
from typing import Any, Callable, Iterable, Optional, TypeVar, cast

from django.db import models

ModelT = TypeVar('ModelT', bound=models.Model)


def initialize_new_resource_version(data: dict[str, Any]) -> None:
    """
    初始化新资源的版本字段。
    """
    data.pop('resource_uuid', None)
    data['resource_uuid'] = uuid.uuid4()
    data['version_number'] = 1
    data['is_current'] = True


def deactivate_current_version(model_cls: type[models.Model], resource_uuid) -> None:
    """
    取消同一资源当前版本标记。
    """
    model_cls.objects.filter(
        resource_uuid=resource_uuid,
        is_current=True,
    ).update(is_current=False)


def build_next_version_data(
    source: ModelT,
    *,
    actor,
    copy_fields: Iterable[str],
    overrides: Optional[dict[str, Any]] = None,
    extra_fields: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    """
    基于 source 构造新版本数据。
    """
    overrides = overrides or {}
    next_version = source.__class__.next_version_number(source.resource_uuid)
    new_data = {
        'resource_uuid': source.resource_uuid,
        'version_number': next_version,
        'is_current': True,
        'created_by': actor,
        'updated_by': actor,
    }
    for field in copy_fields:
        new_data[field] = overrides.get(field, getattr(source, field, None))
    if extra_fields:
        new_data.update(extra_fields)
    return new_data


def derive_resource_version(
    source: ModelT,
    *,
    actor,
    copy_fields: Iterable[str],
    overrides: Optional[dict[str, Any]] = None,
    extra_fields: Optional[dict[str, Any]] = None,
    is_current: bool = True,
    deactivate_current: bool = True,
    finalize: Optional[Callable[[ModelT], None]] = None,
) -> ModelT:
    """
    基于当前资源派生新版本，并在需要时执行落库后的补充逻辑。
    """
    new_data = build_next_version_data(
        source,
        actor=actor,
        copy_fields=copy_fields,
        overrides=overrides,
        extra_fields=extra_fields,
    )
    new_data['is_current'] = is_current
    if deactivate_current:
        deactivate_current_version(source.__class__, source.resource_uuid)
    new_resource = cast(ModelT, source.__class__.objects.create(**new_data))
    if finalize:
        finalize(new_resource)
    return new_resource


def is_referenced(resource_id: int, relation_model: type[models.Model], fk_field: str) -> bool:
    """
    检查资源是否被引用。

    Args:
        resource_id: 资源 ID
        relation_model: 关联模型类（如 TaskQuiz, QuizQuestion）
        fk_field: 外键字段名（如 'quiz_id', 'question_id'）

    Returns:
        bool: 是否被引用
    """
    return relation_model.objects.filter(**{fk_field: resource_id}).exists()
