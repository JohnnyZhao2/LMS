import React from 'react';
import { Button } from './button';

/**
 * 简单分页组件的属性
 */
export interface SimplePaginationProps {
  /** 当前页码（从1开始） */
  currentPage: number;
  /** 是否有下一页 */
  hasNext: boolean;
  /** 总记录数 */
  totalCount: number;
  /** 计数标签文本（如 "条记录"、"份待评分"） */
  countLabel: string;
  /** 页码改变时的回调函数 */
  onPageChange: (page: number) => void;
  /** 自定义类名 */
  className?: string;
}

/**
 * 简单分页组件
 * 提供上一页/下一页按钮和记录数显示
 */
export const SimplePagination: React.FC<SimplePaginationProps> = ({
  currentPage,
  hasNext,
  totalCount,
  countLabel,
  onPageChange,
  className,
}) => {
  return (
    <div className={`flex items-center justify-between mt-4 pt-4 border-t border-[#E5E7EB] ${className || ''}`}>
      <span className="text-sm text-[#6B7280]">
        共 {totalCount || 0} {countLabel}
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="shadow-none border-4 border-[#E5E7EB]"
        >
          上一页
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasNext}
          onClick={() => onPageChange(currentPage + 1)}
          className="shadow-none border-4 border-[#E5E7EB]"
        >
          下一页
        </Button>
      </div>
    </div>
  );
};
