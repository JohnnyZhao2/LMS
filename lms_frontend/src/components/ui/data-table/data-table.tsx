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

type ColumnWidthMeta = {
  width?: string
  minWidth?: string
  maxWidth?: string
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  isLoading?: boolean
  header?: React.ReactNode
  headerClassName?: string
  className?: string
  shellClassName?: string
  tableContainerClassName?: string
  pagination?: {
    pageIndex: number
    pageSize: number
    defaultPageSize?: number
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
  header,
  headerClassName,
  className,
  shellClassName,
  tableContainerClassName,
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
  const frameRef = React.useRef<number | null>(null)
  const shellRef = React.useRef<HTMLDivElement | null>(null)
  const topBarRef = React.useRef<HTMLDivElement | null>(null)
  const headerRef = React.useRef<HTMLTableSectionElement | null>(null)
  const footerRef = React.useRef<HTMLDivElement | null>(null)
  const [stretchedRowHeight, setStretchedRowHeight] = React.useState<number | null>(null)
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
  const shouldShowPagination = !!pagination
    && resolvedTotalCount > 0
    && (
      resolvedTotalCount > pagination.pageSize
      || pagination.pageSize !== (pagination.defaultPageSize ?? pagination.pageSize)
    )

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

  const visibleRowCount = table.getRowModel().rows.length
  const targetRowCount = pagination?.pageSize
  const getColumnWidthMeta = React.useCallback((column: ColumnDef<TData, TValue>): ColumnWidthMeta => {
    const meta = (column.meta ?? {}) as ColumnWidthMeta
    return {
      width: meta.width,
      minWidth: meta.minWidth,
      maxWidth: meta.maxWidth,
    }
  }, [])
  const getColumnWidthStyle = React.useCallback((column: ColumnDef<TData, TValue>) => {
    const meta = getColumnWidthMeta(column)
    return {
      width: meta.width ?? (column.size ? `${column.size}px` : undefined),
      minWidth: meta.minWidth ?? (column.minSize ? `${column.minSize}px` : undefined),
      maxWidth: meta.maxWidth ?? (column.maxSize ? `${column.maxSize}px` : undefined),
    }
  }, [getColumnWidthMeta])
  const hasColumnSizes = columns.some((col) => {
    const meta = getColumnWidthMeta(col)
    return col.size || col.minSize || col.maxSize || meta.width || meta.minWidth || meta.maxWidth
  })
  const hasTopBar = Boolean(header)
  const shouldStretchRows = fillHeight
    && !isLoading
    && !!targetRowCount
    && visibleRowCount === targetRowCount

  const getColumnSpacingClass = React.useCallback((index: number, total: number) => {
    if (total <= 1) {
      return 'px-5'
    }
    if (index === 0) {
      return 'pl-5 pr-3'
    }
    if (index === total - 1) {
      return 'pl-3 pr-5'
    }
    return 'px-3'
  }, [])

  React.useLayoutEffect(() => {
    if (!shouldStretchRows) {
      setStretchedRowHeight(null)
      return
    }

    const updateRowHeight = () => {
      const shellHeight = shellRef.current?.clientHeight ?? 0
      const topBarHeight = topBarRef.current?.offsetHeight ?? 0
      const headerHeight = headerRef.current?.offsetHeight ?? 0
      const footerHeight = footerRef.current?.offsetHeight ?? 0
      const availableHeight = shellHeight - topBarHeight - headerHeight - footerHeight

      if (availableHeight <= 0 || !targetRowCount) {
        setStretchedRowHeight(null)
        return
      }

      const nextHeight = Math.max(68, Math.floor(availableHeight / targetRowCount))
      setStretchedRowHeight((prev) => (prev === nextHeight ? prev : nextHeight))
    }

    const scheduleUpdate = () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
      }
      frameRef.current = window.requestAnimationFrame(updateRowHeight)
    }

    scheduleUpdate()

    const resizeObserver = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(scheduleUpdate)

    if (resizeObserver) {
      if (shellRef.current) resizeObserver.observe(shellRef.current)
      if (topBarRef.current) resizeObserver.observe(topBarRef.current)
      if (headerRef.current) resizeObserver.observe(headerRef.current)
      if (footerRef.current) resizeObserver.observe(footerRef.current)
    }

    window.addEventListener("resize", scheduleUpdate)

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
      resizeObserver?.disconnect()
      window.removeEventListener("resize", scheduleUpdate)
    }
  }, [shouldStretchRows, targetRowCount, shouldShowPagination])

  return (
    <div
      className={cn("mt-4 flex min-h-0 flex-col", fillHeight && "flex-1 max-h-full", className)}
      style={{ minHeight: typeof minHeight === 'number' ? `${minHeight}px` : minHeight }}
    >
      <div
        ref={shellRef}
        className={cn(
          "flex min-h-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-white",
          fillHeight && "flex-1 max-h-full",
          shellClassName,
        )}
      >
        {header && (
          <div
            ref={topBarRef}
            className={cn(
              "flex items-center justify-between gap-3 border-b border-border/60 bg-white px-5 py-3",
              headerClassName,
            )}
          >
            {header}
          </div>
        )}
        <Table
          containerClassName={cn("min-h-0", fillHeight && "flex-1", tableContainerClassName)}
          className={cn(hasColumnSizes ? "table-fixed" : "table-auto")}
        >
            <TableHeader ref={headerRef}>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="border-0 hover:bg-transparent">
                  {headerGroup.headers.map((header, index) => (
                    <TableHead
                      key={header.id}
                      style={getColumnWidthStyle(header.column.columnDef)}
                      className={cn(
                        getColumnSpacingClass(index, headerGroup.headers.length),
                        !hasTopBar && index === 0
                          ? 'rounded-tl-lg'
                          : !hasTopBar && index === headerGroup.headers.length - 1
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
                        style={getColumnWidthStyle(column)}
                        className={getColumnSpacingClass(index, columns.length)}
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
                    className={cn(onRowClick && "cursor-pointer", rowClassName)}
                    style={stretchedRowHeight ? { height: `${stretchedRowHeight}px` } : undefined}
                  >
                    {row.getVisibleCells().map((cell, index, cells) => (
                      <TableCell
                        key={cell.id}
                        style={getColumnWidthStyle(cell.column.columnDef)}
                        className={getColumnSpacingClass(index, cells.length)}
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
        {shouldShowPagination && (
        <div ref={footerRef} className="mt-auto border-t border-border bg-muted/20 px-5 py-2">
          <Pagination
            current={pagination.pageIndex + 1}
            total={resolvedTotalCount}
            pageSize={pagination.pageSize}
            defaultPageSize={pagination.defaultPageSize}
            onChange={(page) => pagination.onPageChange(page - 1)}
            showSizeChanger
            onShowSizeChange={(_, size) => pagination.onPageSizeChange(size)}
            showTotal={(total) => `共 ${total} 条记录`}
            className="min-h-8"
          />
        </div>
        )}
      </div>
    </div>
  );
}
