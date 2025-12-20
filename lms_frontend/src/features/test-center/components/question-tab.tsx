import { useState } from 'react';
import { 
  Table, Card, Button, Modal, message, Space, Select, Tag
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, FileAddOutlined, UploadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQuestions } from '@/features/questions/api/get-questions';
import { useDeleteQuestion } from '@/features/questions/api/create-question';
import { useLineTypeTags } from '@/features/knowledge/api/get-tags';
import { useAuth } from '@/features/auth/hooks/use-auth';
import type { Question, QuestionType } from '@/types/api';
import dayjs from '@/lib/dayjs';

const { Option } = Select;

interface QuestionTabProps {
  /** @deprecated 不再使用快速创建弹窗，改为跳转到试卷编辑页面 */
  onQuickCreateQuiz?: (quizId: number, taskType: 'PRACTICE' | 'EXAM') => void;
}

/**
 * 题目管理标签页
 * 支持多选和组卷功能（跳转到试卷编辑页面）
 */
export const QuestionTab: React.FC<QuestionTabProps> = () => {
  const [page, setPage] = useState(1);
  const [questionType, setQuestionType] = useState<QuestionType | undefined>();
  const [lineTypeId, setLineTypeId] = useState<number | undefined>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);

  const { data, isLoading } = useQuestions({ page, questionType, lineTypeId });
  const { data: lineTypes } = useLineTypeTags();
  const deleteQuestion = useDeleteQuestion();
  const navigate = useNavigate();
  const { user, currentRole } = useAuth();

  /**
   * 检查是否有编辑/删除权限
   */
  const canEdit = (record: Question): boolean => {
    if (currentRole === 'ADMIN') return true;
    return record.created_by === user?.id;
  };

  const handleDelete = (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除后无法恢复，确定要删除这个题目吗？',
      onOk: async () => {
        try {
          await deleteQuestion.mutateAsync(id);
          message.success('删除成功');
        } catch {
          message.error('删除失败');
        }
      },
    });
  };

  /**
   * 组卷 - 跳转到试卷编辑页面
   */
  const handleCreateQuiz = () => {
    // 将已选题目 ID 通过 URL 参数传递到试卷编辑页面
    const questionIds = selectedRowKeys.join(',');
    navigate(`/test-center/quizzes/create?question_ids=${questionIds}`);
  };

  const getTypeTag = (type: QuestionType) => {
    const colors: Record<QuestionType, string> = {
      SINGLE_CHOICE: 'blue',
      MULTIPLE_CHOICE: 'green',
      TRUE_FALSE: 'orange',
      SHORT_ANSWER: 'purple',
    };
    const labels: Record<QuestionType, string> = {
      SINGLE_CHOICE: '单选题',
      MULTIPLE_CHOICE: '多选题',
      TRUE_FALSE: '判断题',
      SHORT_ANSWER: '简答题',
    };
    return <Tag color={colors[type]}>{labels[type]}</Tag>;
  };

  const columns = [
    {
      title: '题目类型',
      dataIndex: 'question_type',
      key: 'question_type',
      width: 100,
      render: (type: QuestionType) => getTypeTag(type),
    },
    {
      title: '题目内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
    },
    {
      title: '条线类型',
      dataIndex: 'line_type',
      key: 'line_type',
      width: 100,
      render: (lineType?: { name: string } | null) => lineType?.name || '-',
    },
    {
      title: '分值',
      dataIndex: 'score',
      key: 'score',
      width: 60,
    },
    {
      title: '创建人',
      dataIndex: 'created_by_name',
      key: 'created_by_name',
      width: 100,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 100,
      render: (text: string) => dayjs(text).format('YYYY-MM-DD'),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: unknown, record: Question) => (
        <Space>
          {canEdit(record) && (
            <>
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => navigate(`/test-center/questions/${record.id}/edit`)}
              >
                编辑
              </Button>
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDelete(record.id)}
              >
                删除
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys as number[]),
  };

  return (
    <Card>
      {/* 工具栏 */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Space>
          <Select
            style={{ width: 150 }}
            placeholder="题目类型"
            allowClear
            onChange={(value) => setQuestionType(value)}
          >
            <Option value="SINGLE_CHOICE">单选题</Option>
            <Option value="MULTIPLE_CHOICE">多选题</Option>
            <Option value="TRUE_FALSE">判断题</Option>
            <Option value="SHORT_ANSWER">简答题</Option>
          </Select>
          <Select
            style={{ width: 150 }}
            placeholder="条线类型"
            allowClear
            onChange={(value) => setLineTypeId(value)}
          >
            {lineTypes?.map((tag) => (
              <Option key={tag.id} value={tag.id}>
                {tag.name}
              </Option>
            ))}
          </Select>
        </Space>
        <Space>
          {selectedRowKeys.length > 0 && (
            <Button
              type="primary"
              icon={<FileAddOutlined />}
              onClick={handleCreateQuiz}
            >
              组卷 ({selectedRowKeys.length})
            </Button>
          )}
          {currentRole === 'ADMIN' && (
            <Button icon={<UploadOutlined />}>
              批量导入
            </Button>
          )}
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={() => navigate('/test-center/questions/create')}
          >
            新建题目
          </Button>
        </Space>
      </div>

      {/* 题目表格 */}
      <Table
        rowSelection={rowSelection}
        columns={columns}
        dataSource={data?.results || []}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: page,
          total: data?.count || 0,
          pageSize: 20,
          onChange: setPage,
          showTotal: (total) => `共 ${total} 条`,
        }}
      />

    </Card>
  );
};

