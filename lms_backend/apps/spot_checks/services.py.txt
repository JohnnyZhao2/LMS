"""
抽查记录应用服务
发起(PENDING) → 学员提交(SUBMITTED) → 导师评分(SCORED)
"""
import uuid
from typing import Optional
from uuid import UUID

from django.db import transaction
from django.db.models import QuerySet
from django.utils import timezone

from apps.activity_logs.decorators import log_operation
from apps.authorization.engine import enforce, scope_filter
from apps.users.models import User
from core.base_service import BaseService
from core.exceptions import BusinessError, ErrorCodes

from .image_utils import normalize_images
from .models import SpotCheck, SpotCheckItem


class SpotCheckService(BaseService):
    """抽查记录应用服务。"""

    def _base_queryset(self) -> QuerySet:
        return SpotCheck.objects.select_related(
            'student',
            'checker',
            'student__department',
        ).prefetch_related('items')

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
        fields = list(dict.fromkeys([*update_fields, 'revision', 'updated_at']))
        spot_check.save(update_fields=fields)

    def get_by_id(self, pk: int) -> SpotCheck:
        spot_check = self._base_queryset().filter(pk=pk).first()
        self.validate_not_none(spot_check, f'抽查记录 {pk} 不存在')
        enforce('spot_check.view', self.request, resource=spot_check, error_message='无权访问该抽查记录')
        return spot_check

    def get_list(
        self,
        student_id: Optional[int] = None,
        batch_id: Optional[UUID] = None,
        status: Optional[str] = None,
        topic: str = '',
        ordering: str = '-created_at',
    ) -> QuerySet:
        return self._get_queryset_for_user(
            student_id=student_id,
            batch_id=batch_id,
            status=status,
            topic=topic,
            ordering=ordering,
        )

    def get_mine(
        self,
        ordering: str = '-created_at',
        status: Optional[str] = None,
    ) -> QuerySet:
        enforce('spot_check.view', self.request, error_message='无权查看抽查记录')
        qs = self._base_queryset().filter(student_id=self.user.id)
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
            if isinstance(student, int):
                student_id = student
                student = User.objects.filter(pk=student_id).first()
                self.validate_not_none(student, f'学员 {student_id} 不存在')
            if not isinstance(student, User):
                raise BusinessError(code=ErrorCodes.VALIDATION_ERROR, message='无效的学员数据')
            if student.pk in seen_student_ids:
                continue
            seen_student_ids.add(student.pk)
            self._validate_student_scope(student)
            resolved_students.append(student)

        if not resolved_students:
            raise BusinessError(code=ErrorCodes.VALIDATION_ERROR, message='至少选择一名学员')

        items = self._normalize_issue_items(data.get('items'))
        batch_id = uuid.uuid4()

        created: list[SpotCheck] = []
        for student in resolved_students:
            spot_check = SpotCheck.objects.create(
                student=student,
                checker=self.user,
                status=SpotCheck.STATUS_PENDING,
                batch_id=batch_id,
            )
            self._replace_items(spot_check, items, keep_score=False, bump_revision=False)
            created.append(spot_check)
        return created

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
        enforce(
            'spot_check.submit',
            self.request,
            resource=spot_check,
            error_message='无权提交该抽查',
        )
        self._require_revision(spot_check, data)
        if spot_check.status != SpotCheck.STATUS_PENDING:
            raise BusinessError(code=ErrorCodes.VALIDATION_ERROR, message='当前状态不可提交')

        payload_items = data.get('items') or []
        existing_by_id = {item.id: item for item in spot_check.items.all()}
        if not existing_by_id:
            raise BusinessError(code=ErrorCodes.VALIDATION_ERROR, message='抽查项不存在')
        if len(payload_items) != len(existing_by_id):
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='抽查项已变更，请刷新后重试',
            )

        payload_ids: list[int] = []
        for index, payload in enumerate(payload_items, start=1):
            item_id = payload.get('id')
            if item_id is None:
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message=f'第 {index} 项缺少条目 ID',
                )
            try:
                item_id = int(item_id)
            except (TypeError, ValueError) as exc:
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message=f'第 {index} 项条目 ID 无效',
                ) from exc
            if item_id in payload_ids:
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message=f'第 {index} 项条目 ID 重复',
                )
            if item_id not in existing_by_id:
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message='抽查项已变更，请刷新后重试',
                )
            payload_ids.append(item_id)

        if set(payload_ids) != set(existing_by_id.keys()):
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='抽查项已变更，请刷新后重试',
            )

        for index, payload in enumerate(payload_items, start=1):
            item = existing_by_id[int(payload['id'])]
            content = str(payload.get('content') or '').strip()
            images = normalize_images(payload.get('images'), field_label=f'第 {index} 项贴图')
            if not content and not images:
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message=f'第 {index} 项请填写内容或贴图',
                )
            item.content = content
            item.images = images
            item.save(update_fields=['content', 'images'])

        spot_check.status = SpotCheck.STATUS_SUBMITTED
        spot_check.submitted_at = timezone.now()
        self._bump_revision(spot_check, update_fields=['status', 'submitted_at'])
        return self.get_by_id(pk)

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
            raise BusinessError(code=ErrorCodes.VALIDATION_ERROR, message='学员提交后才能评分')

        items = self._normalize_score_items(data.get('items'), spot_check)
        self._apply_scores(spot_check, items)
        # 全部打完才标记已评分，支持逐项即时保存
        all_scored = all(payload['score'] is not None for payload in items)
        spot_check.status = SpotCheck.STATUS_SCORED if all_scored else SpotCheck.STATUS_SUBMITTED
        self._bump_revision(spot_check, update_fields=['status'])
        return self.get_by_id(pk)

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
        spot_check = self.get_by_id(pk)
        enforce('spot_check.delete', self.request, resource=spot_check, error_message='无权删除抽查记录')
        spot_check.delete()
        return spot_check

    def _get_queryset_for_user(
        self,
        student_id: Optional[int] = None,
        batch_id: Optional[UUID] = None,
        status: Optional[str] = None,
        topic: str = '',
        ordering: str = '-created_at',
    ) -> QuerySet:
        qs = self._base_queryset()
        qs = scope_filter('spot_check.view', self.request, base_queryset=qs)
        if student_id:
            qs = qs.filter(student_id=student_id)
        if batch_id:
            qs = qs.filter(batch_id=batch_id)
        if status:
            qs = qs.filter(status=status)
        if topic:
            qs = qs.filter(items__topic__icontains=topic).distinct()
        if ordering:
            qs = qs.order_by(ordering)
        return qs

    def _replace_items(
        self,
        spot_check: SpotCheck,
        items: list[dict],
        *,
        keep_score: bool,
        bump_revision: bool,
    ) -> None:
        spot_check.items.all().delete()
        created_items = SpotCheckItem.objects.bulk_create([
            SpotCheckItem(
                spot_check=spot_check,
                topic=item['topic'],
                instruction=item.get('instruction', ''),
                instruction_images=item.get('instruction_images') or [],
                content=item.get('content', ''),
                score=item.get('score') if keep_score else None,
                comment=item.get('comment', '') if keep_score else '',
                images=item.get('images') or [],
                order=index,
            )
            for index, item in enumerate(items)
        ])
        spot_check._prefetched_objects_cache = {'items': created_items}
        if bump_revision:
            self._bump_revision(spot_check, update_fields=[])
        else:
            spot_check.save(update_fields=['updated_at'])

    def _apply_scores(self, spot_check: SpotCheck, items: list[dict]) -> None:
        existing_by_id = {item.id: item for item in spot_check.items.all()}
        if len(items) != len(existing_by_id):
            raise BusinessError(code=ErrorCodes.VALIDATION_ERROR, message='抽查项数量不匹配')

        updated: list[SpotCheckItem] = []
        for payload in items:
            item = existing_by_id[payload['id']]
            item.score = payload['score']
            item.comment = payload['comment']
            item.save(update_fields=['score', 'comment'])
            updated.append(item)
        updated.sort(key=lambda row: (row.order, row.id))
        spot_check._prefetched_objects_cache = {'items': updated}

    def _normalize_issue_items(self, items_data) -> list[dict]:
        if not items_data:
            raise BusinessError(code=ErrorCodes.VALIDATION_ERROR, message='至少需要填写一条抽查主题')

        normalized_items = []
        for index, item in enumerate(items_data, start=1):
            topic = str(item.get('topic') or '').strip()
            instruction = str(item.get('instruction') or '').strip()
            instruction_images = normalize_images(
                item.get('instruction_images'),
                field_label=f'第 {index} 项要求贴图',
            )
            if not topic:
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message=f'第 {index} 条抽查主题不能为空',
                )
            normalized_items.append({
                'topic': topic,
                'instruction': instruction,
                'instruction_images': instruction_images,
                'content': '',
                'images': [],
            })
        return normalized_items

    def _normalize_score_items(self, items_data, spot_check: SpotCheck) -> list[dict]:
        if not items_data:
            raise BusinessError(code=ErrorCodes.VALIDATION_ERROR, message='请填写评分项')

        existing_ids = set(spot_check.items.values_list('id', flat=True))
        if not existing_ids:
            raise BusinessError(code=ErrorCodes.VALIDATION_ERROR, message='抽查项不存在')
        if len(items_data) != len(existing_ids):
            raise BusinessError(code=ErrorCodes.VALIDATION_ERROR, message='抽查项数量不匹配')

        normalized_items = []
        payload_ids: list[int] = []
        for index, item in enumerate(items_data, start=1):
            item_id = item.get('id')
            if item_id is None:
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message=f'第 {index} 项缺少条目 ID',
                )
            try:
                item_id = int(item_id)
            except (TypeError, ValueError) as exc:
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message=f'第 {index} 项条目 ID 无效',
                ) from exc
            if item_id in payload_ids:
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message=f'第 {index} 项条目 ID 重复',
                )
            if item_id not in existing_ids:
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message='抽查项已变更，请刷新后重试',
                )
            payload_ids.append(item_id)

            score = item.get('score')
            if score == '':
                score = None
            normalized_items.append({
                'id': item_id,
                'score': score,
                'comment': str(item.get('comment') or '').strip(),
            })

        if set(payload_ids) != existing_ids:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='抽查项已变更，请刷新后重试',
            )
        return normalized_items

    def _validate_student_scope(self, student: User) -> None:
        enforce(
            'spot_check.create',
            self.request,
            context={'student': student},
        )
