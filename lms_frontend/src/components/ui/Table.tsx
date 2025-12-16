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

    return (
        <div className={cn("w-full", className)}>
            <div className="relative overflow-x-auto rounded-lg border border-border">
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
