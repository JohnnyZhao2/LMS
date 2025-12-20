import { useState } from 'react';
import { Table, Card, Button, Typography, Modal, message, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQuizzes } from '../api/get-quizzes';
import { useDeleteQuiz } from '../api/create-quiz';
import { useAuth } from '@/features/auth/hooks/use-auth';
import type { QuizDetail } from '@/types/api';
import { showApiError } from '@/utils/error-handler';
import dayjs from 'dayjs';

const { Title } = Typography;

/**
 * 试卷列表组件
 */
export const QuizList: React.FC = () => {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuizzes(page);
  const deleteQuiz = useDeleteQuiz();
  const navigate = useNavigate();
  const { user, currentRole } = useAuth();

  /**
   * 检查是否有编辑/删除权限
   * - 管理员可以编辑/删除任何试卷
   * - 导师/室经理只能编辑/删除自己创建的试卷
   */
  const canEdit = (record: QuizDetail): boolean => {
    if (currentRole === 'ADMIN') return true;
    return record.created_by === user?.id;
  };

  const handleDelete = (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除后无法恢复，确定要删除这个试卷吗？',
      onOk: async () => {
        try {
          await deleteQuiz.mutateAsync(id);
          message.success('删除成功');
        } catch (error) {
          showApiError(error, '删除失败');
        }
      },
    });
  };

  const columns = [
    {
      title: '试卷名称',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '题目数量',
      key: 'questions_count',
      render: (_: unknown, record: QuizDetail) => record.questions?.length || 0,
    },
    {
      title: '总分',
      dataIndex: 'total_score',
      key: 'total_score',
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
      render: (text: string) => dayjs(text).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: QuizDetail) => (
        <Space>
          {canEdit(record) && (
            <>
              <Button
                type="link"
                icon={<EditOutlined />}
                onClick={() => navigate(`/test-center/quizzes/${record.id}/edit`)}
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
        <Title level={2} style={{ margin: 0 }}>试卷管理</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/test-center/quizzes/create')}>
          新建试卷
        </Button>
      </div>
      <Card>
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


