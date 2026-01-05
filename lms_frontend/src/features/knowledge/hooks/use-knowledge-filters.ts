import { useState, useCallback } from 'react';

/**
 * 知识列表筛选状态配置
 */
export interface KnowledgeFilterConfig {
  /** 是否启用操作标签筛选（学员端需要） */
  enableOperationTags?: boolean;
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
  /** 选中的条线类型 ID */
  selectedLineTypeId: number | undefined;
  /** 选中的系统标签 IDs */
  selectedSystemTagIds: number[];
  /** 选中的操作标签 IDs */
  selectedOperationTagIds: number[];
  /** 当前页码 */
  page: number;
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
  /** 直接搜索（用于 Search 组件） */
  searchDirectly: (value: string) => void;
  /** 选择/取消条线类型 */
  handleLineTypeSelect: (id: number | undefined) => void;
  /** 切换系统标签 */
  toggleSystemTag: (tagId: number) => void;
  /** 切换操作标签 */
  toggleOperationTag: (tagId: number) => void;
  /** 处理分页变化 */
  handlePageChange: (page: number, pageSize: number) => void;
  /** 重置所有筛选 */
  resetFilters: () => void;
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
  const [selectedLineTypeId, setSelectedLineTypeId] = useState<number | undefined>();
  const [selectedSystemTagIds, setSelectedSystemTagIds] = useState<number[]>([]);
  const [selectedOperationTagIds, setSelectedOperationTagIds] = useState<number[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  /**
   * 提交搜索
   */
  const submitSearch = useCallback(() => {
    setSearch(searchValue);
    setPage(1);
  }, [searchValue]);

  /**
   * 直接搜索（用于 Search 组件）
   */
  const searchDirectly = useCallback((value: string) => {
    setSearchValue(value);
    setSearch(value);
    setPage(1);
  }, []);

  /**
   * 选择/取消条线类型
   */
  const handleLineTypeSelect = useCallback((id: number | undefined) => {
    setSelectedLineTypeId(prev => (prev === id ? undefined : id));
    setSelectedSystemTagIds([]);
    setSelectedOperationTagIds([]);
    setPage(1);
  }, []);

  /**
   * 切换系统标签
   */
  const toggleSystemTag = useCallback((tagId: number) => {
    setSelectedSystemTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [tagId]
    );
    setPage(1);
  }, []);

  /**
   * 切换操作标签
   */
  const toggleOperationTag = useCallback((tagId: number) => {
    setSelectedOperationTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
    setPage(1);
  }, []);

  /**
   * 处理分页变化
   */
  const handlePageChange = useCallback((newPage: number, newPageSize: number) => {
    setPage(newPage);
    setPageSize(newPageSize);
  }, []);

  /**
   * 重置所有筛选
   */
  const resetFilters = useCallback(() => {
    setSearch('');
    setSearchValue('');
    setSelectedLineTypeId(undefined);
    setSelectedSystemTagIds([]);
    setSelectedOperationTagIds([]);
    setPage(1);
    setPageSize(defaultPageSize);
  }, [defaultPageSize]);

  return {
    // 状态
    search,
    searchValue,
    selectedLineTypeId,
    selectedSystemTagIds,
    selectedOperationTagIds,
    page,
    pageSize,
    // 操作
    setSearchValue,
    submitSearch,
    searchDirectly,
    handleLineTypeSelect,
    toggleSystemTag,
    toggleOperationTag,
    handlePageChange,
    resetFilters,
  };
};

