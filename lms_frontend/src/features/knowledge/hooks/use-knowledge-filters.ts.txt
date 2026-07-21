import { useCallback, useState } from 'react';

/**
 * 知识列表筛选状态配置
 */
export interface KnowledgeFilterConfig {
  /** 默认页面大小 */
  defaultPageSize?: number;
}

/**
 * 知识列表筛选状态
 */
export interface KnowledgeFilterState {
  /** 搜索关键词（已提交） */
  search: string;
  /** 搜索输入值（实时） */
  searchValue: string;
  /** 选中的space ID */
  selectedSpaceTagId: number | undefined;
  /** 每页数量 */
  pageSize: number;
}

/**
 * 知识列表筛选操作
 */
export interface KnowledgeFilterActions {
  /** 设置搜索输入值 */
  setSearchValue: (value: string) => void;
  /** 提交搜索 */
  submitSearch: () => void;
  /** 选择/取消space */
  handleSpaceTagSelect: (id: number | undefined) => void;
}

/**
 * 知识列表筛选 Hook
 * 管理端和学员端共用的筛选状态逻辑
 * 
 * @param config - 筛选配置
 * @returns 筛选状态和操作方法
 */
export const useKnowledgeFilters = (
  config: KnowledgeFilterConfig = {}
): KnowledgeFilterState & KnowledgeFilterActions => {
  const { defaultPageSize = 20 } = config;

  // 状态
  const [search, setSearch] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [selectedSpaceTagId, setSelectedSpaceTagId] = useState<number | undefined>();
  const pageSize = defaultPageSize;

  /**
   * 提交搜索
   */
  const submitSearch = useCallback(() => {
    setSearch(searchValue);
  }, [searchValue]);

  /**
   * 选择/取消space
   */
  const handleSpaceTagSelect = useCallback((id: number | undefined) => {
    setSelectedSpaceTagId(prev => (prev === id ? undefined : id));
  }, []);

  return {
    // 状态
    search,
    searchValue,
    selectedSpaceTagId,
    pageSize,
    // 操作
    setSearchValue,
    submitSearch,
    handleSpaceTagSelect,
  };
};
