# MyMind 知识库应用

这是一个模仿 mymind 风格的知识库管理应用。

## 项目结构

```
mymind/
├── app.jsx              # 主应用组件
├── constants.js         # 常量和初始数据
├── utils.js             # 工具函数
├── icons.jsx            # 图标组件
├── card.jsx             # 卡片组件
├── detail-modal.jsx     # 详情弹窗组件
├── detail-editor.jsx    # 详情编辑器组件
├── add-modal.jsx        # 添加弹窗组件
├── add-inline-card.jsx  # 内联添加卡片组件
└── styles.js            # 全局样式
```

## 功能特性

- 知识卡片展示（瀑布流布局）
- 按空间分类（双云、网络、数据库、应用、应急、规章制度）
- 搜索功能（支持内容、标签、标题搜索）
- 卡片详情查看和编辑
- 标签管理
- 备注功能
- 链接关联
- Bionic Reading 阅读模式

## 使用方式

导入主应用组件即可使用:

```jsx
import App from './mymind/app.jsx';
```

## 依赖

- React 19
- Quill 编辑器（通过 CDN 加载）
