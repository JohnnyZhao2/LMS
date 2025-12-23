import { useState, useMemo } from 'react';
import { Table, Card, Button, Typography, Modal, message, Segmented, Tag, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQuestions } from '../api/get-questions';
import { useDeleteQuestion } from '../api/create-question';
import { useLineTypeTags } from '@/features/knowledge/api/get-tags';
import { useAuth } from '@/features/auth/hooks/use-auth';
import type { Question, QuestionType } from '@/types/api';
import dayjs from '@/lib/dayjs';
import styles from './question-list.module.css';

const { Title } = Typography;

/**
 * 题目列表组件
 */
/** 题型选项配置 */
const QUESTION_TYPE_OPTIONS = [
  { label: '全部', value: 'ALL' },
  { label: '单选题', value: 'SINGLE_CHOICE' },
  { label: '多选题', value: 'MULTIPLE_CHOICE' },
  { label: '判断题', value: 'TRUE_FALSE' },
  { label: '简答题', value: 'SHORT_ANSWER' },
];

export const QuestionList: React.FC = () => {
  const [page, setPage] = useState(1);
  const [questionTypeFilter, setQuestionTypeFilter] = useState<string>('ALL');
  const [lineTypeFilter, setLineTypeFilter] = useState<string>('ALL');
  
  /** 将筛选值转换为 API 参数 */
  const questionType = questionTypeFilter === 'ALL' ? undefined : questionTypeFilter as QuestionType;
  const lineTypeId = lineTypeFilter === 'ALL' ? undefined : Number(lineTypeFilter);
  
  const { data, isLoading } = useQuestions({ page, questionType, lineTypeId });
  const { data: lineTypes } = useLineTypeTags();
  const deleteQuestion = useDeleteQuestion();
  const navigate = useNavigate();
  const { user, currentRole } = useAuth();
  
  /** 条线类型选项（动态生成） */
  const lineTypeOptions = useMemo(() => {
    const options = [{ label: '全部', value: 'ALL' }];
    if (lineTypes) {
      lineTypes.forEach((tag) => {
        options.push({ label: tag.name, value: String(tag.id) });
      });
    }
    return options;
  }, [lineTypes]);

  /**
   * 检查是否有编辑/删除权限
   * - 管理员可以编辑/删除任何题目
   * - 导师/室经理只能编辑/删除自己创建的题目
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
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
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
      render: (lineType?: { name: string } | null) => lineType?.name || '-',
    },
    {
      title: '分值',
      dataIndex: 'score',
      key: 'score',
    },
    {
      title: '创建人',
      dataIndex: 'created_by_name',
      key: 'created_by_name',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => dayjs(text).format('YYYY-MM-DD'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: Question) => (
        <Space>
          {canEdit(record) && (
            <>
              <Button
                type="link"
                icon={<EditOutlined />}
                onClick={() => navigate(`/test-center/questions/${record.id}/edit`)}
              >
                编辑
              </Button>
              <Button
                type="link"
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>题库管理</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/test-center/questions/create')}>
          新建题目
        </Button>
      </div>
      <Card>
        <div className={styles.filterBar}>
          <div className={styles.filterItem}>
            <span className={styles.filterLabel}>题型</span>
            <Segmented
              options={QUESTION_TYPE_OPTIONS}
              value={questionTypeFilter}
              onChange={(value) => {
                setQuestionTypeFilter(value as string);
                setPage(1);
              }}
            />
          </div>
          <div className={styles.filterItem}>
            <span className={styles.filterLabel}>条线</span>
            <Segmented
              options={lineTypeOptions}
              value={lineTypeFilter}
              onChange={(value) => {
                setLineTypeFilter(value as string);
                setPage(1);
              }}
            />
          </div>
        </div>
        <Table
          columns={columns}
          dataSource={data?.results || []}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: page,
            total: data?.count || 0,
            pageSize: 20,
            onChange: setPage,
          }}
        />
      </Card>
    </div>
  );
};


