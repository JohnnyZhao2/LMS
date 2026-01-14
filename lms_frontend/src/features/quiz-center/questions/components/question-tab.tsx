"use client"

import React, { useState } from 'react';
import { Trash2, MoreHorizontal, FileText, Eye } from 'lucide-react';
import { useQuestions } from '@/features/quiz-center/questions/api/get-questions';
import { useDeleteQuestion } from '@/features/quiz-center/questions/api/create-question';
import { useLineTypeTags } from '@/features/knowledge/api/get-tags';
import { QuestionEditorPanel } from '@/features/quiz-center/questions/components/question-editor-panel';
import type { Question, QuestionCreateRequest, QuestionType } from '@/types/api';
import { getQuestionTypeLabel, getQuestionTypeStyle } from '@/features/quiz-center/questions/constants';
import { showApiError } from '@/utils/error-handler';
import { toast } from 'sonner';
import dayjs from '@/lib/dayjs';
import {
    Button,
    ConfirmDialog,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { DataTable, CellWithIcon, CellTags } from '@/components/ui/data-table';
import { type ColumnDef } from '@tanstack/react-table';

interface QuestionTabProps {
    search?: string;
}

export const QuestionTab: React.FC<QuestionTabProps> = ({ search = '' }) => {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);

    const { data, isLoading, refetch } = useQuestions({ page, pageSize, search: search || undefined });
    const { data: lineTypes } = useLineTypeTags();
    const deleteQuestion = useDeleteQuestion();

    const previewForm: Partial<QuestionCreateRequest> = previewQuestion ? {
        line_type_id: previewQuestion.line_type?.id,
        question_type: previewQuestion.question_type,
        content: previewQuestion.content,
        options: previewQuestion.options || [],
        answer: previewQuestion.answer || '',
        explanation: previewQuestion.explanation || '',
        score: previewQuestion.score || '1',
    } : {};

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
            cell: ({ row }) => (
                <CellWithIcon
                    icon={<FileText className="w-5 h-5" />}
                    title={row.original.content}
                    subtitle={`ID: ${row.original.id} • ${row.original.created_by_name || '系统'}`}
                    iconBg="#F0FDF4"
                    iconColor="#16A34A"
                />
            )
        },
        {
            id: 'type',
            header: '题型',
            cell: ({ row }) => {
                const typeStyle = getQuestionTypeStyle(row.original.question_type);
                return (
                    <CellTags
                        tags={[{
                            key: row.original.question_type,
                            label: getQuestionTypeLabel(row.original.question_type as QuestionType),
                            bg: typeStyle.bg,
                            color: typeStyle.color,
                        }]}
                    />
                );
            }
        },
        {
            id: 'line_type',
            header: '所属条线',
            cell: ({ row }) => (
                <span className="text-sm font-medium text-gray-600">
                    {row.original.line_type?.name || '—'}
                </span>
            )
        },
        {
            id: 'timestamp',
            header: '更新时间',
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="text-sm font-bold text-[#111827]">
                        {dayjs(row.original.updated_at).format('YYYY.MM.DD')}
                    </span>
                    <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-tighter">
                        {dayjs(row.original.updated_at).format('HH:mm:ss')}
                    </span>
                </div>
            ),
        },
        {
            id: 'actions',
            header: '操作',
            cell: ({ row }) => {
                const record = row.original;
                return (
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-md shadow-none">
                                    <MoreHorizontal className="w-4 h-4 text-gray-500" strokeWidth={2} />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 rounded-lg p-1 border border-gray-200 shadow-none bg-white">
                                <DropdownMenuItem
                                    className="rounded-md px-3 py-2.5 font-semibold cursor-pointer hover:bg-gray-100 transition-colors text-xs"
                                    onClick={() => setPreviewQuestion(record)}
                                >
                                    <Eye className="w-3.5 h-3.5 mr-2" strokeWidth={2} /> 查看详情
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-gray-200 mx-2" />
                                <DropdownMenuItem
                                    className="rounded-md px-3 py-2.5 font-semibold text-red-600 focus:bg-red-50 cursor-pointer transition-colors text-xs"
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
                pagination={{
                    pageIndex: page - 1,
                    pageSize: pageSize,
                    pageCount: Math.ceil((data?.count || 0) / pageSize),
                    totalCount: data?.count || 0,
                    onPageChange: (p: number) => setPage(p + 1),
                    onPageSizeChange: (size: number) => {
                        setPageSize(size);
                        setPage(1);
                    },
                }}
                rowClassName="hover:bg-[#F3F4F6] transition-colors group cursor-pointer"
                onRowClick={(row: Question) => setPreviewQuestion(row)}
            />

            {/* 预览对话框 (Keep this as Dialog since it's a detail view, not a confirmation) */}
            <Dialog open={!!previewQuestion} onOpenChange={(open) => !open && setPreviewQuestion(null)}>
                <DialogContent className="max-w-2xl p-0 overflow-hidden border-none shadow-2xl bg-white rounded-xl">
                    <DialogHeader className="px-6 py-4 bg-gray-50/80 border-b border-gray-100">
                        <DialogTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
                            <FileText className="w-5 h-5 text-emerald-500" />
                            题目详情预览
                            <span className="ml-2 text-xs font-medium text-gray-400">ID: {previewQuestion?.id}</span>
                        </DialogTitle>
                    </DialogHeader>
                    <div className="max-h-[70vh] overflow-y-auto">
                        <QuestionEditorPanel
                            questionForm={previewForm}
                            setQuestionForm={() => { }}
                            lineTypes={lineTypes}
                            editingQuestionId={previewQuestion?.id || null}
                            onCancel={() => setPreviewQuestion(null)}
                            onSave={() => setPreviewQuestion(null)}
                            isSaving={false}
                            readOnly
                            showActions={false}
                        />
                    </div>
                    <DialogFooter className="px-6 py-4 bg-gray-50/50 border-t border-gray-100">
                        <Button onClick={() => setPreviewQuestion(null)} className="font-bold">
                            关闭预览
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 删除确认对话框 */}
            <ConfirmDialog
                open={!!deleteId}
                onOpenChange={(open) => !open && setDeleteId(null)}
                title="彻底从系统中清除此题目?"
                description="此操作将永久删除该题目记录。如果已有试卷正在引用此题目,可能会导致作业显示异常。该操作不可撤销。"
                icon={<Trash2 className="h-10 w-10" />}
                iconBgColor="bg-[#FEE2E2]"
                iconColor="text-[#DC2626]"
                confirmText="确认删除"
                cancelText="取消"
                confirmVariant="destructive"
                onConfirm={handleDelete}
                isConfirming={false}
            />
        </>
    );
};
