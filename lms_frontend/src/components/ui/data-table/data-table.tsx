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
  type PaginationState,
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
  fillHeight?: boolean
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
  minHeight = "320px",
  fillHeight = false,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const paginationState = React.useMemo<PaginationState | undefined>(
    () => (
      pagination
        ? {
            pageIndex: pagination.pageIndex,
            pageSize: pagination.pageSize,
          }
        : undefined
    ),
    [pagination],
  )
  const resolvedTotalCount = pagination?.totalCount ?? data.length
  const isServerPagination = !!pagination && resolvedTotalCount > data.length

  // Sync row selection with parent
  React.useEffect(() => {
    if (onRowSelectionChange) {
      onRowSelectionChange(rowSelection)
    }
  }, [rowSelection, onRowSelectionChange])

  // eslint-disable-next-line react-hooks/incompatible-library
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
      ...(paginationState ? { pagination: paginationState } : {}),
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    manualPagination: isServerPagination,
    pageCount: pagination?.pageCount ?? -1,
  })

  const hasColumnSizes = columns.some(col => col.size || col.minSize || col.maxSize)

  return (
    <div
      className={cn("mt-4 flex min-h-0 flex-col", fillHeight && "max-h-full")}
      style={{ minHeight: typeof minHeight === 'number' ? `${minHeight}px` : minHeight }}
    >
      <div
        className={cn(
          "flex min-h-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-white",
          fillHeight && "max-h-full",
        )}
      >
        <Table
          containerClassName={cn("min-h-0", fillHeight && "flex-1")}
          className={cn(hasColumnSizes ? "table-fixed" : "table-auto")}
        >
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
                    className={onRowClick ? `cursor-pointer hover:bg-muted ${rowClassName || ''}` : rowClassName}
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
                    className="h-24 text-center text-text-muted"
                  >
                    暂无数据
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
        </Table>
        {pagination && (
        <div className="mt-auto border-t border-border bg-muted/20 px-4 py-3">
          <Pagination
            current={pagination.pageIndex + 1}
            total={resolvedTotalCount}
            pageSize={pagination.pageSize}
            onChange={(page) => pagination.onPageChange(page - 1)}
            showSizeChanger
            onShowSizeChange={(_, size) => pagination.onPageSizeChange(size)}
            showTotal={(total) => `共 ${total} 条记录`}
            className="min-h-10"
          />
        </div>
        )}
      </div>
    </div>
  );
}
