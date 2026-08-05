"""题目 payload 校验与存储字段构建（纯函数，无 Service 依赖）。"""

from __future__ import annotations

from decimal import Decimal

from core.exceptions import BusinessError, ErrorCodes

from .question_like import DEFAULT_QUESTION_SCORE


def normalize_score(score) -> Decimal:
    if isinstance(score, Decimal):
        return score
    return Decimal(str(score))


def validate_question_payload(
    data: dict,
    *,
    source=None,
) -> None:
    """校验题目写入 payload；source 用于补全缺省字段。"""
    question_type = data.get('question_type', source.question_type if source else None)
    options = data.get('options', source.options if source else [])
    answer = data.get('answer', source.answer if source else None)

    if question_type in ['SINGLE_CHOICE', 'MULTIPLE_CHOICE']:
        if not options:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='选择题必须设置选项',
            )

        option_keys = []
        for opt in options:
            if not isinstance(opt, dict) or 'key' not in opt or 'value' not in opt:
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message='选项格式错误，必须包含 key 和 value',
                )
            if not str(opt['value']).strip():
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message='选项内容不能为空',
                )
            option_keys.append(opt['key'])

        if len(option_keys) != len(set(option_keys)):
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='选项 key 不能重复',
            )

        if question_type == 'SINGLE_CHOICE':
            if not isinstance(answer, str):
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message='单选题答案必须是字符串',
                )
            if answer not in option_keys:
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message='单选题答案必须是有效的选项',
                )
        else:
            if not isinstance(answer, list):
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message='多选题答案必须是列表',
                )
            for ans in answer:
                if ans not in option_keys:
                    raise BusinessError(
                        code=ErrorCodes.VALIDATION_ERROR,
                        message=f'多选题答案 {ans} 不是有效的选项',
                    )
    elif question_type == 'TRUE_FALSE':
        if answer not in ['TRUE', 'FALSE']:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='判断题答案必须是 TRUE 或 FALSE',
            )
    elif question_type == 'SHORT_ANSWER':
        if not isinstance(answer, str):
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='简答题答案必须是字符串',
            )


def build_merged_question_payload(
    data: dict,
    *,
    source=None,
) -> dict:
    """合并请求字段与来源题缺省值。"""
    return {
        'content': data.get('content', source.content if source else ''),
        'question_type': data.get('question_type', source.question_type if source else None),
        'options': data.get('options', source.options if source else []),
        'answer': data.get('answer', source.answer if source else None),
        'explanation': data.get('explanation', source.explanation if source else ''),
        'score': normalize_score(
            data.get('score', source.score if source else DEFAULT_QUESTION_SCORE)
        ),
    }


def build_option_definitions(
    *,
    question_type: str,
    options: list[dict],
    answer,
) -> list[dict]:
    """按数组顺序生成落库选项；请求 key 仅用于绑定 answer。"""
    if question_type == 'SHORT_ANSWER':
        return []
    if question_type == 'TRUE_FALSE':
        label_map = {
            opt['key']: opt['value']
            for opt in options
            if isinstance(opt, dict) and opt.get('key') in {'TRUE', 'FALSE'}
        }
        return [
            {
                'sort_order': 1,
                'content': label_map.get('TRUE') or '正确',
                'is_correct': answer == 'TRUE',
            },
            {
                'sort_order': 2,
                'content': label_map.get('FALSE') or '错误',
                'is_correct': answer == 'FALSE',
            },
        ]

    correct_keys = {answer} if question_type == 'SINGLE_CHOICE' else set(answer or [])
    return [
        {
            'sort_order': index + 1,
            'content': str(option['value']).strip(),
            'is_correct': option['key'] in correct_keys,
        }
        for index, option in enumerate(options)
    ]


def build_storage_payload(merged_payload: dict) -> tuple[dict, list[dict]]:
    """构建 Question 模型字段与选项定义。"""
    question_type = merged_payload['question_type']
    answer = merged_payload.get('answer')
    return (
        {
            'content': merged_payload['content'],
            'question_type': question_type,
            'reference_answer': answer if question_type == 'SHORT_ANSWER' else '',
            'explanation': merged_payload.get('explanation', ''),
            'score': normalize_score(
                merged_payload.get('score', DEFAULT_QUESTION_SCORE)
            ),
        },
        build_option_definitions(
            question_type=question_type,
            options=merged_payload.get('options', []),
            answer=answer,
        ),
    )


def current_model_fields(question) -> dict:
    return {
        'content': question.content,
        'question_type': question.question_type,
        'reference_answer': question.reference_answer,
        'explanation': question.explanation,
        'score': normalize_score(question.score),
    }


def current_option_definitions(question) -> list[dict]:
    return [
        {
            'sort_order': option.sort_order,
            'content': option.content,
            'is_correct': option.is_correct,
        }
        for option in question._ordered_options()
    ]


def sync_question_options(question, option_defs: list[dict]) -> None:
    """重建题目选项。"""
    from .models import QuestionOption

    question.question_options.all().delete()
    prefetched_cache = getattr(question, '_prefetched_objects_cache', None)
    if prefetched_cache is not None:
        prefetched_cache.pop('question_options', None)
    if not option_defs:
        return
    QuestionOption.objects.bulk_create(
        [
            QuestionOption(
                question=question,
                sort_order=option_def['sort_order'],
                content=option_def['content'],
                is_correct=option_def['is_correct'],
            )
            for option_def in option_defs
        ]
    )
