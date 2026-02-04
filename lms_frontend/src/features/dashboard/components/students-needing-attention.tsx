import * as React from 'react';
import {
  AlertTriangle,
  Clock,
  XCircle,
  ChevronRight,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useStudentsNeedingAttention } from '../api/mentor-dashboard';
import type { StudentNeedingAttention, StudentAlert, AlertLevel } from '@/types/dashboard';

interface StudentsNeedingAttentionProps {
  limit?: number;
  className?: string;
}

const alertConfig: Record<string, { icon: React.ElementType; label: string }> = {
  overdue: { icon: Clock, label: '逾期任务' },
  failed_exam: { icon: XCircle, label: '考试不及格' },
  inactive: { icon: Users, label: '长期不活跃' },
};

const levelConfig: Record<AlertLevel, { bgClass: string; textClass: string; dotClass: string }> = {
  high: {
    bgClass: 'bg-destructive-50',
    textClass: 'text-destructive',
    dotClass: 'bg-destructive',
  },
  medium: {
    bgClass: 'bg-warning-50',
    textClass: 'text-warning-700',
    dotClass: 'bg-warning',
  },
  low: {
    bgClass: 'bg-muted',
    textClass: 'text-muted-foreground',
    dotClass: 'bg-muted-foreground',
  },
};

export const StudentsNeedingAttention: React.FC<StudentsNeedingAttentionProps> = ({
  limit = 5,
  className,
}) => {
  const navigate = useNavigate();
  const { data, isLoading } = useStudentsNeedingAttention(limit);

  if (isLoading) {
    return (
      <Card className={cn('p-6 border border-border', className)}>
        <div className="flex items-center justify-between mb-5">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-5 w-16" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      </Card>
    );
  }

  const students = data?.students || [];
  const totalCount = data?.total_count || 0;

  if (totalCount === 0) {
    return (
      <Card className={cn('p-6 border border-border', className)}>
        <div className="flex items-center gap-2 mb-5">
          <AlertTriangle className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-base font-semibold text-foreground">需要关注的学员</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Users className="w-12 h-12 mb-3 opacity-50" />
          <p className="text-sm">暂无需要关注的学员</p>
          <p className="text-xs mt-1">所有学员状态良好</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn('p-6 border border-border', className)}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          <h3 className="text-base font-semibold text-foreground">
            需要关注的学员
          </h3>
          <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-destructive text-white">
            {totalCount}
          </span>
        </div>
        {totalCount > limit && (
          <button
            onClick={() => navigate('/users?filter=needs_attention')}
            className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors cursor-pointer"
          >
            查看全部
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="space-y-3">
        {students.map((student) => (
          <StudentAlertCard key={student.student_id} student={student} />
        ))}
      </div>
    </Card>
  );
};

interface StudentAlertCardProps {
  student: StudentNeedingAttention;
}

const StudentAlertCard: React.FC<StudentAlertCardProps> = ({ student }) => {
  const navigate = useNavigate();
  const levelStyle = levelConfig[student.highest_level];

  const handleClick = () => {
    navigate(`/users/${student.student_id}`);
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'p-4 rounded-lg border border-border cursor-pointer transition-all duration-200',
        'hover:border-primary/30 hover:bg-muted/50',
        levelStyle.bgClass
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={cn('w-2 h-2 rounded-full', levelStyle.dotClass)} />
            <span className="font-semibold text-foreground truncate">
              {student.student_name}
            </span>
            {student.employee_id && (
              <span className="text-xs text-muted-foreground">
                ({student.employee_id})
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {student.alerts.map((alert, index) => (
              <AlertBadge key={index} alert={alert} />
            ))}
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />
      </div>
    </div>
  );
};

interface AlertBadgeProps {
  alert: StudentAlert;
}

const AlertBadge: React.FC<AlertBadgeProps> = ({ alert }) => {
  const config = alertConfig[alert.type] || { icon: AlertTriangle, label: alert.message };
  const Icon = config.icon;
  const levelStyle = levelConfig[alert.level];

  const getAlertText = () => {
    if (alert.type === 'overdue' && alert.count) {
      return `${alert.count} 个逾期任务`;
    }
    if (alert.type === 'failed_exam' && alert.score !== undefined) {
      return `${alert.quiz_title || '考试'}不及格 (${alert.score}分)`;
    }
    return alert.message;
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium',
        levelStyle.textClass,
        'bg-background/80'
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {getAlertText()}
    </span>
  );
};
