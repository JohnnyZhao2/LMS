"""任务分配状态同步。

本模块只处理“任务是否完成/逾期”的状态推进，避免提交、学习进度和定时任务各自
重复判断完成条件。
"""

from .progress import build_assignment_progress, is_assignment_completed


def get_assignment_progress_data(assignment):
    return build_assignment_progress(assignment)


def sync_assignment_overdue_status(assignment) -> bool:
    if assignment.is_overdue and assignment.status not in ['COMPLETED', 'OVERDUE']:
        assignment.mark_overdue()
        return True
    return False


def sync_assignment_completion_status(assignment) -> bool:
    progress = get_assignment_progress_data(assignment)
    if is_assignment_completed(progress):
        if assignment.status != 'COMPLETED':
            assignment.mark_completed()
        return True
    return False
