import { useState } from 'react';
import { Row, Col, Typography, Spin, Empty, Input, Checkbox, Pagination } from 'antd';
import { DatabaseOutlined, EyeOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useStudentKnowledgeList } from '../api/get-student-knowledge-list';
import { useLineTypeTags, useSystemTags, useOperationTags } from '../api/get-tags';
import { useIncrementViewCount } from '../api/increment-view-count';
import type { KnowledgeListItem, Tag as TagType } from '@/types/api';
import { ROUTES } from '@/config/routes';
import dayjs from '@/lib/dayjs';
import styles from './admin-knowledge-list.module.css';

const { Title, Text } = Typography;
const { Search } = Input;

/**
 * 知识卡片组件（学员端）
 */
interface KnowledgeCardProps {
  item: KnowledgeListItem;
  onView: (id: number) => void;
}

const StudentKnowledgeCard: React.FC<KnowledgeCardProps> = ({ item, onView }) => {
  const isEmergency = item.knowledge_type === 'EMERGENCY';
  // 获取第一个操作标签作为顶部标签
  const firstOperationTag = item.operation_tags && item.operation_tags.length > 0 
    ? item.operation_tags[0].name 
    : null;

  return (
    <div className={styles.card} onClick={() => onView(item.id)}>
      {/* 标签 */}
      <div className={styles.cardHeader}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {firstOperationTag && (
            <span className={`${styles.typeTag} ${isEmergency ? styles.emergencyTag : styles.normalTag}`}>
              {firstOperationTag}
            </span>
          )}
          {item.line_type?.name && (
            <span className={styles.unpublishedTag} style={{ background: 'var(--color-gray-50)', color: 'var(--color-gray-500)' }}>
              {item.line_type.name}
            </span>
          )}
        </div>
        <div className={styles.footerRight} style={{ color: 'var(--color-gray-300)' }}>
          <EyeOutlined />
          <span>{item.view_count || 0}</span>
        </div>
      </div>

      {/* 标题 */}
      <div className={styles.cardBody}>
        <h3 className={styles.cardTitle}>{item.title}</h3>
        {/* 内容预览 */}
        {item.content_preview && (
          <div className={styles.cardPreview} title={item.content_preview}>
            {item.content_preview}
          </div>
        )}
      </div>

      {/* 底部信息 */}
      <div className={styles.cardFooter}>
        <div className={styles.footerLeft}>
          <div className={styles.footerItem}>
            <div className={styles.userAvatar}>
              {(item.updated_by_name || item.created_by_name || '?').charAt(0)}
            </div>
            <span>{item.updated_by_name || item.created_by_name || '-'}</span>
          </div>
        </div>
        <div className={styles.footerItem}>
          <ClockCircleOutlined />
          <span>{item.updated_at ? dayjs(item.updated_at).format('YYYY-MM-DD') : '-'}</span>
        </div>
      </div>
    </div>
  );
};

/**
 * 学员知识中心组件
 * 采用卡片式布局，支持筛选、搜索和分页
 */
export const StudentKnowledgeCenter: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedLineTypeId, setSelectedLineTypeId] = useState<number | undefined>();
  const [selectedSystemTagIds, setSelectedSystemTagIds] = useState<number[]>([]);
  const [selectedOperationTagIds, setSelectedOperationTagIds] = useState<number[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  const navigate = useNavigate();
  const incrementViewCount = useIncrementViewCount();
  
  // 获取条线类型标签
  const { data: lineTypeTags = [] } = useLineTypeTags();
  // 级联获取系统标签（根据已选条线类型）
  const { data: systemTags = [] } = useSystemTags(selectedLineTypeId);
  // 级联获取操作标签（根据已选条线类型）
  const { data: operationTags = [] } = useOperationTags(selectedLineTypeId);
  
  const { data, isLoading, refetch } = useStudentKnowledgeList({
    search: search || undefined,
    line_type_id: selectedLineTypeId,
    system_tag_id: selectedSystemTagIds[0],
    operation_tag_id: selectedOperationTagIds[0],
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
   * 查看详情
   * 点击知识卡片时，先记录阅读次数，再跳转到详情页
   */
  const handleView = (id: number) => {
    // 记录阅读次数（点击一次计数一次）
    incrementViewCount.mutate(id, {
      onSuccess: () => {
        // 更新列表数据中的阅读次数
        refetch();
      },
    });
    // 跳转到详情页
    navigate(`${ROUTES.KNOWLEDGE}/${id}`);
  };

  return (
    <div className={styles.container}>
      {/* 页面头部 */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <DatabaseOutlined className={styles.headerIcon} />
          <div className={styles.headerInfo}>
            <Title level={3} className={styles.headerTitle}>知识中心</Title>
            <Text className={styles.headerSubtitle}>
              浏览和学习已发布的知识文档，提升专业技能。
            </Text>
          </div>
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
              onSearch={(value) => {
                setSearch(value);
                setPage(1); // 重置到第一页
              }}
              className={styles.searchInput}
              size="large"
            />
            <span className={styles.resultCount}>
              共 {data?.count || 0} 篇知识文档
            </span>
          </div>
          <Spin spinning={isLoading}>
            {data?.results && data.results.length > 0 ? (
              <>
                <Row gutter={[24, 24]}>
                  {data.results.map((item) => (
                    <Col key={item.id} xs={24} sm={12} lg={8} xxl={6}>
                      <StudentKnowledgeCard
                        item={item}
                        onView={handleView}
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
    </div>
  );
};

