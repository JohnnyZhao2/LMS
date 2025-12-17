/**
 * ScoreHistory Component
 * Displays practice and exam score records with export functionality
 * Requirements: 10.2 - Display practice and exam score records
 * Requirements: 10.4 - Download file containing score history
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import { 
  Trophy, 
  Download, 
  BookOpen, 
  GraduationCap,
  TrendingUp,
  Target,
  Calendar
} from 'lucide-react';
import type { ScoreRecord, ScoreHistoryParams } from '../api/types';
import { exportScoreHistory } from '../api/export-score-history';

interface ScoreHistoryProps {
  records: ScoreRecord[];
  total: number;
  averageScore: number;
  passRate: number;
  isLoading?: boolean;
  onFilterChange?: (params: ScoreHistoryParams) => void;
}

/**
 * Task type badge component
 */
function TaskTypeBadge({ type }: { type: 'PRACTICE' | 'EXAM' | 'LEARNING' }) {
  const config = {
    PRACTICE: { label: '练习', variant: 'default' as const, icon: BookOpen },
    EXAM: { label: '考试', variant: 'warning' as const, icon: GraduationCap },
    LEARNING: { label: '学习', variant: 'secondary' as const, icon: BookOpen },
  };
  
  const { label, variant, icon: Icon } = config[type] || config.PRACTICE;
  
  return (
    <Badge variant={variant} className="gap-1">
      <Icon size={12} />
      {label}
    </Badge>
  );
}

/**
 * Score record row component
 */
function ScoreRecordRow({ record }: { record: ScoreRecord }) {
  const scorePercentage = (record.obtained_score / record.total_score) * 100;
  const isPassed = record.is_passed ?? scorePercentage >= 60;
  
  const formattedDate = new Date(record.submitted_at).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="flex items-center gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
      {/* Task info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <TaskTypeBadge type={record.task.type} />
          {record.attempt_number > 1 && (
            <span className="text-xs text-text-muted">
              第 {record.attempt_number} 次
            </span>
          )}
        </div>
        <h4 className="text-sm font-medium text-white truncate">
          {record.task.title}
        </h4>
        <p className="text-xs text-text-muted truncate">
          {record.quiz.title}
        </p>
      </div>

      {/* Score */}
      <div className="text-right">
        <div className={`text-lg font-bold font-mono ${
          isPassed ? 'text-status-success' : 'text-status-error'
        }`}>
          {record.obtained_score}
          <span className="text-sm text-text-muted">/{record.total_score}</span>
        </div>
        <div className="text-xs text-text-muted flex items-center justify-end gap-1">
          <Calendar size={10} />
          {formattedDate}
        </div>
      </div>
    </div>
  );
}

/**
 * Stats summary card
 */
function StatsSummary({ 
  averageScore, 
  passRate, 
  total 
}: { 
  averageScore: number; 
  passRate: number; 
  total: number;
}) {
  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <div className="p-4 rounded-lg bg-white/5 text-center">
        <div className="flex items-center justify-center gap-1 text-text-muted text-xs mb-1">
          <Target size={12} />
          平均分
        </div>
        <div className="text-xl font-bold text-white font-mono">
          {averageScore.toFixed(1)}
        </div>
      </div>
      <div className="p-4 rounded-lg bg-white/5 text-center">
        <div className="flex items-center justify-center gap-1 text-text-muted text-xs mb-1">
          <TrendingUp size={12} />
          通过率
        </div>
        <div className="text-xl font-bold text-status-success font-mono">
          {(passRate * 100).toFixed(0)}%
        </div>
      </div>
      <div className="p-4 rounded-lg bg-white/5 text-center">
        <div className="flex items-center justify-center gap-1 text-text-muted text-xs mb-1">
          <Trophy size={12} />
          总次数
        </div>
        <div className="text-xl font-bold text-white font-mono">
          {total}
        </div>
      </div>
    </div>
  );
}

/**
 * Loading skeleton
 */
function ScoreHistorySkeleton() {
  return (
    <Card className="glass-panel border-white/5">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Trophy className="text-primary" size={20} />
          历史成绩
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-lg bg-white/5 animate-pulse">
              <div className="h-3 w-12 bg-white/10 rounded mx-auto mb-2" />
              <div className="h-6 w-16 bg-white/10 rounded mx-auto" />
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 rounded-lg bg-white/5 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-16 bg-white/10 rounded" />
                  <div className="h-4 w-32 bg-white/10 rounded" />
                </div>
                <div className="h-6 w-16 bg-white/10 rounded" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * ScoreHistory component
 */
export function ScoreHistory({ 
  records, 
  total, 
  averageScore, 
  passRate,
  isLoading,
  onFilterChange 
}: ScoreHistoryProps) {
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);

  if (isLoading) {
    return <ScoreHistorySkeleton />;
  }

  const handleTypeChange = (value: string) => {
    setTypeFilter(value);
    onFilterChange?.({ 
      type: value as 'PRACTICE' | 'EXAM' | undefined 
    });
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await exportScoreHistory({ 
        type: typeFilter as 'PRACTICE' | 'EXAM' | undefined 
      });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `成绩记录_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card className="glass-panel border-white/5">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="text-primary" size={20} />
            历史成绩
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select
              value={typeFilter}
              onChange={(value) => handleTypeChange(value as string)}
              options={[
                { value: '', label: '全部类型' },
                { value: 'PRACTICE', label: '练习' },
                { value: 'EXAM', label: '考试' },
              ]}
              placeholder="全部类型"
              className="w-28"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={isExporting || records.length === 0}
              className="gap-1"
            >
              <Download size={14} />
              {isExporting ? '导出中...' : '导出'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats summary */}
        <StatsSummary 
          averageScore={averageScore} 
          passRate={passRate} 
          total={total} 
        />

        {/* Records list */}
        {records.length === 0 ? (
          <EmptyState
            icon={<Trophy className="h-12 w-12" />}
            title="暂无成绩记录"
            description="完成练习或考试后，成绩将显示在这里"
          />
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {records.map((record) => (
              <ScoreRecordRow key={record.id} record={record} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ScoreHistory;
