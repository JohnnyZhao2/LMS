import React, { useState } from 'react';
import { Trash2, MoreHorizontal, FileText, Eye, PencilLine } from 'lucide-react';
import { useQuestions } from '@/features/questions/api/get-questions';
import { useCreateQuestion, useDeleteQuestion, useUpdateQuestion } from '@/features/questions/api/create-question';
import { useSpaceTypeTags } from '@/features/knowledge/api/get-tags';
import { QuestionEditorPanel } from '@/features/questions/components/question-editor-panel';
import type { Question, QuestionCreateRequest, QuestionType, Tag } from '@/types/api';
import { getQuestionTypeLabel, getQuestionTypeStyle } from '@/features/questions/constants';
import { showApiError } from '@/utils/error-handler';
import { toast } from 'sonner';
import dayjs from '@/lib/dayjs';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
    createSignal?: number;
    filterQuestionType?: QuestionType | 'all';
    filterSpaceTypeId?: string;
    spaceTypes?: Tag[];
}

const DEFAULT_QUESTION_FORM: Partial<QuestionCreateRequest> = {
    question_type: 'SINGLE_CHOICE',
    content: '',
    options: [{ key: 'A', value: '' }, { key: 'B', value: '' }],
    answer: '',
    explanation: '',
    score: '1',
    tag_ids: [],
};

const buildQuestionForm = (question: Question): Partial<QuestionCreateRequest> => ({
    question_type: question.question_type,
    content: question.content,
    options: question.options || [],
    answer: question.answer || '',
    explanation: question.explanation || '',
    score: question.score || '1',
    space_tag_id: question.space_tag?.id,
    tag_ids: question.tags?.map((tag) => tag.id) ?? [],
});

const normalizeCompareValue = (value: unknown, field: keyof QuestionCreateRequest) => {
    if (field === 'tag_ids' && Array.isArray(value)) {
        return [...value].sort((a, b) => Number(a) - Number(b));
    }
    return value ?? null;
};

const buildQuestionPatchPayload = (
    baseline: Partial<QuestionCreateRequest>,
    current: Partial<QuestionCreateRequest>,
): Partial<QuestionCreateRequest> => {
    const fields: Array<keyof QuestionCreateRequest> = [
        'space_tag_id',
        'content',
        'options',
        'answer',
        'explanation',
        'score',
        'tag_ids',
    ];
    const patch: Partial<QuestionCreateRequest> = {};
    fields.forEach((field) => {
        const before = normalizeCompareValue(baseline[field], field);
        const after = normalizeCompareValue(current[field], field);
        if (JSON.stringify(before) !== JSON.stringify(after)) {
            switch (field) {
                case 'space_tag_id':
                    patch.space_tag_id = current.space_tag_id;
                    break;
                case 'content':
                    patch.content = current.content;
                    break;
                case 'options':
                    patch.options = current.options;
                    break;
                case 'answer':
                    patch.answer = current.answer;
                    break;
                case 'explanation':
                    patch.explanation = current.explanation;
                    break;
                case 'score':
                    patch.score = current.score;
                    break;
                case 'tag_ids':
                    patch.tag_ids = current.tag_ids;
                    break;
                default:
                    break;
            }
        }
    });
    return patch;
};

export const QuestionTab: React.FC<QuestionTabProps> = ({
    search = '',
    createSignal = 0,
    filterQuestionType = 'all',
    filterSpaceTypeId = 'all',
    spaceTypes: externalSpaceTypes,
}) => {
    const [pagination, setPagination] = useState({
        page: 1,
        pageSize: 10,
        scopeKey: search,
    });
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const [handledCreateSignal, setHandledCreateSignal] = useState(0);
    const [questionForm, setQuestionForm] = useState<Partial<QuestionCreateRequest>>(DEFAULT_QUESTION_FORM);
    const [editingForm, setEditingForm] = useState<Partial<QuestionCreateRequest>>(DEFAULT_QUESTION_FORM);

    const currentScopeKey = `${search}|${filterQuestionType}|${filterSpaceTypeId}`;
    const page = pagination.scopeKey === currentScopeKey ? pagination.page : 1;
    const pageSize = pagination.pageSize;
    const isCreateDialogOpen = createSignal > handledCreateSignal;

    const { data, isLoading, refetch } = useQuestions({
        page,
        pageSize,
        search: search || undefined,
        questionType: filterQuestionType === 'all' ? undefined : filterQuestionType,
        spaceTypeId: filterSpaceTypeId === 'all' ? undefined : Number(filterSpaceTypeId),
    });
    const { data: internalSpaceTypes } = useSpaceTypeTags();
    const spaceTypes = externalSpaceTypes ?? internalSpaceTypes;
    const createQuestion = useCreateQuestion();
    const updateQuestion = useUpdateQuestion();
    const deleteQuestion = useDeleteQuestion();

    const closeCreateDialog = () => {
        setHandledCreateSignal((prev) => Math.max(prev, createSignal));
        setQuestionForm({
            ...DEFAULT_QUESTION_FORM,
        });
    };

    const previewForm: Partial<QuestionCreateRequest> = previewQuestion ? buildQuestionForm(previewQuestion) : {};

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

    const handleCreateQuestion = async () => {
        if (!questionForm.content?.trim()) return toast.error('请输入内容');
        if (!questionForm.answer) return toast.error('请设置答案');

        try {
            await createQuestion.mutateAsync(questionForm as QuestionCreateRequest);
            toast.success('题目创建成功');
            closeCreateDialog();
        } catch (error) {
            showApiError(error);
        }
    };

    const openEditDialog = (question: Question) => {
        setEditingQuestion(question);
        setEditingForm(buildQuestionForm(question));
    };

    const closeEditDialog = () => {
        setEditingQuestion(null);
        setEditingForm({ ...DEFAULT_QUESTION_FORM });
    };

    const handleUpdateQuestion = async () => {
        if (!editingQuestion) return;
        if (!editingForm.content?.trim()) return toast.error('请输入内容');
        if (!editingForm.answer) return toast.error('请设置答案');

        const baseline = buildQuestionForm(editingQuestion);
        const payload = buildQuestionPatchPayload(baseline, editingForm);
        if (Object.keys(payload).length === 0) {
            toast.info('未检测到改动');
            closeEditDialog();
            return;
        }
        try {
            await updateQuestion.mutateAsync({
                id: editingQuestion.id,
                data: payload,
            });
            toast.success('题目更新成功');
            closeEditDialog();
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
                                    onClick={() => openEditDialog(record)}
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

            <Dialog
                open={isCreateDialogOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        closeCreateDialog();
                    }
                }}
            >
                <DialogContent className="flex h-[min(820px,86vh)] max-w-[1120px] flex-col gap-0 overflow-hidden rounded-xl border border-border bg-background p-0">
                    <DialogHeader className="px-6 pt-5 pb-0">
                        <DialogTitle className="text-base font-bold text-foreground">
                            新建题目
                        </DialogTitle>
                    </DialogHeader>
                    <div className="min-h-0 flex-1">
                        <QuestionEditorPanel
                            questionForm={questionForm}
                            setQuestionForm={setQuestionForm}
                            spaceTypes={spaceTypes}
                            editingQuestionId={null}
                            onCancel={closeCreateDialog}
                            onSave={handleCreateQuestion}
                            isSaving={createQuestion.isPending}
                        />
                    </div>
                </DialogContent>
            </Dialog>

            {/* 预览对话框 */}
            <Dialog open={!!previewQuestion} onOpenChange={(open) => !open && setPreviewQuestion(null)}>
                <DialogContent className="flex h-[min(820px,86vh)] max-w-[1120px] flex-col gap-0 overflow-hidden rounded-xl border border-border bg-background p-0">
                    <DialogHeader className="px-6 pt-5 pb-0">
                        <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                            <FileText className="w-4 h-4 text-primary-500" />
                            题目详情
                        </DialogTitle>
                    </DialogHeader>
                    <div className="min-h-0 flex-1">
                        <QuestionEditorPanel
                            questionForm={previewForm}
                            setQuestionForm={() => { }}
                            spaceTypes={spaceTypes}
                            editingQuestionId={previewQuestion?.id || null}
                            onCancel={() => setPreviewQuestion(null)}
                            onSave={() => setPreviewQuestion(null)}
                            isSaving={false}
                            readOnly
                            showActions={false}
                        />
                    </div>
                    <div className="flex justify-end border-t border-border px-6 py-3">
                        <Button
                            variant="ghost"
                            onClick={() => setPreviewQuestion(null)}
                            className="text-text-muted"
                        >
                            关闭
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* 编辑对话框 */}
            <Dialog open={!!editingQuestion} onOpenChange={(open) => !open && closeEditDialog()}>
                <DialogContent className="flex h-[min(820px,86vh)] max-w-[1120px] flex-col gap-0 overflow-hidden rounded-xl border border-border bg-background p-0">
                    <DialogHeader className="px-6 pt-5 pb-0">
                        <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                            <PencilLine className="w-4 h-4 text-primary-500" />
                            编辑题目
                        </DialogTitle>
                    </DialogHeader>
                    <div className="min-h-0 flex-1">
                        <QuestionEditorPanel
                            questionForm={editingForm}
                            setQuestionForm={setEditingForm}
                            spaceTypes={spaceTypes}
                            editingQuestionId={editingQuestion?.id ?? null}
                            onCancel={closeEditDialog}
                            onSave={handleUpdateQuestion}
                            isSaving={updateQuestion.isPending}
                        />
                    </div>
                </DialogContent>
            </Dialog>

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
