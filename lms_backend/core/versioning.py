"""
版本化资源通用工具。
"""
import uuid
from typing import Any, Iterable

from django.db import models


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
    source: models.Model,
    *,
    actor,
    copy_fields: Iterable[str],
    overrides: dict[str, Any] | None = None,
    extra_fields: dict[str, Any] | None = None,
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
