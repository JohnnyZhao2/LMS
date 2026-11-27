import * as React from 'react';
import {
  FileSpreadsheet,
  Link as LinkIcon,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { renderTagCategoryIcon } from '@/components/tags/tag-assignment-section';

import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import {
  useBulkDeleteKnowledge,
  useBulkImportKnowledge,
  type KnowledgeBulkDeleteItem,
  type KnowledgeBulkImportItem,
} from '@/features/knowledge/api/knowledge';
import {
  extractPreviewDocKey,
  guessDefaultColumnMapping,
  parseKnowledgeImportXlsx,
  readKnowledgeXlsxSheet,
  resolveMappedImportRows,
  saveColumnMappingPreference,
  type ColumnMappingItem,
  type ImportTargetField,
  type ParsedXlsxSheet,
} from '@/features/knowledge/utils/import-knowledge-xlsx';
import { getRelatedLinkDisplayText } from '@/features/knowledge/utils/related-links';
import { parseMultiValueExtraField, sanitizeStepsHtml } from '@/lib/knowledge-content';
import { cn } from '@/lib/utils';
import type { KnowledgeListItem } from '@/types/knowledge';
import { showApiError } from '@/utils/error-handler';
import { KnowledgeCardMymind } from './cards/knowledge-card';
import { SIDE_PANEL_HEADER_BG_CLASS } from './modals/knowledge-detail-side-panel';

type BulkRowFailure = { row: number; reason: string };

const XLSX_ACCEPT =
  '.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel';

const XLSX_ACTION_CLASS =
  'inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-[6px] px-2.5 py-1.5 text-[12.5px] font-medium text-text-muted transition-colors hover:bg-black/[0.04] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50';

const MAX_TOAST_FAILURE_ROWS = 5;
const UNMAPPED_VALUE = '__none__';
const PREVIEW_SPACE_COLOR = '#2A6CE5';

type SingletonFieldDef = {
  field: Exclude<ImportTargetField, 'tags' | 'extra' | 'ignore'>;
  label: string;
};

const CORE_CONTENT_FIELDS: SingletonFieldDef[] = [
  { field: 'title', label: '标题' },
  { field: 'summary', label: '针对故障' },
  { field: 'content', label: '步骤摘要' },
];

const STRUCTURE_FIELDS: SingletonFieldDef[] = [
  { field: 'space', label: '空间' },
  { field: 'section', label: '分组标签' },
  { field: 'url', label: '文档链接' },
  { field: 'related_links', label: '相关链接' },
];

const ID_FIELD: SingletonFieldDef = { field: 'id', label: '知识ID' };

function toPreviewListItem(item: KnowledgeBulkImportItem, index: number): KnowledgeListItem {
  const docKey = extractPreviewDocKey(item.external_doc_url);
  return {
    id: -(index + 1),
    title: item.title,
    section: item.section || '',
    summary: item.summary || '',
    space_tag: item.space_name
      ? { id: -(index + 1000), name: item.space_name, color: PREVIEW_SPACE_COLOR }
      : null,
    tags: (item.tag_items ?? []).map((t, tIdx) => ({
      id: -(tIdx + 1),
      name: t.name,
      category: t.category,
    })),
    content_preview: item.content,
    external_doc_url: item.external_doc_url,
    doc_key: docKey,
    view_count: 0,
    related_links: item.related_links,
    created_at: '',
    updated_at: '',
  };
}

function toastBulkOutcome(
  successCount: number,
  failures: BulkRowFailure[],
  messages: { ok: string; partial: string; fail: string },
) {
  if (successCount > 0 && failures.length === 0) {
    toast.success(messages.ok);
    return;
  }
  if (successCount > 0) toast.warning(messages.partial);
  else toast.error(messages.fail);
  failures.slice(0, MAX_TOAST_FAILURE_ROWS).forEach((item) => {
    toast.error(`第 ${item.row} 行：${item.reason}`);
  });
  if (failures.length > MAX_TOAST_FAILURE_ROWS) {
    toast.error(`另有 ${failures.length - MAX_TOAST_FAILURE_ROWS} 行失败`);
  }
}

interface KnowledgeXlsxActionsProps {
  canImport: boolean;
  canDelete: boolean;
}

export const KnowledgeXlsxActions: React.FC<KnowledgeXlsxActionsProps> = ({
  canImport,
  canDelete,
}) => {
  const bulkImportKnowledge = useBulkImportKnowledge();
  const bulkDeleteKnowledge = useBulkDeleteKnowledge();

  const [importProgress, setImportProgress] = React.useState<string | null>(null);
  const [deleteProgress, setDeleteProgress] = React.useState<string | null>(null);
  const [bulkDeleteItems, setBulkDeleteItems] = React.useState<KnowledgeBulkDeleteItem[] | null>(null);

  const [pendingSheet, setPendingSheet] = React.useState<ParsedXlsxSheet | null>(null);
  const [columnMappings, setColumnMappings] = React.useState<ColumnMappingItem[]>([]);
  const [activePreviewId, setActivePreviewId] = React.useState<number | null>(null);

  const importInputRef = React.useRef<HTMLInputElement | null>(null);
  const bulkDeleteInputRef = React.useRef<HTMLInputElement | null>(null);
  const lastGroupedItemIdRef = React.useRef<number | null>(null);

  const isImporting = importProgress !== null;
  const isBulkDeleting = deleteProgress !== null;

  const handleSelectImportFile = React.useCallback(async (file: File) => {
    if (importProgress) return;
    setImportProgress('解析中…');
    try {
      const sheet = await readKnowledgeXlsxSheet(file);
      const guessed = guessDefaultColumnMapping(sheet);
      setPendingSheet(sheet);
      setColumnMappings(guessed);
      lastGroupedItemIdRef.current = null;
      setActivePreviewId(null);
    } catch (error) {
      showApiError(error, '解析表格失败');
    } finally {
      setImportProgress(null);
      if (importInputRef.current) {
        importInputRef.current.value = '';
      }
    }
  }, [importProgress]);

  const handleAssignSingletonColumn = React.useCallback(
    (field: Exclude<ImportTargetField, 'tags' | 'extra' | 'ignore'>, colValue: string) => {
      const nextColIndex = colValue === UNMAPPED_VALUE ? -1 : Number(colValue);
      setColumnMappings((prev) => prev.map((item) => {
        if (item.colIndex === nextColIndex) {
          return { ...item, target: field };
        }
        if (item.target === field) {
          return { ...item, target: 'extra' };
        }
        return item;
      }));
    },
    [],
  );

  const handleSetColumnTarget = React.useCallback((colIndex: number, target: 'tags' | 'extra' | 'ignore') => {
    setColumnMappings((prev) => prev.map((item) => (
      item.colIndex === colIndex ? { ...item, target } : item
    )));
  }, []);

  const mappedByField = React.useMemo(() => {
    const map = new Map<ImportTargetField, ColumnMappingItem>();
    for (const item of columnMappings) {
      if (item.target !== 'tags' && item.target !== 'extra' && item.target !== 'ignore' && !map.has(item.target)) {
        map.set(item.target, item);
      }
    }
    return map;
  }, [columnMappings]);

  const multiTagColumns = React.useMemo(
    () => columnMappings.filter((item) => item.target === 'tags'),
    [columnMappings],
  );
  const extraColumns = React.useMemo(
    () => columnMappings.filter((item) => item.target === 'extra'),
    [columnMappings],
  );
  const ignoredColumns = React.useMemo(
    () => columnMappings.filter((item) => item.target === 'ignore'),
    [columnMappings],
  );

  const activeStructureFields = React.useMemo(
    () => (mappedByField.has('id') ? [...STRUCTURE_FIELDS, ID_FIELD] : STRUCTURE_FIELDS),
    [mappedByField],
  );

  /** 按与后端一致的 (doc_key, section) 规则预分组全表，统计关联卡与单条卡并支持切换预览 */
  const previewCatalog = React.useMemo(() => {
    if (!pendingSheet || pendingSheet.dataRows.length === 0) return null;
    const { ready } = resolveMappedImportRows(pendingSheet, columnMappings);
    if (ready.length === 0) return null;

    type CardPreviewEntry = {
      cardItem: KnowledgeListItem;
      rawById: Map<number, KnowledgeBulkImportItem>;
      firstRaw: KnowledgeBulkImportItem;
      count: number;
    };

    const buckets: KnowledgeBulkImportItem[][] = [];
    const byKey = new Map<string, KnowledgeBulkImportItem[]>();

    for (const row of ready) {
      const docKey = extractPreviewDocKey(row.external_doc_url);
      if (!docKey) {
        buckets.push([row]);
        continue;
      }
      const groupKey = `${docKey}::${(row.section || '').trim()}`;
      const existing = byKey.get(groupKey);
      if (existing) {
        existing.push(row);
      } else {
        const next = [row];
        byKey.set(groupKey, next);
        buckets.push(next);
      }
    }

    const grouped: CardPreviewEntry[] = [];
    const single: CardPreviewEntry[] = [];
    let nextIdSeed = 0;

    for (const groupRows of buckets) {
      const listItems = groupRows.map((raw) => {
        const li = toPreviewListItem(raw, nextIdSeed);
        nextIdSeed += 1;
        return li;
      });
      const cardItem: KnowledgeListItem = listItems.length > 1
        ? { ...listItems[0], grouped_items: listItems }
        : listItems[0];
      const rawById = new Map<number, KnowledgeBulkImportItem>();
      listItems.forEach((li, idx) => {
        rawById.set(li.id, groupRows[idx]);
      });
      const entry: CardPreviewEntry = {
        cardItem,
        rawById,
        firstRaw: groupRows[0],
        count: groupRows.length,
      };
      if (listItems.length > 1) {
        grouped.push(entry);
      } else {
        single.push(entry);
      }
    }

    return { grouped, single };
  }, [columnMappings, pendingSheet]);

  const groupedSample = previewCatalog?.grouped[0] ?? null;
  const singleSample = previewCatalog?.single[0] ?? null;
  const hasAnyPreview = Boolean(groupedSample || singleSample);
  const hasBothCardKinds = Boolean(groupedSample && singleSample);

  const previewRawById = React.useMemo(() => {
    const map = new Map<number, KnowledgeBulkImportItem>();
    groupedSample?.rawById.forEach((value, key) => map.set(key, value));
    singleSample?.rawById.forEach((value, key) => map.set(key, value));
    return map;
  }, [groupedSample, singleSample]);

  const activeSideItem = React.useMemo(() => {
    if (activePreviewId !== null && previewRawById.has(activePreviewId)) {
      return previewRawById.get(activePreviewId)!;
    }
    return groupedSample?.firstRaw ?? singleSample?.firstRaw ?? null;
  }, [activePreviewId, groupedSample, previewRawById, singleSample]);

  const activeCardKind: 'grouped' | 'single' = React.useMemo(() => {
    if (singleSample && activePreviewId !== null && singleSample.rawById.has(activePreviewId)) {
      return 'single';
    }
    if (groupedSample) return 'grouped';
    return 'single';
  }, [activePreviewId, groupedSample, singleSample]);

  const activeSiblingPos = React.useMemo(() => {
    if (!groupedSample || activeCardKind !== 'grouped' || groupedSample.count <= 1) return null;
    const groupedItems = groupedSample.cardItem.grouped_items ?? [];
    const idx = activePreviewId !== null
      ? Math.max(0, groupedItems.findIndex((g) => g.id === activePreviewId))
      : 0;
    return { current: idx + 1, total: groupedItems.length };
  }, [activeCardKind, activePreviewId, groupedSample]);

  const handleGroupedActiveItemChange = React.useCallback((item: KnowledgeListItem) => {
    lastGroupedItemIdRef.current = item.id;
    setActivePreviewId(item.id);
  }, []);

  const handleActivateGroupedSample = React.useCallback(() => {
    if (!groupedSample) return;
    const fallbackId = groupedSample.cardItem.grouped_items?.[0]?.id ?? groupedSample.cardItem.id;
    const candidateId = lastGroupedItemIdRef.current;
    setActivePreviewId(
      candidateId !== null && groupedSample.rawById.has(candidateId) ? candidateId : fallbackId,
    );
  }, [groupedSample]);

  const handleConfirmImport = React.useCallback(async () => {
    if (!pendingSheet || importProgress) return;
    const { ready, failures } = resolveMappedImportRows(pendingSheet, columnMappings);
    if (ready.length === 0) {
      toast.error(failures[0] ? `第 ${failures[0].rowNumber} 行：${failures[0].reason}` : '无有效数据');
      return;
    }

    setImportProgress(`同步 ${ready.length} 条…`);
    try {
      const result = await bulkImportKnowledge.mutateAsync(ready);
      saveColumnMappingPreference(pendingSheet.headers, columnMappings);
      setPendingSheet(null);
      const allFailures: BulkRowFailure[] = [
        ...failures.map((item) => ({ row: item.rowNumber, reason: item.reason })),
        ...result.failures.map((item) => ({ row: item.row_number, reason: item.reason })),
      ];
      const successCount = result.created + result.updated + result.unchanged;
      toastBulkOutcome(successCount, allFailures, {
        ok: `已同步 ${successCount} 条（新建 ${result.created}，更新 ${result.updated}，未变更 ${result.unchanged}）`,
        partial: `导入完成：新建 ${result.created}，更新 ${result.updated}，未变更 ${result.unchanged}，失败 ${allFailures.length}`,
        fail: `导入失败：${allFailures[0]?.reason ?? '无有效数据'}`,
      });
    } catch (error) {
      showApiError(error, '导入失败');
    } finally {
      setImportProgress(null);
    }
  }, [bulkImportKnowledge, columnMappings, importProgress, pendingSheet]);

  const handleBulkDeleteXlsx = React.useCallback(async (file: File) => {
    if (deleteProgress) return;
    setDeleteProgress('解析中…');
    try {
      const rows = await parseKnowledgeImportXlsx(file);
      const items = rows
        .filter((row) => row.id || row.externalDocUrl)
        .map((row) => ({
          row_number: row.rowNumber,
          ...(row.id !== undefined && { id: row.id }),
          external_doc_url: row.externalDocUrl,
          title: row.title,
          ...(row.section && { section: row.section }),
        }));
      if (items.length === 0) {
        toast.error('表格中没有知识 ID 或文档链接');
        return;
      }
      setBulkDeleteItems(items);
    } catch (error) {
      showApiError(error, '解析表格失败');
    } finally {
      setDeleteProgress(null);
      if (bulkDeleteInputRef.current) {
        bulkDeleteInputRef.current.value = '';
      }
    }
  }, [deleteProgress]);

  const confirmBulkDelete = React.useCallback(async () => {
    if (!bulkDeleteItems || deleteProgress) return;
    setDeleteProgress(`删除 ${bulkDeleteItems.length} 条…`);
    try {
      const result = await bulkDeleteKnowledge.mutateAsync({ items: bulkDeleteItems });
      setBulkDeleteItems(null);
      toastBulkOutcome(
        result.deleted,
        result.failures.map((item) => ({ row: item.row_number, reason: item.reason })),
        {
          ok: `已删除 ${result.deleted} 条知识`,
          partial: `删除完成：成功 ${result.deleted}，失败 ${result.failures.length}`,
          fail: `删除失败：${result.failures[0]?.reason ?? '无匹配数据'}`,
        },
      );
    } catch (error) {
      showApiError(error, '批量删除失败');
    } finally {
      setDeleteProgress(null);
    }
  }, [bulkDeleteItems, bulkDeleteKnowledge, deleteProgress]);

  const renderSingletonCell = (def: SingletonFieldDef) => {
    const matched = mappedByField.get(def.field);
    return (
      <div key={def.field} className="min-w-0 space-y-1.5">
        <div className="text-[12px] font-normal text-text-muted">{def.label}</div>
        <Select
          value={matched ? String(matched.colIndex) : UNMAPPED_VALUE}
          onValueChange={(value) => handleAssignSingletonColumn(def.field, value)}
          disabled={isImporting}
        >
          <SelectTrigger
            className={cn(
              'h-9 rounded-[8px] px-3 text-left text-[13px]',
              matched ? 'font-medium text-foreground' : 'font-normal text-text-muted/70',
            )}
          >
            <SelectValue placeholder="不导入" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNMAPPED_VALUE} className="text-[12.5px] text-text-muted">
              不导入
            </SelectItem>
            {columnMappings.map((col) => (
              <SelectItem
                key={col.colIndex}
                value={String(col.colIndex)}
                className="text-[12.5px]"
              >
                {col.header}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  if (!canImport && !canDelete) return null;

  const sideExtraFields = activeSideItem?.extra_fields ?? [];
  const sideTagItems = activeSideItem?.tag_items ?? [];
  const hasSidePanelData = Boolean(
    activeSideItem && (
      activeSideItem.summary
      || activeSideItem.content
      || sideTagItems.length > 0
      || sideExtraFields.length > 0
      || activeSideItem.external_doc_url
      || activeSideItem.related_links.length > 0
    ),
  );

  return (
    <>
      {canImport && (
        <>
          <input
            ref={importInputRef}
            type="file"
            accept={XLSX_ACCEPT}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleSelectImportFile(file);
            }}
          />
          <button
            type="button"
            disabled={isImporting || isBulkDeleting}
            title="上传表格导入知识"
            onClick={() => importInputRef.current?.click()}
            className={XLSX_ACTION_CLASS}
          >
            {importProgress ? <Spinner size="sm" /> : <Upload className="h-3.5 w-3.5" strokeWidth={1.8} />}
            {importProgress ?? '导入表格'}
          </button>
        </>
      )}

      {canDelete && (
        <>
          <input
            ref={bulkDeleteInputRef}
            type="file"
            accept={XLSX_ACCEPT}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleBulkDeleteXlsx(file);
            }}
          />
          <button
            type="button"
            disabled={isImporting || isBulkDeleting}
            title="按表格「文档链接」中的 id 批量删除"
            onClick={() => bulkDeleteInputRef.current?.click()}
            className={XLSX_ACTION_CLASS}
          >
            {deleteProgress ? <Spinner size="sm" /> : <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />}
            {deleteProgress ?? '表格删除'}
          </button>
        </>
      )}

      {/* Excel 导入弹窗：左字段对应 + 右真实组件样例预览（关联卡/单条卡上下同屏 + 侧栏实时联动） */}
      <Dialog
        open={pendingSheet !== null}
        onOpenChange={(open) => {
          if (!open && !isImporting) {
            setPendingSheet(null);
          }
        }}
      >
        <DialogContent
          className={cn(
            'flex max-h-[90vh] flex-col gap-0 overflow-hidden rounded-[12px] p-0',
            hasSidePanelData
              ? 'max-w-[min(1180px,calc(100vw-48px))]'
              : 'max-w-[min(860px,calc(100vw-48px))]',
          )}
        >
          <DialogHeader className="shrink-0 px-6 pt-5 pb-4">
            <div className="flex flex-wrap items-center gap-2.5 pr-6">
              <DialogTitle className="text-[16px] font-semibold tracking-tight">导入表格</DialogTitle>
              {pendingSheet ? (
                <span className="inline-flex max-w-[340px] items-center gap-1.5 rounded-full bg-muted/70 px-2.5 py-0.5 text-[12px] text-text-muted">
                  <FileSpreadsheet className="h-3.5 w-3.5 shrink-0 text-emerald-600/80" />
                  <span className="truncate">{pendingSheet.fileName}</span>
                  <span className="shrink-0 text-text-muted/50">·</span>
                  <span className="shrink-0 tabular-nums font-medium text-foreground">
                    {pendingSheet.dataRows.length} 条
                  </span>
                </span>
              ) : null}
            </div>
          </DialogHeader>

          <div className="grid min-h-0 flex-1 grid-cols-1 items-start gap-5 overflow-y-auto px-6 pb-5 [scrollbar-width:thin] lg:grid-cols-[360px_minmax(0,1fr)]">
            {/* 左侧：字段对应区（常驻展示，边调字段边看右侧实时预览） */}
            <div className="space-y-4 lg:max-h-[min(640px,calc(90vh-140px))] lg:overflow-y-auto lg:pr-1 [scrollbar-width:thin]">
              <div className="grid grid-cols-2 gap-3">
                {CORE_CONTENT_FIELDS.map(renderSingletonCell)}
                {activeStructureFields.map(renderSingletonCell)}
              </div>

              {/* 多列归属区：点击标签名称可在「标签(按列名分类)」与「其余信息」间互切，点 × 排除 */}
              {(multiTagColumns.length > 0 || extraColumns.length > 0 || ignoredColumns.length > 0) ? (
                <div className="space-y-2.5">
                  <div className="rounded-[10px] bg-muted/40 px-3.5 py-2.5">
                    <div className="mb-2 flex items-center justify-between text-[12px] text-text-muted">
                      <span>标签（按列名分类）</span>
                      <span className="text-[11px] text-text-muted/70">点击移至其余信息</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {multiTagColumns.length === 0 ? (
                        <span className="text-[12px] text-text-muted/60">暂无</span>
                      ) : (
                        multiTagColumns.map((col) => (
                          <span
                            key={col.colIndex}
                            className="inline-flex items-center gap-1 rounded-[7px] border border-black/[0.08] bg-white px-2.5 py-1 text-[12px] font-medium text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
                          >
                            <button
                              type="button"
                              disabled={isImporting}
                              onClick={() => handleSetColumnTarget(col.colIndex, 'extra')}
                              title="点击改放进其余信息"
                              className="cursor-pointer border-0 bg-transparent p-0 font-inherit text-inherit"
                            >
                              {col.header}
                            </button>
                            <button
                              type="button"
                              disabled={isImporting}
                              onClick={() => handleSetColumnTarget(col.colIndex, 'ignore')}
                              title="排除不导入"
                              className="cursor-pointer border-0 bg-transparent p-0 text-text-muted/60 hover:text-foreground"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-[10px] bg-muted/40 px-3.5 py-2.5">
                    <div className="mb-2 flex items-center justify-between text-[12px] text-text-muted">
                      <span>其余信息</span>
                      <span className="text-[11px] text-text-muted/70">点击移至标签</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {extraColumns.length === 0 ? (
                        <span className="text-[12px] text-text-muted/60">暂无</span>
                      ) : (
                        extraColumns.map((col) => (
                          <span
                            key={col.colIndex}
                            className="inline-flex items-center gap-1 rounded-[7px] border border-black/[0.08] bg-white px-2.5 py-1 text-[12px] font-medium text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
                          >
                            <button
                              type="button"
                              disabled={isImporting}
                              onClick={() => handleSetColumnTarget(col.colIndex, 'tags')}
                              title="点击改放进标签（按列名分类）"
                              className="cursor-pointer border-0 bg-transparent p-0 font-inherit text-inherit"
                            >
                              {col.header}
                            </button>
                            <button
                              type="button"
                              disabled={isImporting}
                              onClick={() => handleSetColumnTarget(col.colIndex, 'ignore')}
                              title="排除不导入"
                              className="cursor-pointer border-0 bg-transparent p-0 text-text-muted/60 hover:text-foreground"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {ignoredColumns.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-1.5 px-1">
                      <span className="text-[11.5px] text-text-muted">已排除（点击恢复）：</span>
                      {ignoredColumns.map((col) => (
                        <button
                          key={col.colIndex}
                          type="button"
                          disabled={isImporting}
                          onClick={() => handleSetColumnTarget(col.colIndex, 'extra')}
                          className="inline-flex cursor-pointer items-center rounded-[6px] border border-dashed border-black/[0.12] bg-transparent px-2 py-0.5 text-[11.5px] text-text-muted/70 line-through hover:text-foreground"
                        >
                          {col.header}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* 右侧：真实组件样例预览（关联卡 + 单条卡上下排列，右侧信息栏自然舒展无需滚动） */}
            <div className="min-w-0">
              {hasAnyPreview ? (
                <div className="rounded-[10px] bg-[#f4f6f9] p-4">
                  <div
                    className={cn(
                      'grid items-start gap-4',
                      hasSidePanelData ? 'grid-cols-1 md:grid-cols-[minmax(0,1fr)_308px]' : 'grid-cols-1',
                    )}
                  >
                    <div className="min-w-0 space-y-3.5">
                      {groupedSample ? (
                        <div
                          className="min-w-0 space-y-1.5 [&>div]:mb-0"
                          onMouseEnter={handleActivateGroupedSample}
                        >
                          {hasBothCardKinds ? (
                            <div className="flex items-center gap-1.5 px-0.5 text-[11.5px]">
                              <span
                                className={cn(
                                  'h-1.5 w-1.5 rounded-full transition-colors',
                                  activeCardKind === 'grouped' ? 'bg-[#2A6CE5]' : 'bg-[#cbd5e1]',
                                )}
                              />
                              <span
                                className={cn(
                                  'transition-colors',
                                  activeCardKind === 'grouped'
                                    ? 'font-medium text-[#334155]'
                                    : 'text-[#8f9aa8]',
                                )}
                              >
                                关联卡样例
                              </span>
                            </div>
                          ) : null}
                          <KnowledgeCardMymind
                            key={`grouped-${groupedSample.cardItem.id}`}
                            item={groupedSample.cardItem}
                            index={0}
                            onClick={handleActivateGroupedSample}
                            onActiveItemChange={handleGroupedActiveItemChange}
                            disableSideOverlay
                          />
                        </div>
                      ) : null}

                      {singleSample ? (
                        <div
                          className="min-w-0 space-y-1.5 [&>div]:mb-0"
                          onMouseEnter={() => setActivePreviewId(singleSample.cardItem.id)}
                        >
                          {hasBothCardKinds ? (
                            <div className="flex items-center gap-1.5 px-0.5 text-[11.5px]">
                              <span
                                className={cn(
                                  'h-1.5 w-1.5 rounded-full transition-colors',
                                  activeCardKind === 'single' ? 'bg-[#2A6CE5]' : 'bg-[#cbd5e1]',
                                )}
                              />
                              <span
                                className={cn(
                                  'transition-colors',
                                  activeCardKind === 'single'
                                    ? 'font-medium text-[#334155]'
                                    : 'text-[#8f9aa8]',
                                )}
                              >
                                单条卡样例
                              </span>
                            </div>
                          ) : null}
                          <KnowledgeCardMymind
                            key={`single-${singleSample.cardItem.id}`}
                            item={singleSample.cardItem}
                            index={1}
                            onClick={() => setActivePreviewId(singleSample.cardItem.id)}
                            disableSideOverlay
                          />
                        </div>
                      ) : null}
                    </div>

                    {/* 右侧：与详情弹窗真实信息栏一致的预览（高度匹配上下两张样例卡，信息一次看完且 hover 切换不抖动） */}
                    {hasSidePanelData && activeSideItem ? (
                      <div
                        className={cn(
                          'flex flex-col overflow-hidden rounded-[8px] bg-[#eef2f6] shadow-[0_2px_10px_rgba(21,38,61,0.06)]',
                          hasBothCardKinds
                            ? 'h-[min(612px,calc(90vh-164px))]'
                            : 'h-[min(520px,calc(90vh-164px))]',
                        )}
                      >
                      <div className={cn(SIDE_PANEL_HEADER_BG_CLASS, 'shrink-0 px-4 pt-4 pb-3')}>
                        <div className="line-clamp-2 text-[15px] leading-[1.4] font-medium text-[#465566]">
                          {activeSideItem.title || '未命名知识'}
                        </div>
                        <div className="mt-1.5 flex items-center justify-between gap-2 text-[11.5px] text-[#94a0ae]">
                          <span>今天 · 0 次阅读</span>
                          {activeSiblingPos ? (
                            <span className="tabular-nums text-[#64748b]">
                              {activeSiblingPos.current} / {activeSiblingPos.total}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto px-4 pt-3 pb-3 [scrollbar-width:thin]">
                        {(activeSideItem.summary || activeSideItem.content) ? (
                          <div className="relative mt-1 rounded-[6px] border-[1.5px] border-[#dbe2ea] bg-transparent px-3.5 pt-3 pb-2.5">
                            <span className="pointer-events-none absolute -top-[8px] -left-[2px] bg-[#eef2f6] pr-2 pb-[2px] text-[11px] leading-none font-medium tracking-[0.06em] text-[#e87c5d]">
                              速览
                            </span>
                            <div className="space-y-2.5">
                              {activeSideItem.summary ? (
                                <div>
                                  <div className="mb-0.5 text-[10.5px] font-medium text-[#9aa5b4]">针对故障</div>
                                  <p className="m-0 text-[12.5px] leading-[1.6] break-words text-[#637182]">
                                    {activeSideItem.summary}
                                  </p>
                                </div>
                              ) : null}
                              {activeSideItem.content ? (
                                <div>
                                  <div className="mb-0.5 text-[10.5px] font-medium text-[#9aa5b4]">步骤摘要</div>
                                  <div
                                    className="text-[12.5px] leading-[1.62] break-words whitespace-pre-wrap text-[#637182]"
                                    dangerouslySetInnerHTML={{
                                      __html: sanitizeStepsHtml(activeSideItem.content),
                                    }}
                                  />
                                </div>
                              ) : null}
                            </div>
                          </div>
                        ) : null}

                        {sideTagItems.length > 0 ? (
                          <div>
                            <div className="mb-1.5 text-[11px] font-semibold tracking-[0.04em] text-[#95a0ae]">标签</div>
                            <div className="flex flex-wrap gap-1.5">
                              {sideTagItems.map((t) => {
                                const isGroupTag = Boolean(activeSideItem.section && t.name === activeSideItem.section);
                                const icon = renderTagCategoryIcon(
                                  t.category,
                                  isGroupTag,
                                  'h-[11.5px] w-[11.5px] shrink-0 text-[#7a8797]',
                                );
                                return (
                                  <span
                                    key={t.name}
                                    title={t.category ? `${t.category}：${t.name}` : t.name}
                                    className="inline-flex max-w-full items-center gap-1 rounded-full bg-[#e2e7ee] px-2.5 py-1 text-[11.5px] leading-[1.2] text-[#566577]"
                                  >
                                    {icon}
                                    <span className="truncate">{t.name}</span>
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        ) : null}

                        {sideExtraFields.length > 0 ? (
                          <div>
                            <div className="mb-1.5 text-[11px] font-semibold tracking-[0.04em] text-[#95a0ae]">其余信息</div>
                            <dl className="m-0 space-y-2">
                              {sideExtraFields.map((field, idx) => {
                                const multiItems = parseMultiValueExtraField(field.value);
                                return (
                                  <div
                                    key={`${field.label}-${idx}`}
                                    className="grid grid-cols-[68px_minmax(0,1fr)] items-baseline gap-2.5"
                                  >
                                    <dt className="truncate text-[12.5px] leading-[1.5] text-[#8f9aa8]">{field.label}</dt>
                                    <dd className="m-0 text-[12.5px] leading-[1.5] break-words text-[#465566]">
                                      {multiItems ? multiItems.join(' · ') : field.value}
                                    </dd>
                                  </div>
                                );
                              })}
                            </dl>
                          </div>
                        ) : null}

                        {(activeSideItem.external_doc_url || activeSideItem.related_links.length > 0) ? (
                          <div>
                            <div className="mb-1.5 text-[11px] font-semibold tracking-[0.04em] text-[#95a0ae]">链接</div>
                            <div className="space-y-1.5">
                              {activeSideItem.external_doc_url ? (
                                <div className="flex items-center gap-1.5 text-[12.5px] text-[#556476]">
                                  <LinkIcon className="h-3.5 w-3.5 shrink-0 text-[#9aa3af]" />
                                  <span className="truncate">原文档链接</span>
                                </div>
                              ) : null}
                              {activeSideItem.related_links.map((link, idx) => (
                                <div key={`${link.url}-${idx}`} className="flex items-center gap-1.5 text-[12.5px] text-[#556476]">
                                  <LinkIcon className="h-3.5 w-3.5 shrink-0 text-[#9aa3af]" />
                                  <span className="truncate">{getRelatedLinkDisplayText(link)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
              ) : (
                <div className="rounded-[10px] bg-[#f4f6f9] py-8 text-center text-[13px] text-text-muted">
                  未识别到有效字段，请在左侧调整字段对应
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="shrink-0 items-center justify-end gap-2 border-t border-border/50 bg-muted/15 px-6 py-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isImporting}
              onClick={() => setPendingSheet(null)}
            >
              取消
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isImporting || !pendingSheet || !hasAnyPreview}
              onClick={() => void handleConfirmImport()}
            >
              {isImporting
                ? importProgress
                : `导入 ${pendingSheet?.dataRows.length ?? 0} 条`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={bulkDeleteItems !== null}
        onOpenChange={(open) => { if (!open && !isBulkDeleting) setBulkDeleteItems(null); }}
        title="确认批量删除"
        description={`将按文档链接删除 ${bulkDeleteItems?.length ?? 0} 条知识，此操作不可恢复。`}
        confirmText="删除"
        confirmVariant="destructive"
        isConfirming={isBulkDeleting}
        onConfirm={confirmBulkDelete}
      />
    </>
  );
};
