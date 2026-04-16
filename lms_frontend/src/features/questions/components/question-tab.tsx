import React from 'react';
import { Trash2, Eye, PencilLine, Clock3, CircleHelp } from 'lucide-react';
import { useQuestions } from '@/features/questions/api/get-questions';
import { useDeleteQuestion } from '@/features/questions/api/create-question';
import { QuestionDetailDialog } from '@/features/questions/components/question-detail-dialog';
import { useRoleNavigate } from '@/hooks/use-role-navigate';
import { useScopedPagination } from '@/hooks/use-scoped-pagination';
import type { QuestionType } from '@/types/common';
import type { Question } from '@/types/question';
import { getQuestionTypeLabel, getQuestionTypePresentation } from '@/features/questions/constants';
import { showApiError } from '@/utils/error-handler';
import { toast } from 'sonner';
import dayjs from '@/lib/dayjs';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DataTable } from '@/components/ui/data-table/data-table';
import { ListTag } from '@/components/ui/list-tag';
import { Tooltip } from '@/components/ui/tooltip';
import { richTextToPreviewText } from '@/lib/rich-text';
import { cn } from '@/lib/utils';
import { type ColumnDef } from '@tanstack/react-table';

interface QuestionTabProps {
    search?: string;
    filterQuestionType?: QuestionType | 'all';
    filterSpaceTagId?: string;
}

export const QuestionTab: React.FC<QuestionTabProps> = ({
    search = '',
    filterQuestionType = 'all',
    filterSpaceTagId = 'all',
}) => {
    const [deleteId, setDeleteId] = React.useState<number | null>(null);
    const [previewQuestion, setPreviewQuestion] = React.useState<Question | null>(null);
    const { roleNavigate } = useRoleNavigate();

    const currentScopeKey = `${search}|${filterQuestionType}|${filterSpaceTagId}`;
    const {
        page,
        pageIndex,
        pageSize,
        onPageChange,
        onPageSizeChange,
    } = useScopedPagination({ scopeKey: currentScopeKey });

    const { data, isLoading } = useQuestions({
        page,
        pageSize,
        search: search || undefined,
        questionType: filterQuestionType === 'all' ? undefined : filterQuestionType,
        spaceTagId: filterSpaceTagId === 'all' ? undefined : Number(filterSpaceTagId),
    });
    const deleteQuestion = useDeleteQuestion();

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await deleteQuestion.mutateAsync(deleteId);
            toast.success('题目已从系统库清除');
            setDeleteId(null);
        } catch (error) {
            showApiError(error);
        }
    };

    const columns: ColumnDef<Question>[] = [
        {
            id: 'content',
            header: '题干',
            minSize: 280,
            meta: {
                width: '30%',
                minWidth: '280px',
                maxWidth: '360px',
            },
            cell: ({ row }) => {
                const typePresentation = getQuestionTypePresentation(row.original.question_type as QuestionType);

                return (
                    <div className="flex min-w-0 items-center gap-4 py-1">
                        <div
                            className={cn(
                                'flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted/55',
                                typePresentation.color,
                            )}
                        >
                            <CircleHelp className="h-3.5 w-3.5" strokeWidth={1.8} />
                        </div>
                        <div className="flex min-w-0 flex-col gap-1">
                            <span className="truncate font-bold text-foreground">
                                {richTextToPreviewText(row.original.content)}
                            </span>
                            <span className="truncate text-[11px] font-normal text-text-muted">
                                {row.original.updated_by_name || row.original.created_by_name || '系统'}
                            </span>
                        </div>
                    </div>
                );
            }
        },
        {
            id: 'type',
            header: '题型',
            minSize: 88,
            meta: {
                width: '9%',
                minWidth: '88px',
                maxWidth: '104px',
            },
            cell: ({ row }) => (
                <span className="whitespace-nowrap text-[13px] font-normal text-foreground/68">
                    {getQuestionTypeLabel(row.original.question_type as QuestionType)}
                </span>
            )
        },
        {
            id: 'space',
            header: '所属空间',
            minSize: 112,
            meta: {
                width: '11%',
                minWidth: '112px',
                maxWidth: '144px',
            },
            cell: ({ row }) => {
                const spaceTag = row.original.space_tag;
                if (!spaceTag) {
                    return <span className="text-text-muted italic text-xs">—</span>;
                }

                return (
                    <ListTag
                        className="max-w-full"
                        style={spaceTag.color ? {
                            color: spaceTag.color,
                            borderColor: spaceTag.color,
                        } : undefined}
                    >
                        {spaceTag.name}
                    </ListTag>
                );
            },
        },
        {
            id: 'usage',
            header: '使用情况',
            minSize: 88,
            meta: {
                width: '9%',
                minWidth: '88px',
                maxWidth: '108px',
            },
            cell: ({ row }) => (
                <span className={row.original.is_referenced ? 'text-[13px] font-medium text-secondary-700' : 'text-[13px] font-medium text-text-muted'}>
                    {row.original.is_referenced ? `${row.original.usage_count} 次` : '未引用'}
                </span>
            ),
        },
        {
            id: 'timestamp',
            header: '更新时间',
            minSize: 120,
            meta: {
                width: '11%',
                minWidth: '120px',
                maxWidth: '132px',
            },
            cell: ({ row }) => (
                <div className="flex items-center gap-2 whitespace-nowrap">
                    <Clock3 className="h-3.5 w-3.5 text-text-muted" strokeWidth={1.8} />
                    <span className="text-[13px] font-medium text-foreground">
                        {dayjs(row.original.updated_at).format('YY.MM.DD')}
                    </span>
                    <span className="text-[11px] font-medium text-text-muted">
                        {dayjs(row.original.updated_at).format('HH:mm')}
                    </span>
                </div>
            ),
        },
        {
            id: 'actions',
            header: '操作',
            minSize: 108,
            meta: {
                width: '9%',
                minWidth: '108px',
                maxWidth: '124px',
            },
            cell: ({ row }) => {
                const record = row.original;
                return (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Tooltip title="查看详情">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-md text-text-muted hover:bg-muted hover:text-foreground"
                                onClick={() => setPreviewQuestion(record)}
                            >
                                <Eye className="h-4 w-4" strokeWidth={2} />
                            </Button>
                        </Tooltip>
                        <Tooltip title="编辑题目">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-md text-text-muted hover:bg-primary-50 hover:text-primary"
                                onClick={() => roleNavigate(`/questions/${record.id}/edit`)}
                            >
                                <PencilLine className="h-4 w-4" strokeWidth={2} />
                            </Button>
                        </Tooltip>
                        <Tooltip title="彻底删除">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-md text-text-muted hover:bg-destructive-50 hover:text-destructive"
                                onClick={() => setDeleteId(record.id)}
                            >
                                <Trash2 className="h-4 w-4" strokeWidth={2} />
                            </Button>
                        </Tooltip>
                    </div>
                );
            },
        },
    ];

    return (
        <>
            <DataTable
                columns={columns}
                data={data?.results || []}
                isLoading={isLoading}
                fillHeight
                pagination={{
                    pageIndex,
                    pageSize,
                    defaultPageSize: 10,
                    pageCount: Math.ceil((data?.count || 0) / pageSize),
                    totalCount: data?.count || 0,
                    onPageChange,
                    onPageSizeChange,
                }}
                rowClassName="group"
                onRowClick={(row: Question) => setPreviewQuestion(row)}
            />

            <QuestionDetailDialog
                question={previewQuestion}
                open={!!previewQuestion}
                onOpenChange={(open) => {
                    if (!open) {
                        setPreviewQuestion(null);
                    }
                }}
                onEdit={(question) => {
                    setPreviewQuestion(null);
                    roleNavigate(`/questions/${question.id}/edit`);
                }}
                onDelete={(question) => {
                    setPreviewQuestion(null);
                    setDeleteId(question.id);
                }}
            />

            {/* 删除确认对话框 */}
            <ConfirmDialog
                open={!!deleteId}
                onOpenChange={(open) => !open && setDeleteId(null)}
                title="彻底从系统中清除此题目?"
                description="此操作将永久删除该题目记录。若该题已被试卷引用，系统会直接阻止删除。该操作不可撤销。"
                icon={<Trash2 className="h-10 w-10" />}
                iconBgColor="bg-destructive-100"
                iconColor="text-destructive"
                confirmText="确认删除"
                cancelText="取消"
                confirmVariant="destructive"
                onConfirm={handleDelete}
                isConfirming={false}
            />
        </>
    );
};
