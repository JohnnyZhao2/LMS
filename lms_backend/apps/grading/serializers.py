from rest_framework import serializers


class GradingQuestionSerializer(serializers.Serializer):
    """阅卷中心题目概览序列化器"""
    question_id = serializers.IntegerField()
    question_text = serializers.CharField()
    question_analysis = serializers.CharField(allow_blank=True)
    question_type = serializers.ChoiceField(
        choices=['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER']
    )
    question_type_display = serializers.CharField()
    max_score = serializers.FloatField()
    pass_rate = serializers.FloatField(allow_null=True)


class GradingOptionStudentSerializer(serializers.Serializer):
    student_id = serializers.IntegerField()
    student_name = serializers.CharField()
    employee_id = serializers.CharField()
    department = serializers.CharField()


class GradingOptionSerializer(serializers.Serializer):
    option_key = serializers.CharField()
    option_text = serializers.CharField()
    selected_count = serializers.IntegerField()
    is_correct = serializers.BooleanField()
    students = GradingOptionStudentSerializer(many=True)


class GradingSubjectiveAnswerSerializer(serializers.Serializer):
    student_id = serializers.IntegerField()
    student_name = serializers.CharField()
    employee_id = serializers.CharField()
    department = serializers.CharField()
    answer_text = serializers.CharField(allow_blank=True, allow_null=True)
    submitted_at = serializers.DateTimeField()
    score = serializers.FloatField(allow_null=True)


class GradingAnswerResponseSerializer(serializers.Serializer):
    question_id = serializers.IntegerField()
    question_type = serializers.ChoiceField(
        choices=['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER']
    )
    pass_rate = serializers.FloatField(allow_null=True)
    options = GradingOptionSerializer(many=True, required=False)
    subjective_answers = GradingSubjectiveAnswerSerializer(many=True, required=False)


class GradingSubmitSerializer(serializers.Serializer):
    """评分提交序列化器"""
    quiz_id = serializers.IntegerField()
    question_id = serializers.IntegerField()
    student_id = serializers.IntegerField()
    score = serializers.FloatField()
    comments = serializers.CharField(required=False, allow_blank=True, default='')
