# Requirements Document - LMS Backend API

## Introduction

本文档定义了LMS学习管理系统后端API的需求规范。系统采用Django + Django REST Framework构建RESTful API，支持前后端分离架构，实现"学、练、考、评"完整闭环。

## Glossary

- **LMS**: Learning Management System，学习管理系统
- **API**: Application Programming Interface，应用程序接口
- **JWT**: JSON Web Token，用于身份认证的令牌
- **RBAC**: Role-Based Access Control，基于角色的访问控制
- **User**: 系统用户，包括学员、导师、室经理、团队经理、管理员
- **Role**: 用户角色，定义用户权限范围
- **Knowledge**: 知识文档，系统中的学习资源
- **Quiz**: 测验/试卷，题目的容器
- **Question**: 题目，包括单选、多选、判断、简答
- **Task**: 任务，将学习资源（知识文档或测验）分配给学员的工作单元
- **Submission**: 答题记录，学员对测验的提交
- **Answer**: 答案记录，单个题目的答案和评分

## Requirements

### Requirement 1: 用户认证与授权

**User Story:** 作为系统用户，我希望能够安全地登录系统并根据我的角色访问相应的功能，以便保护数据安全和权限隔离

#### Acceptance Criteria

1. WHEN a user submits valid credentials, THE System SHALL generate a JWT token and return user information
2. WHEN a user submits invalid credentials, THE System SHALL reject the login request and return an error message
3. WHEN a user accesses a protected endpoint with a valid JWT token, THE System SHALL authenticate the user and process the request
4. WHEN a user accesses a protected endpoint without a valid JWT token, THE System SHALL return a 401 Unauthorized error
5. WHEN a user has multiple roles, THE System SHALL allow the user to switch between roles and return role-specific data

---

### Requirement 2: 角色权限管理

**User Story:** 作为管理员，我希望能够为用户分配和管理角色，以便控制用户的访问权限

#### Acceptance Criteria

1. WHEN an administrator creates a user, THE System SHALL automatically assign the STUDENT role to the user
2. WHEN an administrator assigns a role to a user, THE System SHALL create a user-role association record
3. WHEN an administrator removes a role from a user, THE System SHALL delete the user-role association record
4. WHEN a user queries their roles, THE System SHALL return all roles assigned to the user
5. THE System SHALL support five predefined roles: STUDENT, MENTOR, DEPT_MANAGER, TEAM_MANAGER, ADMIN

---

### Requirement 3: 知识库管理API

**User Story:** 作为管理员，我希望通过API管理知识文档，以便维护学习资源库

#### Acceptance Criteria

1. WHEN an administrator creates a knowledge document, THE System SHALL store the document with title, content, categories, and metadata
2. WHEN an administrator updates a knowledge document, THE System SHALL update the document and record the modifier information
3. WHEN an administrator deletes a knowledge document, THE System SHALL perform a soft delete by setting is_deleted flag to true
4. WHEN a user queries knowledge documents, THE System SHALL return only published and non-deleted documents
5. WHEN a user searches knowledge documents by keyword, THE System SHALL return matching documents based on title and content
6. WHEN a user filters knowledge documents by category, THE System SHALL return documents associated with the specified categories

---

### Requirement 4: 知识分类管理API

**User Story:** 作为管理员，我希望管理三级知识分类体系，以便组织知识文档

#### Acceptance Criteria

1. THE System SHALL support three-level category hierarchy: Level 1 (primary), Level 2 (secondary), Level 3 (operation tags)
2. WHEN an administrator creates a category, THE System SHALL validate the parent-child relationship and level constraints
3. WHEN an administrator queries categories by level, THE System SHALL return categories of the specified level
4. WHEN an administrator queries child categories of a parent, THE System SHALL return all direct children of the parent category
5. WHEN an administrator deletes a category with associated knowledge documents, THE System SHALL prevent deletion and return an error

---

### Requirement 5: 题库管理API

**User Story:** 作为管理员，我希望管理题库并支持批量导入，以便构建题目资源

#### Acceptance Criteria

1. THE System SHALL support four question types: SINGLE (single choice), MULTIPLE (multiple choice), JUDGE (true/false), ESSAY (short answer)
2. WHEN an administrator creates a question, THE System SHALL validate the question type and store options and correct answers in JSON format
3. WHEN an administrator uploads an Excel file for batch import, THE System SHALL parse the file and create questions asynchronously
4. WHEN a batch import completes, THE System SHALL return the number of successfully imported questions and any error records
5. WHEN an administrator queries questions, THE System SHALL support filtering by type, difficulty, and creator

---

### Requirement 6: 测验管理API

**User Story:** 作为导师或室经理，我希望创建测验资源并从题库选题，以便灵活组卷

#### Acceptance Criteria

1. WHEN a user creates a quiz, THE System SHALL store the quiz with title, description, total score, and pass score
2. WHEN a user adds questions to a quiz, THE System SHALL create quiz-question associations with sort order and individual scores
3. WHEN a user reorders questions in a quiz, THE System SHALL update the sort_order values accordingly
4. WHEN a user queries a quiz, THE System SHALL return the quiz with all associated questions in the correct order
5. WHEN a user deletes a quiz, THE System SHALL perform a soft delete and prevent deletion if the quiz is associated with active tasks

---

### Requirement 7: 任务管理API

**User Story:** 作为导师或室经理，我希望创建和管理学习、练习、考试任务，以便分配学习内容给学员

#### Acceptance Criteria

1. THE System SHALL support three task types: LEARNING (learning task), PRACTICE (practice task), EXAM (exam task)
2. WHEN a user creates a learning task, THE System SHALL associate the task with selected knowledge documents
3. WHEN a user creates a practice task, THE System SHALL associate the task with selected quizzes and optionally with knowledge documents
4. WHEN a user creates an exam task, THE System SHALL associate the task with exactly one quiz
5. WHEN a user assigns a task to students, THE System SHALL create task assignment records with status NOT_STARTED
6. WHEN a mentor creates a task, THE System SHALL restrict student selection to the mentor's assigned students
7. WHEN a department manager creates a task, THE System SHALL restrict student selection to the department's employees excluding the creator
8. WHEN an administrator creates a task, THE System SHALL allow student selection from all users in the system

---

### Requirement 8: 任务分配与状态管理API

**User Story:** 作为学员，我希望查看我的任务列表和任务详情，以便了解学习进度

#### Acceptance Criteria

1. WHEN a student queries their tasks, THE System SHALL return tasks assigned to the student with status and deadline information
2. WHEN a student filters tasks by type, THE System SHALL return tasks matching the specified type (LEARNING, PRACTICE, EXAM)
3. WHEN a student filters tasks by status, THE System SHALL return tasks matching the specified status (NOT_STARTED, IN_PROGRESS, COMPLETED, OVERDUE)
4. WHEN a student starts a task, THE System SHALL update the task assignment status to IN_PROGRESS and record the start time
5. WHEN a student completes a learning task, THE System SHALL update the task assignment status to COMPLETED and record the completion time
6. WHEN the current time exceeds a task deadline and the task is not completed, THE System SHALL automatically update the status to OVERDUE

---

### Requirement 9: 答题与提交API

**User Story:** 作为学员，我希望提交练习和考试的答案，以便完成任务并获得评分

#### Acceptance Criteria

1. WHEN a student starts a quiz, THE System SHALL create a submission record with status SUBMITTED
2. WHEN a student submits answers for a quiz, THE System SHALL create answer records for each question
3. WHEN a student submits objective questions (SINGLE, MULTIPLE, JUDGE), THE System SHALL automatically evaluate correctness and calculate scores
4. WHEN a student submits subjective questions (ESSAY), THE System SHALL set the submission status to GRADING and wait for manual grading
5. WHEN all questions in a submission are graded, THE System SHALL calculate the total obtained score and update the submission status to GRADED
6. WHEN a student attempts to retake a practice task, THE System SHALL increment the attempt number and create a new submission record
7. WHEN a student attempts to retake an exam task, THE System SHALL reject the request and return an error

---

### Requirement 10: 评分管理API

**User Story:** 作为导师或室经理，我希望对主观题进行人工评分，以便给出准确的成绩和反馈

#### Acceptance Criteria

1. WHEN a grader queries pending grading tasks, THE System SHALL return submissions with status GRADING containing unanswered essay questions
2. WHEN a grader submits a score and comment for an essay question, THE System SHALL update the answer record with score, grader, comment, and grading time
3. WHEN a grader uses the "full score" feature, THE System SHALL automatically assign the maximum score to the answer
4. WHEN all essay questions in a submission are graded, THE System SHALL recalculate the total score and update the submission status to GRADED
5. WHEN a submission is fully graded, THE System SHALL update the corresponding task assignment status to COMPLETED

---

### Requirement 11: 现场抽查API

**User Story:** 作为导师或室经理，我希望录入现场抽查记录，以便记录线下考核情况

#### Acceptance Criteria

1. WHEN a grader creates a spot check record, THE System SHALL store the student, topic, score (1-10), comment, and checker information
2. WHEN a grader queries spot check history, THE System SHALL return spot check records filtered by student, checker, or date range
3. WHEN a spot check record is created, THE System SHALL update the user's learning statistics with the new spot check data
4. THE System SHALL calculate the average spot check score for each user based on all spot check records

---

### Requirement 12: 数据统计API

**User Story:** 作为导师、室经理或团队经理，我希望查看学员的学习数据统计，以便了解学习效果

#### Acceptance Criteria

1. WHEN a user queries student statistics, THE System SHALL return total tasks, completed tasks, completion rate, average score, and learning time
2. WHEN a mentor queries statistics, THE System SHALL return aggregated data for the mentor's assigned students
3. WHEN a department manager queries statistics, THE System SHALL return aggregated data for the department's employees
4. WHEN a team manager queries statistics, THE System SHALL return aggregated data for all employees across departments
5. WHEN an administrator queries statistics, THE System SHALL return platform-wide aggregated data

---

### Requirement 13: 通知管理API

**User Story:** 作为系统，我希望创建和管理通知记录，以便支持任务提醒和外部通知集成

#### Acceptance Criteria

1. WHEN a task is assigned to a student, THE System SHALL create a notification record with type TASK_ASSIGNED
2. WHEN a task deadline is approaching, THE System SHALL create a notification record with type DEADLINE_REMINDER
3. WHEN a submission is fully graded, THE System SHALL create a notification record with type GRADED
4. WHEN a user queries their notifications, THE System SHALL return unread and read notifications sorted by creation time
5. WHEN a user marks a notification as read, THE System SHALL update the is_read flag to true
6. THE System SHALL provide an interface for external notification services to query pending notifications and update external send status

---

### Requirement 14: 组织架构管理API

**User Story:** 作为管理员，我希望管理组织架构和师徒关系，以便建立管理层级

#### Acceptance Criteria

1. WHEN an administrator creates a department, THE System SHALL store the department with name, code, and optional manager
2. WHEN an administrator assigns a manager to a department, THE System SHALL update the department's manager_id field
3. WHEN an administrator assigns a mentor to a student, THE System SHALL update the student's mentor_id field
4. WHEN an administrator queries a department's employees, THE System SHALL return all users belonging to the department
5. WHEN an administrator queries a mentor's students, THE System SHALL return all users with the mentor assigned as their mentor

---

### Requirement 15: 权限控制中间件

**User Story:** 作为系统，我希望在API层面强制执行权限控制，以便确保数据隔离和操作安全

#### Acceptance Criteria

1. WHEN a user accesses an endpoint, THE System SHALL verify the user's current active role
2. WHEN a user with STUDENT role accesses management endpoints, THE System SHALL return a 403 Forbidden error
3. WHEN a user with MENTOR role accesses student data, THE System SHALL filter results to only include the mentor's assigned students
4. WHEN a user with DEPT_MANAGER role accesses employee data, THE System SHALL filter results to only include the department's employees
5. WHEN a user with ADMIN role accesses any endpoint, THE System SHALL allow full access without filtering

---

### Requirement 16: API响应格式标准化

**User Story:** 作为前端开发者，我希望所有API响应遵循统一格式，以便简化前端处理逻辑

#### Acceptance Criteria

1. WHEN an API request succeeds, THE System SHALL return a response with status code 200 and a JSON body containing success flag, data, and optional message
2. WHEN an API request fails due to validation errors, THE System SHALL return a response with status code 400 and error details
3. WHEN an API request fails due to authentication errors, THE System SHALL return a response with status code 401 and error message
4. WHEN an API request fails due to authorization errors, THE System SHALL return a response with status code 403 and error message
5. WHEN an API request fails due to resource not found, THE System SHALL return a response with status code 404 and error message
6. WHEN an API request fails due to server errors, THE System SHALL return a response with status code 500 and error message

---

### Requirement 17: 分页与排序

**User Story:** 作为API用户，我希望列表接口支持分页和排序，以便高效获取大量数据

#### Acceptance Criteria

1. WHEN a user queries a list endpoint without pagination parameters, THE System SHALL return the first page with a default page size of 20
2. WHEN a user queries a list endpoint with page and page_size parameters, THE System SHALL return the specified page of results
3. WHEN a user queries a list endpoint with an ordering parameter, THE System SHALL return results sorted by the specified field
4. THE System SHALL return pagination metadata including total count, current page, page size, and total pages
5. WHEN a user requests a page number exceeding the total pages, THE System SHALL return an empty results array

---

### Requirement 18: 数据验证

**User Story:** 作为系统，我希望对所有输入数据进行验证，以便确保数据完整性和一致性

#### Acceptance Criteria

1. WHEN a user submits data with missing required fields, THE System SHALL return a 400 error with field-specific error messages
2. WHEN a user submits data with invalid field types, THE System SHALL return a 400 error with type validation messages
3. WHEN a user submits data violating unique constraints, THE System SHALL return a 400 error indicating the constraint violation
4. WHEN a user submits data violating foreign key constraints, THE System SHALL return a 400 error indicating the referenced object does not exist
5. WHEN a user submits JSON data with invalid format, THE System SHALL return a 400 error with JSON parsing error details

---

### Requirement 19: 错题本API

**User Story:** 作为学员，我希望查看我的错题记录，以便针对性复习薄弱知识点

#### Acceptance Criteria

1. WHEN a student queries their wrong answers, THE System SHALL return all answers where is_correct is false
2. WHEN a student filters wrong answers by task type, THE System SHALL return wrong answers from tasks matching the specified type
3. WHEN a student filters wrong answers by knowledge category, THE System SHALL return wrong answers from quizzes associated with the specified category
4. WHEN a student views a wrong answer detail, THE System SHALL return the question, student's answer, correct answer, and analysis
5. THE System SHALL group wrong answers by question to show how many times the student answered incorrectly

---

### Requirement 20: 知识浏览日志API

**User Story:** 作为系统，我希望记录用户的知识浏览行为，以便分析知识热度和学习行为

#### Acceptance Criteria

1. WHEN a student views a knowledge document, THE System SHALL create a view log record with knowledge, user, optional task, and timestamp
2. WHEN a student views a knowledge document from a task, THE System SHALL associate the view log with the task
3. WHEN an administrator queries knowledge view statistics, THE System SHALL return view counts and unique viewer counts for each knowledge document
4. WHEN an administrator queries user learning behavior, THE System SHALL return the user's view history with duration and frequency
5. THE System SHALL update the knowledge document's view_count field when a new view log is created
