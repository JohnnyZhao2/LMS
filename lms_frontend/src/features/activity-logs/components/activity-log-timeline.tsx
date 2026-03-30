import React, { useMemo } from 'react';
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from '@/components/ui/data-table/data-table';
import { CellWithAvatar } from '@/components/ui/data-table/data-table-cells';
import { ShieldAlert, ShieldCheck, AlertTriangle } from 'lucide-react';

export type ActivityLogStatus = 'success' | 'failed' | 'partial';

export interface ActivityLogTimelineItem {
  id: string;
  createdAt: string;
  status: ActivityLogStatus;
  actor: string;
  action: string;
  target?: string;
  description?: string;
}

interface ActivityLogTimelineProps {
  items: ActivityLogTimelineItem[];
  isLoading?: boolean;
  emptyText?: string;
}

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

export const ActivityLogTimeline: React.FC<ActivityLogTimelineProps> = ({
  items,
  isLoading = false,
  emptyText = '暂无相关数据',
}) => {

  const columns = useMemo<ColumnDef<ActivityLogTimelineItem>[]>(() => [
    {
      header: "发生时间",
      id: "createdAt",
      size: 170,
      cell: ({ row }) => (
        <span className="text-[13px] font-mono text-muted-foreground whitespace-nowrap">
          {formatDateTime(row.original.createdAt)}
        </span>
      ),
    },
    {
      header: "操作账号",
      id: "actor",
      size: 200,
      cell: ({ row }) => (
        <CellWithAvatar name={row.original.actor} />
      ),
    },
    {
      header: "状态",
      id: "status",
      size: 130,
      cell: ({ row }) => {
        const isError = row.original.status === 'failed';
        const isWarning = row.original.status === 'partial';
        return (
          <div className="flex items-center gap-2">
             {isError ? <ShieldAlert className="w-4 h-4 text-rose-500" /> : 
              isWarning ? <AlertTriangle className="w-4 h-4 text-amber-500" /> :
              <ShieldCheck className="w-4 h-4 text-emerald-500" />}
             <span className="text-[13px] font-medium">
               {row.original.status === 'success' ? '成功' : row.original.status === 'failed' ? '失败' : '部分成功'}
             </span>
          </div>
        );
      }
    },
    {
      header: "动作类别",
      id: "action",
      size: 140,
      cell: ({ row }) => (
        <span className="font-semibold text-foreground/80 bg-muted px-2 py-1 rounded text-[12px] border border-border/50 whitespace-nowrap">
           {row.original.action}
        </span>
      )
    },
    {
      header: "操作对象及详情",
      id: "details",
      cell: ({ row }) => (
        <div className="flex flex-col gap-1.5 min-w-[200px] py-1">
           {row.original.target && (
             <div className="text-[13px] font-semibold text-foreground">
                {row.original.target}
             </div>
           )}
           {row.original.description && (
             <div className="text-[12px] text-muted-foreground/80 leading-relaxed" title={row.original.description}>
               {row.original.description}
             </div>
           )}
           {!row.original.target && !row.original.description && (
             <span className="text-[12px] text-muted-foreground/40 italic">System Auto Logging</span>
           )}
        </div>
      )
    }
  ], []);

  if (items.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/50 border border-dashed border-border/40 rounded-xl bg-muted">
        <p className="text-[13px] font-medium">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <DataTable
        columns={columns}
        data={items}
        isLoading={isLoading}
        rowClassName="group transition-colors"
      />
    </div>
  );
};
