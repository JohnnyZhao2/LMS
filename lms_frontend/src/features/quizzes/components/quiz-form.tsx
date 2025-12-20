import { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Typography, message, Space, Table, Modal, Tabs } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useCreateQuiz, useUpdateQuiz } from '../api/create-quiz';
import { useQuizDetail } from '../api/get-quizzes';
import { useQuestions } from '@/features/questions/api/get-questions';
import type { QuizCreateRequest, Question } from '@/types/api';
import { showApiError } from '@/utils/error-handler';

const { Title } = Typography;
const { TextArea } = Input;

/**
 * 试卷表单组件
 */
export const QuizForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const isEdit = !!id;
  
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<number[]>([]);
  const [questionModalVisible, setQuestionModalVisible] = useState(false);
  
  const { data: quizData, isLoading } = useQuizDetail(Number(id));
  const { data: questionsData } = useQuestions({ pageSize: 1000 });
  const createQuiz = useCreateQuiz();
  const updateQuiz = useUpdateQuiz();

  useEffect(() => {
    if (isEdit && quizData) {
      form.setFieldsValue({
        title: quizData.title,
        description: quizData.description,
      });
      setSelectedQuestionIds(quizData.questions?.map((q) => q.question) || []);
    }
  }, [isEdit, quizData, form]);

  const handleSubmit = async (values: { title: string; description?: string }) => {
    try {
      const submitData: QuizCreateRequest = {
        ...values,
        existing_question_ids: selectedQuestionIds,
      };

      if (isEdit) {
        await updateQuiz.mutateAsync({ id: Number(id), data: submitData });
        message.success('更新成功');
      } else {
        await createQuiz.mutateAsync(submitData);
        message.success('创建成功');
      }
      navigate('/test-center/quizzes');
    } catch (error) {
      showApiError(error, isEdit ? '更新失败' : '创建失败');
    }
  };

  const questionColumns = [
    {
      title: '题目内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
    },
    {
      title: '类型',
      dataIndex: 'question_type_display',
      key: 'question_type_display',
      width: 100,
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: unknown, record: Question) => (
        <Button
          type="link"
          danger
          icon={<DeleteOutlined />}
          onClick={() => {
            setSelectedQuestionIds(selectedQuestionIds.filter((id) => id !== record.id));
          }}
        >
          移除
        </Button>
      ),
    },
  ];

  const availableQuestions = questionsData?.results?.filter(
    (q) => !selectedQuestionIds.includes(q.id)
  ) || [];

  const selectedQuestions = (questionsData?.results || []).filter((q) =>
    selectedQuestionIds.includes(q.id)
  );

  return (
    <div>
      <Title level={2} style={{ marginBottom: 16 }}>
        {isEdit ? '编辑试卷' : '新建试卷'}
      </Title>
      <Card>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="title"
            label="试卷名称"
            rules={[{ required: true, message: '请输入试卷名称' }]}
          >
            <Input placeholder="请输入试卷名称" />
          </Form.Item>

          <Form.Item name="description" label="试卷描述">
            <TextArea rows={3} placeholder="请输入试卷描述（可选）" />
          </Form.Item>

          <Form.Item label="题目列表">
            <div style={{ marginBottom: 16 }}>
              <Space>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setQuestionModalVisible(true)}
                >
                  添加题目
                </Button>
                <Button onClick={() => navigate('/test-center/questions/create')}>
                  新建题目
                </Button>
              </Space>
            </div>

            {selectedQuestions.length > 0 ? (
              <Table
                columns={questionColumns}
                dataSource={selectedQuestions}
                rowKey="id"
                pagination={false}
                size="small"
              />
            ) : (
              <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>
                暂无题目，请添加题目
              </div>
            )}
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={createQuiz.isPending || updateQuiz.isPending}
              >
                {isEdit ? '更新' : '创建'}
              </Button>
              <Button onClick={() => navigate('/test-center/quizzes')}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Modal
        title="选择题目"
        open={questionModalVisible}
        onCancel={() => setQuestionModalVisible(false)}
        footer={null}
        width={800}
      >
        <Table
          rowSelection={{
            selectedRowKeys: selectedQuestionIds.filter((id) =>
              availableQuestions.some((q) => q.id === id)
            ),
            onChange: (selectedKeys) => {
              const newSelected = [
                ...selectedQuestionIds.filter((id) => !availableQuestions.some((q) => q.id === id)),
                ...(selectedKeys as number[]),
              ];
              setSelectedQuestionIds(newSelected);
            },
          }}
          columns={[
            {
              title: '题目内容',
              dataIndex: 'content',
              key: 'content',
              ellipsis: true,
            },
            {
              title: '类型',
              dataIndex: 'question_type_display',
              key: 'question_type_display',
            },
            {
              title: '条线类型',
              dataIndex: 'line_type',
              key: 'line_type',
              render: (lineType?: { name: string } | null) => lineType?.name || '-',
            },
          ]}
          dataSource={availableQuestions}
          rowKey="id"
          pagination={false}
        />
        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <Space>
            <Button onClick={() => setQuestionModalVisible(false)}>取消</Button>
            <Button
              type="primary"
              onClick={() => {
                setQuestionModalVisible(false);
                message.success(`已选择 ${selectedQuestionIds.length} 道题目`);
              }}
            >
              确定
            </Button>
          </Space>
        </div>
      </Modal>
    </div>
  );
};

