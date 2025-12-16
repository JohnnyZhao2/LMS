/**
 * QuestionManagement Page
 * Main page for question management combining list, form, and quick publish
 * Requirements: 12.1 - Question management page
 */

import * as React from 'react';
import { QuestionList } from './components/QuestionList';
import { QuestionForm } from './components/QuestionForm';
import { QuickPublish } from './components/QuickPublish';
import type { Question } from '@/types/domain';

export function QuestionManagement() {
  // Modal states
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isQuickPublishOpen, setIsQuickPublishOpen] = React.useState(false);
  
  // Edit state
  const [editingQuestion, setEditingQuestion] = React.useState<Question | null>(null);
  
  // Selected questions for quick publish
  const [selectedQuestions, setSelectedQuestions] = React.useState<Question[]>([]);
  
  // Handle create button click
  const handleCreateClick = () => {
    setEditingQuestion(null);
    setIsFormOpen(true);
  };
  
  // Handle edit button click
  const handleEditClick = (question: Question) => {
    setEditingQuestion(question);
    setIsFormOpen(true);
  };
  
  // Handle form close
  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingQuestion(null);
  };
  
  // Handle form success
  const handleFormSuccess = () => {
    // Form will close itself, just need to refresh list
    // React Query will handle the refresh via invalidation
  };
  
  // Handle quick quiz click
  const handleQuickQuizClick = (questions: Question[]) => {
    setSelectedQuestions(questions);
    setIsQuickPublishOpen(true);
  };
  
  // Handle quick publish close
  const handleQuickPublishClose = () => {
    setIsQuickPublishOpen(false);
    setSelectedQuestions([]);
  };
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-heading font-bold text-white tracking-tight">
          题目管理
        </h1>
        <p className="text-text-muted mt-1">
          管理题库中的所有题目，支持创建、编辑、删除和快速组卷
        </p>
      </div>
      
      {/* Question List */}
      <QuestionList
        onCreateClick={handleCreateClick}
        onEditClick={handleEditClick}
        onQuickQuizClick={handleQuickQuizClick}
      />
      
      {/* Question Form Modal */}
      <QuestionForm
        open={isFormOpen}
        onClose={handleFormClose}
        question={editingQuestion}
        onSuccess={handleFormSuccess}
      />
      
      {/* Quick Publish Modal */}
      <QuickPublish
        open={isQuickPublishOpen}
        onClose={handleQuickPublishClose}
        questions={selectedQuestions}
      />
    </div>
  );
}

QuestionManagement.displayName = 'QuestionManagement';
