import { useState } from 'react';
import { Row, Col, Button, Typography, Modal, message, Spin, Empty, Input, Checkbox, Dropdown, Select, Tag, Tooltip } from 'antd';
import { PlusOutlined, DatabaseOutlined, EditOutlined, DeleteOutlined, EllipsisOutlined, CheckCircleOutlined, StopOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAdminKnowledgeList } from '../api/get-admin-knowledge';
import { useDeleteKnowledge, usePublishKnowledge, useUnpublishKnowledge } from '../api/manage-knowledge';
import { useLineTypeTags, useSystemTags, useOperationTags } from '../api/get-tags';
import { KnowledgeFormModal } from './knowledge-form-modal';
import type { KnowledgeListItem, KnowledgeType, Tag as TagType } from '@/types/api';
import { showApiError } from '@/utils/error-handler';
import { ROUTES } from '@/config/routes';
import dayjs from '@/lib/dayjs';
import styles from './admin-knowledge-list.module.css';

const { Title, Text } = Typography;
const { Search } = Input;

/**
 * 知识卡片组件
 */
interface KnowledgeCardProps {
  item: KnowledgeListItem;
  onEdit: (id: number) => void;
  onDelete: (item: KnowledgeListItem) => void;
  onView: (id: number) => void;
  onPublish?: (id: number) => void;
  onUnpublish?: (id: number) => void;
}

const KnowledgeCard: React.FC<KnowledgeCardProps> = ({ item, onEdit, onDelete, onView, onPublish, onUnpublish }) => {
  const isEmergency = item.knowledge_type === 'EMERGENCY';
  const isPublished = item.status === 'PUBLISHED';
  // 获取第一个操作标签作为顶部标签
  const firstOperationTag = item.operation_tags && item.operation_tags.length > 0 
    ? item.operation_tags[0].name 
    : null;
  
  const menuItems = [
    { key: 'edit', label: '编辑', icon: <EditOutlined /> },
    { 
      key: isPublished ? 'unpublish' : 'publish', 
      label: isPublished ? '取消发布' : '发布', 
      icon: isPublished ? <StopOutlined /> : <CheckCircleOutlined /> 
    },
    { key: 'delete', label: '删除', icon: <DeleteOutlined />, danger: true },
  ];

  const handleMenuClick = (key: string) => {
    if (key === 'edit') {
      onEdit(item.id);
    } else if (key === 'publish' && onPublish) {
      onPublish(item.id);
    } else if (key === 'unpublish' && onUnpublish) {
      onUnpublish(item.id);
    } else if (key === 'delete') {
      onDelete(item);
    }
  };

  return (
    <div className={styles.card} onClick={() => onView(item.id)}>
      {/* 标签 */}
      <div className={styles.cardHeader}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {!isPublished && (
            <span style={{ 
              fontSize: '12px', 
              color: '#999', 
              background: '#f5f5f5', 
              padding: '2px 8px', 
              borderRadius: '4px' 
            }}>
              草稿
            </span>
          )}
          {firstOperationTag && (
            <span className={`${styles.typeTag} ${isEmergency ? styles.emergencyTag : styles.normalTag}`}>
              {firstOperationTag}
            </span>
          )}
          <Tag color="geekblue" style={{ borderRadius: 12 }}>
            V{item.version_number}
          </Tag>
          {isPublished && item.is_current && (
            <Tag color="green" style={{ borderRadius: 12 }}>当前版本</Tag>
          )}
          {isPublished && !item.is_current && (
            <Tooltip title="此版本已被新版本取代，但仍可查看历史内容">
              <Tag color="orange" style={{ borderRadius: 12 }}>历史版本</Tag>
            </Tooltip>
          )}
        </div>
        <Dropdown
          menu={{
            items: menuItems,
            onClick: ({ key, domEvent }) => {
              domEvent.stopPropagation();
              handleMenuClick(key);
            },
          }}
          trigger={['click']}
        >
          <Button
            type="text"
            icon={<EllipsisOutlined />}
            className={styles.moreBtn}
            onClick={(e) => e.stopPropagation()}
          />
        </Dropdown>
      </div>

      {/* 标题 */}
      <h3 className={styles.cardTitle}>{item.title}</h3>

      {/* 分隔线 */}
      <div className={styles.cardDivider} />

      {/* 内容预览 */}
      {item.content_preview && (
        <div className={styles.cardPreview} title={item.content_preview}>
          {item.content_preview}
        </div>
      )}

      {/* 底部信息 */}
      <div className={styles.cardFooter}>
        <div>
          <span className={styles.lineType}>
            {item.updated_by_name || item.created_by_name || '-'}
          </span>
          <span className={styles.updateTime}>
            {item.updated_at ? dayjs(item.updated_at).format('YYYY-MM-DD') : '-'}
          </span>
        </div>
        <div className={styles.versionMeta}>
          <span>
            发布于：{item.published_at ? dayjs(item.published_at).format('YYYY-MM-DD HH:mm') : '未发布'}
          </span>
          <span>
            资源ID：{item.resource_uuid.slice(0, 8)}…
          </span>
        </div>
      </div>
    </div>
  );
};

/**
 * 管理员知识库列表组件
 * 采用卡片式布局
 */
type KnowledgeStatusFilter = 'ALL' | 'PUBLISHED' | 'DRAFT';

export const AdminKnowledgeList: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedLineTypeId, setSelectedLineTypeId] = useState<number | undefined>();
  const [selectedSystemTagIds, setSelectedSystemTagIds] = useState<number[]>([]);
  const [selectedOperationTagIds, setSelectedOperationTagIds] = useState<number[]>([]);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingKnowledgeId, setEditingKnowledgeId] = useState<number | undefined>();
  const [defaultKnowledgeType, setDefaultKnowledgeType] = useState<KnowledgeType>('OTHER');
  const [statusFilter, setStatusFilter] = useState<KnowledgeStatusFilter>('ALL');
  
  const navigate = useNavigate();
  
  // 获取条线类型标签
  const { data: lineTypeTags = [] } = useLineTypeTags();
  // 级联获取系统标签（根据已选条线类型）
  const { data: systemTags = [] } = useSystemTags(selectedLineTypeId);
  // 级联获取操作标签（根据已选条线类型）
  const { data: operationTags = [] } = useOperationTags(selectedLineTypeId);
  
  const { data, isLoading, refetch } = useAdminKnowledgeList({
    search: search || undefined,
    line_type_id: selectedLineTypeId,
    system_tag_id: selectedSystemTagIds[0],
    operation_tag_id: selectedOperationTagIds[0],
    status: statusFilter === 'ALL' ? undefined : (statusFilter as 'PUBLISHED' | 'DRAFT'),
  });
  const deleteKnowledge = useDeleteKnowledge();
  const publishKnowledge = usePublishKnowledge();
  const unpublishKnowledge = useUnpublishKnowledge();

  /**
   * 处理条线类型选择
   */
  const handleLineTypeSelect = (id: number | undefined) => {
    if (selectedLineTypeId === id) {
      setSelectedLineTypeId(undefined);
    } else {
      setSelectedLineTypeId(id);
    }
    setSelectedSystemTagIds([]);
    setSelectedOperationTagIds([]);
  };

  /**
   * 处理系统标签选择
   */
  const handleSystemTagChange = (tagId: number, checked: boolean) => {
    if (checked) {
      setSelectedSystemTagIds([...selectedSystemTagIds, tagId]);
    } else {
      setSelectedSystemTagIds(selectedSystemTagIds.filter(id => id !== tagId));
    }
  };

  /**
   * 处理操作标签选择
   */
  const handleOperationTagChange = (tagId: number, checked: boolean) => {
    if (checked) {
      setSelectedOperationTagIds([...selectedOperationTagIds, tagId]);
    } else {
      setSelectedOperationTagIds(selectedOperationTagIds.filter(id => id !== tagId));
    }
  };

  /**
   * 处理删除知识
   */
  const handleDelete = (record: KnowledgeListItem) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除知识文档「${record.title}」吗？此操作不可撤销。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteKnowledge.mutateAsync(record.id);
          message.success('删除成功');
        } catch (error) {
          showApiError(error, '删除失败');
        }
      },
    });
  };

  /**
   * 打开编辑弹窗
   */
  const handleEdit = (id: number) => {
    setEditingKnowledgeId(id);
    setFormModalOpen(true);
  };

  /**
   * 打开新建弹窗（应急类）
   */
  const handleCreateEmergency = () => {
    setEditingKnowledgeId(undefined);
    setDefaultKnowledgeType('EMERGENCY');
    setFormModalOpen(true);
  };

  /**
   * 打开新建弹窗（普通文档）
   */
  const handleCreateNormal = () => {
    setEditingKnowledgeId(undefined);
    setDefaultKnowledgeType('OTHER');
    setFormModalOpen(true);
  };

  /**
   * 查看详情
   */
  const handleView = (id: number) => {
    navigate(`${ROUTES.ADMIN_KNOWLEDGE}/${id}`);
  };

  /**
   * 发布知识
   */
  const handlePublish = async (id: number) => {
    try {
      await publishKnowledge.mutateAsync(id);
      message.success('发布成功');
      refetch();
    } catch (error) {
      showApiError(error, '发布失败');
    }
  };

  /**
   * 取消发布知识
   */
  const handleUnpublish = async (id: number) => {
    Modal.confirm({
      title: '确认取消发布',
      content: '取消发布后，该知识将变为草稿状态，无法用于任务分配。确定要取消发布吗？',
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          await unpublishKnowledge.mutateAsync(id);
          message.success('取消发布成功');
          refetch();
        } catch (error) {
          showApiError(error, '取消发布失败');
        }
      },
    });
  };

  return (
    <div className={styles.container}>
      {/* 页面头部 */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <DatabaseOutlined className={styles.headerIcon} />
          <div className={styles.headerInfo}>
            <Title level={3} className={styles.headerTitle}>知识库治理</Title>
            <Text className={styles.headerSubtitle}>
              维护全平台原子知识文档，定义应急类与通用类技术标准。
            </Text>
          </div>
        </div>
        <div className={styles.headerRight}>
          <Button
            type="primary"
            danger
            icon={<PlusOutlined />}
            className={styles.emergencyBtn}
            onClick={handleCreateEmergency}
          >
            新建应急类知识
          </Button>
          <Button
            icon={<PlusOutlined />}
            className={styles.normalBtn}
            onClick={handleCreateNormal}
          >
            新建普通文档
          </Button>
        </div>
      </div>

      <div className={styles.mainContent}>
        {/* 侧边栏筛选 */}
        <aside className={styles.sidebar}>
          {/* 条线类型 */}
          <div className={styles.filterSection}>
            <div className={styles.filterTitle}>条线类型</div>
            <div className={styles.lineTypeList}>
              <div
                className={`${styles.lineTypeItem} ${!selectedLineTypeId ? styles.lineTypeItemActive : ''}`}
                onClick={() => handleLineTypeSelect(undefined)}
              >
                全部
              </div>
              {lineTypeTags.map((tag: TagType) => (
                <div
                  key={tag.id}
                  className={`${styles.lineTypeItem} ${selectedLineTypeId === tag.id ? styles.lineTypeItemActive : ''}`}
                  onClick={() => handleLineTypeSelect(tag.id)}
                >
                  {tag.name}
                </div>
              ))}
            </div>
          </div>

          {/* 系统标签（选择条线后显示） */}
          {selectedLineTypeId && systemTags.length > 0 && (
            <div className={styles.filterSection}>
              <div className={styles.filterTitle}>系统标签</div>
              <div className={styles.tagList}>
                {systemTags.map((tag: TagType) => (
                  <Checkbox
                    key={tag.id}
                    checked={selectedSystemTagIds.includes(tag.id)}
                    onChange={(e) => handleSystemTagChange(tag.id, e.target.checked)}
                    className={styles.tagCheckbox}
                  >
                    {tag.name}
                  </Checkbox>
                ))}
              </div>
            </div>
          )}

          {/* 操作标签（选择条线后显示） */}
          {selectedLineTypeId && operationTags.length > 0 && (
            <div className={styles.filterSection}>
              <div className={styles.filterTitle}>操作标签</div>
              <div className={styles.tagList}>
                {operationTags.map((tag: TagType) => (
                  <Checkbox
                    key={tag.id}
                    checked={selectedOperationTagIds.includes(tag.id)}
                    onChange={(e) => handleOperationTagChange(tag.id, e.target.checked)}
                    className={styles.tagCheckbox}
                  >
                    {tag.name}
                  </Checkbox>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* 知识卡片列表 */}
        <main className={styles.content}>
          {/* 搜索和统计 */}
          <div className={styles.contentHeader}>
            <Search
              placeholder="搜索知识标题或内容..."
              allowClear
              onSearch={setSearch}
              className={styles.searchInput}
            />
            <Select
              value={statusFilter}
              options={[
                { label: '全部状态', value: 'ALL' },
                { label: '仅已发布', value: 'PUBLISHED' },
                { label: '仅草稿', value: 'DRAFT' },
              ]}
              onChange={(value: KnowledgeStatusFilter) => setStatusFilter(value)}
              className={styles.statusSelect}
            />
            <span className={styles.resultCount}>
              共 {data?.length || 0} 篇知识文档
            </span>
          </div>
          <Spin spinning={isLoading}>
            {data && data.length > 0 ? (
              <Row gutter={[24, 24]}>
                {data.map((item) => (
                  <Col key={item.id} xs={24} sm={12} lg={8} xxl={6}>
                    <KnowledgeCard
                      item={item}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onView={handleView}
                      onPublish={handlePublish}
                      onUnpublish={handleUnpublish}
                    />
                  </Col>
                ))}
              </Row>
            ) : (
              <Empty
                description="暂无知识文档"
                className={styles.empty}
              />
            )}
          </Spin>
        </main>
      </div>

      {/* 知识表单弹窗 */}
      <KnowledgeFormModal
        open={formModalOpen}
        knowledgeId={editingKnowledgeId}
        defaultKnowledgeType={defaultKnowledgeType}
        onClose={() => {
          setFormModalOpen(false);
          setEditingKnowledgeId(undefined);
        }}
        onSuccess={() => {
          refetch();
        }}
      />
    </div>
  );
};
