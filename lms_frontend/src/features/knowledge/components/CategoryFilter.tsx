/**
 * CategoryFilter Component
 * Hierarchical category filter for knowledge center
 * Requirements: 5.2, 5.3 - Primary and secondary category selection
 */

import { useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { useKnowledgeCategories } from '../api/knowledge';
import { Layers, ChevronRight } from 'lucide-react';

export interface CategoryFilterValue {
  primaryCategory: number | null;
  secondaryCategory: number | null;
}

interface CategoryFilterProps {
  value: CategoryFilterValue;
  onChange: (value: CategoryFilterValue) => void;
  className?: string;
}

export function CategoryFilter({ value, onChange, className = '' }: CategoryFilterProps) {
  const { data: categories, isLoading, error } = useKnowledgeCategories();
  
  // Get primary categories (level 1)
  const primaryCategories = useMemo(() => {
    if (!categories) return [];
    return categories.filter(cat => cat.level === 1);
  }, [categories]);
  
  // Get secondary categories based on selected primary category
  // Requirements: 5.3 - Dynamic loading of secondary categories
  const secondaryCategories = useMemo(() => {
    if (!categories || !value.primaryCategory) return [];
    
    // Find the selected primary category and get its children
    const primaryCat = categories.find(cat => cat.id === value.primaryCategory);
    if (primaryCat?.children) {
      return primaryCat.children;
    }
    
    // Fallback: filter by parent_id
    return categories.filter(
      cat => cat.level === 2 && cat.parent_id === value.primaryCategory
    );
  }, [categories, value.primaryCategory]);
  
  // Build options for Select components
  const primaryOptions = useMemo(() => [
    { value: '', label: '全部领域' },
    ...primaryCategories.map(cat => ({ value: cat.id.toString(), label: cat.name }))
  ], [primaryCategories]);
  
  const secondaryOptions = useMemo(() => [
    { value: '', label: '全部子类' },
    ...secondaryCategories.map(cat => ({ value: cat.id.toString(), label: cat.name }))
  ], [secondaryCategories]);
  
  // Reset secondary category when primary changes
  useEffect(() => {
    if (value.secondaryCategory) {
      const isValidSecondary = secondaryCategories.some(
        cat => cat.id === value.secondaryCategory
      );
      if (!isValidSecondary) {
        onChange({ ...value, secondaryCategory: null });
      }
    }
  }, [value.primaryCategory, secondaryCategories]);
  
  const handlePrimaryChange = (val: string | string[]) => {
    const strVal = Array.isArray(val) ? val[0] : val;
    onChange({
      primaryCategory: strVal ? parseInt(strVal, 10) : null,
      secondaryCategory: null, // Reset secondary when primary changes
    });
  };
  
  const handleSecondaryChange = (val: string | string[]) => {
    const strVal = Array.isArray(val) ? val[0] : val;
    onChange({
      ...value,
      secondaryCategory: strVal ? parseInt(strVal, 10) : null,
    });
  };
  
  const handleClear = () => {
    onChange({
      primaryCategory: null,
      secondaryCategory: null,
    });
  };
  
  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Spinner size="sm" />
        <span className="text-sm text-text-muted">加载分类...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className={`text-sm text-red-400 ${className}`}>
        分类加载失败
      </div>
    );
  }
  
  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      <div className="flex items-center gap-2 text-text-muted">
        <Layers size={16} />
        <span className="text-sm font-medium">分类筛选</span>
      </div>
      
      {/* Primary Category Select */}
      <Select
        options={primaryOptions}
        value={value.primaryCategory?.toString() || ''}
        onChange={handlePrimaryChange}
        placeholder="全部领域"
        className="min-w-[140px]"
      />
      
      {/* Secondary Category Select - Only show when primary is selected */}
      {value.primaryCategory && secondaryCategories.length > 0 && (
        <>
          <ChevronRight size={16} className="text-text-muted" />
          <Select
            options={secondaryOptions}
            value={value.secondaryCategory?.toString() || ''}
            onChange={handleSecondaryChange}
            placeholder="全部子类"
            className="min-w-[140px]"
          />
        </>
      )}
      
      {/* Clear button */}
      {(value.primaryCategory || value.secondaryCategory) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="text-text-muted hover:text-white"
        >
          清除筛选
        </Button>
      )}
    </div>
  );
}

/**
 * Compact version using button pills for primary categories
 * Alternative UI for smaller spaces
 */
export function CategoryFilterPills({ value, onChange, className = '' }: CategoryFilterProps) {
  const { data: categories, isLoading } = useKnowledgeCategories();
  
  const primaryCategories = useMemo(() => {
    if (!categories) return [];
    return categories.filter(cat => cat.level === 1);
  }, [categories]);
  
  const secondaryCategories = useMemo(() => {
    if (!categories || !value.primaryCategory) return [];
    const primaryCat = categories.find(cat => cat.id === value.primaryCategory);
    return primaryCat?.children || categories.filter(
      cat => cat.level === 2 && cat.parent_id === value.primaryCategory
    );
  }, [categories, value.primaryCategory]);
  
  if (isLoading) {
    return <Spinner size="sm" />;
  }
  
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Primary category pills */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={value.primaryCategory === null ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => onChange({ primaryCategory: null, secondaryCategory: null })}
          className={`rounded-full ${
            value.primaryCategory === null 
              ? '' 
              : 'text-text-secondary hover:text-white bg-white/5'
          }`}
        >
          全部
        </Button>
        {primaryCategories.map((cat) => (
          <Button
            key={cat.id}
            variant={value.primaryCategory === cat.id ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => onChange({ primaryCategory: cat.id, secondaryCategory: null })}
            className={`rounded-full ${
              value.primaryCategory === cat.id 
                ? '' 
                : 'text-text-secondary hover:text-white bg-white/5'
            }`}
          >
            {cat.name}
          </Button>
        ))}
      </div>
      
      {/* Secondary category pills */}
      {value.primaryCategory && secondaryCategories.length > 0 && (
        <div className="flex flex-wrap gap-2 pl-4 border-l-2 border-primary/30">
          <Button
            variant={value.secondaryCategory === null ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onChange({ ...value, secondaryCategory: null })}
            className="rounded-full text-xs"
          >
            全部
          </Button>
          {secondaryCategories.map((cat) => (
            <Button
              key={cat.id}
              variant={value.secondaryCategory === cat.id ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onChange({ ...value, secondaryCategory: cat.id })}
              className="rounded-full text-xs"
            >
              {cat.name}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
