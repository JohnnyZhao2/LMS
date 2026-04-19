import React from 'react';
import { Trash2, PencilLine, Clock3, CircleHelp } from 'lucide-react';
import { useQuestions } from '@/entities/question/api/get-questions';
import { useDeleteQuestion } from '@/entities/question/api/create-question';
import { QuestionDetailDialog } from '@/entities/question/components/question-detail-dialog';
import { useRoleNavigate } from '@/session/hooks/use-role-navigate';
import { useScopedPagination } from '@/hooks/use-scoped-pagination';
import type { QuestionType } from '@/types/common';
import type { Question } from '@/types/question';
import { getQuestionTypeLabel, getQuestionTypePresentation } from '@/entities/question/constants';
import { showApiError } from '@/utils/error-handler';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DataTable } from '@/components/ui/data-table/data-table';
import {
    LIST_ACTION_ICON_DESTRUCTIVE_CLASS,
    LIST_ACTION_ICON_EDIT_CLASS,
} from '@/components/ui/data-table/action-icon-styles';
import { ListTag } from '@/components/ui/list-tag';
import { CellMutedTimestamp, CellReferenceTag, CellWithIcon } from '@/components/ui/data-table/data-table-cells';
import { Tooltip } from '@/components/ui/tooltip';
import { richTextToPreviewText } from '@/lib/rich-text';
import { getLastEditedByName } from '@/lib/last-edited';
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
            meta: {
                width: '34%',
                minWidth: '280px',
            },
            cell: ({ row }) => {
                return (
                    <CellWithIcon
                        icon={<CircleHelp className="h-3.5 w-3.5" strokeWidth={1.8} />}
                        title={richTextToPreviewText(row.original.content)}
                        subtitle={getLastEditedByName(row.original.updated_by_name, row.original.created_by_name)}
                        iconBgClass="bg-muted/55"
                        iconColorClass="text-foreground/60"
                    />
                );
            }
        },
        {
            id: 'type',
            header: '题型',
            meta: {
                width: '96px',
            },
            cell: ({ row }) => {
                const presentation = getQuestionTypePresentation(row.original.question_type as QuestionType);
                return (
                    <ListTag size="sm" className={cn(presentation.bg, 'text-text-muted')}>
                        {getQuestionTypeLabel(row.original.question_type as QuestionType)}
                    </ListTag>
                );
            }
        },
        {
            id: 'space',
            header: '所属空间',
            meta: {
                minWidth: '140px',
            },
            cell: ({ row }) => {
                const spaceTag = row.original.space_tag;
                if (!spaceTag) {
                    return <span className="text-[13px] font-medium text-text-muted">—</span>;
                }

                return (
                    <ListTag
                        size="sm"
                        className="max-w-full text-text-muted"
                        style={spaceTag.color ? {
                            backgroundColor: `${spaceTag.color}22`,
                        } : undefined}
                    >
                        {spaceTag.name}
                    </ListTag>
                );
            },
        },
        {
            id: 'usage',
            header: '引用次数',
            meta: {
                width: '96px',
            },
            cell: ({ row }) => <CellReferenceTag count={row.original.usage_count} />,
        },
        {
            id: 'timestamp',
            header: '更新时间',
            meta: {
                width: '168px',
            },
            cell: ({ row }) => (
                <CellMutedTimestamp
                    icon={<Clock3 className="h-3.5 w-3.5" strokeWidth={1.8} />}
                    value={row.original.updated_at}
                />
            ),
        },
        {
            id: 'actions',
            header: '操作',
            meta: {
                width: '88px',
            },
            cell: ({ row }) => {
                const record = row.original;
                return (
                    <div className="inline-flex flex-nowrap items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Tooltip title="编辑题目">
                            <Button
                                variant="ghost"
                                size="icon"
                                className={LIST_ACTION_ICON_EDIT_CLASS}
                                onClick={() => roleNavigate(`/questions/${record.id}/edit`)}
                            >
                                <PencilLine className="h-4 w-4" strokeWidth={2} />
                            </Button>
                        </Tooltip>
                        <Tooltip title="彻底删除">
                            <Button
                                variant="ghost"
                                size="icon"
                                className={LIST_ACTION_ICON_DESTRUCTIVE_CLASS}
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
