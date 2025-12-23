import { useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Typography, Tag, Spin, Button, Divider, Modal, message, Space } from 'antd';
import { ArrowLeftOutlined, EyeOutlined, CalendarOutlined, UserOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined, StopOutlined } from '@ant-design/icons';
import { useStudentKnowledgeDetail } from '../api/get-student-knowledge-detail';
import { useKnowledgeDetail as useAdminKnowledgeDetail } from '../api/get-admin-knowledge';
import { useDeleteKnowledge, usePublishKnowledge, useUnpublishKnowledge } from '../api/manage-knowledge';
import { KnowledgeFormModal } from './knowledge-form-modal';
import { Card, StatusBadge } from '@/components/ui';
import type { KnowledgeDetail as KnowledgeDetailType } from '@/types/api';
import { ROUTES } from '@/config/routes';
import { showApiError } from '@/utils/error-handler';
import dayjs from '@/lib/dayjs';

const { Title, Text } = Typography;

/**
 * 知识详情组件
 * 
 * 支持管理员和学员两种视图：
 * - 管理员视图：显示完整信息，包括状态、编辑功能等
 * - 学员视图：只显示已发布的知识
 * 
 * 注意：阅读次数在点击知识卡片时记录，不在详情页面记录
 */
export const KnowledgeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  
  // 根据路由判断使用哪个 API
  const isAdminRoute = location.pathname.startsWith(ROUTES.ADMIN_KNOWLEDGE);
  const studentQuery = useStudentKnowledgeDetail(Number(id));
  const adminQuery = useAdminKnowledgeDetail(Number(id));
  
  const { data, isLoading, refetch } = isAdminRoute ? adminQuery : studentQuery;
  
  // 操作相关状态
  const [formModalOpen, setFormModalOpen] = useState(false);
  const deleteKnowledge = useDeleteKnowledge();
  const publishKnowledge = usePublishKnowledge();
  const unpublishKnowledge = useUnpublishKnowledge();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--spacing-12)' }}>
        <Text type="secondary">知识文档不存在</Text>
      </div>
    );
  }

  const knowledge = data as KnowledgeDetailType;
  const isPublished = knowledge.status === 'PUBLISHED';
  
  /**
   * 处理编辑
   */
  const handleEdit = () => {
    setFormModalOpen(true);
  };
  
  /**
   * 处理删除
   */
  const handleDelete = () => {
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
      content: '取消发布后，该知识将变为草稿状态，无法用于任务分配。确定要取消发布吗？',
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
  
  // 获取内容（应急类知识需要手动组合结构化字段）
  const getContent = () => {
    if (knowledge.knowledge_type === 'EMERGENCY') {
      const parts = [];
      if (knowledge.fault_scenario) parts.push(`<h3>故障场景</h3><div class="content-section">${knowledge.fault_scenario}</div>`);
      if (knowledge.trigger_process) parts.push(`<h3>触发流程</h3><div class="content-section">${knowledge.trigger_process}</div>`);
      if (knowledge.solution) parts.push(`<h3>解决方案</h3><div class="content-section">${knowledge.solution}</div>`);
      if (knowledge.verification_plan) parts.push(`<h3>验证方案</h3><div class="content-section">${knowledge.verification_plan}</div>`);
      if (knowledge.recovery_plan) parts.push(`<h3>恢复方案</h3><div class="content-section">${knowledge.recovery_plan}</div>`);
      return parts.join('');
    }
    return knowledge.content || '';
  };

  return (
    <div className="animate-fadeIn">
      {/* 返回按钮 */}
      <div style={{ marginBottom: 'var(--spacing-4)' }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(-1)}
          style={{
            color: 'var(--color-gray-600)',
            fontWeight: 500,
          }}
        >
          返回列表
        </Button>
      </div>

      <Card>
        {/* 标题区 */}
        <div style={{ marginBottom: 'var(--spacing-6)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-3)', flexWrap: 'wrap', gap: 'var(--spacing-3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', flexWrap: 'wrap' }}>
              <StatusBadge
                status={knowledge.knowledge_type === 'EMERGENCY' ? 'error' : 'info'}
                text={knowledge.knowledge_type_display}
              />
              {knowledge.line_type && (
                <Tag style={{ margin: 0, borderRadius: 'var(--radius-full)' }}>
                  {knowledge.line_type.name}
                </Tag>
              )}
              {isAdminRoute && (
                <StatusBadge
                  status={knowledge.status === 'PUBLISHED' ? 'success' : 'default'}
                  text={knowledge.status_display}
                  showIcon={false}
                />
              )}
            </div>
            
            {/* 操作按钮（仅管理员可见） */}
            {isAdminRoute && (
              <Space>
                <Button
                  icon={<EditOutlined />}
                  onClick={handleEdit}
                >
                  编辑
                </Button>
                {isPublished ? (
                  <Button
                    icon={<StopOutlined />}
                    onClick={handleUnpublish}
                  >
                    取消发布
                  </Button>
                ) : (
                  <Button
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    onClick={handlePublish}
                  >
                    发布
                  </Button>
                )}
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={handleDelete}
                >
                  删除
                </Button>
              </Space>
            )}
          </div>
          
          <Title
            level={2}
            style={{
              margin: 0,
              marginBottom: 'var(--spacing-4)',
              fontSize: 'var(--font-size-3xl)',
              fontWeight: 700,
              color: 'var(--color-gray-900)',
            }}
          >
            {knowledge.title}
          </Title>

          {/* 标签 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-2)', marginBottom: 'var(--spacing-4)' }}>
            {knowledge.operation_tags?.map((tag) => (
              <Tag
                key={tag.id}
                style={{
                  margin: 0,
                  background: 'var(--color-primary-50)',
                  color: 'var(--color-primary-600)',
                  border: 'none',
                  borderRadius: 'var(--radius-full)',
                }}
              >
                {tag.name}
              </Tag>
            ))}
            {knowledge.system_tags?.map((tag) => (
              <Tag
                key={tag.id}
                style={{
                  margin: 0,
                  background: 'rgba(155, 0, 255, 0.1)',
                  color: 'var(--color-purple-500)',
                  border: 'none',
                  borderRadius: 'var(--radius-full)',
                }}
              >
                {tag.name}
              </Tag>
            ))}
          </div>

          {/* 元信息 */}
          <div
            style={{
              display: 'flex',
              gap: 'var(--spacing-6)',
              flexWrap: 'wrap',
              padding: 'var(--spacing-4)',
              background: 'var(--color-gray-50)',
              borderRadius: 'var(--radius-lg)',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-gray-600)',
            }}
          >
            {knowledge.created_by_name && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                <UserOutlined />
                <span>创建人：{knowledge.created_by_name}</span>
              </div>
            )}
            {knowledge.updated_by_name && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                <UserOutlined />
                <span>更新人：{knowledge.updated_by_name}</span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
              <EyeOutlined />
              <span>阅读次数：{knowledge.view_count}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
              <CalendarOutlined />
              <span>更新时间：{dayjs(knowledge.updated_at).format('YYYY-MM-DD HH:mm')}</span>
            </div>
          </div>
        </div>

        <Divider style={{ margin: 'var(--spacing-6) 0' }} />

        {/* 内容区 */}
        <div
          className="knowledge-content"
          dangerouslySetInnerHTML={{
            __html: getContent(),
          }}
        />

        <style>{`
          .knowledge-content {
            color: var(--color-gray-800);
            line-height: 1.8;
            font-size: var(--font-size-base);
          }
          .knowledge-content h3 {
            color: var(--color-gray-900);
            font-size: var(--font-size-xl);
            font-weight: 600;
            margin: var(--spacing-8) 0 var(--spacing-4) 0;
            padding-bottom: var(--spacing-2);
            border-bottom: 2px solid var(--color-primary-100);
            display: flex;
            align-items: center;
            gap: var(--spacing-2);
          }
          .knowledge-content h3::before {
            content: '';
            display: inline-block;
            width: 4px;
            height: 20px;
            background: linear-gradient(180deg, var(--color-primary-500) 0%, var(--color-purple-500) 100%);
            border-radius: 2px;
          }
          .knowledge-content .content-section {
            padding: var(--spacing-4);
            background: var(--color-gray-50);
            border-radius: var(--radius-lg);
            margin-bottom: var(--spacing-4);
          }
          .knowledge-content p {
            margin: var(--spacing-3) 0;
            color: var(--color-gray-700);
          }
          .knowledge-content ul,
          .knowledge-content ol {
            margin: var(--spacing-3) 0;
            padding-left: var(--spacing-6);
            color: var(--color-gray-700);
          }
          .knowledge-content li {
            margin: var(--spacing-2) 0;
          }
          .knowledge-content code {
            background: var(--color-primary-50);
            color: var(--color-primary-700);
            padding: 2px 6px;
            border-radius: var(--radius-sm);
            font-family: var(--font-mono);
            font-size: var(--font-size-sm);
          }
          .knowledge-content pre {
            background: var(--color-gray-900);
            color: var(--color-gray-100);
            padding: var(--spacing-5);
            border-radius: var(--radius-lg);
            overflow-x: auto;
            margin: var(--spacing-4) 0;
          }
          .knowledge-content pre code {
            background: transparent;
            color: inherit;
            padding: 0;
          }
          .knowledge-content a {
            color: var(--color-primary-500);
            text-decoration: underline;
          }
          .knowledge-content a:hover {
            color: var(--color-primary-600);
          }
          .knowledge-content blockquote {
            margin: var(--spacing-4) 0;
            padding: var(--spacing-4) var(--spacing-5);
            border-left: 4px solid var(--color-primary-500);
            background: var(--color-primary-50);
            border-radius: 0 var(--radius-md) var(--radius-md) 0;
            color: var(--color-gray-700);
          }
          .knowledge-content table {
            width: 100%;
            border-collapse: collapse;
            margin: var(--spacing-4) 0;
          }
          .knowledge-content th,
          .knowledge-content td {
            padding: var(--spacing-3) var(--spacing-4);
            border: 1px solid var(--color-gray-200);
            text-align: left;
          }
          .knowledge-content th {
            background: var(--color-gray-50);
            font-weight: 600;
          }
          .knowledge-content img {
            max-width: 100%;
            border-radius: var(--radius-lg);
            margin: var(--spacing-4) 0;
          }
        `}</style>
      </Card>
      
      {/* 编辑表单弹窗（仅管理员可见） */}
      {isAdminRoute && (
        <KnowledgeFormModal
          open={formModalOpen}
          knowledgeId={Number(id)}
          onClose={() => {
            setFormModalOpen(false);
          }}
          onSuccess={() => {
            setFormModalOpen(false);
            refetch?.();
          }}
        />
      )}
    </div>
  );
};
