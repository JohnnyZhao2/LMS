export const queryKeys = {
  activityLogs: {
    all: () => ['activity-logs'] as const,
    list: (params: unknown) => ['activity-logs', params] as const,
    policies: () => ['activity-log-policies'] as const,
  },
  authorization: {
    permissionCatalog: () => ['authorization', 'permission-catalog'] as const,
    groupPermissionsRoot: () => ['authorization', 'group-permissions'] as const,
    groupPermissions: ({
      roleCode,
    }: {
      roleCode: string | null | undefined;
    }) => ['authorization', 'group-permissions', roleCode ?? 'NONE'] as const,
    userPermissionsRoot: () => ['authorization', 'user-permissions'] as const,
    userPermissions: ({
      userId,
    }: {
      userId: number | null;
    }) => ['authorization', 'user-permissions', userId ?? 'NONE'] as const,
  },
  dashboards: {
    admin: () => ['admin-dashboard'] as const,
    mentor: () => ['mentor-dashboard'] as const,
    student: ({
      taskLimit,
      knowledgeLimit,
    }: {
      taskLimit: number;
      knowledgeLimit: number;
    }) => ['student-dashboard', taskLimit, knowledgeLimit] as const,
    taskParticipants: (taskId: number | null) => ['task-participants', taskId] as const,
    examReport: ({
      filters,
    }: {
      filters: string;
    }) => ['exam-report', filters] as const,
  },
  grading: {
    pending: () => ['grading', 'pending'] as const,
    taskAnalyticsRoot: () => ['task-analytics'] as const,
    taskAnalytics: ({
      taskId,
    }: {
      taskId: number;
    }) => ['task-analytics', taskId] as const,
    studentExecutionsRoot: () => ['student-executions'] as const,
    studentExecutions: ({
      taskId,
    }: {
      taskId: number;
    }) => ['student-executions', taskId] as const,
    questionsRoot: () => ['grading-questions'] as const,
    questions: ({
      taskId,
      quizId,
    }: {
      taskId: number;
      quizId: number | null;
    }) => ['grading-questions', taskId, quizId] as const,
    answersRoot: () => ['grading-answers'] as const,
    answers: ({
      taskId,
      quizId,
      questionId,
    }: {
      taskId: number;
      quizId: number | null;
      questionId: number | null;
    }) => ['grading-answers', taskId, quizId, questionId] as const,
  },
  knowledge: {
    listRoot: () => ['knowledge-list'] as const,
    infiniteList: ({
      spaceTagId,
      search,
      pageSize,
    }: {
      spaceTagId?: number;
      search?: string;
      pageSize: number;
    }) => [
      'knowledge-list',
      'infinite',
      spaceTagId,
      search,
      pageSize,
    ] as const,
    detailRoot: () => ['knowledge-detail'] as const,
    detail: ({
      knowledgeId,
      taskKnowledgeId,
    }: {
      knowledgeId?: number;
      taskKnowledgeId?: number;
    }) => [
      'knowledge-detail',
      taskKnowledgeId ? 'task' : 'knowledge',
      taskKnowledgeId ?? knowledgeId ?? 0,
    ] as const,
  },
  questions: {
    all: () => ['questions'] as const,
    list: ({
      page,
      pageSize,
      questionType,
      search,
      spaceTagId,
      tagId,
    }: {
      page: number;
      pageSize: number;
      questionType?: string;
      search?: string;
      spaceTagId?: number;
      tagId?: number;
    }) => [
      'questions',
      page,
      pageSize,
      questionType,
      search,
      spaceTagId,
      tagId,
    ] as const,
    detailRoot: () => ['question-detail'] as const,
    detail: ({
      id,
    }: {
      id: number;
    }) => ['question-detail', id] as const,
  },
  quizzes: {
    all: () => ['quizzes'] as const,
    list: ({
      page,
      pageSize,
      search,
      quizType,
    }: {
      page: number;
      pageSize: number;
      search?: string;
      quizType?: string;
    }) => ['quizzes', page, pageSize, search, quizType] as const,
    detailRoot: () => ['quiz-detail'] as const,
    detail: ({
      id,
    }: {
      id: number;
    }) => ['quiz-detail', id] as const,
  },
  spotChecks: {
    all: () => ['spot-checks'] as const,
    list: ({
      studentId,
      batchId,
      page,
      pageSize,
    }: {
      studentId?: number;
      batchId?: string;
      page: number;
      pageSize: number;
    }) => [
      'spot-checks',
      studentId ?? 'ALL',
      batchId ?? 'ALL',
      page,
      pageSize,
    ] as const,
    batchPeers: ({
      batchId,
    }: {
      batchId: string;
    }) => ['spot-checks-batch-peers', batchId] as const,
    mine: ({
      page,
      pageSize,
      status,
    }: {
      page: number;
      pageSize: number;
      status?: string;
    }) => ['spot-checks-mine', page, pageSize, status ?? 'all'] as const,
    studentsRoot: () => ['spot-check-students'] as const,
    students: ({
      search,
    }: {
      search?: string;
    }) => ['spot-check-students', search ?? ''] as const,
    detailRoot: () => ['spot-check-detail'] as const,
    detail: ({
      id,
    }: {
      id: number;
    }) => ['spot-check-detail', id] as const,
  },
  submissions: {
    detailRoot: () => ['submission'] as const,
    detail: (submissionId: number) => ['submission', submissionId] as const,
    result: ({
      submissionId,
    }: {
      submissionId?: number;
    }) => ['submission-result', submissionId] as const,
  },
  tags: {
    all: () => ['tags'] as const,
    list: ({
      canQueryTags,
      tagType,
      search,
      limit,
      applicableTo,
    }: {
      canQueryTags: boolean;
      tagType?: string;
      search?: string;
      limit: number;
      applicableTo?: string;
    }) => [
      'tags',
      canQueryTags,
      tagType,
      search,
      limit,
      applicableTo,
    ] as const,
  },
  tasks: {
    all: () => ['tasks'] as const,
    list: ({
      page,
      pageSize,
      search,
      taskStatus,
      creatorSide,
    }: {
      page: number;
      pageSize: number;
      search?: string;
      taskStatus?: string;
      creatorSide?: string;
    }) => [
      'tasks',
      page,
      pageSize,
      search,
      taskStatus,
      creatorSide,
    ] as const,
    detailRoot: () => ['task-detail'] as const,
    detail: ({
      id,
    }: {
      id: number;
    }) => ['task-detail', id] as const,
    studentRoot: () => ['student-tasks'] as const,
    studentList: ({
      page,
      pageSize,
      status,
      search,
    }: {
      page: number;
      pageSize: number;
      status?: string;
      search?: string;
    }) => ['student-tasks', page, pageSize, status, search] as const,
    studentLearningDetailRoot: () => ['student-learning-task-detail'] as const,
    studentLearningDetail: ({
      taskId,
    }: {
      taskId: number;
    }) => ['student-learning-task-detail', taskId] as const,
    resourceOptionsRoot: () => ['task-resource-options'] as const,
    resourceOptions: ({
      resourceType,
      search,
      page,
      pageSize,
      excludeDocumentIds,
      excludeQuizIds,
    }: {
      resourceType: string;
      search: string;
      page: number;
      pageSize: number;
      excludeDocumentIds: string;
      excludeQuizIds: string;
    }) => [
      'task-resource-options',
      resourceType,
      search,
      page,
      pageSize,
      excludeDocumentIds,
      excludeQuizIds,
    ] as const,
  },
  users: {
    all: () => ['users'] as const,
    list: ({
      departmentId,
      mentorId,
      isActive,
      search,
    }: {
      departmentId?: number;
      mentorId?: number;
      isActive?: boolean;
      search?: string;
    }) => [
      'users',
      departmentId,
      mentorId,
      isActive,
      search,
    ] as const,
    detailRoot: () => ['user-detail'] as const,
    detail: ({
      id,
    }: {
      id: number;
    }) => ['user-detail', id] as const,
    mentors: () => ['mentors'] as const,
    roles: () => ['roles'] as const,
    departments: () => ['departments'] as const,
    assignable: () => ['assignable-users'] as const,
  },
} as const;
