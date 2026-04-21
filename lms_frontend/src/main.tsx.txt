import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
// 导入 dayjs 配置（确保时区设置正确）
import './lib/dayjs';
import { App } from './app/app';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
