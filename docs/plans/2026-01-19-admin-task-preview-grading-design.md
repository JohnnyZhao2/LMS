# Admin Task Preview & Grading System Design

**Date:** 2026-01-19
**Status:** Approved
**Author:** Design collaboration with user

## Overview

Design for a comprehensive admin task preview and grading system that provides progress monitoring and essay question grading capabilities for learning tasks.

## Entry Point

- Add a "预览" button in the task management list
- New route: `/tasks/:id/preview`
- Query params: `?tab=progress|grading` for direct tab access

## Architecture

### Component Structure
- `TaskPreviewPage` - Main container with tab switching
- `ProgressMonitoringTab` - Progress monitoring view
- `GradingCenterTab` - Three-column grading interface

### Data Flow
1. Backend provides aggregated analytics and grading APIs
2. Frontend uses React Query for data fetching and caching
3. Optimistic updates for grading submissions

## Progress Monitoring Tab

### Layout Structure

**Header:**
```
[← Back Button] [Task Name] [进度监控 | 阅卷中心 Tab Switcher]
```

**Row 1 - KPI Cards (4 metrics):**
1. **Completion Card**: 完成人数/总人数 with percentage
2. **Average Time Card**: Average time spent across all students
3. **Accuracy Card**:
   - If task has quizzes/exams: Show accuracy percentage
   - If no quizzes: Show "无考试" placeholder
4. **Abnormal Count Card**: Count of students with abnormal behavior
   - Article reading < 5min
   - Quiz completion < 5min
   - Exam completion < 30min
   - **Rule**: Any one condition triggers abnormal flag

**Row 2 - Analytics Section (2 columns):**
- **Left Column - Task Node Progress**:
  - Vertical list of progress bars
  - Each bar: Node name, completion rate %, completed/total count
  - Ordered by task sequence

- **Right Column - Distribution Chart**:
  - Single task type: Bar chart of time/score distribution
  - Mixed task type: Tab switcher [时间分布 | 分数分布] + bar chart
  - X-axis: Time ranges or score ranges
  - Y-axis: Student count

**Row 3 - Student Execution Table:**

Columns:
- 学员信息 (Name, Employee ID, Department)
- 状态 (COMPLETED, IN_PROGRESS, OVERDUE, COMPLETED_ABNORMAL)
- 任务节点进度 (e.g., "3/5")
- 分数 (nullable)
- 用时 (in minutes)
- 答题情况 (link or summary)

## Grading Center Tab

### Layout Structure

**Header:**
```
[← Back Button] [试卷信息: {Quiz Title}] [简答题筛选: Dropdown]
```

**Three-Column Layout:**

**Left Column - Student List (25% width):**
- Scrollable list of assigned students
- Each item shows:
  - Avatar/Initial
  - Name
  - Employee ID
  - Grading status badge (已评分 / 待评分)
- Click to select student
- Visual indicator for selected student

**Middle Column - Question & Answer (50% width):**
- **Top Section - Question Display:**
  - Question number and stem
  - Question analysis/reference answer
  - Point value

- **Bottom Section - Student Answer:**
  - Student's submitted answer text
  - Submission timestamp
  - Read-only display

**Right Column - Grading Panel (25% width):**
- **Student Info Card:**
  - Name, Employee ID, Department
  - Submission time

- **Scoring Section:**
  - Score input field (0 to max points)
  - Quick score buttons (0%, 50%, 75%, 100%)

- **Comments Section:**
  - Textarea for grading comments
  - Character count indicator

- **Action Buttons:**
  - "提交评分" primary button
  - "下一位学员" secondary button (auto-advances)

## API Contracts

### 1. Task Analytics API

```
GET /api/tasks/{id}/analytics/

Response: {
  completion: {
    completed_count: number;
    total_count: number;
    percentage: number;
  };
  average_time: number; // in minutes
  accuracy: {
    has_quiz: boolean;
    percentage: number | null;
  };
  abnormal_count: number;
  node_progress: Array<{
    node_id: number;
    node_name: string;
    node_type: 'KNOWLEDGE' | 'QUIZ';
    completed_count: number;
    total_count: number;
    percentage: number;
  }>;
  time_distribution: Array<{
    range: string; // "0-10", "10-20", etc.
    count: number;
  }>;
  score_distribution: Array<{
    range: string; // "0-60", "60-80", etc.
    count: number;
  }> | null;
}
```

### 2. Student Executions API

```
GET /api/tasks/{id}/student-executions/

Response: {
  results: Array<{
    student_id: number;
    student_name: string;
    employee_id: string;
    department: string;
    status: 'COMPLETED' | 'IN_PROGRESS' | 'OVERDUE' | 'COMPLETED_ABNORMAL';
    node_progress: string; // "3/5"
    score: number | null;
    time_spent: number; // in minutes
    answer_details: string; // Link or summary
    is_abnormal: boolean;
  }>;
}
```

### 3. Grading APIs

```
GET /api/tasks/{id}/grading/questions/

Response: Array<{
  question_id: number;
  question_text: string;
  question_analysis: string;
  max_score: number;
  ungraded_count: number;
}>
```

```
GET /api/tasks/{id}/grading/answers/?question_id={qid}

Response: Array<{
  student_id: number;
  student_name: string;
  employee_id: string;
  department: string;
  answer_text: string;
  submitted_at: string;
  score: number | null;
  comments: string | null;
  is_graded: boolean;
}>
```

```
POST /api/tasks/{id}/grading/submit/

Body: {
  question_id: number;
  student_id: number;
  score: number;
  comments: string;
}
```

## Implementation Approach

### Frontend Component Hierarchy

```
TaskPreviewPage
├── Header (back button, title, tab switcher)
├── ProgressMonitoringTab
│   ├── KPICards (4 stat cards)
│   ├── AnalyticsSection
│   │   ├── NodeProgressList (left)
│   │   └── DistributionChart (right, using recharts)
│   └── StudentExecutionTable (using DataTable component)
└── GradingCenterTab
    ├── GradingHeader (quiz info, question filter)
    └── GradingLayout
        ├── StudentList (left sidebar)
        ├── QuestionAnswerView (middle)
        └── GradingPanel (right sidebar)
```

### Key Technical Decisions

1. **Charts**: Use `recharts` library for bar charts
2. **Table**: Reuse existing `DataTable` component
3. **State Management**: React Query for server state, useState for UI state
4. **Styling**: Follow existing design system (Tailwind + shadcn/ui)
5. **Abnormal Detection**: Backend calculates, frontend displays

### Backend Implementation (Django)

1. Create new serializers for analytics data aggregation
2. Add methods to calculate KPIs from assignment records
3. Create grading viewset for essay question management
4. Add permissions check (admin/mentor only)

## Scope

- **In Scope**: Current task preview, progress monitoring, essay question grading
- **Out of Scope**: Cross-task analytics, automated grading, bulk operations

## Next Steps

1. Backend: Implement analytics and grading APIs
2. Frontend: Create component structure and integrate APIs
3. Testing: Verify calculations and grading workflow
4. Review: User acceptance testing
