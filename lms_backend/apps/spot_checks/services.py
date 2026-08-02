"""
抽查记录应用服务
发起(PENDING) → 学员提交(SUBMITTED) → 导师评分(SCORED)
"""
from __future__ import annotations

import uuid
from uuid import UUID

from django.db import transaction
from django.db.models import Prefetch, QuerySet
from django.utils import timezone

from apps.activity_logs.decorators import log_operation
from apps.authorization.engine import enforce, scope_filter
from apps.authorization.roles import enforce_student_workspace, is_student_workspace
from apps.users.models import User
from core.base_service import BaseService
from core.exceptions import BusinessError, ErrorCodes

from .image_utils import normalize_images
from .models import SpotCheck, SpotCheckItem


class SpotCheckService(BaseService):
    """抽查记录应用服务。"""

    def _base_queryset(self, *, include_item_details: bool = True) -> QuerySet:
        item_qs = SpotCheckItem.objects.all()
        if not include_item_details:
            item_qs = item_qs.only('id', 'spot_check_id', 'topic', 'score', 'order')
        return SpotCheck.objects.select_related(
            'student',
            'checker',
            'student__department',
        ).prefetch_related(Prefetch('items', queryset=item_qs))

    def _lock_by_id(self, pk: int) -> SpotCheck:
        """锁定单行 SpotCheck，串行化 update/submit/score。不联表，避免锁住用户行。"""
        spot_check = SpotCheck.objects.select_for_update().filter(pk=pk).first()
        self.validate_not_none(spot_check, f'抽查记录 {pk} 不存在')
        return spot_check

    def _require_revision(self, spot_check: SpotCheck, data: dict) -> None:
        raw = data.get('revision')
        if raw is None:
            raise BusinessError(code=ErrorCodes.VALIDATION_ERROR, message='缺少版本号')
        try:
            client_revision = int(raw)
        except (TypeError, ValueError) as exc:
            raise BusinessError(code=ErrorCodes.VALIDATION_ERROR, message='版本号无效') from exc
        if client_revision != spot_check.revision:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_VERSION_MISMATCH,
                message='记录已被更新，请刷新后重试',
                details={'revision': spot_check.revision},
            )

    def _bump_revision(self, spot_check: SpotCheck, *, update_fields: list[str]) -> None:
        spot_check.revision = int(spot_check.revision) + 1
        fields = [*update_fields, 'revision', 'updated_at']
        spot_check.save(update_fields=fields)

    def _enforce_student_owned(self, spot_check: SpotCheck, *, error_message: str) -> None:
        enforce_student_workspace(self.request, error_message=error_message)
        if spot_check.student_id != getattr(self.user, 'id', None):
            raise BusinessError(code=ErrorCodes.PERMISSION_DENIED, message=error_message)

    def get_by_id(self, pk: int) -> SpotCheck:
        spot_check = self._get_raw_by_id(pk)
        if is_student_workspace(self.request):
            self._enforce_student_owned(spot_check, error_message='无权访问该抽查记录')
            return spot_check
        enforce('spot_check.view', self.request, resource=spot_check, error_message='无权访问该抽查记录')
        return spot_check

    def _get_raw_by_id(self, pk: int) -> SpotCheck:
        spot_check = self._base_queryset().filter(pk=pk).first()
        self.validate_not_none(spot_check, f'抽查记录 {pk} 不存在')
        return spot_check

    def get_list(
        self,
        student_id: int | None = None,
        batch_id: UUID | None = None,
        status: str | None = None,
        ordering: str = '-created_at',
    ) -> QuerySet:
        return self._get_queryset_for_user(student_id, batch_id, ordering, status=status)

    def get_mine(
        self,
        ordering: str = '-created_at',
        status: str | None = None,
    ) -> QuerySet:
        enforce_student_workspace(self.request, error_message='无权查看抽查记录')
        qs = self._base_queryset(include_item_details=False).filter(student_id=self.user.id)
        if status:
            qs = qs.filter(status=status)
        if ordering:
            qs = qs.order_by(ordering)
        return qs

    @log_operation(
        'spot_check',
        'create_spot_check',
        '批量发起抽查',
        target_type='spot_check',
        target_title_template='批量抽查',
        group='抽查记录',
        label='发起抽查',
    )
    @transaction.atomic
    def batch_create(self, data: dict) -> list[SpotCheck]:
        students = data.get('students') or []
        if not students:
            raise BusinessError(code=ErrorCodes.VALIDATION_ERROR, message='至少选择一名学员')

        resolved_students: list[User] = []
        seen_student_ids: set[int] = set()
        for student in students:
            if not isinstance(student, User):
                raise BusinessError(code=ErrorCodes.VALIDATION_ERROR, message='无效的学员数据')
            if student.pk in seen_student_ids:
                continue
            seen_student_ids.add(student.pk)
            resolved_students.append(student)

        if not resolved_students:
            raise BusinessError(code=ErrorCodes.VALIDATION_ERROR, message='至少选择一名学员')

        student_ids = [student.pk for student in resolved_students]
        allowed_ids = set(
            scope_filter('spot_check.create', self.request, resource_model=User)
            .filter(pk__in=student_ids)
            .values_list('pk', flat=True)
        )
        invalid_ids = sorted(set(student_ids) - allowed_ids)
        if invalid_ids:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message=f'以下学员不在当前管理范围内: {invalid_ids}',
            )

        issue_items = self._normalize_issue_items(data.get('items'))
        batch_id = uuid.uuid4()
        spot_checks = SpotCheck.objects.bulk_create([
            SpotCheck(
                student=student,
                checker=self.user,
                status=SpotCheck.STATUS_PENDING,
                batch_id=batch_id,
            )
            for student in resolved_students
        ])

        SpotCheckItem.objects.bulk_create([
            SpotCheckItem(
                spot_check=spot_check,
                topic=item['topic'],
                instruction=item['instruction'],
                content='',
                images=[],
                order=index,
            )
            for spot_check in spot_checks
            for index, item in enumerate(issue_items)
        ])

        return list(
            self._base_queryset().filter(batch_id=batch_id).order_by('id')
        )

    @log_operation(
        'spot_check',
        'submit_spot_check',
        '{topic_summary_preview}',
        target_type='spot_check',
        target_title_template='{student_label}',
        group='抽查记录',
        label='提交抽查',
    )
    @transaction.atomic
    def submit(self, pk: int, data: dict) -> SpotCheck:
        spot_check = self._lock_by_id(pk)
        self._enforce_student_owned(spot_check, error_message='无权提交该抽查')
        self._require_revision(spot_check, data)
        if spot_check.status != SpotCheck.STATUS_PENDING:
            raise BusinessError(code=ErrorCodes.INVALID_OPERATION, message='当前状态不可提交')

        matched = self._match_items(
            spot_check,
            data.get('items') or [],
            empty_message='请填写抽查项',
        )
        updated: list[SpotCheckItem] = []
        for index, (item, payload) in enumerate(matched, start=1):
            content = str(payload.get('content') or '').strip()
            images = normalize_images(payload.get('images'), field_label=f'第 {index} 项贴图')
            if not content and not images:
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message=f'第 {index} 项请填写内容或贴图',
                )
            item.content = content
            item.images = images
            updated.append(item)

        SpotCheckItem.objects.bulk_update(updated, ['content', 'images'])
        updated.sort(key=lambda row: (row.order, row.id))
        spot_check._prefetched_objects_cache = {'items': updated}

        spot_check.status = SpotCheck.STATUS_SUBMITTED
        spot_check.submitted_at = timezone.now()
        self._bump_revision(spot_check, update_fields=['status', 'submitted_at'])
        return self._get_raw_by_id(pk)

    @log_operation(
        'spot_check',
        'score_spot_check',
        '{average_score_text} 分，{topic_summary_preview}',
        target_type='spot_check',
        target_title_template='{student_label}',
        group='抽查记录',
        label='抽查评分',
    )
    @transaction.atomic
    def score(self, pk: int, data: dict) -> SpotCheck:
        spot_check = self._lock_by_id(pk)
        enforce('spot_check.update', self.request, resource=spot_check, error_message='无权评分')
        self._require_revision(spot_check, data)
        if spot_check.status not in {SpotCheck.STATUS_SUBMITTED, SpotCheck.STATUS_SCORED}:
            raise BusinessError(code=ErrorCodes.INVALID_OPERATION, message='学员提交后才能评分')

        matched = self._match_items(
            spot_check,
            data.get('items') or [],
            empty_message='请填写评分项',
        )
        updated: list[SpotCheckItem] = []
        for item, payload in matched:
            score = payload.get('score')
            if score == '':
                score = None
            item.score = score
            item.comment = str(payload.get('comment') or '').strip()
            updated.append(item)

        SpotCheckItem.objects.bulk_update(updated, ['score', 'comment'])
        updated.sort(key=lambda row: (row.order, row.id))
        spot_check._prefetched_objects_cache = {'items': updated}

        # 全部打完才标记已评分，支持逐项即时保存
        all_scored = all(item.score is not None for item in updated)
        spot_check.status = SpotCheck.STATUS_SCORED if all_scored else SpotCheck.STATUS_SUBMITTED
        self._bump_revision(spot_check, update_fields=['status'])
        return self._get_raw_by_id(pk)

    @log_operation(
        'spot_check',
        'delete_spot_check',
        '{average_score_text} 分',
        target_type='spot_check',
        target_title_template='{student_label}',
        group='抽查记录',
        label='删除抽查记录',
    )
    def delete(self, pk: int) -> SpotCheck:
        spot_check = self._get_raw_by_id(pk)
        enforce('spot_check.delete', self.request, resource=spot_check, error_message='无权删除抽查记录')
        spot_check.delete()
        return spot_check

    def _get_queryset_for_user(
        self,
        student_id: int | None = None,
        batch_id: UUID | None = None,
        ordering: str = '-created_at',
        status: str | None = None,
    ) -> QuerySet:
        qs = self._base_queryset(include_item_details=False)
        qs = scope_filter('spot_check.view', self.request, base_queryset=qs)
        if student_id:
            qs = qs.filter(student_id=student_id)
        if batch_id:
            qs = qs.filter(batch_id=batch_id)
        if status:
            qs = qs.filter(status=status)
        if ordering:
            qs = qs.order_by(ordering)
        return qs

    def _match_items(
        self,
        spot_check: SpotCheck,
        payloads: list[dict],
        *,
        empty_message: str,
    ) -> list[tuple[SpotCheckItem, dict]]:
        """校验 payload 与当前 SpotCheckItem 集合完全一致，返回 (item, payload) 对。"""
        if not payloads:
            raise BusinessError(code=ErrorCodes.VALIDATION_ERROR, message=empty_message)

        existing = {item.id: item for item in spot_check.items.all()}
        if not existing:
            raise BusinessError(code=ErrorCodes.VALIDATION_ERROR, message='抽查项不存在')
        if len(payloads) != len(existing):
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='抽查项已变更，请刷新后重试',
            )

        seen_ids: set[int] = set()
        matched: list[tuple[SpotCheckItem, dict]] = []
        for index, payload in enumerate(payloads, start=1):
            item_id = payload.get('id')
            if item_id is None:
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message=f'第 {index} 项缺少条目 ID',
                )
            if item_id in seen_ids:
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message=f'第 {index} 项条目 ID 重复',
                )
            item = existing.get(item_id)
            if item is None:
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message='抽查项已变更，请刷新后重试',
                )
            seen_ids.add(item_id)
            matched.append((item, payload))

        if seen_ids != set(existing.keys()):
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='抽查项已变更，请刷新后重试',
            )
        return matched

    def _normalize_issue_items(self, items_data) -> list[dict]:
        if not items_data:
            raise BusinessError(code=ErrorCodes.VALIDATION_ERROR, message='至少需要填写一条抽查主题')

        normalized_items = []
        for index, item in enumerate(items_data, start=1):
            topic = str(item.get('topic') or '').strip()
            instruction = str(item.get('instruction') or '').strip()
            if not topic:
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message=f'第 {index} 条抽查主题不能为空',
                )
            normalized_items.append({
                'topic': topic,
                'instruction': instruction,
            })
        return normalized_items
