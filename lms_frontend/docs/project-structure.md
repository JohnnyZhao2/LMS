# Frontend Architecture Principles

## 当前分层

```sh
src
├── app          # 路由、布局、页面装配
├── session      # 登录态、工作区、角色路径等会话能力
├── entities     # 跨 feature 共享的领域模型与纯业务原语
├── features     # 用例导向的功能模块
├── components   # 共享 UI 组件
├── hooks        # 共享 hooks
├── lib          # 通用库封装
├── utils        # 通用工具
├── config       # 前端配置
└── types        # 共享类型
```

## 约束

- `feature` 不直接依赖其他 `feature`
- `feature` 不依赖 `app`
- `components/hooks/lib/utils/config/types` 不依赖 `feature` 和 `app`
- `session` 不依赖 `feature` 和 `app`
- 禁止 barrel / forwarding re-export，统一显式文件路径导入

## 机器约束

- 分层边界由 [eslint.config.js](../eslint.config.js) 中的 `no-restricted-imports` 负责校验

## 维护原则

- 原则、命名约定可以手写
- 不维护组件清单、依赖图等易漂移的事实型文档
