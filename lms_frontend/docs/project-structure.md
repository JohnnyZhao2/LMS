# Frontend Architecture Principles

这份文档只写原则，不再手写事实清单。

事实型文档统一由脚本生成：

- `generated/component-inventory.md`
- `generated/feature-dependency-graph.md`

更新命令：

```sh
npm run docs:generate
```

校验命令：

```sh
npm run docs:check
```

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
- 事实清单不手写，避免文档与代码双轨漂移

## 机器约束

- 分层边界由 [eslint.config.js](../eslint.config.js) 中的 `no-restricted-imports` 负责校验
- 文档漂移由 `npm run docs:check` 负责校验

## 维护原则

- 原则、ADR、命名约定可以手写
- 组件清单、依赖图、文件清单这类事实必须生成
- 如果事实型文档无法稳定生成，就不要保留它
