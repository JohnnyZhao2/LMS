/**
 * QuizManagement Page
 * Main page for quiz/paper management
 * Requirements: 13.1 - Quiz management with list, builder, and quick publish
 */

import * as React from 'react';
import { QuizList } from './components/QuizList';
import { QuizBuilder, type QuizFormData } from './components/QuizBuilder';
import { QuizQuickPublish } from './components/QuizQuickPublish';
import { useCreateQuiz } from './api/quizzes/create-quiz';
import { useUpdateQuiz } from './api/quizzes/update-quiz';
import type { Quiz } from '@/types/domain';

export function QuizManagement() {
  // Modal states
  const [showBuilder, setShowBuilder] = React.useState(false);
  const [editingQuiz, setEditingQuiz] = React.useState<Quiz | null>(null);
  const [showQuickPublish, setShowQuickPublish] = React.useState(false);
  const [selectedQuizzes, setSelectedQuizzes] = React.useState<Quiz[]>([]);
  
  // API hooks
  const createQuiz = useCreateQuiz();
  const updateQuiz = useUpdateQuiz();
  
  const isSubmitting = createQuiz.isPending || updateQuiz.isPending;
  
  // Handle create button click
  const handleCreateClick = () => {
    setEditingQuiz(null);
    setShowBuilder(true);
  };
  
  // Handle edit button click
  const handleEditClick = (quiz: Quiz) => {
    setEditingQuiz(quiz);
    setShowBuilder(true);
  };
  
  // Handle builder close
  const handleBuilderClose = () => {
    setShowBuilder(false);
    setEditingQuiz(null);
  };
  
  // Handle save quiz
  const handleSaveQuiz = async (data: QuizFormData) => {
    try {
      if (editingQuiz) {
        await updateQuiz.mutateAsync({
          id: editingQuiz.id,
          data: {
            title: data.title,
            description: data.description,
            questions: data.questions,
          },
        });
      } else {
        await createQuiz.mutateAsync({
          title: data.title,
          description: data.description,
          questions: data.questions,
        });
      }
      handleBuilderClose();
    } catch (error) {
      console.error('Save quiz failed:', error);
    }
  };
  
  // Handle quick publish click
  const handleQuickPublishClick = (quizzes: Quiz[]) => {
    setSelectedQuizzes(quizzes);
    setShowQuickPublish(true);
  };
  
  // Handle quick publish close
  const handleQuickPublishClose = () => {
    setShowQuickPublish(false);
    setSelectedQuizzes([]);
  };
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-heading font-bold text-white tracking-tight">
          试卷管理
        </h1>
        <p className="text-text-muted mt-1">
          创建和管理试卷资源，支持快速发布为练习或考试任务
        </p>
      </div>
      
      {/* Quiz List */}
      <QuizList
        onCreateClick={handleCreateClick}
        onEditClick={handleEditClick}
        onQuickPublishClick={handleQuickPublishClick}
      />
      
      {/* Quiz Builder Modal */}
      <QuizBuilder
        open={showBuilder}
        onClose={handleBuilderClose}
        onSave={handleSaveQuiz}
        initialData={editingQuiz || undefined}
        isSubmitting={isSubmitting}
      />
      
      {/* Quick Publish Modal */}
      <QuizQuickPublish
        open={showQuickPublish}
        onClose={handleQuickPublishClose}
        quizzes={selectedQuizzes}
      />
    </div>
  );
}

export default QuizManagement;
