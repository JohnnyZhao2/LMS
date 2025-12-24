import { useState, useMemo } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Spin, Button, Modal, message, Space } from 'antd';
import {
  ArrowLeftOutlined,
  EyeOutlined,
  CalendarOutlined,
  UserOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  StopOutlined,
  OrderedListOutlined,
  MenuUnfoldOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { useStudentKnowledgeDetail } from '../api/get-student-knowledge-detail';
import { useKnowledgeDetail as useAdminKnowledgeDetail } from '../api/get-admin-knowledge';
import { useDeleteKnowledge, usePublishKnowledge, useUnpublishKnowledge } from '../api/manage-knowledge';
import type { KnowledgeDetail as KnowledgeDetailType } from '@/types/api';
import { ROUTES } from '@/config/routes';
import { showApiError } from '@/utils/error-handler';
import dayjs from '@/lib/dayjs';
import styles from './knowledge-detail.module.css';

/**
 * 目录项接口
 */
interface OutlineItem {
  id: string;
  level: number;
  text: string;
}

/**
 * 从 Markdown/HTML 内容解析标题生成目录
 */
const parseOutline = (content: string, isEmergency: boolean): OutlineItem[] => {
  if (isEmergency) {
    // 应急类知识返回固定的章节目录
    return [
      { id: 'fault_scenario', level: 1, text: '故障场景' },
      { id: 'trigger_process', level: 1, text: '触发流程' },
      { id: 'solution', level: 1, text: '解决方案' },
      { id: 'verification_plan', level: 1, text: '验证方案' },
      { id: 'recovery_plan', level: 1, text: '恢复方案' },
    ];
  }

  if (!content) return [];
  
  const lines = content.split('\n');
  const outline: OutlineItem[] = [];
  
  lines.forEach((line, index) => {
    const match = line.match(/^(#{1,3})\s+(.+)$/);
    if (match) {
      outline.push({
        id: `heading-${index}`,
        level: match[1].length,
        text: match[2].trim(),
      });
    }
  });
  
  return outline;
};

/**
 * 简单的 Markdown 渲染
 */
const renderMarkdown = (markdown: string): string => {
  if (!markdown) return '';
  
  let html = markdown;
  
  // 转义 HTML
  const escapeHtml = (text: string) => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  };
  
  // 代码块（先处理，避免内容被其他规则影响）
  const codeBlocks: string[] = [];
  html = html.replace(/```(\w+)?\n([\s\S]+?)\n```/g, (_, lang, code) => {
    const index = codeBlocks.length;
    codeBlocks.push(`<pre><code class="${lang || ''}">${escapeHtml(code)}</code></pre>`);
    return `__CODE_BLOCK_${index}__`;
  });
  
  // 标题
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  
  // 粗体、斜体、删除线
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');
  
  // 行内代码
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // 链接和图片
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  
  // 引用块
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
  
  // 分隔线
  html = html.replace(/^---$/gm, '<hr />');
  
  // 列表
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/^\* (.+)$/gm, '<li>$1</li>');
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>[\s\S]*?<\/li>)+/g, (match) => `<ul>${match}</ul>`);
  
  // 段落
  const lines = html.split('\n');
  const processedLines: string[] = [];
  const blockTags = ['<h', '<ul', '<ol', '<li', '<table', '<blockquote', '<hr', '<pre'];
  
  let inParagraph = false;
  let paragraphContent = '';
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) {
      if (inParagraph && paragraphContent) {
        processedLines.push(`<p>${paragraphContent}</p>`);
        paragraphContent = '';
        inParagraph = false;
      }
      continue;
    }
    
    const isBlockElement = blockTags.some(tag => trimmedLine.startsWith(tag));
    
    if (isBlockElement) {
      if (inParagraph && paragraphContent) {
        processedLines.push(`<p>${paragraphContent}</p>`);
        paragraphContent = '';
        inParagraph = false;
      }
      processedLines.push(trimmedLine);
    } else {
      if (inParagraph) {
        paragraphContent += '<br/>' + trimmedLine;
      } else {
        paragraphContent = trimmedLine;
        inParagraph = true;
      }
    }
  }
  
  if (inParagraph && paragraphContent) {
    processedLines.push(`<p>${paragraphContent}</p>`);
  }
  
  html = processedLines.join('\n');
  
  // 还原代码块
  codeBlocks.forEach((block, index) => {
    html = html.replace(`__CODE_BLOCK_${index}__`, block);
  });
  
  return html;
};

/**
 * 知识详情组件
 * 
 * 布局：
 * - 顶部：标题、更新人、更新时间、操作按钮
 * - 左侧：目录导航
 * - 右侧：内容区域
 */
export const KnowledgeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  
  // 目录折叠状态
  const [outlineCollapsed, setOutlineCollapsed] = useState(false);
  
  // 根据路由判断使用哪个 API
  const isAdminRoute = location.pathname.startsWith(ROUTES.ADMIN_KNOWLEDGE);
  const studentQuery = useStudentKnowledgeDetail(Number(id));
  const adminQuery = useAdminKnowledgeDetail(Number(id));
  
  const { data, isLoading, refetch } = isAdminRoute ? adminQuery : studentQuery;
  
  // 操作相关
  const deleteKnowledge = useDeleteKnowledge();
  const publishKnowledge = usePublishKnowledge();
  const unpublishKnowledge = useUnpublishKnowledge();

  const knowledge = data as KnowledgeDetailType | undefined;
  const isEmergency = knowledge?.knowledge_type === 'EMERGENCY';
  const isPublished = knowledge?.status === 'PUBLISHED';

  /**
   * 解析目录
   */
  const outline = useMemo(() => {
    if (!knowledge) return [];
    return parseOutline(knowledge.content || '', isEmergency);
  }, [knowledge, isEmergency]);

  /**
   * 获取渲染内容
   */
  const renderedContent = useMemo(() => {
    if (!knowledge) return '';
    
    if (isEmergency) {
      const sections = [];
      if (knowledge.fault_scenario) {
        sections.push(`
          <div class="${styles.emergencySection}">
            <h3 class="${styles.emergencySectionTitle}">故障场景</h3>
            <div class="${styles.emergencySectionContent}">${renderMarkdown(knowledge.fault_scenario)}</div>
          </div>
        `);
      }
      if (knowledge.trigger_process) {
        sections.push(`
          <div class="${styles.emergencySection}">
            <h3 class="${styles.emergencySectionTitle}">触发流程</h3>
            <div class="${styles.emergencySectionContent}">${renderMarkdown(knowledge.trigger_process)}</div>
          </div>
        `);
      }
      if (knowledge.solution) {
        sections.push(`
          <div class="${styles.emergencySection}">
            <h3 class="${styles.emergencySectionTitle}">解决方案</h3>
            <div class="${styles.emergencySectionContent}">${renderMarkdown(knowledge.solution)}</div>
          </div>
        `);
      }
      if (knowledge.verification_plan) {
        sections.push(`
          <div class="${styles.emergencySection}">
            <h3 class="${styles.emergencySectionTitle}">验证方案</h3>
            <div class="${styles.emergencySectionContent}">${renderMarkdown(knowledge.verification_plan)}</div>
          </div>
        `);
      }
      if (knowledge.recovery_plan) {
        sections.push(`
          <div class="${styles.emergencySection}">
            <h3 class="${styles.emergencySectionTitle}">恢复方案</h3>
            <div class="${styles.emergencySectionContent}">${renderMarkdown(knowledge.recovery_plan)}</div>
          </div>
        `);
      }
      return sections.join('');
    }
    
    return renderMarkdown(knowledge.content || '');
  }, [knowledge, isEmergency]);

  /**
   * 处理编辑
   */
  const handleEdit = () => {
    navigate(`${ROUTES.ADMIN_KNOWLEDGE}/${id}/edit`);
  };
  
  /**
   * 处理删除
   */
  const handleDelete = () => {
    if (!knowledge) return;
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除知识文档「${knowledge.title}」吗？此操作不可撤销。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteKnowledge.mutateAsync(Number(id));
          message.success('删除成功');
          navigate(ROUTES.ADMIN_KNOWLEDGE);
        } catch (error) {
          showApiError(error, '删除失败');
        }
      },
    });
  };
  
  /**
   * 处理发布
   */
  const handlePublish = async () => {
    try {
      await publishKnowledge.mutateAsync(Number(id));
      message.success('发布成功');
      refetch?.();
    } catch (error) {
      showApiError(error, '发布失败');
    }
  };
  
  /**
   * 处理取消发布
   */
  const handleUnpublish = () => {
    Modal.confirm({
      title: '确认取消发布',
      content: '取消发布后，该知识将变为草稿状态。确定要取消发布吗？',
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          await unpublishKnowledge.mutateAsync(Number(id));
          message.success('取消发布成功');
          refetch?.();
        } catch (error) {
          showApiError(error, '取消发布失败');
        }
      },
    });
  };

  // 加载状态
  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <Spin size="large" />
        </div>
      </div>
    );
  }

  // 空状态
  if (!knowledge) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <span>知识文档不存在</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* 顶部栏 */}
      <div className={styles.topBar}>
        <div className={styles.topLeft}>
          <button className={styles.backButton} onClick={() => navigate(-1)}>
            <ArrowLeftOutlined />
          </button>
          <div className={styles.titleSection}>
            <div className={styles.titleRow}>
              <h1 className={styles.title}>{knowledge.title}</h1>
              {isAdminRoute && (
                <span className={`${styles.statusBadge} ${isPublished ? styles.statusPublished : styles.statusDraft}`}>
                  {knowledge.status_display}
                </span>
              )}
            </div>
            <div className={styles.metaRow}>
              {knowledge.updated_by_name && (
                <span className={styles.metaItem}>
                  <UserOutlined />
                  {knowledge.updated_by_name}
                </span>
              )}
              <span className={styles.metaItem}>
                <CalendarOutlined />
                {dayjs(knowledge.updated_at).format('YYYY-MM-DD HH:mm')}
              </span>
              <span className={styles.metaItem}>
                <EyeOutlined />
                {knowledge.view_count} 次阅读
              </span>
            </div>
          </div>
        </div>
        
        {/* 操作按钮（仅管理员可见） */}
        {isAdminRoute && (
          <div className={styles.topRight}>
            <Space>
              <Button icon={<EditOutlined />} onClick={handleEdit}>
                编辑
              </Button>
              {isPublished ? (
                <Button icon={<StopOutlined />} onClick={handleUnpublish}>
                  取消发布
                </Button>
              ) : (
                <Button type="primary" icon={<CheckCircleOutlined />} onClick={handlePublish}>
                  发布
                </Button>
              )}
              <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>
                删除
              </Button>
            </Space>
          </div>
        )}
      </div>

      {/* 主体内容 */}
      <div className={styles.mainContent}>
        {/* 左侧目录 */}
        <div className={styles.outlineWrapper}>
          {outlineCollapsed ? (
            <button 
              className={styles.outlineExpandBtn}
              onClick={() => setOutlineCollapsed(false)}
              title="展开目录"
            >
              <MenuUnfoldOutlined />
            </button>
          ) : (
            <div className={styles.outlinePanel}>
              <div className={styles.outlineHeader}>
                <div className={styles.outlineHeaderTitle}>
                  <OrderedListOutlined style={{ marginRight: 8 }} />
                  目录
                </div>
                <button 
                  className={styles.outlineCollapseBtn}
                  onClick={() => setOutlineCollapsed(true)}
                  title="折叠目录"
                >
                  <CloseCircleOutlined />
                </button>
              </div>
              <div className={styles.outlineContent}>
                {outline.length > 0 ? (
                  outline.map((item) => (
                    <div
                      key={item.id}
                      className={`${styles.outlineItem} ${
                        item.level === 1 ? styles.outlineItemH1 : 
                        item.level === 2 ? styles.outlineItemH2 : 
                        styles.outlineItemH3
                      }`}
                    >
                      <span className={styles.outlineItemIcon}>{'#'.repeat(item.level)}</span>
                      <span className={styles.outlineItemText}>{item.text}</span>
                    </div>
                  ))
                ) : (
                  <div className={styles.outlineEmpty}>
                    暂无目录
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 右侧内容 */}
        <div className={styles.contentSection}>
          {/* 标签栏 */}
          {(knowledge.system_tags?.length || knowledge.operation_tags?.length) ? (
            <div className={styles.tagsBar}>
              {knowledge.system_tags?.map((tag) => (
                <span key={tag.id} className={`${styles.tag} ${styles.tagSystem}`}>
                  {tag.name}
                </span>
              ))}
              {knowledge.operation_tags?.map((tag) => (
                <span key={tag.id} className={`${styles.tag} ${styles.tagOperation}`}>
                  {tag.name}
                </span>
              ))}
            </div>
          ) : null}
          
          {/* 内容 */}
          <div className={styles.contentBody}>
            <div 
              className={styles.markdownContent}
              dangerouslySetInnerHTML={{ __html: renderedContent }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
