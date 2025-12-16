/**
 * GradingCenter Page
 * Main page for grading center - combines pending list and grading detail
 * Requirements: 15.1 - 展示待评分考试列表
 * Requirements: 15.4 - 调用评分 API 并更新列表状态
 */

import * as React from 'react';
import { PendingList } from './components/PendingList';
import { GradingDetail } from './components/GradingDetail';
import type { PendingGradingItem } from './api/grading';
import { FileCheck } from 'lucide-react';

export const GradingCenter: React.FC = () => {
  const [selectedSubmission, setSelectedSubmission] = React.useState<PendingGradingItem | null>(null);
  
  const handleSelectSubmission = (submission: PendingGradingItem) => {
    setSelectedSubmission(submission);
  };
  
  const handleGradingComplete = () => {
    // Clear selection after successful grading
    setSelectedSubmission(null);
  };
  
  return (
    <div className="h-full flex flex-col">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/20">
            <FileCheck className="text-amber-400" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">评分中心</h1>
            <p className="text-text-muted text-sm">
              对考试中的主观题进行人工评分
            </p>
          </div>
        </div>
      </div>
      
      {/* Main Content - Split View */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6 min-h-0">
        {/* Left Panel - Pending List */}
        <div className="min-h-0 overflow-hidden">
          <PendingList
            onSelectSubmission={handleSelectSubmission}
            selectedId={selectedSubmission?.id}
          />
        </div>
        
        {/* Right Panel - Grading Detail */}
        <div className="min-h-0 overflow-hidden">
          {selectedSubmission ? (
            <GradingDetail
              submissionId={selectedSubmission.id}
              onGradingComplete={handleGradingComplete}
            />
          ) : (
            <div className="h-full flex items-center justify-center glass-panel border-white/5 rounded-lg">
              <div className="text-center">
                <FileCheck className="mx-auto text-text-muted mb-4" size={48} />
                <p className="text-text-muted">
                  请从左侧列表选择一份试卷进行评分
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

GradingCenter.displayName = 'GradingCenter';

export default GradingCenter;
