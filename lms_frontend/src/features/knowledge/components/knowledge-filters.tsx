import { Tabs } from 'antd';
import type { KnowledgeCategory } from '@/types/api';

interface KnowledgeFiltersProps {
  categories: KnowledgeCategory[];
  primaryCategoryId?: number;
  onPrimaryCategoryChange: (id: number | undefined) => void;
  onSecondaryCategoryChange: (id: number | undefined) => void;
}

/**
 * 知识筛选组件
 */
export const KnowledgeFilters: React.FC<KnowledgeFiltersProps> = ({
  categories,
  primaryCategoryId,
  onPrimaryCategoryChange,
  onSecondaryCategoryChange,
}) => {
  const primaryCategories = categories.filter((c) => c.level === 'PRIMARY');

  return (
    <Tabs
      activeKey={primaryCategoryId ? String(primaryCategoryId) : 'all'}
      onChange={(key) => {
        if (key === 'all') {
          onPrimaryCategoryChange(undefined);
          onSecondaryCategoryChange(undefined);
        } else {
          onPrimaryCategoryChange(Number(key));
          onSecondaryCategoryChange(undefined);
        }
      }}
      items={[
        {
          key: 'all',
          label: '全部',
        },
        ...primaryCategories.map((cat) => ({
          key: String(cat.id),
          label: cat.name,
        })),
      ]}
    />
  );
};

