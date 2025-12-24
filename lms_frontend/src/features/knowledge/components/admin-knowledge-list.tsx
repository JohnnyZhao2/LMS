import { Modal, message, Spin, Pagination } from 'antd';
import {
  PlusOutlined,
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
import { useNavigate } from 'react-router-dom';
import { useAdminKnowledgeList } from '../api/get-admin-knowledge';
import { useLineTypeTags, useSystemTags } from '../api/get-tags';
import { SharedKnowledgeCard } from './shared-knowledge-card';
import { useKnowledgeFilters } from '../hooks/use-knowledge-filters';
import { usePublishKnowledge, useUnpublishKnowledge } from '../api/manage-knowledge';
import { showApiError } from '@/utils/error-handler';
import type { KnowledgeFilterType, Tag as TagType } from '@/types/api';
import { ROUTES } from '@/config/routes';
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
 * 管理员知识库列表组件
 * 采用暗色科技主题设计
 */
export const AdminKnowledgeList: React.FC = () => {
  const navigate = useNavigate();

  // 使用共用的筛选 Hook
  const {
    search,
    searchValue,
    setSearchValue,
    submitSearch,
    selectedLineTypeId,
    handleLineTypeSelect,
    selectedSystemTagIds,
    toggleSystemTag,
    filterType,
    setFilterType,
    page,
    pageSize,
    handlePageChange,
  } = useKnowledgeFilters();

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
   * 处理搜索输入回车
   */
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      submitSearch();
    }
  };

  /**
   * 跳转到新建页面
   */
  const handleCreate = () => {
    navigate(`${ROUTES.ADMIN_KNOWLEDGE}/create`);
  };

  /**
   * 查看详情
   */
  const handleView = (id: number) => {
    navigate(`${ROUTES.ADMIN_KNOWLEDGE}/${id}`);
  };

  /**
   * 跳转到编辑页面
   */
  const handleEdit = (id: number) => {
    navigate(`${ROUTES.ADMIN_KNOWLEDGE}/${id}/edit`);
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
          
          // 如果当前筛选是已发布相关的状态，自动切换到草稿视图
          if (filterType === 'PUBLISHED_CLEAN' || filterType === 'REVISING') {
            setFilterType('UNPUBLISHED');
          }
          
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

        {/* 创建按钮 - 吸附在侧边栏底部 */}
        <div className={styles.createButtonWrapper}>
          <div
            className={`${styles.iconItem} ${styles.createIconButton}`}
            onClick={handleCreate}
          >
            <PlusOutlined />
            <span className={styles.iconTooltip}>创建知识</span>
          </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className={styles.mainArea}>
        {/* 顶部标题栏 - 三栏布局 */}
        <header className={styles.topBar}>
          <div className={styles.pageTitle}>
            <DatabaseOutlined className={styles.pageTitleIcon} />
            <span className={styles.pageTitleText}>知识库</span>
          </div>
          <div className={styles.topCenter}>
            <div className={styles.searchBox}>
              <SearchOutlined className={styles.searchIcon} />
              <input
                type="text"
                className={styles.searchInput}
                placeholder="搜索知识..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                onBlur={submitSearch}
              />
            </div>
          </div>
          <div className={styles.topActions}>
            {/* 右侧预留空间，保持三栏布局平衡 */}
          </div>
        </header>

        {/* 筛选区域 */}
        <div className={styles.filterArea}>
          {/* 系统标签筛选 */}
          <div className={styles.systemTagsRow}>
            <span
              className={`${styles.systemTag} ${selectedSystemTagIds.length === 0 ? styles.systemTagActive : ''}`}
              onClick={() => toggleSystemTag(-1)} // 使用 -1 表示清空
            >
              ALL_SYSTEMS
            </span>
            {systemTags.map((tag: TagType) => (
              <span
                key={tag.id}
                className={`${styles.systemTag} ${selectedSystemTagIds.includes(tag.id) ? styles.systemTagActive : ''}`}
                onClick={() => toggleSystemTag(tag.id)}
              >
                {tag.name}
              </span>
            ))}
          </div>

          {/* 状态筛选 */}
          <div className={styles.statusTabs}>
            {statusFilters.map((filter) => (
              <button
                key={filter.key}
                className={`${styles.statusTab} ${filterType === filter.key ? styles.statusTabActive : ''}`}
                onClick={() => setFilterType(filter.key)}
              >
                {filter.showIcon && <AppstoreOutlined className={styles.statusIcon} />}
                {filter.dotClass && <span className={`${styles.statusDot} ${filter.dotClass}`} />}
                <span>{filter.label}</span>
              </button>
            ))}
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
                  <SharedKnowledgeCard
                    key={item.id}
                    item={item}
                    variant="admin"
                    showActions
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

    </div>
  );
};
