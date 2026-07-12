type QueryRole = string | null | undefined;

const normalizeRoleKey = (currentRole: QueryRole) => currentRole ?? 'UNKNOWN';

export const queryKeys = {
  activityLogs: {
    all: () => ['activity-logs'] as const,
    list: (params: unknown) => ['activity-logs', params] as const,
    policies: () => ['activity-log-policies'] as const,
  },
  authorization: {
    permissionCatalogRoot: () => ['authorization', 'permission-catalog'] as const,
    permissionCatalog: ({
      currentRole,
      module,
      view,
    }: {
      currentRole: QueryRole;
      module?: string;
      view?: string;
    }) => [
      'authorization',
      'permission-catalog',
      normalizeRoleKey(currentRole),
      module ?? 'ALL',
      view ?? 'ALL',
    ] as const,
    roleTemplatesRoot: () => ['authorization', 'role-template'] as const,
    roleTemplate: ({
      currentRole,
      roleCode,
    }: {
      currentRole: QueryRole;
      roleCode: string;
    }) => ['authorization', 'role-template', normalizeRoleKey(currentRole), roleCode] as const,
    userOverridesRoot: () => ['authorization', 'user-overrides'] as const,
    userOverrides: ({
      currentRole,
      userId,
    }: {
      currentRole: QueryRole;
      userId: number | null;
    }) => ['authorization', 'user-overrides', normalizeRoleKey(currentRole), userId ?? 'NONE'] as const,
    userScopeGroupOverridesRoot: () => ['authorization', 'user-scope-group-overrides'] as const,
    userScopeGroupOverrides: ({
      currentRole,
      userId,
    }: {
      currentRole: QueryRole;
      userId: number | null;
    }) => ['authorization', 'user-scope-group-overrides', normalizeRoleKey(currentRole), userId ?? 'NONE'] as const,
  },
  dashboards: {
    admin: (currentRole: QueryRole) => ['admin-dashboard', normalizeRoleKey(currentRole)] as const,
    mentor: (currentRole: QueryRole) => ['mentor-dashboard', normalizeRoleKey(currentRole)] as const,
    student: ({
      currentRole,
      taskLimit,
      knowledgeLimit,
    }: {
      currentRole: QueryRole;
      taskLimit: number;
      knowledgeLimit: number;
    }) => ['student-dashboard', normalizeRoleKey(currentRole), taskLimit, knowledgeLimit] as const,
    taskParticipants: (taskId: number | null) => ['task-participants', taskId] as const,
    teamManager: (currentRole: QueryRole) => ['team-manager-dashboard', normalizeRoleKey(currentRole)] as const,
  },
  grading: {
    pendingRoot: () => ['grading', 'pending'] as const,
    pending: (currentRole: QueryRole) => ['grading', 'pending', normalizeRoleKey(currentRole)] as const,
    taskAnalyticsRoot: () => ['task-analytics'] as const,
    taskAnalytics: ({
      currentRole,
      taskId,
    }: {
      currentRole: QueryRole;
      taskId: number;
    }) => ['task-analytics', normalizeRoleKey(currentRole), taskId] as const,
    studentExecutionsRoot: () => ['student-executions'] as const,
    studentExecutions: ({
      currentRole,
      taskId,
    }: {
      currentRole: QueryRole;
      taskId: number;
    }) => ['student-executions', normalizeRoleKey(currentRole), taskId] as const,
    questionsRoot: () => ['grading-questions'] as const,
    questions: ({
      currentRole,
      taskId,
      quizId,
    }: {
      currentRole: QueryRole;
      taskId: number;
      quizId: number | null;
    }) => ['grading-questions', normalizeRoleKey(currentRole), taskId, quizId] as const,
    answersRoot: () => ['grading-answers'] as const,
    answers: ({
      currentRole,
      taskId,
      quizId,
      questionId,
    }: {
      currentRole: QueryRole;
      taskId: number;
      quizId: number | null;
      questionId: number | null;
    }) => ['grading-answers', normalizeRoleKey(currentRole), taskId, quizId, questionId] as const,
  },
  knowledge: {
    listRoot: () => ['knowledge-list'] as const,
    infiniteList: ({
      currentRole,
      spaceTagId,
      tagId,
      search,
      pageSize,
    }: {
      currentRole: QueryRole;
      spaceTagId?: number;
      tagId?: number;
      search?: string;
      pageSize: number;
    }) => [
      'knowledge-list',
      'infinite',
      normalizeRoleKey(currentRole),
      spaceTagId,
      tagId,
      search,
      pageSize,
    ] as const,
    detailRoot: () => ['knowledge-detail'] as const,
    detail: ({
      currentRole,
      knowledgeId,
      taskKnowledgeId,
    }: {
      currentRole: QueryRole;
      knowledgeId?: number;
      taskKnowledgeId?: number;
    }) => [
      'knowledge-detail',
      normalizeRoleKey(currentRole),
      taskKnowledgeId ? 'task' : 'knowledge',
      taskKnowledgeId ?? knowledgeId ?? 0,
    ] as const,
  },
  questions: {
    all: () => ['questions'] as const,
    list: ({
      currentRole,
      page,
      pageSize,
      questionType,
      search,
      spaceTagId,
      tagId,
    }: {
      currentRole: QueryRole;
      page: number;
      pageSize: number;
      questionType?: string;
      search?: string;
      spaceTagId?: number;
      tagId?: number;
    }) => [
      'questions',
      normalizeRoleKey(currentRole),
      page,
      pageSize,
      questionType,
      search,
      spaceTagId,
      tagId,
    ] as const,
    detailRoot: () => ['question-detail'] as const,
    detail: ({
      currentRole,
      id,
    }: {
      currentRole: QueryRole;
      id: number;
    }) => ['question-detail', normalizeRoleKey(currentRole), id] as const,
  },
  quizzes: {
    all: () => ['quizzes'] as const,
    list: ({
      currentRole,
      page,
      pageSize,
      search,
      quizType,
    }: {
      currentRole: QueryRole;
      page: number;
      pageSize: number;
      search?: string;
      quizType?: string;
    }) => ['quizzes', normalizeRoleKey(currentRole), page, pageSize, search, quizType] as const,
    detailRoot: () => ['quiz-detail'] as const,
    detail: ({
      currentRole,
      id,
    }: {
      currentRole: QueryRole;
      id: number;
    }) => ['quiz-detail', normalizeRoleKey(currentRole), id] as const,
  },
  spotChecks: {
    all: () => ['spot-checks'] as const,
    list: ({
      currentRole,
      studentId,
      page,
      pageSize,
    }: {
      currentRole: QueryRole;
      studentId?: number;
      page: number;
      pageSize: number;
    }) => ['spot-checks', normalizeRoleKey(currentRole), studentId ?? 'ALL', page, pageSize] as const,
    studentsRoot: () => ['spot-check-students'] as const,
    students: ({
      currentRole,
      search,
    }: {
      currentRole: QueryRole;
      search?: string;
    }) => ['spot-check-students', normalizeRoleKey(currentRole), search ?? ''] as const,
    detailRoot: () => ['spot-check-detail'] as const,
    detail: ({
      currentRole,
      id,
    }: {
      currentRole: QueryRole;
      id: number;
    }) => ['spot-check-detail', normalizeRoleKey(currentRole), id] as const,
  },
  submissions: {
    detailRoot: () => ['submission'] as const,
    detail: (submissionId: number) => ['submission', submissionId] as const,
    examResult: ({
      currentRole,
      submissionId,
    }: {
      currentRole: QueryRole;
      submissionId?: number;
    }) => ['exam-result', normalizeRoleKey(currentRole), submissionId] as const,
    practiceResult: ({
      currentRole,
      submissionId,
    }: {
      currentRole: QueryRole;
      submissionId?: number;
    }) => ['practice-result', normalizeRoleKey(currentRole), submissionId] as const,
  },
  tags: {
    all: () => ['tags'] as const,
    list: ({
      currentRole,
      canQueryTags,
      tagType,
      search,
      limit,
      applicableTo,
    }: {
      currentRole: QueryRole;
      canQueryTags: boolean;
      tagType?: string;
      search?: string;
      limit: number;
      applicableTo?: string;
    }) => [
      'tags',
      normalizeRoleKey(currentRole),
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
      currentRole,
      page,
      pageSize,
      search,
      taskStatus,
      creatorSide,
    }: {
      currentRole: QueryRole;
      page: number;
      pageSize: number;
      search?: string;
      taskStatus?: string;
      creatorSide?: string;
    }) => [
      'tasks',
      normalizeRoleKey(currentRole),
      page,
      pageSize,
      search,
      taskStatus,
      creatorSide,
    ] as const,
    detailRoot: () => ['task-detail'] as const,
    detail: ({
      currentRole,
      id,
    }: {
      currentRole: QueryRole;
      id: number;
    }) => ['task-detail', normalizeRoleKey(currentRole), id] as const,
    studentRoot: () => ['student-tasks'] as const,
    studentList: ({
      currentRole,
      page,
      pageSize,
      status,
      search,
    }: {
      currentRole: QueryRole;
      page: number;
      pageSize: number;
      status?: string;
      search?: string;
    }) => ['student-tasks', normalizeRoleKey(currentRole), page, pageSize, status, search] as const,
    studentLearningDetailRoot: () => ['student-learning-task-detail'] as const,
    studentLearningDetail: ({
      currentRole,
      taskId,
    }: {
      currentRole: QueryRole;
      taskId: number;
    }) => ['student-learning-task-detail', normalizeRoleKey(currentRole), taskId] as const,
    resourceOptionsRoot: () => ['task-resource-options'] as const,
    resourceOptions: ({
      currentRole,
      resourceType,
      search,
      page,
      pageSize,
      excludeDocumentIds,
      excludeQuizIds,
    }: {
      currentRole: QueryRole;
      resourceType: string;
      search: string;
      page: number;
      pageSize: number;
      excludeDocumentIds: string;
      excludeQuizIds: string;
    }) => [
      'task-resource-options',
      normalizeRoleKey(currentRole),
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
      currentRole,
      departmentId,
      mentorId,
      isActive,
      search,
    }: {
      currentRole: QueryRole;
      departmentId?: number;
      mentorId?: number;
      isActive?: boolean;
      search?: string;
    }) => [
      'users',
      normalizeRoleKey(currentRole),
      departmentId,
      mentorId,
      isActive,
      search,
    ] as const,
    detailRoot: () => ['user-detail'] as const,
    detail: ({
      currentRole,
      id,
    }: {
      currentRole: QueryRole;
      id: number;
    }) => ['user-detail', normalizeRoleKey(currentRole), id] as const,
    mentorsRoot: () => ['mentors'] as const,
    mentors: (currentRole: QueryRole) => ['mentors', normalizeRoleKey(currentRole)] as const,
    rolesRoot: () => ['roles'] as const,
    roles: (currentRole: QueryRole) => ['roles', normalizeRoleKey(currentRole)] as const,
    departmentsRoot: () => ['departments'] as const,
    departments: (currentRole: QueryRole) => ['departments', normalizeRoleKey(currentRole)] as const,
    assignableRoot: () => ['assignable-users'] as const,
    assignable: (currentRole: QueryRole) => ['assignable-users', normalizeRoleKey(currentRole)] as const,
  },
} as const;
