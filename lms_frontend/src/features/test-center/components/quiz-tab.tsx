import React, { useState } from 'react';
import {
  Table, Card, Button, Space, Modal, message, Form
} from 'antd';
import {
  EditOutlined, DeleteOutlined, SendOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQuizzes } from '@/features/quizzes/api/get-quizzes';
import { useDeleteQuiz } from '@/features/quizzes/api/create-quiz';
import { useAuth } from '@/features/auth/hooks/use-auth';
import type { QuizListItem } from '@/types/api';
import { showApiError } from '@/utils/error-handler';
import dayjs from 'dayjs';

interface QuizTabProps {
  onQuickPublish: (quizIds: number[]) => void;
  search?: string;
}

/**
 * 试卷管理标签页
 * 支持多选和快速发布功能
 */
export const QuizTab: React.FC<QuizTabProps> = ({ onQuickPublish, search = '' }) => {
  const [page, setPage] = useState(1);
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);
  const [quickPublishModalVisible, setQuickPublishModalVisible] = useState(false);
  const [_form] = Form.useForm();

  const { data, isLoading } = useQuizzes({ page, search: search || undefined });
  const deleteQuiz = useDeleteQuiz();
  const navigate = useNavigate();
  const { user, currentRole } = useAuth();

  /**
   * 检查是否有编辑/删除权限
   */
  const canEdit = (record: QuizListItem): boolean => {
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

  /**
   * 快速发布
   */
  const handleQuickPublish = async () => {
    try {
      setQuickPublishModalVisible(false);
      // 跳转到任务创建流程
      onQuickPublish(selectedRowKeys);
      setSelectedRowKeys([]);
    } catch {
      // 失败
    }
  };

  const columns = [
    {
      title: '试卷名称',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '题目数量',
      dataIndex: 'question_count',
      key: 'question_count',
      width: 100,
    },
    {
      title: '总分',
      dataIndex: 'total_score',
      key: 'total_score',
      width: 80,
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
      width: 120,
      render: (text: string) => dayjs(text).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: unknown, record: QuizListItem) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<SendOutlined />}
            onClick={() => {
              setSelectedRowKeys([record.id]);
              setQuickPublishModalVisible(true);
            }}
          >
            发布任务
          </Button>
          {canEdit(record) && (
            <>
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => navigate(`/test-center/quizzes/${record.id}/edit`)}
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
    <Card style={{ height: '100%' }}>
      {/* 工具栏 */}
      {selectedRowKeys.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={() => setQuickPublishModalVisible(true)}
          >
            快速发布 ({selectedRowKeys.length})
          </Button>
        </div>
      )}

      {/* 试卷表格 */}
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

      {/* 快速发布弹窗 */}
      <Modal
        title="确认发布任务"
        open={quickPublishModalVisible}
        onOk={handleQuickPublish}
        onCancel={() => {
          setQuickPublishModalVisible(false);
          // form.resetFields(); // Not using form
        }}
      >
        <p>确认将选中的 {selectedRowKeys.length} 份试卷发布为新任务吗？</p>
      </Modal>
    </Card>
  );
};

