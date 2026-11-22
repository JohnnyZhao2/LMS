from rest_framework import serializers


class CompletionSerializer(serializers.Serializer):
    completed_count = serializers.IntegerField()
    in_progress_count = serializers.IntegerField()
    overdue_count = serializers.IntegerField()
    total_count = serializers.IntegerField()
    percentage = serializers.FloatField()


class DistributionItemSerializer(serializers.Serializer):
    range = serializers.CharField()
    count = serializers.IntegerField()


class NodeProgressSerializer(serializers.Serializer):
    node_id = serializers.IntegerField()
    node_name = serializers.CharField()
    category = serializers.ChoiceField(choices=['KNOWLEDGE', 'PRACTICE', 'EXAM'])
    completed_count = serializers.IntegerField()
    pending_count = serializers.IntegerField()
    overdue_count = serializers.IntegerField()
    total_count = serializers.IntegerField()
    percentage = serializers.FloatField()
    average_time = serializers.FloatField(allow_null=True)
    average_score = serializers.FloatField(allow_null=True)
    duration = serializers.IntegerField(allow_null=True)
    total_score = serializers.FloatField(allow_null=True)
    pass_score = serializers.FloatField(allow_null=True)
    pass_rate = serializers.FloatField(allow_null=True)
    passed_count = serializers.IntegerField(allow_null=True)
    failed_count = serializers.IntegerField(allow_null=True)
    abnormal_count = serializers.IntegerField()
    time_distribution = DistributionItemSerializer(many=True)
    score_distribution = DistributionItemSerializer(many=True, allow_null=True)


class TaskAnalyticsSerializer(serializers.Serializer):
    completion = CompletionSerializer()
    average_time = serializers.FloatField()
    abnormal_count = serializers.IntegerField()
    node_progress = NodeProgressSerializer(many=True)


class StudentExecutionSerializer(serializers.Serializer):
    student_id = serializers.IntegerField()
    student_name = serializers.CharField()
    avatar_key = serializers.CharField()
    employee_id = serializers.CharField()
    department = serializers.CharField()
    status = serializers.ChoiceField(
        choices=[
            'NOT_STARTED',
            'IN_PROGRESS',
            'PENDING_GRADING',
            'COMPLETED',
            'OVERDUE',
        ]
    )
    started_at = serializers.DateTimeField(allow_null=True)
    completed_at = serializers.DateTimeField(allow_null=True)
    time_spent = serializers.FloatField(allow_null=True)
    objective_score = serializers.FloatField(allow_null=True)
    subjective_score = serializers.FloatField(allow_null=True)
    score = serializers.FloatField(allow_null=True)
    is_passed = serializers.BooleanField(allow_null=True)
    is_subjective_pending = serializers.BooleanField()
    attempt_count = serializers.IntegerField(allow_null=True)
    is_abnormal = serializers.BooleanField()
