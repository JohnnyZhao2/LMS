import { useEffect } from 'react';
import { Form, Input, Select, Button, Card, message, Typography, Space } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { useCreateUser, useUpdateUser } from '../api/manage-users';
import { useUserDetail, useMentors, useDepartments } from '../api/get-users';
import { showApiError } from '@/utils/error-handler';

const { Title } = Typography;
const { Option } = Select;

/**
 * 用户表单组件（用于创建和编辑）
 */
export const UserForm: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const { data: userDetail, isLoading: detailLoading } = useUserDetail(Number(id || 0));
  const { data: mentors = [] } = useMentors();
  const { data: departments = [] } = useDepartments();

  // 编辑模式下填充表单
  useEffect(() => {
    if (isEdit && userDetail) {
      form.setFieldsValue({
        username: userDetail.username,
        department_id: userDetail.department?.id,
      });
    }
  }, [isEdit, userDetail, form]);

  const handleSubmit = async (values: {
    password?: string;
    employee_id?: string;
    username: string;
    department_id: number;
    mentor_id?: number | null;
  }) => {
    try {
      if (isEdit) {
        await updateUser.mutateAsync({
          id: Number(id),
          data: {
            username: values.username,
            department_id: values.department_id,
          },
        });
        message.success('用户信息更新成功');
      } else {
        await createUser.mutateAsync({
          password: values.password!,
          employee_id: values.employee_id!,
          username: values.username,
          department_id: values.department_id,
          mentor_id: values.mentor_id || null,
        });
        message.success('用户创建成功');
      }
      navigate('/users');
    } catch (error) {
      showApiError(error, isEdit ? '更新失败' : '创建失败');
    }
  };

  if (isEdit && detailLoading) {
    return <div>加载中...</div>;
  }

  return (
    <div>
      <Title level={2}>{isEdit ? '编辑用户' : '新建用户'}</Title>
      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{}}
        >
          {!isEdit && (
            <>
              <Form.Item
                name="employee_id"
                label="工号"
                rules={[{ required: true, message: '请输入工号' }]}
              >
                <Input placeholder="请输入工号" />
              </Form.Item>

              <Form.Item
                name="password"
                label="密码"
                rules={[{ required: true, message: '请输入密码' }]}
              >
                <Input.Password placeholder="请输入密码" />
              </Form.Item>
            </>
          )}

          <Form.Item
            name="username"
            label="姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input placeholder="请输入姓名" />
          </Form.Item>

          <Form.Item
            name="department_id"
            label="部门"
            rules={[{ required: true, message: '请选择部门' }]}
          >
            <Select placeholder="请选择部门">
              {departments.map((dept) => (
                <Option key={dept.id} value={dept.id}>
                  {dept.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {!isEdit && (
            <Form.Item
              name="mentor_id"
              label="导师"
              help="可选，创建后也可以随时指定或更换导师"
            >
              <Select
                placeholder="请选择导师（可选）"
                allowClear
                showSearch
                optionFilterProp="children"
              >
                {mentors.map((mentor) => (
                  <Option key={mentor.id} value={mentor.id}>
                    {mentor.username} ({mentor.employee_id})
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={createUser.isPending || updateUser.isPending}>
                {isEdit ? '更新' : '创建'}
              </Button>
              <Button onClick={() => navigate('/users')}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

