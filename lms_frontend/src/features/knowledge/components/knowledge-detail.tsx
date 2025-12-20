import { useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Card, Typography, Tag, Spin } from 'antd';
import { useStudentKnowledgeDetail } from '../api/get-student-knowledge-detail';
import { useKnowledgeDetail as useAdminKnowledgeDetail } from '../api/get-admin-knowledge';
import { useIncrementViewCount } from '../api/increment-view-count';
import type { KnowledgeDetail } from '@/types/api';
import { ROUTES } from '@/config/routes';
import dayjs from '@/lib/dayjs';

const { Title, Text } = Typography;

/**
 * 知识详情组件
 * 
 * 支持管理员和学员两种视图：
 * - 管理员视图：显示完整信息，包括状态、编辑功能等
 * - 学员视图：只显示已发布的知识，查看时自动记录阅读次数
 */
export const KnowledgeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  
  // 根据路由判断使用哪个 API
  const isAdminRoute = location.pathname.startsWith(ROUTES.ADMIN_KNOWLEDGE);
  const studentQuery = useStudentKnowledgeDetail(Number(id));
  const adminQuery = useAdminKnowledgeDetail(Number(id));
  
  const { data, isLoading } = isAdminRoute ? adminQuery : studentQuery;
  const incrementViewCount = useIncrementViewCount();

  // 学员查看时，自动记录阅读次数
  useEffect(() => {
    if (!isAdminRoute && id && data && !isLoading) {
      // 延迟调用，避免影响页面加载
      const timer = setTimeout(() => {
        incrementViewCount.mutate(Number(id));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [id, data, isLoading, isAdminRoute, incrementViewCount]);

  if (isLoading) {
    return <Spin />;
  }

  if (!data) {
    return <div>知识文档不存在</div>;
  }

  const knowledge = data as KnowledgeDetail;
  
  // 获取内容（应急类知识需要手动组合结构化字段）
  const getContent = () => {
    if (knowledge.knowledge_type === 'EMERGENCY') {
      const parts = [];
      if (knowledge.fault_scenario) parts.push(`<h3>故障场景</h3><p>${knowledge.fault_scenario}</p>`);
      if (knowledge.trigger_process) parts.push(`<h3>触发流程</h3><p>${knowledge.trigger_process}</p>`);
      if (knowledge.solution) parts.push(`<h3>解决方案</h3><p>${knowledge.solution}</p>`);
      if (knowledge.verification_plan) parts.push(`<h3>验证方案</h3><p>${knowledge.verification_plan}</p>`);
      if (knowledge.recovery_plan) parts.push(`<h3>恢复方案</h3><p>${knowledge.recovery_plan}</p>`);
      return parts.join('');
    }
    return knowledge.content || '';
  };

  return (
    <div style={{ padding: '24px', background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)', minHeight: 'calc(100vh - 64px)', margin: '-24px' }}>
      <Card style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px' }}>
        <Title level={2} style={{ color: '#ffffff', marginBottom: '16px' }}>
          {knowledge.title}
        </Title>
        
        {/* 标签和元信息 */}
        <div style={{ marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          <Tag color={knowledge.knowledge_type === 'EMERGENCY' ? 'red' : 'blue'}>
            {knowledge.knowledge_type_display}
          </Tag>
          {knowledge.line_type && (
            <Tag color="default">{knowledge.line_type.name}</Tag>
          )}
          {knowledge.operation_tags?.map((tag) => (
            <Tag key={tag.id}>{tag.name}</Tag>
          ))}
          {knowledge.system_tags?.map((tag) => (
            <Tag key={tag.id} color="purple">{tag.name}</Tag>
          ))}
        </div>

        {/* 元数据信息 */}
        <div style={{ marginBottom: '24px', padding: '12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)' }}>
          {knowledge.created_by_name && (
            <span>创建人：{knowledge.created_by_name}</span>
          )}
          {knowledge.updated_by_name && (
            <span>更新人：{knowledge.updated_by_name}</span>
          )}
          <span>阅读次数：{knowledge.view_count}</span>
          <span>更新时间：{dayjs(knowledge.updated_at).format('YYYY-MM-DD HH:mm')}</span>
          {isAdminRoute && (
            <Tag color={knowledge.status === 'PUBLISHED' ? 'green' : 'default'}>
              {knowledge.status_display}
            </Tag>
          )}
        </div>

        {/* 内容 */}
        <div
          style={{
            color: 'rgba(255, 255, 255, 0.9)',
            lineHeight: '1.8',
            fontSize: '15px',
          }}
          className="knowledge-content"
          dangerouslySetInnerHTML={{
            __html: getContent(),
          }}
        />
        <style>{`
          .knowledge-content h3 {
            color: #ffffff;
            font-size: 18px;
            font-weight: 600;
            margin: 24px 0 12px 0;
            padding-bottom: 8px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          }
          .knowledge-content p {
            margin: 12px 0;
            color: rgba(255, 255, 255, 0.8);
          }
          .knowledge-content ul,
          .knowledge-content ol {
            margin: 12px 0;
            padding-left: 24px;
            color: rgba(255, 255, 255, 0.8);
          }
          .knowledge-content li {
            margin: 8px 0;
          }
          .knowledge-content code {
            background: rgba(255, 255, 255, 0.1);
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Monaco', 'Courier New', monospace;
            font-size: 13px;
          }
          .knowledge-content pre {
            background: rgba(255, 255, 255, 0.05);
            padding: 16px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 16px 0;
          }
          .knowledge-content pre code {
            background: transparent;
            padding: 0;
          }
        `}</style>
      </Card>
    </div>
  );
};

