export const activityLogsQueryKeys = {
    all: () => ['activity-logs'] as const,
    list: (params: unknown) => ['activity-logs', params] as const,
    policies: () => ['activity-log-policies'] as const,
} as const;
