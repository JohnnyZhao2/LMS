import { Layout } from 'antd';
import { Header } from './header';
import { Sidebar } from './sidebar';

const { Content } = Layout;

interface AppLayoutProps {
  children: React.ReactNode;
}

/**
 * 主布局组件
 * 应用毛玻璃效果和氛围背景
 */
export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <Layout
      style={{
        minHeight: '100vh',
        background: 'transparent',
      }}
    >
      <Header />
      <Layout
        style={{
          background: 'transparent',
        }}
      >
        <Sidebar />
        <Layout
          style={{
            padding: 'var(--spacing-6)',
            background: 'transparent',
            marginLeft: 'var(--sidebar-width)',
            marginTop: 'var(--header-height)',
            minHeight: 'calc(100vh - var(--header-height))',
          }}
        >
          <Content
            className="animate-fadeIn"
            style={{
              background: 'var(--glass-bg)',
              backdropFilter: 'var(--glass-blur)',
              WebkitBackdropFilter: 'var(--glass-blur)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--spacing-6)',
              minHeight: 280,
              boxShadow: 'var(--shadow-md)',
              border: '1px solid rgba(255, 255, 255, 0.5)',
            }}
          >
            {children}
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
};
