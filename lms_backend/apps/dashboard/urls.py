"""
Dashboard URLs.
Implements URL routing for:
- Student dashboard
- Task participants progress
- Mentor/Department manager dashboard
- Team manager dashboard
"""
from django.urls import path

from .views.admin import AdminDashboardView
from .views.exam_report import ExamReportExportView, ExamReportView
from .views.mentor import MentorDashboardView
from .views.student import StudentDashboardView, TaskParticipantsView
from .views.team_manager import TeamManagerDashboardView

urlpatterns = [
    # Student dashboard
    path('student/', StudentDashboardView.as_view(), name='student-dashboard'),
    # Task participants progress
    path('student/task/<int:task_id>/participants/', TaskParticipantsView.as_view(), name='task-participants'),
    # Mentor/Department manager dashboard
    path('mentor/', MentorDashboardView.as_view(), name='mentor-dashboard'),
    # Admin dashboard
    path('admin/', AdminDashboardView.as_view(), name='admin-dashboard'),
    # Team manager dashboard
    path('team-manager/', TeamManagerDashboardView.as_view(), name='team-manager-dashboard'),
    # Exam report
    path('exam-report/', ExamReportView.as_view(), name='exam-report'),
    path('exam-report/export/', ExamReportExportView.as_view(), name='exam-report-export'),
]
