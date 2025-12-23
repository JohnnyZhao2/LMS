import { useState } from 'react';
import { Row, Col, Button, Modal, message, Spin, Empty, Input, Checkbox, Dropdown, Tabs, Pagination } from 'antd';
import { PlusOutlined, MoreOutlined, EditOutlined, CheckCircleOutlined, CloseCircleOutlined, SyncOutlined, EyeOutlined, CalendarOutlined, UserOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAdminKnowledgeList } from '../api/get-admin-knowledge';
import { useLineTypeTags, useSystemTags, useOperationTags } from '../api/get-tags';
import { KnowledgeFormModal } from './knowledge-form-modal';
import { usePublishKnowledge, useUnpublishKnowledge } from '../api/manage-knowledge';
import { showApiError } from '@/utils/error-handler';
import type { KnowledgeListItem, KnowledgeType, KnowledgeFilterType, Tag as TagType } from '@/types/api';
import { ROUTES } from '@/config/routes';
import dayjs from '@/lib/dayjs';
import styles from './admin-knowledge-list.module.css';

const { Search } = Input;

/**
 * 知识卡片组件
 */
interface KnowledgeCardProps {
  item: KnowledgeListItem;
  onView: (id: number) => void;
  onEdit: (id: number) => void;
  onPublish: (id: number) => Promise<void>;
  onUnpublish: (id: number) => Promise<void>;
}

const KnowledgeCard: React.FC<KnowledgeCardProps> = ({ item, onView, onEdit, onPublish, onUnpublish }) => {
  const isEmergency = item.knowledge_type === 'EMERGENCY';
  const isPublished = item.status === 'PUBLISHED';
  const isRevising = item.edit_status === 'REVISING';
  const isUnpublished = item.edit_status === 'UNPUBLISHED';
  
  // 获取第一个操作标签作为顶部标签
  const firstOperationTag = item.operation_tags && item.operation_tags.length > 0 
    ? item.operation_tags[0].name 
    : null;

  /**
   * 处理操作菜单点击
   */
  const handleMenuClick: MenuProps['onClick'] = async ({ key }) => {
    if (key === 'edit') {
      onEdit(item.id);
    } else if (key === 'publish') {
      // 如果是修订中状态，发布草稿版本
      const idToPublish = item.pending_draft_id || item.id;
      await onPublish(idToPublish);
    } else if (key === 'unpublish') {
      await onUnpublish(item.id);
    }
  };

  /**
   * 操作菜单项
   */
  const menuItems: MenuProps['items'] = [
    {
      key: 'edit',
      label: '编辑',
      icon: <EditOutlined />,
    },
    // 如果是修订中，显示"发布修订"
    ...(isRevising
      ? [
          {
            key: 'publish',
            label: '发布修订',
            icon: <CheckCircleOutlined />,
          },
        ]
      : isPublished
        ? [
            {
              key: 'unpublish',
              label: '取消发布',
              icon: <CloseCircleOutlined />,
            },
          ]
        : [
            {
              key: 'publish',
              label: '发布',
              icon: <CheckCircleOutlined />,
            },
          ]),
  ];

  /**
   * 获取卡片样式类名
   */
  const getCardClassName = () => {
    const classes = [styles.card];
    if (isRevising) {
      classes.push(styles.cardRevising);
    } else if (isUnpublished) {
      classes.push(styles.cardUnpublished);
    }
    return classes.join(' ');
  };

  return (
    <div className={getCardClassName()}>
      {/* 顶部：左上角操作标签，右上角操作菜单 */}
      <div className={styles.cardHeader}>
        <div className={styles.cardHeaderLeft}>
          {/* 仅保留核心的操作标签，减少视觉疲劳 */}
          {firstOperationTag && (
            <span className={`${styles.typeTag} ${isEmergency ? styles.emergencyTag : styles.normalTag}`}>
              {firstOperationTag}
            </span>
          )}
          {/* 修订中和草稿状态通过卡片整体样式表达，不再使用文字标签 */}
        </div>
        <div className={styles.cardHeaderRight}>
          {isRevising && (
            <span className={styles.revisingTag}>
              <SyncOutlined spin style={{ marginRight: 6, fontSize: 12 }} />
              修订中
            </span>
          )}
          <Dropdown
            menu={{ items: menuItems, onClick: handleMenuClick }}
            trigger={['click']}
            placement="bottomRight"
          >
            <Button
              type="text"
              icon={<MoreOutlined />}
              className={styles.actionButton}
              onClick={(e) => e.stopPropagation()}
            />
          </Dropdown>
        </div>
      </div>

      {/* 主体内容：标题 + 知识内容缩略 */}
      <div className={styles.cardBody} onClick={() => onView(item.id)}>
        <h3 className={styles.cardTitle}>{item.title}</h3>
        <div className={styles.cardPreview} title={item.content_preview || ''}>
          {item.content_preview || '暂无内容预览'}
        </div>
      </div>

      {/* 底部信息：姓名、时间、阅读次数 */}
      <div className={styles.cardFooter} onClick={() => onView(item.id)}>
        <div className={styles.footerLeft}>
          <div className={styles.footerItem}>
            <div className={styles.userAvatar}>
              {(item.updated_by_name || item.created_by_name || '?').charAt(0)}
            </div>
            <span>{item.updated_by_name || item.created_by_name || '-'}</span>
          </div>
          <div className={styles.footerItem}>
            <CalendarOutlined />
            <span>{item.updated_at ? dayjs(item.updated_at).format('YYYY-MM-DD') : '-'}</span>
          </div>
        </div>
        <div className={styles.footerRight}>
          <EyeOutlined />
          <span>{item.view_count || 0}</span>
        </div>
      </div>
    </div>
  );
};

/**
 * 管理员知识库列表组件
 * 采用双栏布局：左侧筛选，右侧列表
 * 
 * 筛选类型说明：
 * - ALL: 全部（已发布+未发布，不含已发布版本的草稿副本）
 * - PUBLISHED_CLEAN: 已发布且无待发布修改
 * - REVISING: 修订中（已发布但有待发布的草稿修改）
 * - UNPUBLISHED: 未发布（从未发布过的新草稿）
 */
export const AdminKnowledgeList: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedLineTypeId, setSelectedLineTypeId] = useState<number | undefined>();
  const [selectedSystemTagIds, setSelectedSystemTagIds] = useState<number[]>([]);
  const [selectedOperationTagIds, setSelectedOperationTagIds] = useState<number[]>([]);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingKnowledgeId, setEditingKnowledgeId] = useState<number | undefined>();
  const [defaultKnowledgeType, setDefaultKnowledgeType] = useState<KnowledgeType>('OTHER');
  const [filterType, setFilterType] = useState<KnowledgeFilterType>('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  const navigate = useNavigate();
  
  // 获取条线类型标签
  const { data: lineTypeTags = [] } = useLineTypeTags();
  // 级联获取系统标签（根据已选条线类型）
  const { data: systemTags = [] } = useSystemTags(selectedLineTypeId);
  // 级联获取操作标签（根据已选条线类型）
  const { data: operationTags = [] } = useOperationTags(selectedLineTypeId);
  
  // 应用状态筛选的数据
  const { data, isLoading, refetch } = useAdminKnowledgeList({
    search: search || undefined,
    line_type_id: selectedLineTypeId,
    system_tag_id: selectedSystemTagIds[0],
    operation_tag_id: selectedOperationTagIds[0],
    filter_type: filterType,
    page,
    pageSize,
  });
  
  /**
   * 处理分页变化
   */
  const handlePageChange = (newPage: number, newPageSize: number) => {
    setPage(newPage);
    setPageSize(newPageSize);
  };

  // 发布和取消发布操作
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
    setPage(1); // 重置到第一页
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
    setPage(1); // 重置到第一页
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
    setPage(1); // 重置到第一页
  };

  /**
   * 打开新建弹窗
   */
  const handleCreate = () => {
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
   * 处理编辑
   */
  const handleEdit = (id: number) => {
    setEditingKnowledgeId(id);
    setFormModalOpen(true);
  };

  /**
   * 处理发布
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
   * 处理取消发布
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
      <div className={styles.mainContent}>
        {/* 左侧：新建按钮和筛选 */}
        <aside className={styles.sidebar}>
          {/* 新建文档按钮 */}
          <div className={styles.sidebarHeader}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              className={styles.createButton}
              onClick={handleCreate}
              block
            >
              创建新知识文档
            </Button>
          </div>

          {/* 筛选区域 */}
          <div className={styles.sidebarContent}>
            {/* 业务条线 */}
            <div className={styles.filterSection}>
              <div className={styles.filterTitle}>业务条线</div>
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
          </div>
        </aside>

        {/* 右侧：状态筛选、搜索、统计和卡片列表 */}
        <main className={styles.content}>
          {/* 右侧顶部：状态筛选、搜索、统计 */}
          <div className={styles.contentHeader}>
            {/* 状态筛选 */}
            <Tabs
              activeKey={filterType}
              onChange={(key) => {
                setFilterType(key as KnowledgeFilterType);
                setPage(1); // 重置到第一页
              }}
              items={[
                { key: 'ALL', label: '全部' },
                { key: 'PUBLISHED_CLEAN', label: '已发布' },
                { key: 'REVISING', label: '修订中' },
                { key: 'UNPUBLISHED', label: '草稿箱' },
              ]}
              className={styles.statusTabs}
            />

            {/* 搜索 */}
            <Search
              placeholder="全库检索..."
              allowClear
              onSearch={(value) => {
                setSearch(value);
                setPage(1); // 重置到第一页
              }}
              className={styles.searchInput}
              size="large"
            />
          </div>

          {/* 知识卡片列表 */}
          <Spin spinning={isLoading}>
            {data?.results && data.results.length > 0 ? (
              <>
                <Row gutter={[24, 24]}>
                  {data.results.map((item) => (
                    <Col key={item.id} xs={24} sm={12} lg={8} xxl={6}>
                      <KnowledgeCard
                        item={item}
                        onView={handleView}
                        onEdit={handleEdit}
                        onPublish={handlePublish}
                        onUnpublish={handleUnpublish}
                      />
                    </Col>
                  ))}
                </Row>
                <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
                  <Pagination
                    current={page}
                    total={data.count || 0}
                    pageSize={pageSize}
                    showSizeChanger
                    showTotal={(total) => `共 ${total} 条`}
                    onChange={handlePageChange}
                    onShowSizeChange={handlePageChange}
                    pageSizeOptions={[12, 20, 40, 60]}
                  />
                </div>
              </>
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
