from rest_framework import serializers


class CompletionSerializer(serializers.Serializer):
    completed_count = serializers.IntegerField()
    total_count = serializers.IntegerField()
    percentage = serializers.FloatField()


class AccuracySerializer(serializers.Serializer):
    has_quiz = serializers.BooleanField()
    percentage = serializers.FloatField(allow_null=True)


class NodeProgressSerializer(serializers.Serializer):
    node_id = serializers.IntegerField()
    node_name = serializers.CharField()
    category = serializers.ChoiceField(choices=['KNOWLEDGE', 'PRACTICE', 'EXAM'])
    completed_count = serializers.IntegerField()
    total_count = serializers.IntegerField()
    percentage = serializers.FloatField()


class DistributionItemSerializer(serializers.Serializer):
    range = serializers.CharField()
    count = serializers.IntegerField()


class TaskAnalyticsSerializer(serializers.Serializer):
    completion = CompletionSerializer()
    average_time = serializers.FloatField()
    accuracy = AccuracySerializer()
    abnormal_count = serializers.IntegerField()
    node_progress = NodeProgressSerializer(many=True)
    time_distribution = DistributionItemSerializer(many=True)
    score_distribution = DistributionItemSerializer(many=True, allow_null=True)
    pass_rate = serializers.FloatField(allow_null=True)


class StudentExecutionSerializer(serializers.Serializer):
    student_id = serializers.IntegerField()
    student_name = serializers.CharField()
    avatar_key = serializers.CharField()
    employee_id = serializers.CharField()
    department = serializers.CharField()
    status = serializers.ChoiceField(
        choices=['COMPLETED', 'IN_PROGRESS', 'OVERDUE', 'COMPLETED_ABNORMAL']
    )
    node_progress = serializers.CharField()
    score = serializers.FloatField(allow_null=True)
    time_spent = serializers.IntegerField()
    is_abnormal = serializers.BooleanField()
