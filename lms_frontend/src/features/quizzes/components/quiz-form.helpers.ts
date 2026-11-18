import {
  buildQuestionCreatePayload,
  buildQuestionPatchPayload,
  hasQuestionAnswer,
  normalizeQuestionScore,
  type EditableQuestionItem,
} from '@/lib/question-editor';
import type { QuizCreateRequest, QuizQuestion } from '@/types/quiz';

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
  original: {
    question_type: quizQuestion.question_type,
    content: quizQuestion.question_content,
    options: quizQuestion.options ?? [],
    answer: quizQuestion.answer ?? '',
    explanation: quizQuestion.explanation ?? '',
    space_tag_id: quizQuestion.space_tag?.id ?? null,
    tag_ids: quizQuestion.tags?.map((tag) => tag.id) ?? [],
  },
});

export const buildQuizQuestionChanges = (item: EditableQuestionItem) =>
  item.sourceQuestionId ?? item.questionId
    ? buildQuestionPatchPayload(item.original ?? {}, buildQuestionCreatePayload(item))
    : {};

export interface QuizDraftValidationParams {
  title: string;
  items: EditableQuestionItem[];
}

export const validateQuizDraft = ({
  title,
  items,
}: QuizDraftValidationParams): string | null => {
  if (!title.trim()) return '请输入试卷名称';
  if (items.length === 0) return '请添加题目';

  for (const [index, item] of items.entries()) {
    if (!item.content.trim()) return `第${index + 1}题未填写内容`;
    if (!hasQuestionAnswer(item.answer)) return `第${index + 1}题未设置答案`;
  }

  return null;
};

export const buildQuizSubmitPayload = ({
  title,
  items,
}: QuizDraftValidationParams): QuizCreateRequest => ({
  title,
  questions: items.map((item) => {
    const questionId = item.sourceQuestionId ?? item.questionId;
    const changes = buildQuizQuestionChanges(item);
    return {
      id: item.quizQuestionId ?? undefined,
      source_question_id: questionId ?? null,
      score: normalizeQuestionScore(item.score),
      ...(questionId
        ? (Object.keys(changes).length ? { question_changes: changes } : {})
        : buildQuestionCreatePayload(item)),
    };
  }),
});
