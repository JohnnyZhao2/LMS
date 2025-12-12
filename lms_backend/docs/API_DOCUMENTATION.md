# LMS Backend API Documentation

## Base URL
```
https://api.lms.example.com/api/v1
```

## Authentication

All API requests require authentication using JWT tokens.

### Login
```http
POST /auth/login/
Content-Type: application/json

{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "user": {
      "id": 1,
      "username": "john_doe",
      "real_name": "John Doe",
      "email": "john@example.com",
      "roles": ["STUDENT", "MENTOR"]
    }
  }
}
```

### Refresh Token
```http
POST /auth/refresh/
Content-Type: application/json

{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

### Get Current User
```http
GET /auth/me/
Authorization: Bearer {access_token}
```

### Switch Role
```http
POST /auth/switch-role/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "role_code": "MENTOR"
}
```

---

## Users

### List Users
```http
GET /users/?page=1&page_size=20
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `page_size` (optional): Items per page (default: 20)
- `department` (optional): Filter by department ID
- `role` (optional): Filter by role code

**Response:**
```json
{
  "success": true,
  "data": {
    "count": 100,
    "next": "https://api.lms.example.com/api/v1/users/?page=2",
    "previous": null,
    "results": [
      {
        "id": 1,
        "username": "john_doe",
        "real_name": "John Doe",
        "employee_id": "EMP001",
        "email": "john@example.com",
        "phone": "13800138000",
        "department": {
          "id": 1,
          "name": "一室",
          "code": "DEPT_ONE"
        },
        "mentor": {
          "id": 5,
          "real_name": "Mentor Name"
        },
        "roles": ["STUDENT", "MENTOR"],
        "join_date": "2024-01-01",
        "is_active": true
      }
    ]
  }
}
```

### Create User
```http
POST /users/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "username": "new_user",
  "password": "SecurePass123!",
  "real_name": "New User",
  "employee_id": "EMP002",
  "email": "newuser@example.com",
  "phone": "13900139000",
  "department_id": 1,
  "mentor_id": 5,
  "join_date": "2024-12-01"
}
```

### Get User Detail
```http
GET /users/{id}/
Authorization: Bearer {access_token}
```

### Update User
```http
PUT /users/{id}/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "real_name": "Updated Name",
  "email": "updated@example.com",
  "department_id": 2
}
```

### Assign Role to User
```http
POST /users/{id}/assign-role/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "role_code": "MENTOR"
}
```

### Set Mentor
```http
POST /users/{id}/set-mentor/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "mentor_id": 5
}
```

---

## Knowledge

### List Knowledge Documents
```http
GET /knowledge/?page=1&page_size=20
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `page`, `page_size`: Pagination
- `search`: Keyword search in title and content
- `category`: Filter by category ID
- `is_published`: Filter by published status

**Response:**
```json
{
  "success": true,
  "data": {
    "count": 50,
    "results": [
      {
        "id": 1,
        "title": "数据库基础知识",
        "summary": "介绍数据库的基本概念和操作...",
        "categories": [
          {
            "id": 3,
            "name": "数据库",
            "level": 1
          },
          {
            "id": 15,
            "name": "重启",
            "level": 3
          }
        ],
        "view_count": 150,
        "is_published": true,
        "created_by": {
          "id": 1,
          "real_name": "Admin"
        },
        "updated_by": {
          "id": 1,
          "real_name": "Admin"
        },
        "created_at": "2024-11-01T10:00:00Z",
        "updated_at": "2024-12-01T15:30:00Z"
      }
    ]
  }
}
```

### Create Knowledge Document
```http
POST /knowledge/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "title": "新知识文档",
  "content": "# 标题\n\n这是内容...",
  "summary": "文档摘要",
  "category_ids": [3, 15],
  "file_url": "https://storage.example.com/files/doc.pdf",
  "is_published": true
}
```

### Get Knowledge Detail
```http
GET /knowledge/{id}/
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "数据库基础知识",
    "content": "# 数据库基础\n\n## 什么是数据库...",
    "summary": "介绍数据库的基本概念",
    "categories": [...],
    "file_url": "https://storage.example.com/files/db-basics.pdf",
    "view_count": 150,
    "is_published": true,
    "created_by": {...},
    "updated_by": {...},
    "created_at": "2024-11-01T10:00:00Z",
    "updated_at": "2024-12-01T15:30:00Z"
  }
}
```

### Update Knowledge Document
```http
PUT /knowledge/{id}/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "title": "更新后的标题",
  "content": "更新后的内容",
  "category_ids": [3, 15, 20]
}
```

### Delete Knowledge Document (Soft Delete)
```http
DELETE /knowledge/{id}/
Authorization: Bearer {access_token}
```

### List Knowledge Categories
```http
GET /knowledge/categories/?level=1
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `level`: Filter by category level (1, 2, or 3)
- `parent_id`: Filter by parent category ID

---

## Questions

### List Questions
```http
GET /questions/?page=1&page_size=20
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `type`: Filter by question type (SINGLE, MULTIPLE, JUDGE, ESSAY)
- `difficulty`: Filter by difficulty (1-5)
- `created_by`: Filter by creator ID

**Response:**
```json
{
  "success": true,
  "data": {
    "count": 200,
    "results": [
      {
        "id": 1,
        "type": "SINGLE",
        "content": "以下哪个是关系型数据库？",
        "options": [
          {"key": "A", "value": "MongoDB"},
          {"key": "B", "value": "PostgreSQL"},
          {"key": "C", "value": "Redis"},
          {"key": "D", "value": "Elasticsearch"}
        ],
        "correct_answer": {"answer": "B"},
        "analysis": "PostgreSQL是关系型数据库...",
        "difficulty": 2,
        "is_public": true,
        "created_by": {
          "id": 1,
          "real_name": "Admin"
        },
        "created_at": "2024-11-01T10:00:00Z"
      }
    ]
  }
}
```

### Create Question
```http
POST /questions/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "type": "MULTIPLE",
  "content": "以下哪些是NoSQL数据库？（多选）",
  "options": [
    {"key": "A", "value": "MongoDB"},
    {"key": "B", "value": "PostgreSQL"},
    {"key": "C", "value": "Redis"},
    {"key": "D", "value": "MySQL"}
  ],
  "correct_answer": {"answer": ["A", "C"]},
  "analysis": "MongoDB和Redis都是NoSQL数据库",
  "difficulty": 3,
  "is_public": false
}
```

### Import Questions from Excel
```http
POST /questions/import/
Authorization: Bearer {access_token}
Content-Type: multipart/form-data

file: <excel_file>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "task_id": "abc123",
    "status": "processing"
  }
}
```

### Check Import Status
```http
GET /questions/import/{task_id}/status/
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "completed",
    "total": 100,
    "success_count": 95,
    "error_count": 5,
    "errors": [
      {
        "row": 10,
        "error": "Invalid question type"
      }
    ]
  }
}
```

---

## Quizzes

### List Quizzes
```http
GET /quizzes/?page=1&page_size=20
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `is_public`: Filter by public status
- `created_by`: Filter by creator ID

**Response:**
```json
{
  "success": true,
  "data": {
    "count": 30,
    "results": [
      {
        "id": 1,
        "title": "数据库基础测验",
        "description": "测试数据库基础知识掌握情况",
        "total_score": 100.00,
        "pass_score": 60.00,
        "question_count": 20,
        "is_public": false,
        "created_by": {
          "id": 5,
          "real_name": "Mentor Name"
        },
        "created_at": "2024-11-15T10:00:00Z"
      }
    ]
  }
}
```

### Create Quiz
```http
POST /quizzes/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "title": "新测验",
  "description": "测验描述",
  "total_score": 100.00,
  "pass_score": 60.00,
  "is_public": false
}
```

### Get Quiz Detail with Questions
```http
GET /quizzes/{id}/
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "数据库基础测验",
    "description": "测试数据库基础知识",
    "total_score": 100.00,
    "pass_score": 60.00,
    "questions": [
      {
        "id": 1,
        "sort_order": 1,
        "score": 5.00,
        "question": {
          "id": 10,
          "type": "SINGLE",
          "content": "题目内容...",
          "options": [...]
        }
      }
    ],
    "is_public": false,
    "created_by": {...},
    "created_at": "2024-11-15T10:00:00Z"
  }
}
```

### Add Questions to Quiz
```http
POST /quizzes/{id}/add-questions/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "questions": [
    {
      "question_id": 10,
      "score": 5.00,
      "sort_order": 1
    },
    {
      "question_id": 11,
      "score": 10.00,
      "sort_order": 2
    }
  ]
}
```

### Reorder Questions in Quiz
```http
PUT /quizzes/{id}/reorder-questions/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "question_orders": [
    {"quiz_question_id": 1, "sort_order": 2},
    {"quiz_question_id": 2, "sort_order": 1}
  ]
}
```

---

## Tasks

### List Tasks
```http
GET /tasks/?page=1&page_size=20
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `type`: Filter by task type (LEARNING, PRACTICE, EXAM)
- `status`: Filter by task status (DRAFT, PUBLISHED, CLOSED)
- `created_by`: Filter by creator ID

### Get My Tasks (Student View)
```http
GET /tasks/my-tasks/?type=LEARNING&status=IN_PROGRESS
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `type`: Filter by task type
- `status`: Filter by assignment status (NOT_STARTED, IN_PROGRESS, COMPLETED, OVERDUE)

**Response:**
```json
{
  "success": true,
  "data": {
    "count": 15,
    "results": [
      {
        "id": 1,
        "title": "数据库学习任务",
        "description": "学习数据库基础知识",
        "type": "LEARNING",
        "deadline": "2024-12-31T23:59:59Z",
        "assignment_status": "IN_PROGRESS",
        "started_at": "2024-12-10T10:00:00Z",
        "completed_at": null,
        "knowledge_docs": [
          {
            "id": 1,
            "title": "数据库基础",
            "is_required": true
          }
        ],
        "quizzes": [],
        "created_by": {
          "id": 5,
          "real_name": "Mentor Name"
        },
        "created_at": "2024-12-01T10:00:00Z"
      }
    ]
  }
}
```

### Create Task
```http
POST /tasks/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "title": "新学习任务",
  "description": "任务描述",
  "type": "LEARNING",
  "deadline": "2024-12-31T23:59:59Z",
  "knowledge_doc_ids": [1, 2, 3],
  "assigned_user_ids": [10, 11, 12]
}
```

**For Practice Task:**
```json
{
  "title": "练习任务",
  "description": "任务描述",
  "type": "PRACTICE",
  "deadline": "2024-12-31T23:59:59Z",
  "quiz_ids": [1, 2],
  "knowledge_doc_ids": [1],
  "allow_retake": true,
  "assigned_user_ids": [10, 11]
}
```

**For Exam Task:**
```json
{
  "title": "考试任务",
  "description": "任务描述",
  "type": "EXAM",
  "start_time": "2024-12-20T09:00:00Z",
  "deadline": "2024-12-20T11:00:00Z",
  "quiz_ids": [1],
  "allow_retake": false,
  "anti_cheat_enabled": true,
  "assigned_user_ids": [10, 11, 12]
}
```

### Get Task Detail
```http
GET /tasks/{id}/
Authorization: Bearer {access_token}
```

### Start Task
```http
POST /tasks/{id}/start/
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "assignment_id": 123,
    "status": "IN_PROGRESS",
    "started_at": "2024-12-12T10:30:00Z"
  }
}
```

### Complete Learning Task
```http
POST /tasks/{id}/complete/
Authorization: Bearer {access_token}
```

---

## Submissions

### Create Submission (Start Quiz)
```http
POST /submissions/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "task_id": 1,
  "quiz_id": 1
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 100,
    "task_id": 1,
    "quiz_id": 1,
    "attempt_number": 1,
    "status": "SUBMITTED",
    "submitted_at": "2024-12-12T10:30:00Z"
  }
}
```

### Submit Answers
```http
POST /submissions/{id}/submit-answers/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "answers": [
    {
      "question_id": 10,
      "user_answer": {"answer": "B"}
    },
    {
      "question_id": 11,
      "user_answer": {"answer": ["A", "C"]}
    },
    {
      "question_id": 12,
      "user_answer": {"answer": "学生的简答题答案"}
    }
  ],
  "total_time": 1800
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "submission_id": 100,
    "status": "GRADING",
    "obtained_score": 45.00,
    "correct_count": 9,
    "message": "客观题已自动评分，主观题等待人工评分"
  }
}
```

### Get Submission Results
```http
GET /submissions/{id}/results/
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 100,
    "task": {...},
    "quiz": {...},
    "attempt_number": 1,
    "total_score": 100.00,
    "obtained_score": 85.00,
    "correct_count": 17,
    "total_time": 1800,
    "status": "GRADED",
    "answers": [
      {
        "id": 1,
        "question": {
          "id": 10,
          "type": "SINGLE",
          "content": "题目内容",
          "options": [...],
          "correct_answer": {"answer": "B"},
          "analysis": "解析内容"
        },
        "user_answer": {"answer": "B"},
        "is_correct": true,
        "score": 5.00
      }
    ],
    "submitted_at": "2024-12-12T10:30:00Z",
    "graded_at": "2024-12-12T15:00:00Z"
  }
}
```

### Retake Quiz
```http
POST /submissions/{id}/retake/
Authorization: Bearer {access_token}
```

---

## Grading

### Get Pending Grading Queue
```http
GET /grading/pending/?page=1&page_size=20
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "count": 25,
    "results": [
      {
        "answer_id": 500,
        "submission_id": 100,
        "student": {
          "id": 10,
          "real_name": "Student Name"
        },
        "task": {
          "id": 1,
          "title": "练习任务"
        },
        "question": {
          "id": 12,
          "type": "ESSAY",
          "content": "简答题题目",
          "correct_answer": {"answer": "参考答案"}
        },
        "user_answer": {"answer": "学生的答案"},
        "max_score": 10.00,
        "submitted_at": "2024-12-12T10:30:00Z"
      }
    ]
  }
}
```

### Grade Answer
```http
POST /grading/{answer_id}/grade/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "score": 8.50,
  "comment": "回答基本正确，但缺少部分要点"
}
```

### Full Score Shortcut
```http
POST /grading/{answer_id}/full-score/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "comment": "回答完全正确"
}
```

### Get Grading History
```http
GET /grading/history/?page=1&page_size=20
Authorization: Bearer {access_token}
```

---

## Spot Checks

### Create Spot Check
```http
POST /spot-checks/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "user_id": 10,
  "topic": "数据库应急处理",
  "score": 8,
  "comment": "回答流畅，处理方案合理"
}
```

### List Spot Checks
```http
GET /spot-checks/?page=1&page_size=20
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `user_id`: Filter by student ID
- `checked_by`: Filter by checker ID
- `date_from`: Filter by date range start
- `date_to`: Filter by date range end

**Response:**
```json
{
  "success": true,
  "data": {
    "count": 50,
    "results": [
      {
        "id": 1,
        "user": {
          "id": 10,
          "real_name": "Student Name"
        },
        "topic": "数据库应急处理",
        "score": 8,
        "comment": "回答流畅，处理方案合理",
        "checked_by": {
          "id": 5,
          "real_name": "Mentor Name"
        },
        "checked_at": "2024-12-12T14:00:00Z"
      }
    ]
  }
}
```

---

## Statistics

### Get Dashboard Statistics
```http
GET /statistics/dashboard/
Authorization: Bearer {access_token}
```

**Response (varies by role):**
```json
{
  "success": true,
  "data": {
    "total_tasks": 50,
    "completed_tasks": 35,
    "completion_rate": 70.0,
    "average_score": 82.5,
    "total_learning_time": 12000,
    "pending_grading_count": 5,
    "overdue_tasks": 3
  }
}
```

### Get Student Statistics
```http
GET /statistics/students/?user_id=10
Authorization: Bearer {access_token}
```

### Get Task Statistics
```http
GET /statistics/tasks/?task_id=1
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "task_id": 1,
    "title": "数据库学习任务",
    "total_assigned": 20,
    "completed_count": 15,
    "in_progress_count": 3,
    "not_started_count": 1,
    "overdue_count": 1,
    "completion_rate": 75.0,
    "average_score": 85.5
  }
}
```

### Get Knowledge Heat Map
```http
GET /statistics/knowledge-heat/
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "knowledge_id": 1,
      "title": "数据库基础",
      "view_count": 150,
      "unique_viewers": 45,
      "average_duration": 1200
    }
  ]
}
```

---

## Notifications

### List Notifications
```http
GET /notifications/?page=1&page_size=20
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `is_read`: Filter by read status (true/false)
- `type`: Filter by notification type

**Response:**
```json
{
  "success": true,
  "data": {
    "count": 30,
    "results": [
      {
        "id": 1,
        "type": "TASK_ASSIGNED",
        "title": "新任务分配",
        "content": "你被分配了新的学习任务：数据库基础",
        "related_task": {
          "id": 1,
          "title": "数据库基础"
        },
        "is_read": false,
        "created_at": "2024-12-12T10:00:00Z"
      }
    ]
  }
}
```

### Mark Notification as Read
```http
POST /notifications/{id}/mark-read/
Authorization: Bearer {access_token}
```

### Mark All as Read
```http
POST /notifications/mark-all-read/
Authorization: Bearer {access_token}
```

### Get Unread Count
```http
GET /notifications/unread-count/
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "unread_count": 5
  }
}
```

---

## Departments

### List Departments
```http
GET /departments/
Authorization: Bearer {access_token}
```

### Create Department
```http
POST /departments/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "name": "三室",
  "code": "DEPT_THREE",
  "manager_id": 8,
  "description": "第三部门"
}
```

### Get Department Employees
```http
GET /departments/{id}/employees/
Authorization: Bearer {access_token}
```

---

## Wrong Answers

### Get My Wrong Answers
```http
GET /wrong-answers/?page=1&page_size=20
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `task_type`: Filter by task type (PRACTICE, EXAM)
- `category_id`: Filter by knowledge category

**Response:**
```json
{
  "success": true,
  "data": {
    "count": 15,
    "results": [
      {
        "question_id": 10,
        "question": {
          "type": "SINGLE",
          "content": "题目内容",
          "options": [...],
          "correct_answer": {"answer": "B"},
          "analysis": "解析"
        },
        "wrong_count": 2,
        "last_wrong_answer": {"answer": "A"},
        "last_attempt_at": "2024-12-10T15:00:00Z"
      }
    ]
  }
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "username": ["This field is required"],
      "email": ["Enter a valid email address"]
    }
  }
}
```

### Common Error Codes

- `VALIDATION_ERROR` (400): Input validation failed
- `AUTHENTICATION_FAILED` (401): Invalid or missing authentication token
- `PERMISSION_DENIED` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `CONFLICT` (409): Resource conflict (e.g., duplicate username)
- `INTERNAL_ERROR` (500): Server error

---

## Rate Limiting

API requests are rate-limited to prevent abuse:

- **Authenticated requests**: 1000 requests per hour
- **Login endpoint**: 10 requests per minute

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 995
X-RateLimit-Reset: 1702389600
```

---

## Pagination

List endpoints support pagination with these parameters:

- `page`: Page number (default: 1)
- `page_size`: Items per page (default: 20, max: 100)

Paginated responses include:
```json
{
  "count": 100,
  "next": "https://api.lms.example.com/api/v1/resource/?page=2",
  "previous": null,
  "results": [...]
}
```

---

## Filtering and Ordering

Most list endpoints support:

- **Filtering**: Add query parameters matching field names
- **Ordering**: Use `ordering` parameter (prefix with `-` for descending)

Example:
```http
GET /tasks/?type=LEARNING&status=PUBLISHED&ordering=-created_at
```

---

**API Version:** v1.0  
**Last Updated:** 2024-12-12


---

## 应急操作手册管理 (Emergency Operation Manual)

### 操作类型 API

#### 1. 获取操作类型列表
```http
GET /api/knowledge/operation-types/
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "success": true,
  "message": "获取成功",
  "data": [
    {
      "id": 1,
      "name": "重启",
      "code": "RESTART",
      "description": "重启服务或系统",
      "sort_order": 1,
      "created_at": "2024-12-12T10:00:00Z"
    },
    {
      "id": 2,
      "name": "隔离",
      "code": "ISOLATE",
      "description": "隔离故障节点",
      "sort_order": 2,
      "created_at": "2024-12-12T10:00:00Z"
    }
  ]
}
```

---

### 分类 API（条线和系统）

#### 1. 获取分类列表
```http
GET /api/knowledge/categories/
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `level` (optional): 筛选层级 (1=条线, 2=系统)
- `parent` (optional): 筛选父分类ID（获取某条线下的系统）
- `search` (optional): 搜索关键词（name, code）
- `ordering` (optional): 排序字段 (level, sort_order, created_at)

**Response:**
```json
{
  "success": true,
  "message": "获取成功",
  "data": {
    "count": 7,
    "results": [
      {
        "id": 1,
        "name": "双云",
        "code": "CLOUD",
        "level": 1,
        "level_display": "条线",
        "parent": null,
        "parent_name": null,
        "description": "云平台相关",
        "sort_order": 1,
        "children_count": 2,
        "created_at": "2024-12-12T10:00:00Z",
        "updated_at": "2024-12-12T10:00:00Z"
      },
      {
        "id": 3,
        "name": "数据库",
        "code": "DATABASE",
        "level": 1,
        "level_display": "条线",
        "parent": null,
        "parent_name": null,
        "description": "数据库相关",
        "sort_order": 3,
        "children_count": 3,
        "created_at": "2024-12-12T10:00:00Z",
        "updated_at": "2024-12-12T10:00:00Z"
      }
    ]
  }
}
```

#### 2. 获取分类树
```http
GET /api/knowledge/categories/tree/
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "success": true,
  "message": "获取成功",
  "data": [
    {
      "id": 3,
      "name": "数据库",
      "code": "DATABASE",
      "level": 1,
      "level_display": "条线",
      "description": "数据库相关",
      "sort_order": 3,
      "children": [
        {
          "id": 13,
          "name": "MySQL数据库",
          "code": "DB_MYSQL",
          "level": 2,
          "level_display": "系统",
          "description": null,
          "sort_order": 1,
          "children": []
        },
        {
          "id": 14,
          "name": "Redis缓存",
          "code": "DB_REDIS",
          "level": 2,
          "level_display": "系统",
          "description": null,
          "sort_order": 2,
          "children": []
        }
      ]
    }
  ]
}
```

#### 3. 获取子分类（获取条线下的系统）
```http
GET /api/knowledge/categories/children/?parent_id=3
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "success": true,
  "message": "获取成功",
  "data": [
    {
      "id": 13,
      "name": "MySQL数据库",
      "code": "DB_MYSQL",
      "level": 2,
      "level_display": "系统",
      "parent": 3,
      "parent_name": "数据库",
      "description": null,
      "sort_order": 1,
      "children_count": 0,
      "created_at": "2024-12-12T10:00:00Z",
      "updated_at": "2024-12-12T10:00:00Z"
    }
  ]
}
```

---

### 应急操作手册 API

#### 1. 获取手册列表
```http
GET /api/knowledge/
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `status` (optional): 筛选状态 (DRAFT/PUBLISHED/ARCHIVED)
- `line` (optional): 筛选条线ID
- `system` (optional): 筛选系统ID
- `operation_type` (optional): 筛选操作类型ID
- `creator` (optional): 筛选创建人ID
- `search` (optional): 搜索关键词（title, summary）
- `ordering` (optional): 排序字段 (created_at, updated_at, view_count)
- `page` (optional): 页码
- `page_size` (optional): 每页数量

**Response:**
```json
{
  "success": true,
  "message": "获取成功",
  "data": {
    "count": 3,
    "next": null,
    "previous": null,
    "results": [
      {
        "id": 1,
        "title": "MySQL数据库主从切换应急操作",
        "summary": "MySQL主从架构发生故障时的应急切换操作手册",
        "cover_image": null,
        "line_name": "数据库",
        "system_name": "MySQL数据库",
        "operation_types_names": ["重启", "切换"],
        "status": "PUBLISHED",
        "status_display": "已发布",
        "view_count": 0,
        "creator_name": "系统管理员",
        "created_at": "2024-12-12T10:00:00Z",
        "updated_at": "2024-12-12T10:00:00Z"
      }
    ]
  }
}
```

#### 2. 获取手册详情
```http
GET /api/knowledge/1/
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "success": true,
  "message": "获取成功",
  "data": {
    "id": 1,
    "title": "MySQL数据库主从切换应急操作",
    "summary": "MySQL主从架构发生故障时的应急切换操作手册",
    "cover_image": null,
    "attachment_url": null,
    
    "content": {
      "scenario": "主库出现故障，无法提供服务，需要将从库切换为主库",
      "trigger": "1. 监控系统报警主库连接失败\n2. 确认主库确实无法访问\n3. 评估影响范围\n4. 决定执行主从切换",
      "solution": "1. 停止应用写入\n2. 确认从库数据同步完成\n3. 提升从库为主库\n4. 修改应用配置指向新主库\n5. 重启应用服务",
      "verification": "1. 检查新主库状态正常\n2. 验证应用可以正常读写\n3. 检查数据一致性\n4. 监控系统确认无报警",
      "recovery": "1. 修复原主库故障\n2. 将原主库配置为从库\n3. 启动数据同步\n4. 确认同步正常"
    },
    
    "content_scenario": "主库出现故障，无法提供服务，需要将从库切换为主库",
    "content_trigger": "1. 监控系统报警主库连接失败\n2. 确认主库确实无法访问\n3. 评估影响范围\n4. 决定执行主从切换",
    "content_solution": "1. 停止应用写入\n2. 确认从库数据同步完成\n3. 提升从库为主库\n4. 修改应用配置指向新主库\n5. 重启应用服务",
    "content_verification": "1. 检查新主库状态正常\n2. 验证应用可以正常读写\n3. 检查数据一致性\n4. 监控系统确认无报警",
    "content_recovery": "1. 修复原主库故障\n2. 将原主库配置为从库\n3. 启动数据同步\n4. 确认同步正常",
    
    "line": 3,
    "line_name": "数据库",
    "system": 13,
    "system_name": "MySQL数据库",
    
    "operation_types_detail": [
      {
        "id": 1,
        "name": "重启",
        "code": "RESTART",
        "description": "重启服务或系统",
        "sort_order": 1,
        "created_at": "2024-12-12T10:00:00Z"
      },
      {
        "id": 5,
        "name": "切换",
        "code": "SWITCH",
        "description": "切换到备用系统",
        "sort_order": 5,
        "created_at": "2024-12-12T10:00:00Z"
      }
    ],
    
    "deliverer": null,
    "deliverer_name": null,
    "creator": 1,
    "creator_name": "系统管理员",
    "creator_team": null,
    "creator_team_name": null,
    "modifier": null,
    "modifier_name": null,
    "executors_detail": [],
    
    "emergency_platform": "数据库管理平台",
    "status": "PUBLISHED",
    "status_display": "已发布",
    "view_count": 0,
    "is_deleted": false,
    "deleted_at": null,
    "created_at": "2024-12-12T10:00:00Z",
    "updated_at": "2024-12-12T10:00:00Z"
  }
}
```

#### 3. 按条线筛选
```http
GET /api/knowledge/by-line/?line_id=3
Authorization: Bearer {access_token}
```

#### 4. 按系统筛选
```http
GET /api/knowledge/by-system/?system_id=13
Authorization: Bearer {access_token}
```

#### 5. 创建手册（管理角色）
```http
POST /api/knowledge/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "title": "新应急操作手册",
  "summary": "手册摘要",
  "content_scenario": "故障场景描述",
  "content_trigger": "触发流程",
  "content_solution": "解决方案",
  "content_verification": "验证方案",
  "content_recovery": "恢复方案",
  "line": 3,
  "system": 13,
  "operation_types": [1, 5],
  "deliverer": 2,
  "creator_team": 1,
  "executors": [3, 4],
  "emergency_platform": "数据库管理平台",
  "status": "DRAFT"
}
```

#### 6. 更新手册（管理角色）
```http
PUT /api/knowledge/1/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "title": "更新后的标题",
  "content_solution": "更新后的解决方案",
  "operation_types": [1, 2, 5]
}
```

#### 7. 发布手册（管理角色）
```http
POST /api/knowledge/1/publish/
Authorization: Bearer {access_token}
```

#### 8. 归档手册（管理角色）
```http
POST /api/knowledge/1/archive/
Authorization: Bearer {access_token}
```

#### 9. 删除手册（软删除，管理角色）
```http
DELETE /api/knowledge/1/
Authorization: Bearer {access_token}
```

---

## 测试数据初始化

### 初始化应急操作手册数据
```bash
conda activate lms
python manage.py init_knowledge_data
```

这将创建：
- 6个操作类型（重启、隔离、停止、回滚、切换、修复）
- 7个条线（双云、网络、数据库、应用、应急、规章制度、其他）
- 10个系统（AWS云平台、阿里云平台、防火墙、MySQL数据库、Redis缓存等）
- 4篇应急操作手册（3篇已发布，1篇草稿）

---

## 权限说明

### 分类和操作类型
- **查看**: 所有认证用户
- **创建/更新/删除**: 仅管理员

### 应急操作手册
- **查看**: 所有认证用户（非管理员只能看已发布且未删除的）
- **创建/更新/删除/发布/归档**: 管理角色（导师、室经理、团队经理、管理员）
- **管理员特权**: 可以看到所有手册（包括草稿和已删除的）

---
