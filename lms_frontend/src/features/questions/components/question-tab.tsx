import React, { useState } from 'react';
import { Trash2, MoreHorizontal, FileText, Eye, PencilLine } from 'lucide-react';
import { useQuestions } from '@/features/questions/api/get-questions';
import { useDeleteQuestion } from '@/features/questions/api/create-question';
import { QuestionDetailDialog } from '@/features/questions/components/question-detail-dialog';
import { useRoleNavigate } from '@/hooks/use-role-navigate';
import type { Question, QuestionType } from '@/types/api';
import { getQuestionTypeLabel, getQuestionTypeStyle } from '@/features/questions/constants';
import { showApiError } from '@/utils/error-handler';
import { toast } from 'sonner';
import dayjs from '@/lib/dayjs';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { DataTable } from '@/components/ui/data-table/data-table';
import { CellWithIcon, CellTags } from '@/components/ui/data-table/data-table-cells';
import { richTextToPreviewText } from '@/lib/rich-text';
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
    const [pagination, setPagination] = useState({
        page: 1,
        pageSize: 10,
        scopeKey: search,
    });
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
    const { roleNavigate } = useRoleNavigate();

    const currentScopeKey = `${search}|${filterQuestionType}|${filterSpaceTagId}`;
    const page = pagination.scopeKey === currentScopeKey ? pagination.page : 1;
    const pageSize = pagination.pageSize;

    const { data, isLoading, refetch } = useQuestions({
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
            refetch();
        } catch (error) {
            showApiError(error);
        }
    };

    const columns: ColumnDef<Question>[] = [
        {
            id: 'content',
            header: '题目内容',
            size: 560,
            minSize: 360,
            cell: ({ row }) => (
                <CellWithIcon
                    icon={<FileText className="w-5 h-5" />}
                    title={richTextToPreviewText(row.original.content)}
                    subtitle={row.original.updated_by_name || row.original.created_by_name || '系统'}
                    iconBgClass="bg-secondary-50"
                    iconColorClass="text-secondary-600"
                />
            )
        },
        {
            id: 'type',
            header: '题型',
            size: 110,
            minSize: 100,
            maxSize: 128,
            cell: ({ row }) => {
                const typeStyle = getQuestionTypeStyle(row.original.question_type);
                return (
                    <CellTags
                        tags={[{
                            key: row.original.question_type,
                            label: getQuestionTypeLabel(row.original.question_type as QuestionType),
                            bgClass: typeStyle.bg,
                            textClass: typeStyle.color,
                        }]}
                    />
                );
            }
        },
        {
            id: 'tags',
            header: '标签',
            size: 220,
            minSize: 160,
            maxSize: 260,
            cell: ({ row }) => (
                <CellTags
                    tags={(row.original.tags ?? []).map((tag) => ({
                        key: String(tag.id),
                        label: tag.name,
                        bgClass: 'bg-muted',
                        textClass: 'text-foreground',
                    }))}
                />
            ),
        },
        {
            id: 'timestamp',
            header: '更新时间',
            size: 150,
            minSize: 132,
            maxSize: 168,
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="text-sm font-bold text-foreground">
                        {dayjs(row.original.updated_at).format('YYYY.MM.DD')}
                    </span>
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-tighter">
                        {dayjs(row.original.updated_at).format('HH:mm:ss')}
                    </span>
                </div>
            ),
        },
        {
            id: 'actions',
            header: '操作',
            size: 84,
            minSize: 72,
            maxSize: 96,
            cell: ({ row }) => {
                const record = row.original;
                return (
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-md">
                                    <MoreHorizontal className="w-4 h-4 text-text-muted" strokeWidth={2} />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 rounded-lg p-1 border border-border  bg-background">
                                <DropdownMenuItem
                                    className="rounded-md px-3 py-2.5 font-semibold cursor-pointer text-xs"
                                    onClick={() => setPreviewQuestion(record)}
                                >
                                    <Eye className="w-3.5 h-3.5 mr-2" strokeWidth={2} /> 查看详情
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="rounded-md px-3 py-2.5 font-semibold cursor-pointer text-xs"
                                    onClick={() => roleNavigate(`/questions/${record.id}/edit`)}
                                >
                                    <PencilLine className="w-3.5 h-3.5 mr-2" strokeWidth={2} /> 编辑题目
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-muted mx-2" />
                                <DropdownMenuItem
                                    className="rounded-md px-3 py-2.5 font-semibold text-destructive-600 focus:bg-destructive-50 cursor-pointer transition-colors text-xs"
                                    onClick={() => setDeleteId(record.id)}
                                >
                                    <Trash2 className="w-3.5 h-3.5 mr-2" strokeWidth={2} /> 彻底删除
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
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
                    pageIndex: page - 1,
                    pageSize: pageSize,
                    defaultPageSize: 10,
                    pageCount: Math.ceil((data?.count || 0) / pageSize),
                    totalCount: data?.count || 0,
                    onPageChange: (p: number) =>
                        setPagination((prev) => ({
                            ...prev,
                            page: p + 1,
                            scopeKey: currentScopeKey,
                        })),
                    onPageSizeChange: (size: number) => {
                        setPagination((prev) => ({
                            ...prev,
                            pageSize: size,
                            page: 1,
                            scopeKey: currentScopeKey,
                        }));
                    },
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
                description="此操作将永久删除该题目记录。如果已有试卷正在引用此题目,可能会导致作业显示异常。该操作不可撤销。"
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
