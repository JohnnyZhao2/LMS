import * as React from "react"
import { cn } from "@/utils/cn"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { Button } from "./Button"
import { Checkbox } from "./Checkbox"

// Column definition
export interface TableColumn<T> {
    /** Unique key for the column */
    key: string
    /** Column header title */
    title: string
    /** Width of the column */
    width?: string | number
    /** Custom render function */
    render?: (value: unknown, record: T, index: number) => React.ReactNode
    /** Accessor function or key path */
    accessor?: keyof T | ((record: T) => unknown)
    /** Alignment */
    align?: 'left' | 'center' | 'right'
}

// Pagination config
export interface PaginationConfig {
    current: number
    pageSize: number
    total: number
    onChange: (page: number, pageSize: number) => void
}

// Row selection config
export interface RowSelectionConfig<T> {
    /** Selection type */
    type: 'checkbox' | 'radio'
    /** Selected row keys */
    selectedRowKeys: React.Key[]
    /** Callback when selection changes */
    onChange: (selectedRowKeys: React.Key[], selectedRows: T[]) => void
    /** Get row key */
    getRowKey?: (record: T) => React.Key
}

export interface TableProps<T> {
    /** Table columns */
    columns: TableColumn<T>[]
    /** Data source */
    dataSource: T[]
    /** Row key getter */
    rowKey: keyof T | ((record: T) => React.Key)
    /** Pagination config */
    pagination?: PaginationConfig | false
    /** Row selection config */
    rowSelection?: RowSelectionConfig<T>
    /** Loading state */
    loading?: boolean
    /** Empty text */
    emptyText?: string
    /** Additional class names */
    className?: string
    /** On row click */
    onRowClick?: (record: T, index: number) => void
    /** 
     * Enable responsive card view on mobile 
     * Requirements: 22.4
     */
    responsive?: boolean
    /** Custom card render function for mobile view */
    renderCard?: (record: T, index: number) => React.ReactNode
    /** Columns to show as primary info in mobile card (first 2 by default) */
    mobileColumns?: string[]
}

function Table<T extends object>({
    columns,
    dataSource,
    rowKey,
    pagination,
    rowSelection,
    loading = false,
    emptyText = "暂无数据",
    className,
    onRowClick,
    responsive = true,
    renderCard,
    mobileColumns,
}: TableProps<T>) {
    const getRowKeyValue = React.useCallback((record: T, index: number): React.Key => {
        if (typeof rowKey === 'function') {
            return rowKey(record)
        }
        return (record[rowKey] as React.Key) ?? index
    }, [rowKey])

    const getCellValue = (record: T, column: TableColumn<T>): unknown => {
        if (column.accessor) {
            if (typeof column.accessor === 'function') {
                return column.accessor(record)
            }
            return record[column.accessor]
        }
        return (record as Record<string, unknown>)[column.key]
    }

    // Selection handlers
    const isAllSelected = rowSelection && dataSource.length > 0 && 
        dataSource.every(record => rowSelection.selectedRowKeys.includes(getRowKeyValue(record, 0)))
    
    const isSomeSelected = rowSelection && 
        dataSource.some(record => rowSelection.selectedRowKeys.includes(getRowKeyValue(record, 0)))

    const handleSelectAll = () => {
        if (!rowSelection) return
        
        if (isAllSelected) {
            rowSelection.onChange([], [])
        } else {
            const allKeys = dataSource.map((record, index) => getRowKeyValue(record, index))
            rowSelection.onChange(allKeys, dataSource)
        }
    }

    const handleSelectRow = (record: T, index: number) => {
        if (!rowSelection) return
        
        const key = getRowKeyValue(record, index)
        
        if (rowSelection.type === 'radio') {
            rowSelection.onChange([key], [record])
        } else {
            const isSelected = rowSelection.selectedRowKeys.includes(key)
            if (isSelected) {
                const newKeys = rowSelection.selectedRowKeys.filter(k => k !== key)
                const newRows = dataSource.filter((r, i) => newKeys.includes(getRowKeyValue(r, i)))
                rowSelection.onChange(newKeys, newRows)
            } else {
                const newKeys = [...rowSelection.selectedRowKeys, key]
                const newRows = dataSource.filter((r, i) => newKeys.includes(getRowKeyValue(r, i)))
                rowSelection.onChange(newKeys, newRows)
            }
        }
    }

    // Get columns to display in mobile card view
    const getMobileDisplayColumns = () => {
        if (mobileColumns) {
            return columns.filter(col => mobileColumns.includes(col.key))
        }
        // Default: show first 3 columns
        return columns.slice(0, 3)
    }

    // Render mobile card for a record
    const renderMobileCard = (record: T, index: number) => {
        if (renderCard) {
            return renderCard(record, index)
        }

        const key = getRowKeyValue(record, index)
        const isSelected = rowSelection?.selectedRowKeys.includes(key)
        const displayColumns = getMobileDisplayColumns()
        const remainingColumns = columns.filter(col => !displayColumns.find(dc => dc.key === col.key))

        return (
            <div
                key={key}
                className={cn(
                    "p-4 rounded-lg border border-border bg-card transition-colors",
                    "hover:bg-white/5",
                    isSelected && "bg-primary/5 border-primary/30",
                    onRowClick && "cursor-pointer"
                )}
                onClick={() => onRowClick?.(record, index)}
            >
                {/* Selection checkbox/radio */}
                {rowSelection && (
                    <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/5" onClick={(e) => e.stopPropagation()}>
                        {rowSelection.type === 'checkbox' ? (
                            <Checkbox
                                checked={isSelected}
                                onChange={() => handleSelectRow(record, index)}
                            />
                        ) : (
                            <input
                                type="radio"
                                checked={isSelected}
                                onChange={() => handleSelectRow(record, index)}
                                className="h-4 w-4 text-primary"
                            />
                        )}
                        <span className="text-xs text-text-muted">选择此项</span>
                    </div>
                )}

                {/* Primary columns */}
                <div className="space-y-2">
                    {displayColumns.map((column, colIndex) => {
                        const value = getCellValue(record, column)
                        return (
                            <div key={column.key} className={colIndex === 0 ? "font-medium text-text-primary" : ""}>
                                {colIndex > 0 && (
                                    <span className="text-xs text-text-muted mr-2">{column.title}:</span>
                                )}
                                <span className={colIndex === 0 ? "text-base" : "text-sm text-text-secondary"}>
                                    {column.render 
                                        ? column.render(value, record, index)
                                        : String(value ?? '-')
                                    }
                                </span>
                            </div>
                        )
                    })}
                </div>

                {/* Remaining columns in a grid */}
                {remainingColumns.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-2 gap-2">
                        {remainingColumns.map((column) => {
                            const value = getCellValue(record, column)
                            return (
                                <div key={column.key} className="text-sm">
                                    <span className="text-text-muted text-xs block">{column.title}</span>
                                    <span className="text-text-secondary">
                                        {column.render 
                                            ? column.render(value, record, index)
                                            : String(value ?? '-')
                                        }
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        )
    }

    // Mobile card list view - rendered inline to avoid component-in-render issue
    const mobileCardListContent = (
        <div className="space-y-3 md:hidden">
            {/* Select all for mobile */}
            {rowSelection && rowSelection.type === 'checkbox' && dataSource.length > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-background-secondary border border-border">
                    <Checkbox
                        checked={isAllSelected}
                        onChange={handleSelectAll}
                        className={cn(isSomeSelected && !isAllSelected && "opacity-50")}
                    />
                    <span className="text-sm text-text-secondary">
                        {isAllSelected ? '取消全选' : '全选'}
                    </span>
                </div>
            )}

            {loading ? (
                <div className="p-8 text-center text-text-muted">
                    <div className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        加载中...
                    </div>
                </div>
            ) : dataSource.length === 0 ? (
                <div className="p-8 text-center text-text-muted rounded-lg border border-border bg-card">
                    {emptyText}
                </div>
            ) : (
                dataSource.map((record, index) => renderMobileCard(record, index))
            )}
        </div>
    )

    return (
        <div className={cn("w-full", className)}>
            {/* Mobile card view - Requirements: 22.4 */}
            {responsive && mobileCardListContent}

            {/* Desktop table view */}
            <div className={cn(
                "relative overflow-x-auto rounded-lg border border-border",
                responsive && "hidden md:block"
            )}>
                <table className="w-full text-sm">
                    <thead className="bg-background-secondary text-text-secondary">
                        <tr>
                            {rowSelection && (
                                <th className="w-12 px-4 py-3">
                                    {rowSelection.type === 'checkbox' && (
                                        <Checkbox
                                            checked={isAllSelected}
                                            onChange={handleSelectAll}
                                            className={cn(isSomeSelected && !isAllSelected && "opacity-50")}
                                        />
                                    )}
                                </th>
                            )}
                            {columns.map((column) => (
                                <th
                                    key={column.key}
                                    className={cn(
                                        "px-4 py-3 font-medium",
                                        column.align === 'center' && "text-center",
                                        column.align === 'right' && "text-right"
                                    )}
                                    style={{ width: column.width }}
                                >
                                    {column.title}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {loading ? (
                            <tr>
                                <td 
                                    colSpan={columns.length + (rowSelection ? 1 : 0)}
                                    className="px-4 py-8 text-center text-text-muted"
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                        加载中...
                                    </div>
                                </td>
                            </tr>
                        ) : dataSource.length === 0 ? (
                            <tr>
                                <td 
                                    colSpan={columns.length + (rowSelection ? 1 : 0)}
                                    className="px-4 py-8 text-center text-text-muted"
                                >
                                    {emptyText}
                                </td>
                            </tr>
                        ) : (
                            dataSource.map((record, index) => {
                                const key = getRowKeyValue(record, index)
                                const isSelected = rowSelection?.selectedRowKeys.includes(key)
                                
                                return (
                                    <tr
                                        key={key}
                                        className={cn(
                                            "bg-card transition-colors",
                                            "hover:bg-white/5",
                                            isSelected && "bg-primary/5",
                                            onRowClick && "cursor-pointer"
                                        )}
                                        onClick={() => onRowClick?.(record, index)}
                                    >
                                        {rowSelection && (
                                            <td className="w-12 px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                                {rowSelection.type === 'checkbox' ? (
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onChange={() => handleSelectRow(record, index)}
                                                    />
                                                ) : (
                                                    <input
                                                        type="radio"
                                                        checked={isSelected}
                                                        onChange={() => handleSelectRow(record, index)}
                                                        className="h-4 w-4 text-primary"
                                                    />
                                                )}
                                            </td>
                                        )}
                                        {columns.map((column) => {
                                            const value = getCellValue(record, column)
                                            return (
                                                <td
                                                    key={column.key}
                                                    className={cn(
                                                        "px-4 py-3 text-text-primary",
                                                        column.align === 'center' && "text-center",
                                                        column.align === 'right' && "text-right"
                                                    )}
                                                >
                                                    {column.render 
                                                        ? column.render(value, record, index)
                                                        : String(value ?? '-')
                                                    }
                                                </td>
                                            )
                                        })}
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {pagination && (
                <TablePagination
                    current={pagination.current}
                    pageSize={pagination.pageSize}
                    total={pagination.total}
                    onChange={pagination.onChange}
                />
            )}
        </div>
    )
}

// Pagination component
interface TablePaginationProps {
    current: number
    pageSize: number
    total: number
    onChange: (page: number, pageSize: number) => void
}

function TablePagination({ current, pageSize, total, onChange }: TablePaginationProps) {
    const totalPages = Math.ceil(total / pageSize)
    const startItem = (current - 1) * pageSize + 1
    const endItem = Math.min(current * pageSize, total)

    const canGoPrev = current > 1
    const canGoNext = current < totalPages

    return (
        <div className="flex items-center justify-between px-2 py-4">
            <div className="text-sm text-text-muted">
                显示 {startItem}-{endItem} 条，共 {total} 条
            </div>
            <div className="flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onChange(1, pageSize)}
                    disabled={!canGoPrev}
                    aria-label="第一页"
                >
                    <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onChange(current - 1, pageSize)}
                    disabled={!canGoPrev}
                    aria-label="上一页"
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <span className="px-3 text-sm text-text-primary">
                    {current} / {totalPages}
                </span>
                
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onChange(current + 1, pageSize)}
                    disabled={!canGoNext}
                    aria-label="下一页"
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onChange(totalPages, pageSize)}
                    disabled={!canGoNext}
                    aria-label="最后一页"
                >
                    <ChevronsRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}

export { Table, TablePagination }
