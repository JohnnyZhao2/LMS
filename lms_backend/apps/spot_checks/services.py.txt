"""
抽查记录应用服务
编排业务逻辑，处理抽查记录的创建、更新、删除和权限验证。
Properties: 35, 36

使用方式（构造器注入）:
    service = SpotCheckService(request)
    records = service.get_list(student_id=123)
"""
from typing import List, Optional

from django.db import transaction
from django.db.models import QuerySet

from apps.authorization.engine import enforce, scope_filter
from apps.users.models import User
from core.base_service import BaseService
from core.decorators import log_operation
from core.exceptions import BusinessError, ErrorCodes

from .models import SpotCheck, SpotCheckItem


class SpotCheckService(BaseService):
    """抽查记录应用服务。"""

    def _base_queryset(self) -> QuerySet:
        """基础查询集，统一加载关联数据。"""
        return SpotCheck.objects.select_related(
            'student',
            'checker',
            'student__department',
        ).prefetch_related('items')

    def get_by_id(self, pk: int) -> SpotCheck:
        """获取抽查记录详情。"""
        spot_check = self._base_queryset().filter(pk=pk).first()
        self.validate_not_none(spot_check, f'抽查记录 {pk} 不存在')
        enforce('spot_check.view', self.request, resource=spot_check, error_message='无权访问该抽查记录')
        return spot_check

    def get_list(
        self,
        student_id: Optional[int] = None,
        ordering: str = '-created_at',
    ) -> List[SpotCheck]:
        """获取抽查记录列表（根据用户权限范围）。"""
        qs = self._get_queryset_for_user(student_id, ordering)
        return list(qs)

    @log_operation(
        'spot_check',
        'create_spot_check',
        '{score_text} 分，{content_preview}',
        target_type='spot_check',
        target_title_template='{student_label}',
    )
    @transaction.atomic
    def create(self, data: dict) -> SpotCheck:
        """创建抽查记录。"""
        student = data.get('student')
        if not student:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='必须指定被抽查学员',
            )

        if isinstance(student, int):
            student = User.objects.filter(pk=student).first()
            self.validate_not_none(student, f'学员 {data.get("student")} 不存在')

        if not isinstance(student, User):
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='无效的学员数据',
            )

        self._validate_student_scope(student)
        items = self._normalize_items(data.get('items'))

        spot_check = SpotCheck.objects.create(
            student=student,
            checker=self.user,
        )
        self._replace_items(spot_check, items)
        return spot_check

    @log_operation(
        'spot_check',
        'update_spot_check',
        '{score_text} 分，{content_preview}',
        target_type='spot_check',
        target_title_template='{student_label}',
    )
    @transaction.atomic
    def update(self, pk: int, data: dict) -> SpotCheck:
        """更新抽查记录。"""
        spot_check = self.get_by_id(pk)
        enforce('spot_check.update', self.request, resource=spot_check, error_message='无权更新抽查记录')

        if 'items' in data:
            items = self._normalize_items(data.get('items'))
            self._replace_items(spot_check, items)

        return spot_check

    @log_operation(
        'spot_check',
        'delete_spot_check',
        '{score_text} 分',
        target_type='spot_check',
        target_title_template='{student_label}',
    )
    def delete(self, pk: int) -> SpotCheck:
        """删除抽查记录。"""
        spot_check = self.get_by_id(pk)
        enforce('spot_check.delete', self.request, resource=spot_check, error_message='无权删除抽查记录')

        spot_check.delete()
        return spot_check

    def _get_queryset_for_user(
        self,
        student_id: Optional[int] = None,
        ordering: str = '-created_at',
    ) -> QuerySet:
        """根据当前用户可查看学员范围获取查询集。"""
        qs = self._base_queryset()
        qs = scope_filter('spot_check.view', self.request, base_queryset=qs)

        if student_id:
            qs = qs.filter(student_id=student_id)
        if ordering:
            qs = qs.order_by(ordering)
        return qs

    def _replace_items(self, spot_check: SpotCheck, items: list[dict]) -> None:
        """整批替换抽查明细，保持实现简单明确。"""
        spot_check.items.all().delete()
        created_items = SpotCheckItem.objects.bulk_create([
            SpotCheckItem(
                spot_check=spot_check,
                topic=item['topic'],
                content=item['content'],
                score=item['score'],
                comment=item['comment'],
                order=index,
            )
            for index, item in enumerate(items)
        ])
        spot_check._prefetched_objects_cache = {'items': created_items}

    def _normalize_items(self, items_data) -> list[dict]:
        """标准化抽查明细输入。"""
        if not items_data:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='至少需要填写一条抽查主题',
            )

        normalized_items = []
        for index, item in enumerate(items_data, start=1):
            topic = str(item.get('topic') or '').strip()
            content = str(item.get('content') or '').strip()
            comment = str(item.get('comment') or '').strip()
            score = item.get('score')

            if not topic:
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message=f'第 {index} 条抽查主题不能为空',
                )
            if score is None:
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message=f'第 {index} 条抽查评分不能为空',
                )

            normalized_items.append({
                'topic': topic,
                'content': content,
                'score': score,
                'comment': comment,
            })

        return normalized_items

    def _validate_data_scope_access(self, spot_check: SpotCheck) -> None:
        """验证用户是否有权限访问该抽查记录。"""
        enforce('spot_check.view', self.request, resource=spot_check, error_message='无权访问该抽查记录')

    def _validate_student_scope(self, student: User) -> None:
        """验证用户是否有权限为指定学员创建抽查记录。"""
        enforce(
            'spot_check.create',
            self.request,
            context={'student': student},
        )
