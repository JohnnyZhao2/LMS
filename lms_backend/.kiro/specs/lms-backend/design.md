# Design Document - LMS Backend API

## Overview

本文档描述了LMS学习管理系统后端API的技术设计方案。系统采用Django + Django REST Framework构建RESTful API，使用PostgreSQL作为主数据库，支持JWT身份认证和基于角色的访问控制（RBAC）。

### 核心设计原则

1. **资源与任务分离**: 知识文档和测验作为可复用资源，任务作为资源分配的载体
2. **前后端分离**: 后端提供纯API服务，不涉及前端渲染
3. **权限隔离**: 通过中间件和查询过滤器实现严格的数据隔离
4. **可扩展性**: 预留外部通知接口，支持未来功能扩展
5. **性能优化**: 使用数据库索引、查询优化和缓存机制

### 技术栈

- **Web框架**: Django 4.2+
- **API框架**: Django REST Framework 3.14+
- **数据库**: PostgreSQL 14+
- **认证**: JWT (djangorestframework-simplejwt)
- **对象存储**: MinIO / 阿里云OSS / AWS S3
- **异步任务**: Celery + Redis
- **API文档**: drf-spectacular (OpenAPI 3.0)

---

## Architecture

### 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS/JSON
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     API Gateway / Nginx                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Django REST Framework                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Auth Layer   │  │ Permission   │  │ Serializers  │      │
│  │ (JWT)        │  │ Middleware   │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ ViewSets     │  │ Business     │  │ Validators   │      │
│  │              │  │ Logic        │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ PostgreSQL  │  │   Redis     │  │   MinIO     │
│  (Primary)  │  │  (Cache +   │  │  (Object    │
│             │  │   Queue)    │  │   Storage)  │
└─────────────┘  └─────────────┘  └─────────────┘
```

### 分层架构

1. **API层 (Views/ViewSets)**
   - 处理HTTP请求和响应
   - 调用业务逻辑层
   - 返回标准化JSON响应

2. **业务逻辑层 (Services)**
   - 实现核心业务规则
   - 处理复杂的数据操作
   - 协调多个模型的交互

3. **数据访问层 (Models/ORM)**
   - Django ORM模型定义
   - 数据库查询和操作
   - 数据完整性约束

4. **认证授权层 (Authentication/Permission)**
   - JWT token验证
   - 角色权限检查
   - 数据访问过滤

---

## Components and Interfaces

### 核心模块划分

#### 1. 认证模块 (Authentication)

**职责**: 用户登录、token生成和验证

**主要组件**:
- `AuthViewSet`: 登录、登出、token刷新
- `JWTAuthentication`: JWT token验证中间件
- `UserSerializer`: 用户信息序列化

**接口**:
```python
POST /api/auth/login/
POST /api/auth/logout/
POST /api/auth/refresh/
GET  /api/auth/me/
POST /api/auth/switch-role/
```

#### 2. 用户管理模块 (Users)

**职责**: 用户CRUD、角色分配、组织架构管理

**主要组件**:
- `UserViewSet`: 用户管理API
- `RoleViewSet`: 角色管理API
- `DepartmentViewSet`: 部门管理API
- `RolePermission`: 角色权限检查类

**接口**:
```python
GET    /api/users/
POST   /api/users/
GET    /api/users/{id}/
PUT    /api/users/{id}/
DELETE /api/users/{id}/
POST   /api/users/{id}/assign-role/
GET    /api/users/{id}/roles/
POST   /api/users/{id}/set-mentor/
```

#### 3. 知识库模块 (Knowledge)

**职责**: 知识文档管理、分类管理、搜索

**主要组件**:
- `KnowledgeViewSet`: 知识文档CRUD
- `KnowledgeCategoryViewSet`: 分类管理
- `KnowledgeSearchFilter`: 搜索过滤器
- `KnowledgeService`: 知识库业务逻辑

**接口**:
```python
GET    /api/knowledge/
POST   /api/knowledge/
GET    /api/knowledge/{id}/
PUT    /api/knowledge/{id}/
DELETE /api/knowledge/{id}/
GET    /api/knowledge/search/?q=keyword
GET    /api/knowledge/categories/
POST   /api/knowledge/categories/
```

#### 4. 题库模块 (Questions)

**职责**: 题目管理、批量导入

**主要组件**:
- `QuestionViewSet`: 题目CRUD
- `QuestionImportView`: Excel批量导入
- `QuestionValidator`: 题目数据验证
- `QuestionImportTask`: Celery异步导入任务

**接口**:
```python
GET    /api/questions/
POST   /api/questions/
GET    /api/questions/{id}/
PUT    /api/questions/{id}/
DELETE /api/questions/{id}/
POST   /api/questions/import/
GET    /api/questions/import/{task_id}/status/
```

#### 5. 测验模块 (Quizzes)

**职责**: 测验管理、组卷

**主要组件**:
- `QuizViewSet`: 测验CRUD
- `QuizQuestionViewSet`: 测验题目关联管理
- `QuizService`: 组卷业务逻辑

**接口**:
```python
GET    /api/quizzes/
POST   /api/quizzes/
GET    /api/quizzes/{id}/
PUT    /api/quizzes/{id}/
DELETE /api/quizzes/{id}/
POST   /api/quizzes/{id}/add-questions/
PUT    /api/quizzes/{id}/reorder-questions/
GET    /api/quizzes/{id}/questions/
```

#### 6. 任务模块 (Tasks)

**职责**: 任务创建、分配、状态管理

**主要组件**:
- `TaskViewSet`: 任务CRUD
- `TaskAssignmentViewSet`: 任务分配管理
- `TaskService`: 任务业务逻辑
- `TaskPermission`: 任务权限检查

**接口**:
```python
GET    /api/tasks/
POST   /api/tasks/
GET    /api/tasks/{id}/
PUT    /api/tasks/{id}/
DELETE /api/tasks/{id}/
POST   /api/tasks/{id}/assign/
GET    /api/tasks/my-tasks/
POST   /api/tasks/{id}/start/
POST   /api/tasks/{id}/complete/
```

#### 7. 答题模块 (Submissions)

**职责**: 答题记录、自动评分

**主要组件**:
- `SubmissionViewSet`: 答题记录管理
- `AnswerViewSet`: 答案管理
- `AutoGradingService`: 客观题自动评分
- `SubmissionService`: 答题业务逻辑

**接口**:
```python
GET    /api/submissions/
POST   /api/submissions/
GET    /api/submissions/{id}/
POST   /api/submissions/{id}/submit-answers/
GET    /api/submissions/{id}/results/
POST   /api/submissions/{id}/retake/
```

#### 8. 评分模块 (Grading)

**职责**: 主观题人工评分

**主要组件**:
- `GradingViewSet`: 评分管理
- `GradingService`: 评分业务逻辑

**接口**:
```python
GET    /api/grading/pending/
POST   /api/grading/{answer_id}/grade/
POST   /api/grading/{answer_id}/full-score/
GET    /api/grading/history/
```

#### 9. 现场抽查模块 (SpotChecks)

**职责**: 现场抽查记录管理

**主要组件**:
- `SpotCheckViewSet`: 抽查记录CRUD
- `SpotCheckService`: 抽查业务逻辑

**接口**:
```python
GET    /api/spot-checks/
POST   /api/spot-checks/
GET    /api/spot-checks/{id}/
GET    /api/spot-checks/history/
```

#### 10. 统计模块 (Statistics)

**职责**: 数据统计和分析

**主要组件**:
- `StatisticsViewSet`: 统计数据API
- `StatisticsService`: 统计计算逻辑
- `DashboardView`: 仪表盘数据

**接口**:
```python
GET    /api/statistics/dashboard/
GET    /api/statistics/students/
GET    /api/statistics/tasks/
GET    /api/statistics/knowledge-heat/
GET    /api/statistics/department-comparison/
```

#### 11. 通知模块 (Notifications)

**职责**: 通知管理、外部通知集成

**主要组件**:
- `NotificationViewSet`: 通知CRUD
- `NotificationService`: 通知创建逻辑
- `ExternalNotificationTask`: 外部通知发送任务

**接口**:
```python
GET    /api/notifications/
GET    /api/notifications/{id}/
POST   /api/notifications/{id}/mark-read/
POST   /api/notifications/mark-all-read/
GET    /api/notifications/unread-count/
```

---

## Data Models

### 核心模型关系

基于已有的数据模型设计文档，后端将实现以下Django模型：

#### 用户与权限域

```python
# models/users.py

class User(AbstractUser):
    """用户模型，继承Django AbstractUser"""
    real_name = models.CharField(max_length=50)
    employee_id = models.CharField(max_length=20, unique=True)
    phone = models.CharField(max_length=11, unique=True, null=True)
    department = models.ForeignKey('Department', on_delete=models.SET_NULL, null=True)
    mentor = models.ForeignKey('self', on_delete=models.SET_NULL, null=True)
    join_date = models.DateField(null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class Role(models.Model):
    """角色模型"""
    name = models.CharField(max_length=20, unique=True)
    code = models.CharField(max_length=20, unique=True)
    description = models.TextField(null=True)
    created_at = models.DateTimeField(auto_now_add=True)

class UserRole(models.Model):
    """用户角色关联"""
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    role = models.ForeignKey(Role, on_delete=models.CASCADE)
    assigned_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    assigned_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('user', 'role')

class Department(models.Model):
    """部门模型"""
    name = models.CharField(max_length=50)
    code = models.CharField(max_length=20, unique=True)
    manager = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    description = models.TextField(null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

#### 知识库域

```python
# models/knowledge.py

class KnowledgeCategory(models.Model):
    """知识分类"""
    name = models.CharField(max_length=50)
    code = models.CharField(max_length=20, unique=True)
    level = models.IntegerField(choices=[(1, 'Level 1'), (2, 'Level 2'), (3, 'Level 3')])
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True)
    sort_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

class Knowledge(models.Model):
    """知识文档"""
    title = models.CharField(max_length=200)
    content = models.TextField()
    summary = models.CharField(max_length=500, null=True)
    file_url = models.CharField(max_length=500, null=True)
    categories = models.ManyToManyField(KnowledgeCategory, through='KnowledgeCategoryRelation')
    view_count = models.IntegerField(default=0)
    is_published = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

#### 题库与测验域

```python
# models/questions.py

class Question(models.Model):
    """题目模型"""
    TYPE_CHOICES = [
        ('SINGLE', 'Single Choice'),
        ('MULTIPLE', 'Multiple Choice'),
        ('JUDGE', 'True/False'),
        ('ESSAY', 'Short Answer'),
    ]
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    content = models.TextField()
    options = models.JSONField(null=True)
    correct_answer = models.JSONField()
    analysis = models.TextField(null=True)
    difficulty = models.IntegerField(default=3)
    is_public = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class Quiz(models.Model):
    """测验模型"""
    title = models.CharField(max_length=200)
    description = models.TextField(null=True)
    questions = models.ManyToManyField(Question, through='QuizQuestion')
    total_score = models.DecimalField(max_digits=5, decimal_places=2, default=100)
    pass_score = models.DecimalField(max_digits=5, decimal_places=2, default=60)
    is_public = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class QuizQuestion(models.Model):
    """测验题目关联"""
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE)
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    sort_order = models.IntegerField()
    score = models.DecimalField(max_digits=5, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('quiz', 'question')
        ordering = ['sort_order']
```

#### 任务域

```python
# models/tasks.py

class Task(models.Model):
    """任务模型"""
    TYPE_CHOICES = [
        ('LEARNING', 'Learning Task'),
        ('PRACTICE', 'Practice Task'),
        ('EXAM', 'Exam Task'),
    ]
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('PUBLISHED', 'Published'),
        ('CLOSED', 'Closed'),
    ]
    title = models.CharField(max_length=200)
    description = models.TextField(null=True)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    start_time = models.DateTimeField(null=True)
    deadline = models.DateTimeField()
    allow_retake = models.BooleanField(default=False)
    anti_cheat_enabled = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    knowledge_docs = models.ManyToManyField(Knowledge, through='TaskKnowledge')
    quizzes = models.ManyToManyField(Quiz, through='TaskQuiz')
    assigned_users = models.ManyToManyField(User, through='TaskAssignment')
    is_deleted = models.BooleanField(default=False)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class TaskAssignment(models.Model):
    """任务分配"""
    STATUS_CHOICES = [
        ('NOT_STARTED', 'Not Started'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('OVERDUE', 'Overdue'),
    ]
    task = models.ForeignKey(Task, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='NOT_STARTED')
    started_at = models.DateTimeField(null=True)
    completed_at = models.DateTimeField(null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('task', 'user')
```

#### 答题与评分域

```python
# models/submissions.py

class Submission(models.Model):
    """答题记录"""
    STATUS_CHOICES = [
        ('SUBMITTED', 'Submitted'),
        ('GRADING', 'Grading'),
        ('GRADED', 'Graded'),
    ]
    task = models.ForeignKey(Task, on_delete=models.CASCADE)
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    attempt_number = models.IntegerField(default=1)
    total_score = models.DecimalField(max_digits=5, decimal_places=2, null=True)
    obtained_score = models.DecimalField(max_digits=5, decimal_places=2, null=True)
    correct_count = models.IntegerField(default=0)
    total_time = models.IntegerField(null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='SUBMITTED')
    submitted_at = models.DateTimeField(auto_now_add=True)
    graded_at = models.DateTimeField(null=True)
    
    class Meta:
        unique_together = ('task', 'user', 'attempt_number')

class Answer(models.Model):
    """答案记录"""
    submission = models.ForeignKey(Submission, on_delete=models.CASCADE)
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    user_answer = models.JSONField()
    is_correct = models.BooleanField(null=True)
    score = models.DecimalField(max_digits=5, decimal_places=2, null=True)
    graded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    grader_comment = models.TextField(null=True)
    graded_at = models.DateTimeField(null=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

### 模型设计要点

1. **软删除**: Knowledge, Question, Quiz, Task使用`is_deleted`字段实现软删除
2. **审计字段**: 所有模型包含`created_at`和`updated_at`时间戳
3. **JSON字段**: 使用PostgreSQL的JSONB类型存储选项和答案
4. **索引策略**: 外键、状态字段、时间字段自动创建索引
5. **级联删除**: 合理设置`on_delete`行为，防止数据丢失

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Authentication & Authorization Properties

Property 1: Valid credentials generate tokens
*For any* user with valid credentials, submitting login request should return a JWT token and user information
**Validates: Requirements 1.1**

Property 2: Invalid credentials are rejected
*For any* invalid credential combination, the login request should be rejected with an error message
**Validates: Requirements 1.2**

Property 3: Valid tokens grant access
*For any* protected endpoint and valid JWT token, the request should be authenticated and processed
**Validates: Requirements 1.3**

Property 4: Missing tokens deny access
*For any* protected endpoint accessed without a valid JWT token, the system should return 401 Unauthorized
**Validates: Requirements 1.4**

Property 5: Role switching updates context
*For any* user with multiple roles, switching roles should return data specific to the newly active role
**Validates: Requirements 1.5**

### Role Management Properties

Property 6: New users get student role
*For any* newly created user, the system should automatically assign the STUDENT role
**Validates: Requirements 2.1**

Property 7: Role assignment creates association
*For any* user and role, assigning the role should create a user-role association record
**Validates: Requirements 2.2**

Property 8: Role removal deletes association
*For any* user-role association, removing the role should delete the association record
**Validates: Requirements 2.3**

Property 9: Role query returns all assignments
*For any* user, querying their roles should return exactly all roles assigned to that user
**Validates: Requirements 2.4**

### Knowledge Management Properties

Property 10: Document creation preserves data
*For any* knowledge document with title, content, and categories, creating it should store all fields correctly
**Validates: Requirements 3.1**

Property 11: Document updates track changes
*For any* knowledge document update, the system should update the document and record the modifier information
**Validates: Requirements 3.2**

Property 12: Deletion is soft
*For any* knowledge document, deleting it should set is_deleted to true without removing the record
**Validates: Requirements 3.3**

Property 13: Queries filter deleted and unpublished
*For any* knowledge query, results should only include documents where is_published=true AND is_deleted=false
**Validates: Requirements 3.4**

Property 14: Search matches keywords
*For any* keyword search, all returned documents should contain the keyword in title or content
**Validates: Requirements 3.5**

Property 15: Category filter matches associations
*For any* category filter, all returned documents should be associated with the specified category
**Validates: Requirements 3.6**

### Category Management Properties

Property 16: Category hierarchy validates
*For any* category creation, the system should validate parent-child relationships and reject invalid hierarchies
**Validates: Requirements 4.2**

Property 17: Level filter matches exactly
*For any* level filter, all returned categories should have the specified level value
**Validates: Requirements 4.3**

Property 18: Child query returns direct children
*For any* parent category, querying children should return all and only direct children
**Validates: Requirements 4.4**

Property 19: Referenced categories cannot be deleted
*For any* category with associated knowledge documents, deletion attempts should fail with an error
**Validates: Requirements 4.5**

### Question Management Properties

Property 20: Question creation validates format
*For any* question, creating it should validate the type and store options and answers in valid JSON format
**Validates: Requirements 5.2**

Property 21: Import results match actual records
*For any* batch import completion, the reported success count should match the number of actually created questions
**Validates: Requirements 5.4**

Property 22: Question filters match criteria
*For any* question query with type, difficulty, or creator filters, all results should match all specified criteria
**Validates: Requirements 5.5**

### Quiz Management Properties

Property 23: Quiz creation preserves fields
*For any* quiz with title, description, total_score, and pass_score, creating it should store all fields correctly
**Validates: Requirements 6.1**

Property 24: Question associations preserve attributes
*For any* questions added to a quiz, the associations should preserve sort_order and individual scores
**Validates: Requirements 6.2**

Property 25: Reordering updates sort order
*For any* quiz question reordering operation, the sort_order values should reflect the new sequence
**Validates: Requirements 6.3**

Property 26: Quiz queries maintain order
*For any* quiz query, the returned questions should be sorted by sort_order
**Validates: Requirements 6.4**

Property 27: Active quiz associations prevent deletion
*For any* quiz associated with active tasks, deletion attempts should fail with an error
**Validates: Requirements 6.5**


### Task Management Properties

Property 28: Learning tasks associate knowledge
*For any* learning task creation with selected knowledge documents, the system should create task-knowledge associations matching the selection
**Validates: Requirements 7.2**

Property 29: Practice tasks associate quizzes and optional knowledge
*For any* practice task creation, the system should create task-quiz associations and optional task-knowledge associations correctly
**Validates: Requirements 7.3**

Property 30: Exam tasks have exactly one quiz
*For any* exam task creation, the system should enforce exactly one quiz association and reject attempts with 0 or >1 quizzes
**Validates: Requirements 7.4**

Property 31: New assignments start as NOT_STARTED
*For any* task assignment creation, the initial status should be NOT_STARTED
**Validates: Requirements 7.5**

Property 32: Mentors see only their students
*For any* mentor creating a task, the student selection should be filtered to only the mentor's assigned students
**Validates: Requirements 7.6**

Property 33: Department managers see department employees
*For any* department manager creating a task, the student selection should include department employees excluding the creator
**Validates: Requirements 7.7**

Property 34: Admins see all users
*For any* administrator creating a task, the student selection should include all users without filtering
**Validates: Requirements 7.8**

### Task Assignment Properties

Property 35: Student queries return assigned tasks
*For any* student querying tasks, results should include only tasks assigned to that student with complete status and deadline information
**Validates: Requirements 8.1**

Property 36: Type filter matches task type
*For any* task query with type filter, all results should have the specified type
**Validates: Requirements 8.2**

Property 37: Status filter matches assignment status
*For any* task query with status filter, all results should have the specified status
**Validates: Requirements 8.3**

Property 38: Starting task updates status and time
*For any* task start action, the assignment status should change to IN_PROGRESS and started_at should be set
**Validates: Requirements 8.4**

Property 39: Completing learning task updates status and time
*For any* learning task completion, the assignment status should change to COMPLETED and completed_at should be set
**Validates: Requirements 8.5**

### Submission Properties

Property 40: Starting quiz creates submission
*For any* quiz start action, the system should create a submission record with status SUBMITTED
**Validates: Requirements 9.1**

Property 41: Answer count matches question count
*For any* quiz submission, the number of answer records should equal the number of questions in the quiz
**Validates: Requirements 9.2**

Property 42: Objective questions auto-grade
*For any* objective question (SINGLE, MULTIPLE, JUDGE) submission, is_correct and score should be set immediately
**Validates: Requirements 9.3**

Property 43: Subjective questions enter grading queue
*For any* submission containing essay questions, the submission status should be GRADING
**Validates: Requirements 9.4**

Property 44: Fully graded submissions calculate total
*For any* submission where all questions have scores, the total obtained_score should be calculated and status should be GRADED
**Validates: Requirements 9.5**

Property 45: Practice retakes increment attempt
*For any* practice task retake, the system should create a new submission with incremented attempt_number
**Validates: Requirements 9.6**

Property 46: Exam retakes are rejected
*For any* exam task retake attempt, the system should reject the request with an error
**Validates: Requirements 9.7**

### Grading Properties

Property 47: Grading queue filters correctly
*For any* grading queue query, results should include only submissions with status GRADING containing ungraded essay questions
**Validates: Requirements 10.1**

Property 48: Grading updates all fields
*For any* essay question grading, the answer record should be updated with score, grader, comment, and grading time
**Validates: Requirements 10.2**

Property 49: Full score assigns maximum
*For any* "full score" action, the answer score should be set to the question's maximum score
**Validates: Requirements 10.3**

Property 50: Completed grading updates submission
*For any* submission where all essay questions are graded, the total score should be recalculated and status should be GRADED
**Validates: Requirements 10.4**

Property 51: Graded submissions complete assignments
*For any* fully graded submission, the corresponding task assignment status should be updated to COMPLETED
**Validates: Requirements 10.5**

### Spot Check Properties

Property 52: Spot check creation stores all fields
*For any* spot check creation, the system should store student, topic, score, comment, and checker information
**Validates: Requirements 11.1**

Property 53: Spot check queries filter correctly
*For any* spot check query with student, checker, or date filters, all results should match the specified criteria
**Validates: Requirements 11.2**

Property 54: Spot checks update statistics
*For any* spot check creation, the user's learning statistics should be updated with the new spot check data
**Validates: Requirements 11.3**

Property 55: Average spot check score is accurate
*For any* user, the average spot check score should equal the actual average of all their spot check scores
**Validates: Requirements 11.4**


### Statistics Properties

Property 56: Student statistics are accurate
*For any* student statistics query, the returned metrics (total tasks, completed tasks, completion rate, average score, learning time) should match actual data
**Validates: Requirements 12.1**

Property 57: Mentor statistics filter to assigned students
*For any* mentor querying statistics, the aggregated data should include only the mentor's assigned students
**Validates: Requirements 12.2**

Property 58: Department statistics filter to employees
*For any* department manager querying statistics, the aggregated data should include only the department's employees
**Validates: Requirements 12.3**

Property 59: Team statistics aggregate all departments
*For any* team manager querying statistics, the aggregated data should include all employees across all departments
**Validates: Requirements 12.4**

Property 60: Admin statistics are unrestricted
*For any* administrator querying statistics, the aggregated data should include all platform-wide data without filtering
**Validates: Requirements 12.5**

### Notification Properties

Property 61: Task assignments create notifications
*For any* task assignment to a student, the system should create a notification record with type TASK_ASSIGNED
**Validates: Requirements 13.1**

Property 62: Grading completion creates notifications
*For any* fully graded submission, the system should create a notification record with type GRADED
**Validates: Requirements 13.3**

Property 63: Notification queries sort by time
*For any* user querying notifications, results should include both read and unread notifications sorted by creation time
**Validates: Requirements 13.4**

Property 64: Marking read updates flag
*For any* notification mark-as-read action, the is_read flag should be updated to true
**Validates: Requirements 13.5**

### Organization Properties

Property 65: Department creation stores all fields
*For any* department creation with name, code, and optional manager, all fields should be stored correctly
**Validates: Requirements 14.1**

Property 66: Manager assignment updates field
*For any* manager assignment to a department, the department's manager_id should be updated
**Validates: Requirements 14.2**

Property 67: Mentor assignment updates field
*For any* mentor assignment to a student, the student's mentor_id should be updated
**Validates: Requirements 14.3**

Property 68: Department queries return all employees
*For any* department employee query, results should include all users belonging to the department
**Validates: Requirements 14.4**

Property 69: Mentor queries return all students
*For any* mentor student query, results should include all users with the mentor assigned
**Validates: Requirements 14.5**

### Permission Properties

Property 70: All endpoints verify active role
*For any* endpoint access, the system should verify the user's current active role
**Validates: Requirements 15.1**

Property 71: Students blocked from management
*For any* user with STUDENT role accessing management endpoints, the system should return 403 Forbidden
**Validates: Requirements 15.2**

Property 72: Mentors see filtered student data
*For any* user with MENTOR role accessing student data, results should be filtered to only the mentor's assigned students
**Validates: Requirements 15.3**

Property 73: Department managers see filtered employee data
*For any* user with DEPT_MANAGER role accessing employee data, results should be filtered to only the department's employees
**Validates: Requirements 15.4**

Property 74: Admins have unrestricted access
*For any* user with ADMIN role accessing any endpoint, the system should allow full access without filtering
**Validates: Requirements 15.5**

### API Response Properties

Property 75: Success responses have standard format
*For any* successful API request, the response should have status 200 and JSON body with success flag, data, and optional message
**Validates: Requirements 16.1**

Property 76: Validation errors return 400
*For any* API request with validation errors, the response should have status 400 and error details
**Validates: Requirements 16.2**

Property 77: Auth errors return 401
*For any* API request with authentication errors, the response should have status 401 and error message
**Validates: Requirements 16.3**

Property 78: Permission errors return 403
*For any* API request with authorization errors, the response should have status 403 and error message
**Validates: Requirements 16.4**

Property 79: Not found errors return 404
*For any* API request for non-existent resources, the response should have status 404 and error message
**Validates: Requirements 16.5**

Property 80: Server errors return 500
*For any* API request causing server errors, the response should have status 500 and error message
**Validates: Requirements 16.6**

### Pagination Properties

Property 81: Custom pagination returns correct page
*For any* list endpoint with page and page_size parameters, the returned results should match the specified page and size
**Validates: Requirements 17.2**

Property 82: Ordering sorts results correctly
*For any* list endpoint with ordering parameter, results should be sorted by the specified field
**Validates: Requirements 17.3**

Property 83: Pagination metadata is accurate
*For any* paginated response, the metadata should include accurate total count, current page, page size, and total pages
**Validates: Requirements 17.4**

### Validation Properties

Property 84: Missing fields return errors
*For any* data submission with missing required fields, the system should return 400 with field-specific error messages
**Validates: Requirements 18.1**

Property 85: Invalid types return errors
*For any* data submission with invalid field types, the system should return 400 with type validation messages
**Validates: Requirements 18.2**

Property 86: Unique violations return errors
*For any* data submission violating unique constraints, the system should return 400 indicating the constraint violation
**Validates: Requirements 18.3**

Property 87: Foreign key violations return errors
*For any* data submission violating foreign key constraints, the system should return 400 indicating the referenced object does not exist
**Validates: Requirements 18.4**

Property 88: Invalid JSON returns errors
*For any* JSON data submission with invalid format, the system should return 400 with JSON parsing error details
**Validates: Requirements 18.5**

### Wrong Answer Properties

Property 89: Wrong answer queries filter correctly
*For any* student querying wrong answers, results should include only answers where is_correct is false
**Validates: Requirements 19.1**

Property 90: Wrong answer type filter works
*For any* wrong answer query with task type filter, results should include only wrong answers from tasks matching the specified type
**Validates: Requirements 19.2**

Property 91: Wrong answer category filter works
*For any* wrong answer query with category filter, results should include only wrong answers from quizzes associated with the specified category
**Validates: Requirements 19.3**

Property 92: Wrong answer details are complete
*For any* wrong answer detail view, the response should include question, student's answer, correct answer, and analysis
**Validates: Requirements 19.4**

Property 93: Wrong answers group by question
*For any* wrong answer grouping, the system should show how many times the student answered each question incorrectly
**Validates: Requirements 19.5**

### View Log Properties

Property 94: Knowledge views create logs
*For any* knowledge document view, the system should create a view log record with knowledge, user, optional task, and timestamp
**Validates: Requirements 20.1**

Property 95: Task context associates logs
*For any* knowledge document view from a task, the view log should be associated with the task
**Validates: Requirements 20.2**

Property 96: View statistics aggregate correctly
*For any* knowledge view statistics query, the returned view counts and unique viewer counts should match actual log data
**Validates: Requirements 20.3**

Property 97: User behavior history is accurate
*For any* user learning behavior query, the returned view history should include accurate duration and frequency data
**Validates: Requirements 20.4**

Property 98: View counts update on log creation
*For any* new view log creation, the knowledge document's view_count field should be incremented
**Validates: Requirements 20.5**

---

## Error Handling

### Error Response Structure

All API errors follow a consistent structure:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field_name": ["Error detail 1", "Error detail 2"]
    }
  }
}
```

### Error Categories

1. **Validation Errors (400)**
   - Missing required fields
   - Invalid data types
   - Constraint violations
   - Business rule violations

2. **Authentication Errors (401)**
   - Missing JWT token
   - Expired token
   - Invalid token signature

3. **Authorization Errors (403)**
   - Insufficient permissions
   - Role-based access denied
   - Data scope restrictions

4. **Not Found Errors (404)**
   - Resource does not exist
   - Soft-deleted resources

5. **Server Errors (500)**
   - Database connection failures
   - Unexpected exceptions
   - External service failures

### Error Handling Strategy

1. **Input Validation**: Use DRF serializers for automatic validation
2. **Business Logic Errors**: Raise custom exceptions with appropriate error codes
3. **Database Errors**: Catch and translate to user-friendly messages
4. **Logging**: Log all errors with context for debugging
5. **User Feedback**: Provide actionable error messages

---

## Testing Strategy

### Unit Testing

**Framework**: pytest + pytest-django

**Coverage Areas**:
- Model methods and properties
- Serializer validation logic
- Service layer business logic
- Utility functions
- Permission classes

**Example**:
```python
def test_user_role_assignment():
    """Test that assigning a role creates the association"""
    user = User.objects.create(username='test')
    role = Role.objects.get(code='MENTOR')
    user.roles.add(role)
    assert user.roles.filter(code='MENTOR').exists()
```

### Property-Based Testing

**Framework**: Hypothesis

**Configuration**: Minimum 100 iterations per property test

**Coverage Areas**:
- Authentication and authorization properties
- Data validation and constraints
- Query filtering and pagination
- Score calculation and aggregation
- State transitions

**Example**:
```python
from hypothesis import given, strategies as st

@given(st.text(min_size=1), st.text(min_size=1))
def test_valid_credentials_generate_token(username, password):
    """
    Feature: lms-backend, Property 1: Valid credentials generate tokens
    Validates: Requirements 1.1
    """
    user = User.objects.create_user(username=username, password=password)
    response = client.post('/api/auth/login/', {
        'username': username,
        'password': password
    })
    assert response.status_code == 200
    assert 'token' in response.json()
    assert 'user' in response.json()
```

### Integration Testing

**Framework**: pytest + Django TestCase

**Coverage Areas**:
- End-to-end API workflows
- Multi-model interactions
- Transaction handling
- External service integration

### API Testing

**Framework**: pytest + DRF APIClient

**Coverage Areas**:
- All API endpoints
- Request/response formats
- Status codes
- Error handling

### Performance Testing

**Tools**: locust / Apache JMeter

**Metrics**:
- Response time < 200ms for simple queries
- Response time < 1s for complex aggregations
- Support 100 concurrent users
- Database query optimization

---

## Security Considerations

### Authentication Security

1. **JWT Token Management**
   - Short-lived access tokens (15 minutes)
   - Long-lived refresh tokens (7 days)
   - Token rotation on refresh
   - Secure token storage (httpOnly cookies recommended for web)

2. **Password Security**
   - Django's PBKDF2 password hashing
   - Minimum password strength requirements
   - Password reset via email

### Authorization Security

1. **Role-Based Access Control**
   - Middleware-level permission checks
   - QuerySet filtering based on role
   - Object-level permissions for sensitive operations

2. **Data Isolation**
   - Mentors see only their students
   - Department managers see only their department
   - Students see only their own data

### Input Validation

1. **SQL Injection Prevention**
   - Use Django ORM (parameterized queries)
   - Avoid raw SQL where possible

2. **XSS Prevention**
   - Sanitize user input
   - Escape output in error messages

3. **CSRF Protection**
   - Django CSRF middleware enabled
   - CSRF tokens for state-changing operations

### API Security

1. **Rate Limiting**
   - Implement rate limiting per user/IP
   - Prevent brute force attacks

2. **CORS Configuration**
   - Whitelist allowed origins
   - Restrict methods and headers

3. **HTTPS Only**
   - Enforce HTTPS in production
   - Secure cookie flags

---

## Performance Optimization

### Database Optimization

1. **Indexing Strategy**
   - Index all foreign keys
   - Index frequently queried fields (status, type, created_at)
   - Composite indexes for common query patterns

2. **Query Optimization**
   - Use `select_related()` for foreign keys
   - Use `prefetch_related()` for many-to-many
   - Avoid N+1 queries

3. **Database Connection Pooling**
   - Configure connection pool size
   - Use persistent connections

### Caching Strategy

1. **Redis Caching**
   - Cache frequently accessed data (roles, categories)
   - Cache expensive aggregations (statistics)
   - Set appropriate TTL values

2. **Query Result Caching**
   - Cache paginated list results
   - Invalidate on data changes

### Async Processing

1. **Celery Tasks**
   - Batch question import
   - Notification sending
   - Statistics calculation
   - Deadline checking

2. **Task Queue Management**
   - Separate queues for different priorities
   - Monitor queue length and processing time

---

## Deployment Considerations

### Environment Configuration

1. **Development**
   - DEBUG = True
   - SQLite or local PostgreSQL
   - Local MinIO

2. **Staging**
   - DEBUG = False
   - PostgreSQL
   - Cloud object storage
   - Similar to production

3. **Production**
   - DEBUG = False
   - PostgreSQL with replication
   - Cloud object storage with CDN
   - Redis cluster
   - Celery workers

### Monitoring and Logging

1. **Application Logging**
   - Structured logging (JSON format)
   - Log levels: DEBUG, INFO, WARNING, ERROR, CRITICAL
   - Log rotation and retention

2. **Performance Monitoring**
   - API response times
   - Database query performance
   - Celery task execution time

3. **Error Tracking**
   - Sentry or similar service
   - Error aggregation and alerting

### Backup and Recovery

1. **Database Backups**
   - Daily full backups
   - Hourly incremental backups
   - 30-day retention

2. **Object Storage Backups**
   - Versioning enabled
   - Cross-region replication

---

## API Documentation

### OpenAPI Specification

- Use drf-spectacular for automatic OpenAPI 3.0 generation
- Include request/response examples
- Document all error codes
- Provide authentication instructions

### API Versioning

- URL-based versioning: `/api/v1/`
- Maintain backward compatibility
- Deprecation notices for old versions

---

**Document Version:** v1.0  
**Created:** 2025-12-12  
**Last Updated:** 2025-12-12
