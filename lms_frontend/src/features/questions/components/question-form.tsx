import { useState, useEffect } from 'react';
import { Form, Input, Select, Button, Card, Typography, message, Space, InputNumber } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { useCreateQuestion, useUpdateQuestion } from '../api/create-question';
import { useQuestionDetail } from '../api/get-questions';
import { useLineTypeTags } from '@/features/knowledge/api/get-tags';
import type { QuestionCreateRequest, QuestionType, Difficulty } from '@/types/api';
import { showApiError } from '@/utils/error-handler';

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

/**
 * 题目表单组件
 */
export const QuestionForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const isEdit = !!id;
  
  const { data: questionData, isLoading } = useQuestionDetail(Number(id));
  const { data: lineTypes } = useLineTypeTags();
  const createQuestion = useCreateQuestion();
  const updateQuestion = useUpdateQuestion();

  useEffect(() => {
    if (isEdit && questionData) {
      form.setFieldsValue({
        ...questionData,
        line_type_id: questionData.line_type?.id,
        score: Number(questionData.score),
      });
    }
  }, [isEdit, questionData, form]);

  const handleSubmit = async (values: QuestionCreateRequest) => {
    try {
      const submitData = {
        ...values,
        score: String(values.score || 1),
      };

      if (isEdit) {
        await updateQuestion.mutateAsync({ id: Number(id), data: submitData });
        message.success('更新成功');
      } else {
        await createQuestion.mutateAsync(submitData);
        message.success('创建成功');
      }
      navigate('/test-center?tab=questions');
    } catch (error) {
      showApiError(error, isEdit ? '更新失败' : '创建失败');
    }
  };

  const questionType = Form.useWatch('question_type', form);

  return (
    <div>
      <Title level={2} style={{ marginBottom: 16 }}>
        {isEdit ? '编辑题目' : '新建题目'}
      </Title>
      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            difficulty: 'MEDIUM',
            score: 1,
          }}
        >
          <Form.Item
            name="line_type_id"
            label="条线类型"
            rules={[{ required: true, message: '请选择条线类型' }]}
          >
            <Select placeholder="请选择条线类型" loading={!lineTypes}>
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
            <TextArea rows={4} placeholder="请输入题目内容" />
          </Form.Item>

          {(questionType === 'SINGLE_CHOICE' || questionType === 'MULTIPLE_CHOICE') && (
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
            <AnswerInput questionType={questionType} form={form} />
          </Form.Item>

          <Form.Item name="explanation" label="解析">
            <TextArea rows={3} placeholder="请输入解析（可选）" />
          </Form.Item>

          <Form.Item name="score" label="分值" rules={[{ required: true }]}>
            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="difficulty" label="难度">
            <Select>
              <Option value="EASY">简单</Option>
              <Option value="MEDIUM">中等</Option>
              <Option value="HARD">困难</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={createQuestion.isPending || updateQuestion.isPending}>
                {isEdit ? '更新' : '创建'}
              </Button>
              <Button onClick={() => navigate('/test-center?tab=questions')}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

/**
 * 选项输入组件
 */
const OptionsInput: React.FC<{ value?: Array<{ key: string; value: string }>; onChange?: (value: Array<{ key: string; value: string }>) => void }> = ({
  value = [],
  onChange,
}) => {
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
            style={{ flex: 1 }}
            value={opt.value}
            onChange={(e) => handleChange(index, 'value', e.target.value)}
            placeholder="选项内容"
          />
          <Button onClick={() => handleRemove(index)}>删除</Button>
        </Space>
      ))}
      <Button onClick={handleAdd}>添加选项</Button>
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
      rows={3}
      value={value as string}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder="请输入参考答案"
    />
  );
};

