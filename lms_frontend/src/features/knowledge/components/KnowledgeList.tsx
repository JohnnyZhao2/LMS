/**
 * KnowledgeList Component
 * List view combining filters and knowledge cards with pagination
 * Requirements: 5.1 - Display knowledge document card list
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { CategoryFilterPills, type CategoryFilterValue } from './CategoryFilter';
import { KnowledgeCard } from './KnowledgeCard';
import { useKnowledgeList } from '../api/knowledge';
import type { KnowledgeFilterParams } from '@/types/api';
import { Search, Filter, Grid, List, RefreshCw } from 'lucide-react';

interface KnowledgeListProps {
  onSelectKnowledge?: (id: number) => void;
  className?: string;
}

type ViewMode = 'grid' | 'list';

export function KnowledgeList({ onSelectKnowledge, className = '' }: KnowledgeListProps) {
  const navigate = useNavigate();
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilterValue>({
    primaryCategory: null,
    secondaryCategory: null,
  });
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  
  // Build filter params
  const filterParams: KnowledgeFilterParams = {
    page,
    page_size: 12,
    search: searchQuery || undefined,
    primary_category: categoryFilter.primaryCategory || undefined,
    secondary_category: categoryFilter.secondaryCategory || undefined,
  };
  
  // Fetch knowledge list
  const { 
    data, 
    isLoading, 
    error, 
    refetch,
    isFetching 
  } = useKnowledgeList(filterParams);
  
  // Handle knowledge card click
  const handleKnowledgeClick = useCallback((id: number) => {
    if (onSelectKnowledge) {
      onSelectKnowledge(id);
    } else {
      navigate(`/knowledge/${id}`);
    }
  }, [onSelectKnowledge, navigate]);
  
  // Handle search
  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
    setPage(1); // Reset to first page on search
  }, []);
  
  // Handle category change
  const handleCategoryChange = useCallback((value: CategoryFilterValue) => {
    setCategoryFilter(value);
    setPage(1); // Reset to first page on filter change
  }, []);
  
  // Calculate pagination - ensure proper null checks
  const totalPages = data ? Math.ceil(data.count / 12) : 0;
  const hasNextPage = data?.next != null;
  const hasPrevPage = data?.previous != null;
  const results = data?.results ?? [];
  
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Search and View Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted h-4 w-4" />
          <Input
            placeholder="搜索知识文档..."
            className="pl-9 bg-background-tertiary border-white/10 focus:border-primary/50"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2">
          {/* Refresh button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 w-8 p-0 text-text-muted hover:text-white"
          >
            <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
          </Button>
          
          {/* View mode toggle */}
          <div className="flex items-center bg-background-tertiary rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="px-2"
            >
              <Grid size={16} />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="px-2"
            >
              <List size={16} />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Category Filter */}
      <CategoryFilterPills
        value={categoryFilter}
        onChange={handleCategoryChange}
      />
      
      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      )}
      
      {/* Error State */}
      {error && !isLoading && (
        <ErrorState
          title="加载失败"
          message={error instanceof Error ? error.message : '无法加载知识列表'}
          onRetry={() => refetch()}
        />
      )}
      
      {/* Empty State - show when not loading, no error, and no results */}
      {!isLoading && !error && results.length === 0 && (
        <EmptyState
          icon={<Filter size={48} className="opacity-20" />}
          title="暂无知识文档"
          description={
            searchQuery || categoryFilter.primaryCategory
              ? '没有找到符合条件的知识文档，请尝试调整筛选条件'
              : '知识库暂无内容'
          }
        />
      )}
      
      {/* Knowledge Grid/List */}
      {!isLoading && !error && results.length > 0 && (
        <>
          <div className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'space-y-4'
          }>
            {results.map((knowledge) => (
              <KnowledgeCard
                key={knowledge.id}
                knowledge={knowledge}
                onClick={() => handleKnowledgeClick(knowledge.id)}
              />
            ))}
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={!hasPrevPage || isFetching}
              >
                上一页
              </Button>
              
              <span className="text-sm text-text-muted">
                第 {page} / {totalPages} 页
              </span>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={!hasNextPage || isFetching}
              >
                下一页
              </Button>
            </div>
          )}
          
          {/* Results count */}
          {data && (
            <div className="text-center text-sm text-text-muted">
              共 {data.count} 条记录
            </div>
          )}
        </>
      )}
    </div>
  );
}
