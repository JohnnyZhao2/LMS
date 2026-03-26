import { Agentation } from 'agentation';

const DEFAULT_AGENTATION_ENDPOINT = 'http://localhost:4747';

/**
 * 仅在开发环境注入 Agentation，避免生产环境暴露调试工具栏。
 */
export const AgentationToolbar: React.FC = () => {
  if (!import.meta.env.DEV) {
    return null;
  }

  const endpoint = import.meta.env.VITE_AGENTATION_ENDPOINT ?? DEFAULT_AGENTATION_ENDPOINT;

  return (
    <Agentation
      endpoint={endpoint}
      onSessionCreated={(sessionId) => {
        console.info('[Agentation] Session started:', sessionId);
      }}
    />
  );
};
