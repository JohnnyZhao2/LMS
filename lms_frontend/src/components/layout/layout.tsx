import { Layout } from 'antd';
import { Header } from './header';
import { Sidebar } from './sidebar';

const { Content } = Layout;

interface AppLayoutProps {
  children: React.ReactNode;
}

/**
 * 主布局组件
 */
export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header />
      <Layout>
        <Sidebar />
        <Layout style={{ padding: '24px' }}>
          <Content
            style={{
              background: '#fff',
              padding: 24,
              borderRadius: 8,
              minHeight: 280,
            }}
          >
            {children}
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
};

