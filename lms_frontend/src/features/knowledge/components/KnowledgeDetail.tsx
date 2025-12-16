/**
 * KnowledgeDetail Component
 * Detailed view of knowledge document with type-specific rendering
 * Requirements: 5.6, 5.7, 5.8 - Display based on type with table of contents
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/ErrorState';
import { useKnowledgeDetail } from '../api/knowledge';
import type { Knowledge, EmergencyContent } from '@/types/domain';
import { 
  ArrowLeft, 
  BookOpen, 
  Clock, 
  User, 
  Eye,
  Share2, 
  Printer, 
  AlertTriangle,
  FileText,
  Zap,
  CheckCircle,
  RefreshCw,
  Target
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface KnowledgeDetailProps {
  knowledgeId: number | string;
  onBack?: () => void;
  showConfirmButton?: boolean;
  onConfirmLearning?: () => void;
  isConfirming?: boolean;
  className?: string;
}

export function KnowledgeDetail({
  knowledgeId,
  onBack,
  showConfirmButton = false,
  onConfirmLearning,
  isConfirming = false,
  className = '',
}: KnowledgeDetailProps) {
  const navigate = useNavigate();
  const { data: knowledge, isLoading, error, refetch } = useKnowledgeDetail(knowledgeId);
  
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/knowledge');
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }
  
  if (error || !knowledge) {
    return (
      <ErrorState
        title="加载失败"
        message={error instanceof Error ? error.message : '无法加载知识详情'}
        onRetry={() => refetch()}
      />
    );
  }
  
  const isEmergency = knowledge.knowledge_type === 'EMERGENCY';
  
  return (
    <div className={`max-w-6xl mx-auto ${className}`}>
      {/* Back button */}
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={handleBack} 
        className="text-text-muted hover:text-white pl-0 mb-4"
      >
        <ArrowLeft size={16} className="mr-2" /> 返回知识中心
      </Button>
      
      <div className="flex gap-6">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          <Card className="glass-panel border-white/10">
            <CardHeader className="border-b border-white/5 pb-6">
              {/* Header badges and actions */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-2 flex-wrap">
                  <Badge variant={isEmergency ? 'destructive' : 'secondary'}>
                    {isEmergency ? (
                      <>
                        <AlertTriangle size={12} className="mr-1" />
                        应急预案
                      </>
                    ) : (
                      <>
                        <BookOpen size={12} className="mr-1" />
                        知识文档
                      </>
                    )}
                  </Badge>
                  <Badge variant="outline" className="text-text-muted border-white/10">
                    {knowledge.primary_category?.name}
                  </Badge>
                  {knowledge.secondary_category && (
                    <Badge variant="outline" className="text-text-muted border-white/10">
                      {knowledge.secondary_category.name}
                    </Badge>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-text-muted">
                    <Share2 size={16} />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-text-muted">
                    <Printer size={16} />
                  </Button>
                </div>
              </div>
              
              {/* Title */}
              <CardTitle className="text-2xl md:text-3xl font-heading leading-tight mb-4">
                {knowledge.title}
              </CardTitle>
              
              {/* Meta info */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-text-muted">
                <div className="flex items-center gap-1.5">
                  <User size={14} />
                  <span>{knowledge.created_by?.real_name || '未知'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={14} />
                  <span>更新于 {formatRelativeTime(knowledge.updated_at)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Eye size={14} />
                  <span>{knowledge.view_count} 次阅读</span>
                </div>
              </div>
              
              {/* Operation tags */}
              {knowledge.operation_tags && knowledge.operation_tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {knowledge.operation_tags.map((tag, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary" 
                      className="bg-white/5 hover:bg-white/10"
                    >
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}
            </CardHeader>
            
            <CardContent className="pt-8">
              {/* Summary */}
              <div className="p-4 bg-white/5 rounded-lg border border-white/5 text-lg text-text-primary leading-relaxed mb-8">
                {knowledge.summary}
              </div>
              
              {/* Content based on type */}
              {isEmergency && knowledge.emergency_content ? (
                <EmergencyContentView content={knowledge.emergency_content} />
              ) : (
                <MarkdownContentView content={knowledge.content || ''} />
              )}
              
              {/* Confirm learning button */}
              {showConfirmButton && (
                <div className="mt-8 pt-6 border-t border-white/5">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={onConfirmLearning}
                    disabled={isConfirming}
                    className="w-full md:w-auto"
                  >
                    {isConfirming ? (
                      <>
                        <Spinner size="sm" className="mr-2" />
                        确认中...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={18} className="mr-2" />
                        我已学习掌握
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Table of Contents - Right sidebar */}
        <div className="hidden lg:block w-64 flex-shrink-0">
          <TableOfContents knowledge={knowledge} />
        </div>
      </div>
    </div>
  );
}

/**
 * Emergency content structured view
 * Requirements: 5.6 - Display structured fields for emergency type
 */
interface EmergencyContentViewProps {
  content: EmergencyContent;
}

function EmergencyContentView({ content }: EmergencyContentViewProps) {
  const sections = [
    { 
      key: 'fault_scenario', 
      title: '故障场景', 
      icon: AlertTriangle,
      content: content.fault_scenario,
      color: 'text-red-400'
    },
    { 
      key: 'trigger_process', 
      title: '触发流程', 
      icon: Zap,
      content: content.trigger_process,
      color: 'text-yellow-400'
    },
    { 
      key: 'solution', 
      title: '解决方案', 
      icon: Target,
      content: content.solution,
      color: 'text-green-400'
    },
    { 
      key: 'verification', 
      title: '验证方案', 
      icon: CheckCircle,
      content: content.verification,
      color: 'text-blue-400'
    },
    { 
      key: 'recovery', 
      title: '恢复方案', 
      icon: RefreshCw,
      content: content.recovery,
      color: 'text-purple-400'
    },
  ];
  
  return (
    <div className="space-y-8">
      {sections.map((section) => {
        if (!section.content) return null;
        
        const Icon = section.icon;
        
        return (
          <section key={section.key} id={section.key} className="scroll-mt-20">
            <h3 className={`text-xl font-bold flex items-center gap-2 mb-4 ${section.color}`}>
              <Icon size={20} />
              {section.title}
            </h3>
            <div className="prose prose-invert max-w-none text-text-secondary pl-7">
              <div className="whitespace-pre-wrap">{section.content}</div>
            </div>
          </section>
        );
      })}
    </div>
  );
}

/**
 * Markdown content view
 * Requirements: 5.7 - Render Markdown content for OTHER type
 */
interface MarkdownContentViewProps {
  content: string;
}

function MarkdownContentView({ content }: MarkdownContentViewProps) {
  // Simple markdown-like rendering
  // In production, use a proper markdown library like react-markdown
  const renderedContent = useMemo(() => {
    if (!content) return null;
    
    // Split by headers and render sections
    const lines = content.split('\n');
    const elements: React.ReactElement[] = [];
    let currentParagraph: string[] = [];
    
    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        elements.push(
          <p key={elements.length} className="text-text-secondary mb-4">
            {currentParagraph.join(' ')}
          </p>
        );
        currentParagraph = [];
      }
    };
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      // Headers
      if (trimmed.startsWith('### ')) {
        flushParagraph();
        elements.push(
          <h4 key={index} id={`section-${index}`} className="text-lg font-bold text-white mt-6 mb-3 scroll-mt-20">
            {trimmed.slice(4)}
          </h4>
        );
      } else if (trimmed.startsWith('## ')) {
        flushParagraph();
        elements.push(
          <h3 key={index} id={`section-${index}`} className="text-xl font-bold text-white mt-8 mb-4 scroll-mt-20">
            {trimmed.slice(3)}
          </h3>
        );
      } else if (trimmed.startsWith('# ')) {
        flushParagraph();
        elements.push(
          <h2 key={index} id={`section-${index}`} className="text-2xl font-bold text-white mt-8 mb-4 scroll-mt-20">
            {trimmed.slice(2)}
          </h2>
        );
      }
      // List items
      else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        flushParagraph();
        elements.push(
          <li key={index} className="text-text-secondary ml-5 mb-2">
            {trimmed.slice(2)}
          </li>
        );
      }
      // Code blocks
      else if (trimmed.startsWith('```')) {
        flushParagraph();
        // Skip code block markers for now
      }
      // Empty lines
      else if (trimmed === '') {
        flushParagraph();
      }
      // Regular text
      else {
        currentParagraph.push(trimmed);
      }
    });
    
    flushParagraph();
    
    return elements;
  }, [content]);
  
  if (!content) {
    return (
      <div className="text-text-muted text-center py-8">
        暂无详细内容
      </div>
    );
  }
  
  return (
    <div className="prose prose-invert max-w-none">
      {renderedContent}
    </div>
  );
}

/**
 * Table of Contents component
 * Requirements: 5.8 - Auto-generated table of contents on the right
 */
interface TableOfContentsProps {
  knowledge: Knowledge;
}

function TableOfContents({ knowledge }: TableOfContentsProps) {
  const [activeSection, setActiveSection] = useState<string>('');
  
  // Generate TOC items based on content type
  const tocItems = useMemo(() => {
    if (knowledge.knowledge_type === 'EMERGENCY' && knowledge.emergency_content) {
      const items: { id: string; title: string }[] = [];
      const content = knowledge.emergency_content;
      
      if (content.fault_scenario) items.push({ id: 'fault_scenario', title: '故障场景' });
      if (content.trigger_process) items.push({ id: 'trigger_process', title: '触发流程' });
      if (content.solution) items.push({ id: 'solution', title: '解决方案' });
      if (content.verification) items.push({ id: 'verification', title: '验证方案' });
      if (content.recovery) items.push({ id: 'recovery', title: '恢复方案' });
      
      return items;
    }
    
    // For OTHER type, extract headers from markdown content
    if (knowledge.content) {
      const items: { id: string; title: string }[] = [];
      const lines = knowledge.content.split('\n');
      
      lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('## ')) {
          items.push({ id: `section-${index}`, title: trimmed.slice(3) });
        } else if (trimmed.startsWith('### ')) {
          items.push({ id: `section-${index}`, title: trimmed.slice(4) });
        }
      });
      
      return items;
    }
    
    return [];
  }, [knowledge]);
  
  // Scroll spy effect
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-20% 0px -80% 0px' }
    );
    
    tocItems.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) observer.observe(element);
    });
    
    return () => observer.disconnect();
  }, [tocItems]);
  
  if (tocItems.length === 0) {
    return null;
  }
  
  return (
    <div className="sticky top-24">
      <Card className="glass-panel border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-text-muted flex items-center gap-2">
            <FileText size={14} />
            目录
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <nav className="space-y-1">
            {tocItems.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`
                  block py-1.5 px-3 text-sm rounded transition-colors
                  ${activeSection === item.id 
                    ? 'text-primary bg-primary/10 border-l-2 border-primary' 
                    : 'text-text-muted hover:text-white hover:bg-white/5'
                  }
                `}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                {item.title}
              </a>
            ))}
          </nav>
        </CardContent>
      </Card>
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
