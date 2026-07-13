import React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table/data-table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ExamReportFiltersState, ExamReportView } from '@/types/dashboard';

import { downloadExamReport } from '../api/exam-report';
import { VIEW_META } from './exam-report-view-meta';

interface ExamReportExportDialogProps<TData> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  view: ExamReportView;
  filters: ExamReportFiltersState;
  columns: ColumnDef<TData, unknown>[];
  rows: TData[];
  totalCount: number;
  isLoading?: boolean;
}

export function ExamReportExportDialog<TData>({
  open,
  onOpenChange,
  view,
  filters,
  columns,
  rows,
  totalCount,
  isLoading = false,
}: ExamReportExportDialogProps<TData>) {
  const [exporting, setExporting] = React.useState(false);
  const { label, template, sheetLabel } = VIEW_META[view];

  const handleConfirm = async () => {
    setExporting(true);
    try {
      await downloadExamReport(filters, template);
      toast.success('报表已开始下载');
      onOpenChange(false);
    } catch {
      toast.error('报表导出失败');
    } finally {
      setExporting(false);
    }
  };

  const previewHint =
    rows.length > 0 && totalCount > rows.length
      ? `预览 ${rows.length} / 共 ${totalCount} 条`
      : `共 ${totalCount} 条`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(88vh,720px)] w-[min(96vw,920px)] max-w-none flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border/60 px-5 py-3.5 pr-12">
          <DialogTitle className="text-base font-semibold">导出预览</DialogTitle>
          <p className="text-[12px] text-text-muted">
            {label} · {sheetLabel} · {previewHint}（文件含筛选下全部数据）
          </p>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-hidden px-5 py-3">
          <div className="flex h-full min-h-[280px] flex-col overflow-hidden rounded-lg border border-border/70">
            <DataTable
              columns={columns}
              data={rows}
              isLoading={isLoading}
              fillHeight
              minHeight={0}
              className="mt-0 flex-1"
              tableContainerClassName="border-0 rounded-none"
              shellClassName="border-0 shadow-none rounded-none"
            />
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t border-border/60 px-5 py-3">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={exporting || isLoading || totalCount === 0}
            onClick={() => {
              void handleConfirm();
            }}
          >
            <Download className="h-4 w-4" />
            {exporting ? '导出中…' : '确认导出'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
