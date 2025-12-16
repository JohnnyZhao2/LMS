/**
 * KnowledgeCard Component
 * Card display for knowledge documents
 * Requirements: 5.4 - Display operation tags, title, summary, modifier and modification time
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { Knowledge } from '@/types/domain';
import { AlertTriangle, BookOpen, Clock, User, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface KnowledgeCardProps {
  knowledge: Knowledge;
  onClick?: () => void;
  className?: string;
}

export function KnowledgeCard({ knowledge, onClick, className = '' }: KnowledgeCardProps) {
  const isEmergency = knowledge.knowledge_type === 'EMERGENCY';
  
  // Format the update time
  const formattedTime = formatRelativeTime(knowledge.updated_at);
  
  return (
    <Card
      className={`
        glass-panel border-white/5 hover:border-primary/30 
        transition-all hover:-translate-y-1 group cursor-pointer 
        flex flex-col ${className}
      `}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        {/* Top row: Type badge and category */}
        <div className="flex justify-between items-start mb-2">
          <Badge 
            variant={isEmergency ? 'destructive' : 'secondary'} 
            className="text-[10px]"
          >
            {isEmergency ? (
              <>
                <AlertTriangle size={10} className="mr-1" /> 
                应急预案
              </>
            ) : (
              <>
                <BookOpen size={10} className="mr-1" />
                知识文档
              </>
            )}
          </Badge>
          
          {/* Primary category */}
          <span className="text-xs text-text-muted font-mono">
            {knowledge.primary_category?.name}
          </span>
        </div>
        
        {/* Operation tags */}
        {knowledge.operation_tags && knowledge.operation_tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {knowledge.operation_tags.slice(0, 3).map((tag, index) => (
              <Badge 
                key={index} 
                variant="outline" 
                className="text-[10px] border-white/10 text-text-muted"
              >
                {tag}
              </Badge>
            ))}
            {knowledge.operation_tags.length > 3 && (
              <Badge 
                variant="outline" 
                className="text-[10px] border-white/10 text-text-muted"
              >
                +{knowledge.operation_tags.length - 3}
              </Badge>
            )}
          </div>
        )}
        
        {/* Title */}
        <CardTitle className="text-lg group-hover:text-primary transition-colors line-clamp-2">
          {knowledge.title}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col justify-between pt-0 pb-4">
        {/* Summary */}
        <p className="text-sm text-text-secondary mb-4 line-clamp-3">
          {knowledge.summary}
        </p>
        
        {/* Footer: Author and time */}
        <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-auto">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <User size={12} />
            <span>{knowledge.created_by?.real_name || '未知'}</span>
          </div>
          
          <div className="flex items-center gap-3 text-xs text-text-muted">
            {knowledge.view_count > 0 && (
              <div className="flex items-center gap-1">
                <Eye size={12} />
                <span>{knowledge.view_count}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Clock size={12} />
              <span>{formattedTime}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Compact version of KnowledgeCard for list views
 */
export function KnowledgeCardCompact({ knowledge, onClick, className = '' }: KnowledgeCardProps) {
  const isEmergency = knowledge.knowledge_type === 'EMERGENCY';
  
  return (
    <div
      className={`
        p-4 rounded-lg bg-background-secondary border border-white/5
        hover:border-primary/30 transition-all cursor-pointer
        flex items-start gap-4 ${className}
      `}
      onClick={onClick}
    >
      {/* Type indicator */}
      <div className={`
        w-1 h-full min-h-[60px] rounded-full flex-shrink-0
        ${isEmergency ? 'bg-red-500' : 'bg-primary'}
      `} />
      
      <div className="flex-1 min-w-0">
        {/* Title and tags */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-medium text-white truncate">
            {knowledge.title}
          </h3>
          <Badge 
            variant={isEmergency ? 'destructive' : 'secondary'} 
            className="text-[10px] flex-shrink-0"
          >
            {isEmergency ? '应急' : '文档'}
          </Badge>
        </div>
        
        {/* Summary */}
        <p className="text-sm text-text-secondary line-clamp-2 mb-2">
          {knowledge.summary}
        </p>
        
        {/* Meta info */}
        <div className="flex items-center gap-4 text-xs text-text-muted">
          <span>{knowledge.primary_category?.name}</span>
          <span>•</span>
          <span>{knowledge.created_by?.real_name}</span>
          <span>•</span>
          <span>{formatRelativeTime(knowledge.updated_at)}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Helper function to format relative time
 */
function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true, locale: zhCN });
  } catch {
    return dateString;
  }
}
