/**
 * SpotCheckCenter Page
 * Main page for spot check center - combines list and form
 * Requirements: 16.1 - 展示抽查记录列表（按时间倒序）
 */

import * as React from 'react';
import { SpotCheckList } from './components/SpotCheckList';
import { SpotCheckForm } from './components/SpotCheckForm';
import { Button } from '@/components/ui/Button';
import type { SpotCheckListItem } from './api/spot-checks';
import { ClipboardCheck, Plus } from 'lucide-react';

export const SpotCheckCenter: React.FC = () => {
  const [selectedSpotCheck, setSelectedSpotCheck] = React.useState<SpotCheckListItem | null>(null);
  const [showForm, setShowForm] = React.useState(false);
  
  const handleSelectSpotCheck = (spotCheck: SpotCheckListItem) => {
    setSelectedSpotCheck(spotCheck);
    setShowForm(false);
  };
  
  const handleCreateNew = () => {
    setSelectedSpotCheck(null);
    setShowForm(true);
  };
  
  const handleFormSuccess = () => {
    setShowForm(false);
    // List will auto-refresh due to query invalidation
  };
  
  const handleFormCancel = () => {
    setShowForm(false);
  };
  
  return (
    <div className="h-full flex flex-col">
      {/* Page Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/20">
            <ClipboardCheck className="text-emerald-400" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">抽查中心</h1>
            <p className="text-text-muted text-sm">
              录入和查看线下抽查的评分记录
            </p>
          </div>
        </div>
        
        {/* Create Button */}
        <Button onClick={handleCreateNew} className="gap-2">
          <Plus size={16} />
          新建抽查
        </Button>
      </div>
      
      {/* Main Content - Split View */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6 min-h-0">
        {/* Left Panel - Spot Check List */}
        <div className="min-h-0 overflow-hidden">
          <SpotCheckList
            onSelectSpotCheck={handleSelectSpotCheck}
            selectedId={selectedSpotCheck?.id}
          />
        </div>
        
        {/* Right Panel - Form or Detail */}
        <div className="min-h-0 overflow-hidden">
          {showForm ? (
            <SpotCheckForm
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
            />
          ) : selectedSpotCheck ? (
            <SpotCheckDetail spotCheck={selectedSpotCheck} />
          ) : (
            <div className="h-full flex items-center justify-center glass-panel border-white/5 rounded-lg">
              <div className="text-center">
                <ClipboardCheck className="mx-auto text-text-muted mb-4" size={48} />
                <p className="text-text-muted mb-4">
                  选择左侧记录查看详情，或点击"新建抽查"录入新记录
                </p>
                <Button onClick={handleCreateNew} variant="secondary" className="gap-2">
                  <Plus size={16} />
                  新建抽查
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * SpotCheckDetail Component
 * Display detailed view of a spot check record
 */
interface SpotCheckDetailProps {
  spotCheck: SpotCheckListItem;
}

const SpotCheckDetail: React.FC<SpotCheckDetailProps> = ({ spotCheck }) => {
  /**
   * Format date to readable string
   */
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  /**
   * Get score color class
   */
  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-amber-400';
    return 'text-red-400';
  };
  
  return (
    <div className="h-full glass-panel border-white/5 rounded-lg p-6 overflow-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 pb-6 border-b border-white/5">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">抽查详情</h2>
          <p className="text-text-muted text-sm">
            {formatDate(spotCheck.checked_at)}
          </p>
        </div>
        <div className={`text-4xl font-bold ${getScoreColor(spotCheck.score)}`}>
          {spotCheck.score}
          <span className="text-lg text-text-muted ml-1">分</span>
        </div>
      </div>
      
      {/* Student Info */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-text-muted mb-2">被抽查学员</h3>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500/30 to-teal-500/30 flex items-center justify-center">
            <span className="text-white font-medium">
              {spotCheck.student.real_name.charAt(0)}
            </span>
          </div>
          <div>
            <p className="text-white font-medium">{spotCheck.student.real_name}</p>
            <p className="text-text-muted text-sm">{spotCheck.student.employee_id}</p>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-text-muted mb-2">抽查内容</h3>
        <div className="p-4 rounded-lg bg-black/20 border border-white/5">
          <p className="text-white whitespace-pre-wrap">{spotCheck.content}</p>
        </div>
      </div>
      
      {/* Comment */}
      {spotCheck.comment && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-text-muted mb-2">评语</h3>
          <div className="p-4 rounded-lg bg-black/20 border border-white/5">
            <p className="text-white/80 whitespace-pre-wrap">{spotCheck.comment}</p>
          </div>
        </div>
      )}
      
      {/* Checker Info */}
      <div className="pt-6 border-t border-white/5">
        <h3 className="text-sm font-medium text-text-muted mb-2">抽查人</h3>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {spotCheck.checked_by.real_name.charAt(0)}
            </span>
          </div>
          <div>
            <p className="text-white text-sm">{spotCheck.checked_by.real_name}</p>
            <p className="text-text-muted text-xs">{spotCheck.checked_by.employee_id}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

SpotCheckCenter.displayName = 'SpotCheckCenter';

export default SpotCheckCenter;
