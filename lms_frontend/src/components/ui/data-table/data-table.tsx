"use client"

import * as React from "react"
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type RowSelectionState,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { Pagination } from "@/components/ui/pagination"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  isLoading?: boolean
  pagination?: {
    pageIndex: number
    pageSize: number
    pageCount: number
    totalCount?: number  // Actual total number of records
    onPageChange: (page: number) => void
    onPageSizeChange: (size: number) => void
  }
  enableRowSelection?: boolean
  onRowSelectionChange?: (selection: RowSelectionState) => void
  onRowClick?: (row: TData) => void
  rowClassName?: string
  minHeight?: string | number
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading,
  pagination,
  enableRowSelection = false,
  onRowSelectionChange,
  onRowClick,
  rowClassName,
  minHeight = "400px",
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})

  // Sync row selection with parent
  React.useEffect(() => {
    if (onRowSelectionChange) {
      onRowSelectionChange(rowSelection)
    }
  }, [rowSelection, onRowSelectionChange])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(), // Always provide row model for client-side pagination support
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: enableRowSelection ? setRowSelection : undefined,
    enableRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    manualPagination: !!pagination,
    pageCount: pagination?.pageCount ?? -1,
  })

  const hasColumnSizes = columns.some(col => col.size || col.minSize || col.maxSize)

  return (
    <div
      className="flex-1 flex flex-col mt-4"
      style={{ minHeight: typeof minHeight === 'number' ? `${minHeight}px` : minHeight }}
    >
      <div className="flex-1 overflow-auto">
        <div className="rounded-lg bg-white shadow-none border-0">
          <Table className={cn(hasColumnSizes ? "table-fixed" : "table-auto")}>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="border-0 hover:bg-transparent">
                  {headerGroup.headers.map((header, index) => (
                    <TableHead
                      key={header.id}
                      style={{
                        width: header.column.columnDef.size ? `${header.column.columnDef.size}px` : undefined,
                        minWidth: header.column.columnDef.minSize ? `${header.column.columnDef.minSize}px` : undefined,
                        maxWidth: header.column.columnDef.maxSize ? `${header.column.columnDef.maxSize}px` : undefined,
                      }}
                      className={cn(
                        index === 0
                          ? 'rounded-tl-lg'
                          : index === headerGroup.headers.length - 1
                            ? 'rounded-tr-lg'
                            : ''
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {columns.map((column, index) => (
                      <TableCell
                        key={index}
                        style={{
                          width: column.size ? `${column.size}px` : undefined,
                          minWidth: column.minSize ? `${column.minSize}px` : undefined,
                          maxWidth: column.maxSize ? `${column.maxSize}px` : undefined,
                        }}
                      >
                        <Skeleton className="h-6 w-full opacity-50" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    onClick={() => onRowClick?.(row.original)}
                    className={onRowClick ? `cursor-pointer hover:bg-[#F9FAFB] ${rowClassName || ''}` : rowClassName}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        style={{
                          width: cell.column.columnDef.size ? `${cell.column.columnDef.size}px` : undefined,
                          minWidth: cell.column.columnDef.minSize ? `${cell.column.columnDef.minSize}px` : undefined,
                          maxWidth: cell.column.columnDef.maxSize ? `${cell.column.columnDef.maxSize}px` : undefined,
                        }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-[#6B7280]"
                  >
                    暂无数据
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      {pagination && (
        <div className="pt-6 mt-4 border-t border-gray-100 bg-white sticky bottom-0 z-10">
          <Pagination
            current={pagination.pageIndex + 1}
            total={pagination.totalCount ?? (pagination.pageCount * pagination.pageSize)}
            pageSize={pagination.pageSize}
            onChange={(page) => pagination.onPageChange(page - 1)}
            showSizeChanger
            onShowSizeChange={(_, size) => pagination.onPageSizeChange(size)}
            showTotal={(total) => `共 ${total} 条记录`}
            className="px-6"
          />
        </div>
      )}
    </div>
  );
}
