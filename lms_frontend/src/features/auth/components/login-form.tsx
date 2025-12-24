import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, message, Typography } from 'antd';
import { UserOutlined, LockOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/use-auth';
import { ROUTES } from '@/config/routes';
import type { LoginRequest } from '@/types/api';
import { showApiError } from '@/utils/error-handler';

const { Text, Title } = Typography;

/**
 * 登录表单组件
 * 现代化设计，带有氛围背景和动画效果
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
      navigate(ROUTES.DASHBOARD, { replace: true });
    } catch (error) {
      showApiError(error, '登录失败，请检查工号和密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        padding: 'var(--spacing-6)',
        background: 'var(--color-gray-900)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 动态背景 - 渐变光晕 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(ellipse 80% 80% at 20% 10%, rgba(77, 108, 255, 0.4) 0%, transparent 50%),
            radial-gradient(ellipse 60% 60% at 80% 30%, rgba(155, 0, 255, 0.3) 0%, transparent 50%),
            radial-gradient(ellipse 50% 50% at 50% 90%, rgba(255, 61, 143, 0.25) 0%, transparent 50%)
          `,
          animation: 'pulse 8s ease-in-out infinite',
        }}
      />

      {/* 网格背景 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '64px 64px',
        }}
      />

      {/* 登录卡片 */}
      <div
        className="animate-scaleIn"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 440,
          padding: 'var(--spacing-10)',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: 'var(--radius-2xl)',
          boxShadow: `
            0 0 0 1px rgba(255, 255, 255, 0.1),
            0 25px 50px -12px rgba(0, 0, 0, 0.4),
            0 0 100px rgba(77, 108, 255, 0.15)
          `,
        }}
      >
        {/* Logo 和标题 */}
        <div
          className="animate-fadeInDown"
          style={{
            textAlign: 'center',
            marginBottom: 'var(--spacing-8)',
          }}
        >
          {/* Logo */}
          <div
            style={{
              width: 72,
              height: 72,
              margin: '0 auto var(--spacing-5)',
              borderRadius: 'var(--radius-xl)',
              background: 'linear-gradient(135deg, var(--color-primary-500) 0%, var(--color-purple-500) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 40px rgba(77, 108, 255, 0.4)',
            }}
          >
            <span
              style={{
                color: 'white',
                fontSize: 32,
                fontWeight: 700,
                fontFamily: 'var(--font-family)',
              }}
            >
              L
            </span>
          </div>

          <Title
            level={2}
            style={{
              margin: 0,
              marginBottom: 'var(--spacing-2)',
              fontSize: 'var(--font-size-3xl)',
              fontWeight: 700,
              color: 'var(--color-gray-900)',
            }}
          >
            LMS 学习管理系统
          </Title>
          <Text
            type="secondary"
            style={{
              fontSize: 'var(--font-size-base)',
            }}
          >
            欢迎回来，请登录您的账号
          </Text>
        </div>

        {/* 表单 */}
        <Form
          name="login"
          onFinish={handleSubmit}
          autoComplete="off"
          size="large"
          layout="vertical"
          requiredMark={false}
        >
          <Form.Item
            name="employee_id"
            label={<Text strong>工号</Text>}
            rules={[{ required: true, message: '请输入工号' }]}
            style={{ marginBottom: 'var(--spacing-5)' }}
            className="login-form-item"
          >
            <Input
              prefix={<UserOutlined style={{ color: 'var(--color-gray-400)' }} />}
              placeholder="请输入工号"
              className="login-input"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label={<Text strong>密码</Text>}
            rules={[{ required: true, message: '请输入密码' }]}
            style={{ marginBottom: 'var(--spacing-8)' }}
            className="login-form-item"
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: 'var(--color-gray-400)' }} />}
              placeholder="请输入密码"
              className="login-input"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              icon={!loading && <ArrowRightOutlined />}
              style={{
                height: 52,
                borderRadius: 'var(--radius-lg)',
                fontSize: 'var(--font-size-md)',
                fontWeight: 600,
                background: 'linear-gradient(135deg, var(--color-primary-500) 0%, var(--color-primary-600) 100%)',
                border: 'none',
                boxShadow: '0 4px 14px rgba(77, 108, 255, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--spacing-2)',
                flexDirection: 'row-reverse',
              }}
            >
              登录系统
            </Button>
          </Form.Item>
        </Form>

        {/* 底部装饰 */}
        <div
          style={{
            marginTop: 'var(--spacing-8)',
            paddingTop: 'var(--spacing-6)',
            borderTop: '1px solid var(--color-gray-100)',
            textAlign: 'center',
          }}
        >
          <Text
            type="secondary"
            style={{
              fontSize: 'var(--font-size-sm)',
            }}
          >
            © {new Date().getFullYear()} LMS 学习管理系统
          </Text>
        </div>
      </div>

      {/* 底部装饰文字 */}
      <div
        style={{
          position: 'absolute',
          bottom: 'var(--spacing-6)',
          left: 0,
          right: 0,
          textAlign: 'center',
        }}
      >
        <Text
          style={{
            color: 'rgba(255, 255, 255, 0.4)',
            fontSize: 'var(--font-size-sm)',
          }}
        >
          Designed with ❤️ for better learning
        </Text>
      </div>
    </div>
  );
};
