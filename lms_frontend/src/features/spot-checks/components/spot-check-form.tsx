import { Form, Input, Select, DatePicker, InputNumber, Button, Card, message, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useCreateSpotCheck } from '../api/create-spot-check';
import { useAssignableUsers } from '@/features/tasks/api/get-assignable-users';
import { showApiError } from '@/utils/error-handler';
import dayjs from '@/lib/dayjs';

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

/**
 * 抽查录入表单组件
 */
export const SpotCheckForm: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const createSpotCheck = useCreateSpotCheck();
  const { data: users, isLoading: usersLoading } = useAssignableUsers();

  const handleSubmit = async (values: {
    student: number;
    content: string;
    score: number;
    comment?: string;
    checked_at: dayjs.Dayjs;
  }) => {
    try {
      await createSpotCheck.mutateAsync({
        student: values.student,
        content: values.content,
        score: String(values.score),
        comment: values.comment,
        checked_at: values.checked_at.toISOString(),
      });
      message.success('抽查记录创建成功');
      navigate('/spot-checks');
    } catch (error) {
      showApiError(error, '创建失败');
    }
  };

  return (
    <div>
      <Title level={2}>发起抽查</Title>
      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ checked_at: dayjs() }}
        >
          <Form.Item
            name="student"
            label="选择学员"
            rules={[{ required: true, message: '请选择学员' }]}
          >
            <Select
              showSearch
              placeholder="搜索并选择学员"
              optionFilterProp="children"
              loading={usersLoading}
            >
              {(users || []).map((user) => (
                <Option key={user.id} value={user.id}>
                  {user.username} ({user.employee_id})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="content"
            label="抽查内容/主题"
            rules={[{ required: true, message: '请输入抽查内容' }]}
          >
            <TextArea rows={3} placeholder="请输入抽查内容或主题" />
          </Form.Item>

          <Form.Item
            name="score"
            label="评分（1-10分）"
            rules={[{ required: true, message: '请输入评分' }]}
          >
            <InputNumber min={1} max={10} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="comment" label="评语">
            <TextArea rows={3} placeholder="请输入评语（可选）" />
          </Form.Item>

          <Form.Item
            name="checked_at"
            label="抽查时间"
            rules={[{ required: true, message: '请选择抽查时间' }]}
          >
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={createSpotCheck.isPending}>
              提交
            </Button>
            <Button style={{ marginLeft: 8 }} onClick={() => navigate('/spot-checks')}>
              取消
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};


