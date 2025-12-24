import { useState, useMemo } from 'react';
import { Modal, message, Spin, Dropdown, Pagination } from 'antd';
import { 
  PlusOutlined, 
  MoreOutlined, 
  EditOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  EyeOutlined, 
  SearchOutlined,
  HomeOutlined,
  DatabaseOutlined,
  CloudOutlined,
  ApiOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  FileTextOutlined,
  InboxOutlined,
  AppstoreOutlined
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAdminKnowledgeList } from '../api/get-admin-knowledge';
import { useLineTypeTags, useSystemTags } from '../api/get-tags';
import { KnowledgeFormModal } from './knowledge-form-modal';
import { usePublishKnowledge, useUnpublishKnowledge } from '../api/manage-knowledge';
import { showApiError } from '@/utils/error-handler';
import type { KnowledgeListItem, KnowledgeType, KnowledgeFilterType, Tag as TagType, SimpleTag } from '@/types/api';
import { ROUTES } from '@/config/routes';
import dayjs from '@/lib/dayjs';
import styles from './knowledge-library.module.css';

/**
 * 条线类型图标映射
 */
const LINE_TYPE_ICONS: Record<string, React.ReactNode> = {
  '双云': <CloudOutlined />,
  '数据库': <DatabaseOutlined />,
  '网络': <ApiOutlined />,
  '应用': <AppstoreOutlined />,
  '应急': <SafetyCertificateOutlined />,
  '规章制度': <FileTextOutlined />,
  '其他': <SettingOutlined />,
};

/**
 * 获取条线类型图标
 */
const getLineTypeIcon = (name: string): React.ReactNode => {
  return LINE_TYPE_ICONS[name] || <FileTextOutlined />;
};

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

  /**
   * 获取状态样式类和文本
   */
  const getStatusInfo = () => {
    if (isRevising) {
      return { className: styles.statusRevising, text: '修订中' };
    }
    if (isPublished) {
      return { className: styles.statusPublished, text: '已发布' };
    }
    return { className: styles.statusDraft, text: '草稿' };
  };

  const statusInfo = getStatusInfo();

  /**
   * 处理操作菜单点击
   */
  const handleMenuClick: MenuProps['onClick'] = async ({ key, domEvent }) => {
    domEvent.stopPropagation();
    if (key === 'edit') {
      onEdit(item.id);
    } else if (key === 'publish') {
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
    ...(isRevising
      ? [{ key: 'publish', label: '发布修订', icon: <CheckCircleOutlined /> }]
      : isPublished
        ? [{ key: 'unpublish', label: '取消发布', icon: <CloseCircleOutlined /> }]
        : [{ key: 'publish', label: '发布', icon: <CheckCircleOutlined /> }]),
  ];

  /**
   * 获取所有标签（系统标签 + 操作标签）
   */
  const allTags = useMemo(() => {
    const tags: SimpleTag[] = [];
    if (item.system_tags) tags.push(...item.system_tags);
    if (item.operation_tags) tags.push(...item.operation_tags);
    return tags;
  }, [item.system_tags, item.operation_tags]);

  /**
   * 显示的标签（最多3个）
   */
  const displayTags = allTags.slice(0, 3);
  const moreTags = allTags.length - 3;

  return (
    <div className={styles.card} onClick={() => onView(item.id)}>
      {/* 卡片头部：文档类型 + 状态 */}
      <div className={styles.cardHeader}>
        <div className={styles.docType}>
          <span className={`${styles.docTypeDot} ${isEmergency ? styles.docTypeDotEmergency : styles.docTypeDotStandard}`} />
          <span className={styles.docTypeLabel}>
            {isEmergency ? 'EMERGENCY_OPS' : 'STANDARD_LOGIC'}
          </span>
        </div>
        <div className={styles.cardHeaderRight}>
          <span className={`${styles.statusBadge} ${statusInfo.className}`}>
            {statusInfo.text}
          </span>
          <Dropdown
            menu={{ items: menuItems, onClick: handleMenuClick }}
            trigger={['click']}
            placement="bottomRight"
          >
            <button
              className={styles.actionButton}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreOutlined />
            </button>
          </Dropdown>
        </div>
      </div>

      {/* 卡片主体 */}
      <div className={styles.cardBody}>
        {/* 标题 */}
        <h3 className={styles.cardTitle}>{item.title}</h3>
        
        {/* 标签 */}
        <div className={styles.cardTags}>
          {displayTags.map((tag) => (
            <span key={tag.id} className={styles.cardTag}>
              <span className={styles.tagIcon}>◇</span>
              {tag.name}
            </span>
          ))}
          {moreTags > 0 && (
            <span className={`${styles.cardTag} ${styles.moreTag}`}>
              +{moreTags}
            </span>
          )}
        </div>

        {/* 横线分隔 + 内容预览 */}
        <div className={styles.contentSection}>
          <div className={styles.cardPreview}>
            {item.content_preview || '暂无内容预览'}
          </div>
        </div>
      </div>

      {/* 卡片底部 */}
      <div className={styles.cardFooter}>
        <div className={styles.footerLeft}>
          <div className={styles.authorAvatar}>
            {(item.updated_by_name || item.created_by_name || '?').charAt(0)}
          </div>
          <div className={styles.authorInfo}>
            <span className={styles.authorName}>
              {item.updated_by_name || item.created_by_name || '-'}
            </span>
            <span className={styles.updateTime}>
              {item.updated_at ? dayjs(item.updated_at).format('YYYY-MM-DD') : '-'}
            </span>
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
 * 采用暗色科技主题设计
 */
export const AdminKnowledgeList: React.FC = () => {
  const [search, setSearch] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [selectedLineTypeId, setSelectedLineTypeId] = useState<number | undefined>();
  const [selectedSystemTagIds, setSelectedSystemTagIds] = useState<number[]>([]);
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
  
  // 获取知识列表
  const { data, isLoading, refetch } = useAdminKnowledgeList({
    search: search || undefined,
    line_type_id: selectedLineTypeId,
    system_tag_id: selectedSystemTagIds[0],
    filter_type: filterType,
    page,
    pageSize,
  });

  // 发布和取消发布操作
  const publishKnowledge = usePublishKnowledge();
  const unpublishKnowledge = useUnpublishKnowledge();

  /**
   * 处理分页变化
   */
  const handlePageChange = (newPage: number, newPageSize: number) => {
    setPage(newPage);
    setPageSize(newPageSize);
  };

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
    setPage(1);
  };

  /**
   * 处理系统标签选择
   */
  const handleSystemTagClick = (tagId: number) => {
    if (selectedSystemTagIds.includes(tagId)) {
      setSelectedSystemTagIds([]);
    } else {
      setSelectedSystemTagIds([tagId]);
    }
    setPage(1);
  };

  /**
   * 处理状态筛选
   */
  const handleFilterTypeChange = (type: KnowledgeFilterType) => {
    setFilterType(type);
    setPage(1);
  };

  /**
   * 处理搜索
   */
  const handleSearch = () => {
    setSearch(searchValue);
    setPage(1);
  };

  /**
   * 处理搜索输入回车
   */
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
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

  /**
   * 状态筛选配置
   */
  const statusFilters: Array<{ key: KnowledgeFilterType; label: string; dotClass?: string; showIcon?: boolean }> = [
    { key: 'ALL', label: '全部视图', showIcon: true },
    { key: 'PUBLISHED_CLEAN', label: '已发布', dotClass: styles.statusDotPublished },
    { key: 'REVISING', label: '修订中', dotClass: styles.statusDotRevising },
    { key: 'UNPUBLISHED', label: '草稿', dotClass: styles.statusDotDraft },
  ];

  return (
    <div className={styles.container}>
      {/* 左侧图标导航栏 */}
      <aside className={styles.iconSidebar}>
        {/* 全部 */}
        <div
          className={`${styles.iconItem} ${!selectedLineTypeId ? styles.iconItemActive : ''}`}
          onClick={() => handleLineTypeSelect(undefined)}
        >
          <HomeOutlined />
          <span className={styles.iconTooltip}>全部条线</span>
        </div>

        {/* 条线类型图标 */}
        {lineTypeTags.map((tag: TagType) => (
          <div
            key={tag.id}
            className={`${styles.iconItem} ${selectedLineTypeId === tag.id ? styles.iconItemActive : ''}`}
            onClick={() => handleLineTypeSelect(tag.id)}
          >
            {getLineTypeIcon(tag.name)}
            <span className={styles.iconTooltip}>{tag.name}</span>
          </div>
        ))}
      </aside>

      {/* 主内容区 */}
      <main className={styles.mainArea}>
        {/* 顶部标题栏 */}
        <header className={styles.topBar}>
          <div className={styles.pageTitle}>
            <DatabaseOutlined className={styles.pageTitleIcon} />
            <span className={styles.pageTitleText}>知识库</span>
          </div>
          <div className={styles.topActions}>
            <button className={styles.createButton} onClick={handleCreate}>
              <PlusOutlined />
              <span>创建知识</span>
            </button>
          </div>
        </header>

        {/* 筛选区域 */}
        <div className={styles.filterArea}>
          {/* 系统标签筛选 */}
          <div className={styles.systemTagsRow}>
            <span
              className={`${styles.systemTag} ${selectedSystemTagIds.length === 0 ? styles.systemTagActive : ''}`}
              onClick={() => setSelectedSystemTagIds([])}
            >
              ALL_SYSTEMS
            </span>
            {systemTags.map((tag: TagType) => (
              <span
                key={tag.id}
                className={`${styles.systemTag} ${selectedSystemTagIds.includes(tag.id) ? styles.systemTagActive : ''}`}
                onClick={() => handleSystemTagClick(tag.id)}
              >
                {tag.name}
              </span>
            ))}
          </div>

          {/* 状态筛选 + 搜索 */}
          <div className={styles.statusSearchRow}>
            <div className={styles.statusTabs}>
              {statusFilters.map((filter) => (
                <button
                  key={filter.key}
                  className={`${styles.statusTab} ${filterType === filter.key ? styles.statusTabActive : ''}`}
                  onClick={() => handleFilterTypeChange(filter.key)}
                >
                  {filter.showIcon && <AppstoreOutlined className={styles.statusIcon} />}
                  {filter.dotClass && <span className={`${styles.statusDot} ${filter.dotClass}`} />}
                  <span>{filter.label}</span>
                </button>
              ))}
            </div>

            <div className={styles.searchBox}>
              <SearchOutlined className={styles.searchIcon} />
              <input
                type="text"
                className={styles.searchInput}
                placeholder="按指令、标签或资产编号搜索..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                onBlur={handleSearch}
              />
            </div>
          </div>
        </div>

        {/* 卡片网格区域 */}
        <div className={styles.cardGrid}>
          {isLoading ? (
            <div className={styles.loadingState}>
              <Spin size="large" />
            </div>
          ) : data?.results && data.results.length > 0 ? (
            <>
              <div className={styles.cardsContainer}>
                {data.results.map((item) => (
                  <KnowledgeCard
                    key={item.id}
                    item={item}
                    onView={handleView}
                    onEdit={handleEdit}
                    onPublish={handlePublish}
                    onUnpublish={handleUnpublish}
                  />
                ))}
              </div>

              {/* 分页 */}
              <div className={styles.pagination}>
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
            <div className={styles.emptyState}>
              <InboxOutlined className={styles.emptyIcon} />
              <span className={styles.emptyText}>暂无知识文档</span>
            </div>
          )}
        </div>
      </main>

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
