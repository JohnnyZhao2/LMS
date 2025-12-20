import { useState } from 'react';
import { Input, Row, Col, Empty, Spin } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useKnowledgeList } from '../api/get-knowledge-list';
import { usePrimaryCategories } from '../api/get-categories';
import { KnowledgeCard } from './knowledge-card';
import { KnowledgeFilters } from './knowledge-filters';

const { Search } = Input;

/**
 * 知识列表组件
 */
export const KnowledgeList: React.FC = () => {
  const [page] = useState(1);
  const [primaryCategoryId, setPrimaryCategoryId] = useState<number | undefined>();
  const [secondaryCategoryId, setSecondaryCategoryId] = useState<number | undefined>();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useKnowledgeList({
    page,
    pageSize: 20,
    primaryCategoryId,
    secondaryCategoryId,
    search: search || undefined,
  });

  const { data: categories } = usePrimaryCategories();

  return (
    <div>
      <KnowledgeFilters
        categories={categories || []}
        primaryCategoryId={primaryCategoryId}
        onPrimaryCategoryChange={setPrimaryCategoryId}
        onSecondaryCategoryChange={setSecondaryCategoryId}
      />
      <div style={{ marginTop: 16 }}>
        <Search
          placeholder="搜索知识文档"
          allowClear
          enterButton={<SearchOutlined />}
          size="large"
          onSearch={setSearch}
          style={{ marginBottom: 16 }}
        />
        <Spin spinning={isLoading}>
          {data && data.length > 0 ? (
            <Row gutter={[16, 16]}>
              {data.map((knowledge) => (
                <Col xs={24} sm={12} lg={8} key={knowledge.id}>
                  <KnowledgeCard knowledge={knowledge} />
                </Col>
              ))}
            </Row>
          ) : (
            <Empty description="暂无知识文档" />
          )}
        </Spin>
      </div>
    </div>
  );
};

