import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/use-auth';
import { ROUTES } from '@/config/routes';
import type { LoginRequest } from '@/types/api';
import { showApiError } from '@/utils/error-handler';

/**
 * 登录表单组件
 */
export const LoginForm: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (values: LoginRequest) => {
    setLoading(true);
    try {
      await login(values);
      message.success('登录成功');
      // 登录成功后跳转到 dashboard
      navigate(ROUTES.DASHBOARD, { replace: true });
    } catch (error) {
      showApiError(error, '登录失败，请检查工号和密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Card style={{ width: 400, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 600, margin: 0, color: '#1a1a1a' }}>LMS 学习管理系统</h1>
          <p style={{ color: '#666', marginTop: 8 }}>欢迎登录</p>
        </div>
        <Form
          name="login"
          onFinish={handleSubmit}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="employee_id"
            rules={[{ required: true, message: '请输入工号' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="工号"
            />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

