"""
Dashboard URLs.
Implements URL routing for:
- Student dashboard
- Task participants progress
- Mentor/Department dashboard
- Global admin dashboard
"""
from django.urls import path

from .views.admin import AdminDashboardView
from .views.exam_report import ExamReportExportView, ExamReportView
from .views.mentor import MentorDashboardView
from .views.student import StudentDashboardView, TaskParticipantsView

urlpatterns = [
    path('student/', StudentDashboardView.as_view(), name='student-dashboard'),
    path('student/task/<int:task_id>/participants/', TaskParticipantsView.as_view(), name='task-participants'),
    path('mentor/', MentorDashboardView.as_view(), name='mentor-dashboard'),
    path('admin/', AdminDashboardView.as_view(), name='admin-dashboard'),
    path('exam-report/', ExamReportView.as_view(), name='exam-report'),
    path('exam-report/export/', ExamReportExportView.as_view(), name='exam-report-export'),
]
