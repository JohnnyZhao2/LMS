from apps.activity_logs.services import ActivityLogService


def sync_activity_log_policies(**kwargs) -> None:
    ActivityLogService.sync_policies()
