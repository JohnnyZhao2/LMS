import { hasQuestionAnswer, normalizeQuestionScore, type EditableQuestionItem } from '@/lib/question-editor';
import type { QuizCreateRequest, QuizQuestion, QuizType } from '@/types/quiz';

export const buildQuizEditableItem = (quizQuestion: QuizQuestion): EditableQuestionItem => ({
  key: `quiz_question_${quizQuestion.id}`,
  quizQuestionId: quizQuestion.id,
  questionId: quizQuestion.source_question_id ?? null,
  sourceQuestionId: quizQuestion.source_question_id ?? null,
  questionType: quizQuestion.question_type,
  spaceTagId: quizQuestion.space_tag?.id ?? null,
  content: quizQuestion.question_content ?? '',
  options: quizQuestion.options ?? [],
  answer: quizQuestion.answer ?? '',
  explanation: quizQuestion.explanation ?? '',
  showExplanation: Boolean(quizQuestion.explanation?.trim()),
  score: normalizeQuestionScore(quizQuestion.score),
  tagIds: quizQuestion.tags?.map((tag) => tag.id) ?? [],
});

export interface QuizDraftValidationParams {
  title: string;
  quizType: QuizType;
  duration?: number;
  passScore?: number;
  items: EditableQuestionItem[];
}

export const validateQuizDraft = ({
  title,
  quizType,
  duration,
  passScore,
  items,
}: QuizDraftValidationParams): string | null => {
  if (!title.trim()) return '请输入试卷名称';
  if (items.length === 0) return '请添加题目';
  if (quizType === 'EXAM' && (!duration || !passScore)) return '考试模式需设置参考时间和及格分';

  for (const [index, item] of items.entries()) {
    if (!item.content.trim()) return `第${index + 1}题未填写内容`;
    if (!hasQuestionAnswer(item.answer)) return `第${index + 1}题未设置答案`;
  }

  return null;
};

export const buildQuizSubmitPayload = ({
  title,
  quizType,
  duration,
  passScore,
  items,
}: QuizDraftValidationParams): QuizCreateRequest => ({
  title,
  quiz_type: quizType,
  duration: quizType === 'EXAM' ? duration : null,
  pass_score: quizType === 'EXAM' ? passScore : null,
  questions: items.map((item) => ({
    id: item.quizQuestionId ?? undefined,
    source_question_id: item.sourceQuestionId ?? item.questionId ?? null,
    content: item.content,
    question_type: item.questionType,
    options: item.options,
    answer: item.answer,
    explanation: item.explanation,
    score: normalizeQuestionScore(item.score),
    space_tag_id: item.spaceTagId ?? null,
    tag_ids: item.tagIds,
  })),
});
