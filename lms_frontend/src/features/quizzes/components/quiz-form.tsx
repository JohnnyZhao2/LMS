import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Form, Input, Button, Card, Typography, message, Space, Table, Modal,
  Tag, InputNumber, Row, Col, Statistic, Divider, Empty, Select,
  Drawer
} from 'antd';
import {
  useNavigate, useParams, useSearchParams
} from 'react-router-dom';
import {
  PlusOutlined, DeleteOutlined, SendOutlined, MenuOutlined,
  ArrowUpOutlined, ArrowDownOutlined, FormOutlined
} from '@ant-design/icons';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useCreateQuiz, useUpdateQuiz } from '../api/create-quiz';
import { useQuizDetail } from '../api/get-quizzes';
import { useQuestions } from '@/features/questions/api/get-questions';
import { useCreateQuestion } from '@/features/questions/api/create-question';
import { useLineTypeTags } from '@/features/knowledge/api/get-tags';
import type { QuizCreateRequest, Question, QuestionType, QuestionCreateRequest } from '@/types/api';
import { showApiError } from '@/utils/error-handler';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

/**
 * 试卷中的题目项（带排序信息）
 */
interface QuizQuestionItem {
  id: number;
  content: string;
  question_type: QuestionType;
  question_type_display: string;
  score: string;
  order: number;
}

/**
 * 获取题目类型显示名称
 */
const getQuestionTypeDisplay = (type: QuestionType): string => {
  const labels: Record<QuestionType, string> = {
    SINGLE_CHOICE: '单选题',
    MULTIPLE_CHOICE: '多选题',
    TRUE_FALSE: '判断题',
    SHORT_ANSWER: '简答题',
  };
  return labels[type] || type;
};

/**
 * 可排序的题目行组件
 */
const SortableQuestionRow: React.FC<{
  item: QuizQuestionItem;
  index: number;
  onRemove: (id: number) => void;
  onScoreChange: (id: number, score: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  isFirst: boolean;
  isLast: boolean;
}> = ({ item, index, onRemove, onScoreChange, onMoveUp, onMoveDown, isFirst, isLast }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
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

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        padding: '12px 16px',
        background: isDragging ? '#f0f5ff' : '#fff',
        borderBottom: '1px solid #f0f0f0',
        gap: 12,
      }}
      {...attributes}
    >
      {/* 拖拽手柄 */}
      <div
        {...listeners}
        style={{ cursor: 'grab', color: '#999', padding: '4px' }}
      >
        <MenuOutlined />
      </div>

      {/* 序号 */}
      <div style={{ width: 30, color: '#666', fontWeight: 500 }}>
        {index + 1}.
      </div>

      {/* 题型标签 */}
      <div style={{ width: 80 }}>
        {getTypeTag(item.question_type)}
      </div>

      {/* 题目内容 */}
      <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {item.content}
      </div>

      {/* 分值 */}
      <div style={{ width: 100 }}>
        <InputNumber
          size="small"
          min={0}
          max={100}
          precision={1}
          value={Number(item.score)}
          onChange={(val) => onScoreChange(item.id, val || 0)}
          addonAfter="分"
          style={{ width: 90 }}
        />
      </div>

      {/* 操作按钮 */}
      <Space size={4}>
        <Button
          type="text"
          size="small"
          icon={<ArrowUpOutlined />}
          disabled={isFirst}
          onClick={() => onMoveUp(index)}
        />
        <Button
          type="text"
          size="small"
          icon={<ArrowDownOutlined />}
          disabled={isLast}
          onClick={() => onMoveDown(index)}
        />
        <Button
          type="text"
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() => onRemove(item.id)}
        />
      </Space>
    </div>
  );
};

/**
 * 试卷表单组件
 * 支持从 URL 参数接收预选题目 ID
 */
export const QuizForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const isEdit = !!id;

  // 已选题目列表（带顺序和分值）
  const [selectedQuestions, setSelectedQuestions] = useState<QuizQuestionItem[]>([]);
  const [questionModalVisible, setQuestionModalVisible] = useState(false);
  const [publishModalVisible, setPublishModalVisible] = useState(false);
  const [createdQuizId, setCreatedQuizId] = useState<number | null>(null);
  const [_publishForm] = Form.useForm();

  // 新建题目抽屉
  const [newQuestionDrawerVisible, setNewQuestionDrawerVisible] = useState(false);
  const [newQuestionForm] = Form.useForm();

  // 标记是否已从 URL/试卷详情初始化，避免重复覆盖本地编辑状态
  const initializedFromUrlRef = useRef(false);
  const initializedFromQuizRef = useRef(false);

  const { data: quizData } = useQuizDetail(Number(id));
  const { data: questionsData } = useQuestions({ pageSize: 1000 });
  const { data: lineTypes } = useLineTypeTags();
  const createQuiz = useCreateQuiz();
  const updateQuiz = useUpdateQuiz();
  const createQuestion = useCreateQuestion();

  // 拖拽传感器
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  /**
   * 切换试卷时重置初始化标记
   */
  useEffect(() => {
    initializedFromQuizRef.current = false;
    initializedFromUrlRef.current = false;
  }, [id]);

  /**
   * 初始化：从 URL 参数或编辑数据加载已选题目
   * 使用 ref 确保只初始化一次，避免新建题目或手动调整后被覆盖
   */
  useEffect(() => {
    if (isEdit && quizData && !initializedFromQuizRef.current) {
      // 编辑模式：从 quizData 加载
      form.setFieldsValue({
        title: quizData.title,
        description: quizData.description,
      });

      if (quizData.questions) {
        const items: QuizQuestionItem[] = quizData.questions.map((qq) => ({
          id: qq.question,
          content: qq.question_content,
          question_type: qq.question_type as QuestionType,
          question_type_display: qq.question_type_display || getQuestionTypeDisplay(qq.question_type as QuestionType),
          score: qq.score,
          order: qq.order,
        })).sort((a, b) => a.order - b.order);
        setSelectedQuestions(items);
      } else {
        setSelectedQuestions([]);
      }
      initializedFromQuizRef.current = true;
    } else if (!isEdit && questionsData?.results && !initializedFromUrlRef.current) {
      // 新建模式：从 URL 参数加载预选题目（只执行一次）
      const questionIdsParam = searchParams.get('question_ids');
      if (questionIdsParam) {
        const questionIds = questionIdsParam.split(',').map(Number).filter(Boolean);
        const items: QuizQuestionItem[] = questionIds
          .map((qid, index) => {
            const question = questionsData.results.find(q => q.id === qid);
            if (!question) return null;
            return {
              id: question.id,
              content: question.content,
              question_type: question.question_type,
              question_type_display: question.question_type_display || getQuestionTypeDisplay(question.question_type),
              score: question.score,
              order: index + 1,
            };
          })
          .filter(Boolean) as QuizQuestionItem[];
        setSelectedQuestions(items);
        initializedFromUrlRef.current = true;
      }
    }
  }, [isEdit, quizData, questionsData, searchParams, form]);

  /**
   * 计算总分
   */
  const totalScore = useMemo(() => {
    return selectedQuestions.reduce((sum, q) => sum + Number(q.score || 0), 0);
  }, [selectedQuestions]);

  /**
   * 题型统计
   */
  const typeStats = useMemo(() => {
    const stats: Record<string, number> = {};
    selectedQuestions.forEach(q => {
      const label = {
        SINGLE_CHOICE: '单选题',
        MULTIPLE_CHOICE: '多选题',
        TRUE_FALSE: '判断题',
        SHORT_ANSWER: '简答题',
      }[q.question_type] || q.question_type;
      stats[label] = (stats[label] || 0) + 1;
    });
    return stats;
  }, [selectedQuestions]);

  /**
   * 提交表单
   */
  const handleSubmit = async (values: { title: string; description?: string }) => {
    if (selectedQuestions.length === 0) {
      message.warning('请至少添加一道题目');
      return;
    }

    try {
      const submitData: QuizCreateRequest = {
        ...values,
        existing_question_ids: selectedQuestions.map(q => q.id),
      };

      if (isEdit) {
        await updateQuiz.mutateAsync({ id: Number(id), data: submitData });
        message.success('更新成功');
        navigate('/test-center?tab=quizzes');
      } else {
        const quiz = await createQuiz.mutateAsync(submitData);
        message.success('创建成功');
        setCreatedQuizId(quiz.id);
        setPublishModalVisible(true);
      }
    } catch (error) {
      showApiError(error, isEdit ? '更新失败' : '创建失败');
    }
  };

  /**
   * 立即发布任务
   */
  const handlePublish = async () => {
    try {
      setPublishModalVisible(false);
      navigate(`/tasks/create?quiz_id=${createdQuizId}`);
    } catch {
      // 表单验证失败
    }
  };

  /**
   * 稍后发布
   */
  const handleLater = () => {
    setPublishModalVisible(false);
    navigate('/test-center?tab=quizzes');
  };

  /**
   * 从题库添加题目
   */
  const handleAddQuestions = (questionIds: number[]) => {
    const newItems: QuizQuestionItem[] = [];
    const currentMaxOrder = selectedQuestions.length;

    questionIds.forEach((qid, index) => {
      // 避免重复添加
      if (selectedQuestions.some(q => q.id === qid)) return;

      const question = questionsData?.results?.find(q => q.id === qid);
      if (!question) return;

      newItems.push({
        id: question.id,
        content: question.content,
        question_type: question.question_type,
        question_type_display: question.question_type_display,
        score: question.score,
        order: currentMaxOrder + index + 1,
      });
    });

    setSelectedQuestions([...selectedQuestions, ...newItems]);
    setQuestionModalVisible(false);
    if (newItems.length > 0) {
      message.success(`已添加 ${newItems.length} 道题目`);
    }
  };

  /**
   * 移除题目
   */
  const handleRemoveQuestion = (questionId: number) => {
    setSelectedQuestions(selectedQuestions.filter(q => q.id !== questionId));
  };

  /**
   * 修改题目分值
   */
  const handleScoreChange = (questionId: number, score: number) => {
    setSelectedQuestions(selectedQuestions.map(q =>
      q.id === questionId ? { ...q, score: String(score) } : q
    ));
  };

  /**
   * 上移题目
   */
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...selectedQuestions];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    setSelectedQuestions(newItems);
  };

  /**
   * 下移题目
   */
  const handleMoveDown = (index: number) => {
    if (index === selectedQuestions.length - 1) return;
    const newItems = [...selectedQuestions];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    setSelectedQuestions(newItems);
  };

  /**
   * 拖拽排序结束
   */
  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = selectedQuestions.findIndex(q => q.id === active.id);
      const newIndex = selectedQuestions.findIndex(q => q.id === over.id);
      setSelectedQuestions(arrayMove(selectedQuestions, oldIndex, newIndex));
    }
  };

  /**
   * 新建题目并添加到试卷
   */
  const handleCreateNewQuestion = async () => {
    try {
      const values = await newQuestionForm.validateFields();
      const submitData: QuestionCreateRequest = {
        ...values,
        score: String(values.score || 1),
      };

      const newQuestion = await createQuestion.mutateAsync(submitData);

      // 添加到已选题目
      const newItem: QuizQuestionItem = {
        id: newQuestion.id,
        content: newQuestion.content,
        question_type: newQuestion.question_type,
        question_type_display: newQuestion.question_type_display || getQuestionTypeDisplay(newQuestion.question_type),
        score: newQuestion.score || String(values.score || 1),
        order: selectedQuestions.length + 1,
      };

      setSelectedQuestions(prev => [...prev, newItem]);

      message.success('题目创建成功并已添加到试卷');
      setNewQuestionDrawerVisible(false);
      newQuestionForm.resetFields();
    } catch (error) {
      showApiError(error, '创建题目失败');
    }
  };

  // 可添加的题目（排除已选的）
  const availableQuestions = questionsData?.results?.filter(
    (q) => !selectedQuestions.some(sq => sq.id === q.id)
  ) || [];

  const newQuestionType = Form.useWatch('question_type', newQuestionForm);

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>
        {isEdit ? '编辑试卷' : '新建试卷'}
      </Title>

      <Row gutter={24}>
        {/* 左侧：试卷信息和题目列表 */}
        <Col span={16}>
          <Card title="基本信息" style={{ marginBottom: 16 }}>
            <Form form={form} layout="vertical" onFinish={handleSubmit}>
              <Form.Item
                name="title"
                label="试卷名称"
                rules={[{ required: true, message: '请输入试卷名称' }]}
              >
                <Input placeholder="请输入试卷名称" size="large" />
              </Form.Item>

              <Form.Item name="description" label="试卷描述">
                <TextArea rows={2} placeholder="请输入试卷描述（可选）" />
              </Form.Item>
            </Form>
          </Card>

          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>题目列表 ({selectedQuestions.length} 道)</span>
                <Space>
                  <Button
                    icon={<PlusOutlined />}
                    onClick={() => setQuestionModalVisible(true)}
                  >
                    从题库添加
                  </Button>
                  <Button
                    type="primary"
                    icon={<FormOutlined />}
                    onClick={() => setNewQuestionDrawerVisible(true)}
                  >
                    新建题目
                  </Button>
                </Space>
              </div>
            }
          >
            {selectedQuestions.length > 0 ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={selectedQuestions.map(q => q.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div style={{ border: '1px solid #f0f0f0', borderRadius: 4 }}>
                    {selectedQuestions.map((item, index) => (
                      <SortableQuestionRow
                        key={item.id}
                        item={item}
                        index={index}
                        onRemove={handleRemoveQuestion}
                        onScoreChange={handleScoreChange}
                        onMoveUp={handleMoveUp}
                        onMoveDown={handleMoveDown}
                        isFirst={index === 0}
                        isLast={index === selectedQuestions.length - 1}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <Empty
                description="暂无题目，请从题库添加或新建题目"
                style={{ padding: '40px 0' }}
              />
            )}
          </Card>

          {/* 提交按钮 */}
          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => navigate('/test-center?tab=quizzes')}>
                取消
              </Button>
              <Button
                type="primary"
                size="large"
                onClick={() => form.submit()}
                loading={createQuiz.isPending || updateQuiz.isPending}
                disabled={selectedQuestions.length === 0}
              >
                {isEdit ? '保存修改' : '创建试卷'}
              </Button>
            </Space>
          </div>
        </Col>

        {/* 右侧：统计信息 */}
        <Col span={8}>
          <Card title="试卷统计" style={{ position: 'sticky', top: 16 }}>
            <Statistic
              title="总分"
              value={totalScore}
              suffix="分"
              valueStyle={{ color: '#1890ff', fontSize: 36 }}
            />
            <Divider />
            <Statistic
              title="题目数量"
              value={selectedQuestions.length}
              suffix="道"
            />
            <Divider />
            <div>
              <Text type="secondary">题型分布</Text>
              <div style={{ marginTop: 8 }}>
                {Object.entries(typeStats).length > 0 ? (
                  Object.entries(typeStats).map(([type, count]) => (
                    <div key={type} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text>{type}</Text>
                      <Text strong>{count} 道</Text>
                    </div>
                  ))
                ) : (
                  <Text type="secondary">暂无题目</Text>
                )}
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 从题库添加题目弹窗 */}
      <Modal
        title="从题库添加题目"
        open={questionModalVisible}
        onCancel={() => setQuestionModalVisible(false)}
        footer={null}
        width={900}
      >
        <QuestionSelector
          availableQuestions={availableQuestions}
          onConfirm={handleAddQuestions}
          onCancel={() => setQuestionModalVisible(false)}
        />
      </Modal>

      {/* 新建题目抽屉 */}
      <Drawer
        title="新建题目"
        placement="right"
        width={600}
        open={newQuestionDrawerVisible}
        onClose={() => setNewQuestionDrawerVisible(false)}
        extra={
          <Space>
            <Button onClick={() => setNewQuestionDrawerVisible(false)}>取消</Button>
            <Button
              type="primary"
              onClick={handleCreateNewQuestion}
              loading={createQuestion.isPending}
            >
              创建并添加
            </Button>
          </Space>
        }
      >
        <Form
          form={newQuestionForm}
          layout="vertical"
          initialValues={{ difficulty: 'MEDIUM', score: 1 }}
        >
          <Form.Item
            name="line_type_id"
            label="条线类型"
            rules={[{ required: true, message: '请选择条线类型' }]}
          >
            <Select placeholder="请选择条线类型">
              {lineTypes?.map((tag) => (
                <Option key={tag.id} value={tag.id}>
                  {tag.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="question_type"
            label="题目类型"
            rules={[{ required: true, message: '请选择题目类型' }]}
          >
            <Select placeholder="请选择题目类型">
              <Option value="SINGLE_CHOICE">单选题</Option>
              <Option value="MULTIPLE_CHOICE">多选题</Option>
              <Option value="TRUE_FALSE">判断题</Option>
              <Option value="SHORT_ANSWER">简答题</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="content"
            label="题目内容"
            rules={[{ required: true, message: '请输入题目内容' }]}
          >
            <TextArea rows={3} placeholder="请输入题目内容" />
          </Form.Item>

          {(newQuestionType === 'SINGLE_CHOICE' || newQuestionType === 'MULTIPLE_CHOICE') && (
            <Form.Item
              name="options"
              label="选项"
              rules={[{ required: true, message: '请设置选项' }]}
            >
              <OptionsInput />
            </Form.Item>
          )}

          <Form.Item
            name="answer"
            label="答案"
            rules={[{ required: true, message: '请设置答案' }]}
          >
            <AnswerInput questionType={newQuestionType} form={newQuestionForm} />
          </Form.Item>

          <Form.Item name="explanation" label="解析">
            <TextArea rows={2} placeholder="请输入解析（可选）" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="score" label="分值" rules={[{ required: true }]}>
                <InputNumber min={0} precision={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="difficulty" label="难度">
                <Select>
                  <Option value="EASY">简单</Option>
                  <Option value="MEDIUM">中等</Option>
                  <Option value="HARD">困难</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Drawer>

      {/* 创建成功后发布弹窗 */}
      <Modal
        title="试卷创建成功"
        open={publishModalVisible}
        onCancel={handleLater}
        footer={[
          <Button key="later" onClick={handleLater}>
            稍后发布
          </Button>,
          <Button key="publish" type="primary" icon={<SendOutlined />} onClick={handlePublish}>
            立即发布任务
          </Button>,
        ]}
      >
        <p style={{ marginBottom: 16 }}>试卷创建成功！是否立即发布为任务？</p>
      </Modal>
    </div>
  );
};

/**
 * 题库选择器组件
 */
const QuestionSelector: React.FC<{
  availableQuestions: Question[];
  onConfirm: (ids: number[]) => void;
  onCancel: () => void;
}> = ({ availableQuestions, onConfirm, onCancel }) => {
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);
  const [filterType, setFilterType] = useState<QuestionType | undefined>();

  const filteredQuestions = filterType
    ? availableQuestions.filter(q => q.question_type === filterType)
    : availableQuestions;

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

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Select
          style={{ width: 150 }}
          placeholder="筛选题型"
          allowClear
          onChange={(value) => setFilterType(value)}
        >
          <Option value="SINGLE_CHOICE">单选题</Option>
          <Option value="MULTIPLE_CHOICE">多选题</Option>
          <Option value="TRUE_FALSE">判断题</Option>
          <Option value="SHORT_ANSWER">简答题</Option>
        </Select>
      </div>
      <Table
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys as number[]),
        }}
        columns={[
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
        ]}
        dataSource={filteredQuestions}
        rowKey="id"
        pagination={{ pageSize: 10 }}
        scroll={{ y: 400 }}
        size="small"
      />
      <div style={{ marginTop: 16, textAlign: 'right' }}>
        <Space>
          <Button onClick={onCancel}>取消</Button>
          <Button
            type="primary"
            disabled={selectedRowKeys.length === 0}
            onClick={() => onConfirm(selectedRowKeys)}
          >
            添加已选 ({selectedRowKeys.length})
          </Button>
        </Space>
      </div>
    </div>
  );
};

/**
 * 选项输入组件
 */
const OptionsInput: React.FC<{
  value?: Array<{ key: string; value: string }>;
  onChange?: (value: Array<{ key: string; value: string }>) => void;
}> = ({ value = [], onChange }) => {
  const [options, setOptions] = useState<Array<{ key: string; value: string }>>(value || []);

  useEffect(() => {
    if (value) {
      setOptions(value);
    }
  }, [value]);

  const handleAdd = () => {
    const keys = ['A', 'B', 'C', 'D', 'E', 'F'];
    const nextKey = keys[options.length] || String.fromCharCode(65 + options.length);
    const newOptions = [...options, { key: nextKey, value: '' }];
    setOptions(newOptions);
    onChange?.(newOptions);
  };

  const handleChange = (index: number, field: 'key' | 'value', val: string) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], [field]: val };
    setOptions(newOptions);
    onChange?.(newOptions);
  };

  const handleRemove = (index: number) => {
    const newOptions = options.filter((_, i) => i !== index);
    setOptions(newOptions);
    onChange?.(newOptions);
  };

  return (
    <div>
      {options.map((opt, index) => (
        <Space key={index} style={{ display: 'flex', marginBottom: 8 }}>
          <Input
            style={{ width: 60 }}
            value={opt.key}
            onChange={(e) => handleChange(index, 'key', e.target.value)}
            placeholder="选项"
          />
          <Input
            style={{ flex: 1, width: 350 }}
            value={opt.value}
            onChange={(e) => handleChange(index, 'value', e.target.value)}
            placeholder="选项内容"
          />
          <Button size="small" onClick={() => handleRemove(index)}>删除</Button>
        </Space>
      ))}
      <Button onClick={handleAdd} size="small">添加选项</Button>
    </div>
  );
};

/**
 * 答案输入组件
 */
const AnswerInput: React.FC<{
  questionType?: QuestionType;
  form: any;
  value?: string | string[];
  onChange?: (value: string | string[]) => void;
}> = ({ questionType, form, value, onChange }) => {
  const options = Form.useWatch('options', form) || [];

  if (questionType === 'SINGLE_CHOICE') {
    return (
      <Select value={value as string} onChange={onChange} placeholder="请选择答案">
        {options.map((opt: { key: string; value: string }) => (
          <Option key={opt.key} value={opt.key}>
            {opt.key}: {opt.value}
          </Option>
        ))}
      </Select>
    );
  }

  if (questionType === 'MULTIPLE_CHOICE') {
    return (
      <Select
        mode="multiple"
        value={value as string[]}
        onChange={onChange}
        placeholder="请选择答案（可多选）"
      >
        {options.map((opt: { key: string; value: string }) => (
          <Option key={opt.key} value={opt.key}>
            {opt.key}: {opt.value}
          </Option>
        ))}
      </Select>
    );
  }

  if (questionType === 'TRUE_FALSE') {
    return (
      <Select value={value as string} onChange={onChange} placeholder="请选择答案">
        <Option value="TRUE">正确</Option>
        <Option value="FALSE">错误</Option>
      </Select>
    );
  }

  return (
    <TextArea
      rows={2}
      value={value as string}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder="请输入参考答案"
    />
  );
};
