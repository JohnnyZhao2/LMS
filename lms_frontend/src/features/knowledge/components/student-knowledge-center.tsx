import { Spin, Pagination } from 'antd';
import {
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
import { useStudentKnowledgeList } from '../api/get-student-knowledge-list';
import { useLineTypeTags, useSystemTags } from '../api/get-tags';
import { useIncrementViewCount } from '../api/increment-view-count';
import { useKnowledgeFilters } from '../hooks/use-knowledge-filters';
import { SharedKnowledgeCard } from './shared-knowledge-card';
import type { Tag as TagType } from '@/types/api';
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
 * 学员知识中心组件
 * 与管理端使用相同的布局风格，但不显示管理功能
 */
export const StudentKnowledgeCenter: React.FC = () => {
  const navigate = useNavigate();
  const incrementViewCount = useIncrementViewCount();

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
    page,
    pageSize,
    handlePageChange,
  } = useKnowledgeFilters();

  // 获取条线类型标签
  const { data: lineTypeTags = [] } = useLineTypeTags();
  // 级联获取系统标签（根据已选条线类型）
  const { data: systemTags = [] } = useSystemTags(selectedLineTypeId);

  // 获取知识列表（学员端只能看到已发布的）
  const { data, isLoading, refetch } = useStudentKnowledgeList({
    search: search || undefined,
    line_type_id: selectedLineTypeId,
    system_tag_id: selectedSystemTagIds[0],
    page,
    pageSize,
  });

  /**
   * 处理搜索输入回车
   */
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      submitSearch();
    }
  };

  /**
   * 查看详情
   * 点击知识卡片时，先记录阅读次数，再跳转到详情页
   */
  const handleView = (id: number) => {
    // 记录阅读次数（点击一次计数一次）
    incrementViewCount.mutate(id, {
      onSuccess: () => {
        refetch();
      },
    });
    // 跳转到详情页
    navigate(`${ROUTES.KNOWLEDGE}/${id}`);
  };

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
        {/* 顶部标题栏 - 三栏布局 */}
        <header className={styles.topBar}>
          <div className={styles.pageTitle}>
            <DatabaseOutlined className={styles.pageTitleIcon} />
            <span className={styles.pageTitleText}>知识中心</span>
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
            {/* 学员端不显示创建按钮 */}
          </div>
        </header>

        {/* 筛选区域 */}
        <div className={styles.filterArea}>
          {/* 系统标签筛选 */}
          <div className={styles.systemTagsRow}>
            <span
              className={`${styles.systemTag} ${selectedSystemTagIds.length === 0 ? styles.systemTagActive : ''}`}
              onClick={() => toggleSystemTag(-1)}
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

          {/* 学员端不显示状态筛选，只显示统计 */}
          <div className={styles.statusTabs}>
            <span className={styles.resultCount}>
              共 {data?.count || 0} 篇知识文档
            </span>
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
                    variant="student"
                    onView={handleView}
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
