import { Layout } from 'antd';
import { Header } from './header';

const { Content } = Layout;

interface AppLayoutProps {
  children: React.ReactNode;
}

/**
 * 主布局组件
 * 顶部导航栏 + 全宽内容区域
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
      <Content
        className="animate-fadeIn"
        style={{
          marginTop: 'var(--header-height)',
          padding: 'var(--spacing-6)',
          maxWidth: 'var(--container-max-width)',
          width: '100%',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        {children}
      </Content>
    </Layout>
  );
};
