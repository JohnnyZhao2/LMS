/**
 * StepResources - Task creation wizard step 2
 * Requirements: 14.5, 14.6, 14.7, 14.8
 * - Learning task: knowledge documents (multi-select)
 * - Practice task: quizzes (multi-select) + knowledge (optional)
 * - Exam task: quiz (single-select)
 */

import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { BookOpen, FileQuestion, Search, Check, X } from 'lucide-react';
import { useAvailableKnowledge, useAvailableQuizzes } from '../../api/task-management';
import type { TaskType, Knowledge, Quiz } from '@/types/domain';

export interface ResourcesData {
  knowledge_ids: number[];
  quiz_ids: number[];
}

interface StepResourcesProps {
  taskType: TaskType;
  data: ResourcesData;
  onChange: (data: ResourcesData) => void;
  errors?: {
    knowledge_ids?: string;
    quiz_ids?: string;
  };
}

export function StepResources({ taskType, data, onChange, errors }: StepResourcesProps) {
  const [knowledgeSearch, setKnowledgeSearch] = useState('');
  const [quizSearch, setQuizSearch] = useState('');

  const { data: knowledgeList, isLoading: knowledgeLoading } = useAvailableKnowledge();
  const { data: quizList, isLoading: quizLoading } = useAvailableQuizzes();

  // Filter knowledge by search
  const filteredKnowledge = knowledgeList?.filter(k => 
    k.title.toLowerCase().includes(knowledgeSearch.toLowerCase()) ||
    k.summary?.toLowerCase().includes(knowledgeSearch.toLowerCase())
  ) || [];

  // Filter quizzes by search
  const filteredQuizzes = quizList?.filter(q => 
    q.title.toLowerCase().includes(quizSearch.toLowerCase()) ||
    q.description?.toLowerCase().includes(quizSearch.toLowerCase())
  ) || [];

  const handleKnowledgeToggle = (id: number) => {
    const newIds = data.knowledge_ids.includes(id)
      ? data.knowledge_ids.filter(k => k !== id)
      : [...data.knowledge_ids, id];
    onChange({ ...data, knowledge_ids: newIds });
  };

  const handleQuizToggle = (id: number) => {
    if (taskType === 'EXAM') {
      // Single select for exam
      onChange({ ...data, quiz_ids: data.quiz_ids.includes(id) ? [] : [id] });
    } else {
      // Multi select for practice
      const newIds = data.quiz_ids.includes(id)
        ? data.quiz_ids.filter(q => q !== id)
        : [...data.quiz_ids, id];
      onChange({ ...data, quiz_ids: newIds });
    }
  };

  const clearKnowledgeSelection = () => {
    onChange({ ...data, knowledge_ids: [] });
  };

  const clearQuizSelection = () => {
    onChange({ ...data, quiz_ids: [] });
  };

  // Determine what to show based on task type
  const showKnowledge = taskType === 'LEARNING' || taskType === 'PRACTICE';
  const showQuizzes = taskType === 'PRACTICE' || taskType === 'EXAM';
  const knowledgeRequired = taskType === 'LEARNING';
  const quizRequired = taskType === 'PRACTICE' || taskType === 'EXAM';

  return (
    <div className="space-y-8">
      {/* Knowledge Selection */}
      {showKnowledge && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              选择知识文档
              {knowledgeRequired && <span className="text-red-400 text-sm">*</span>}
              {!knowledgeRequired && <span className="text-text-muted text-sm">（可选）</span>}
            </h3>
            {data.knowledge_ids.length > 0 && (
              <button
                type="button"
                onClick={clearKnowledgeSelection}
                className="text-sm text-text-muted hover:text-white flex items-center gap-1"
              >
                <X className="h-4 w-4" />
                清除选择 ({data.knowledge_ids.length})
              </button>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <Input
              value={knowledgeSearch}
              onChange={(e) => setKnowledgeSearch(e.target.value)}
              placeholder="搜索知识文档..."
              className="pl-10"
            />
          </div>

          {/* Knowledge List */}
          <div className="max-h-64 overflow-y-auto space-y-2 border border-white/10 rounded-lg p-3 bg-black/20">
            {knowledgeLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : filteredKnowledge.length === 0 ? (
              <div className="text-center py-8 text-text-muted">
                {knowledgeSearch ? '未找到匹配的知识文档' : '暂无可用的知识文档'}
              </div>
            ) : (
              filteredKnowledge.map((knowledge) => (
                <KnowledgeItem
                  key={knowledge.id}
                  knowledge={knowledge}
                  selected={data.knowledge_ids.includes(knowledge.id)}
                  onToggle={() => handleKnowledgeToggle(knowledge.id)}
                />
              ))
            )}
          </div>

          {errors?.knowledge_ids && (
            <p className="text-sm text-red-400">{errors.knowledge_ids}</p>
          )}
        </div>
      )}

      {/* Quiz Selection */}
      {showQuizzes && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <FileQuestion className="h-5 w-5 text-primary" />
              选择试卷
              {quizRequired && <span className="text-red-400 text-sm">*</span>}
              {taskType === 'EXAM' && (
                <span className="text-text-muted text-sm">（单选）</span>
              )}
              {taskType === 'PRACTICE' && (
                <span className="text-text-muted text-sm">（多选）</span>
              )}
            </h3>
            {data.quiz_ids.length > 0 && (
              <button
                type="button"
                onClick={clearQuizSelection}
                className="text-sm text-text-muted hover:text-white flex items-center gap-1"
              >
                <X className="h-4 w-4" />
                清除选择 ({data.quiz_ids.length})
              </button>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <Input
              value={quizSearch}
              onChange={(e) => setQuizSearch(e.target.value)}
              placeholder="搜索试卷..."
              className="pl-10"
            />
          </div>

          {/* Quiz List */}
          <div className="max-h-64 overflow-y-auto space-y-2 border border-white/10 rounded-lg p-3 bg-black/20">
            {quizLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : filteredQuizzes.length === 0 ? (
              <div className="text-center py-8 text-text-muted">
                {quizSearch ? '未找到匹配的试卷' : '暂无可用的试卷'}
              </div>
            ) : (
              filteredQuizzes.map((quiz) => (
                <QuizItem
                  key={quiz.id}
                  quiz={quiz}
                  selected={data.quiz_ids.includes(quiz.id)}
                  onToggle={() => handleQuizToggle(quiz.id)}
                  isRadio={taskType === 'EXAM'}
                />
              ))
            )}
          </div>

          {errors?.quiz_ids && (
            <p className="text-sm text-red-400">{errors.quiz_ids}</p>
          )}
        </div>
      )}

      {/* Selected Summary */}
      <div className="p-4 bg-white/5 rounded-lg border border-white/10">
        <h4 className="text-sm font-semibold text-white mb-3">已选择资源</h4>
        <div className="flex flex-wrap gap-2">
          {data.knowledge_ids.length === 0 && data.quiz_ids.length === 0 && (
            <span className="text-text-muted text-sm">尚未选择任何资源</span>
          )}
          {data.knowledge_ids.map(id => {
            const knowledge = knowledgeList?.find(k => k.id === id);
            return knowledge ? (
              <Badge key={`k-${id}`} variant="secondary" className="flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                {knowledge.title}
                <button
                  type="button"
                  onClick={() => handleKnowledgeToggle(id)}
                  className="ml-1 hover:text-red-400"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ) : null;
          })}
          {data.quiz_ids.map(id => {
            const quiz = quizList?.find(q => q.id === id);
            return quiz ? (
              <Badge key={`q-${id}`} variant="default" className="flex items-center gap-1">
                <FileQuestion className="h-3 w-3" />
                {quiz.title}
                <button
                  type="button"
                  onClick={() => handleQuizToggle(id)}
                  className="ml-1 hover:text-red-400"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ) : null;
          })}
        </div>
      </div>
    </div>
  );
}

// Knowledge Item Component
interface KnowledgeItemProps {
  knowledge: Knowledge;
  selected: boolean;
  onToggle: () => void;
}

function KnowledgeItem({ knowledge, selected, onToggle }: KnowledgeItemProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full flex items-start gap-3 p-3 rounded-lg border transition-all text-left ${
        selected 
          ? 'border-primary bg-primary/10' 
          : 'border-transparent hover:bg-white/5'
      }`}
    >
      <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${
        selected ? 'bg-primary border-primary' : 'border-white/30'
      }`}>
        {selected && <Check className="h-3 w-3 text-black" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-white truncate">{knowledge.title}</div>
        <div className="text-sm text-text-muted truncate">{knowledge.summary}</div>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant={knowledge.knowledge_type === 'EMERGENCY' ? 'destructive' : 'secondary'} className="text-xs">
            {knowledge.knowledge_type === 'EMERGENCY' ? '应急' : '其他'}
          </Badge>
          {knowledge.primary_category && (
            <span className="text-xs text-text-muted">{knowledge.primary_category.name}</span>
          )}
        </div>
      </div>
    </button>
  );
}

// Quiz Item Component
interface QuizItemProps {
  quiz: Quiz;
  selected: boolean;
  onToggle: () => void;
  isRadio?: boolean;
}

function QuizItem({ quiz, selected, onToggle, isRadio }: QuizItemProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full flex items-start gap-3 p-3 rounded-lg border transition-all text-left ${
        selected 
          ? 'border-primary bg-primary/10' 
          : 'border-transparent hover:bg-white/5'
      }`}
    >
      <div className={`mt-0.5 w-5 h-5 ${isRadio ? 'rounded-full' : 'rounded'} border flex items-center justify-center flex-shrink-0 ${
        selected ? 'bg-primary border-primary' : 'border-white/30'
      }`}>
        {selected && <Check className="h-3 w-3 text-black" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-white truncate">{quiz.title}</div>
        {quiz.description && (
          <div className="text-sm text-text-muted truncate">{quiz.description}</div>
        )}
        <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
          <span>{quiz.questions?.length || 0} 题</span>
          <span>总分 {quiz.total_score} 分</span>
        </div>
      </div>
    </button>
  );
}
