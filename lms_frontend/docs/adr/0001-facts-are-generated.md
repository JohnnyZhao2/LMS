# ADR 0001: Facts Are Generated

## 状态

Accepted

## 背景

前端曾维护手写的 `generated/component-inventory.md`。随着组件重命名、删除、结构调整，这类清单很快漂移，最后既不能当事实来源，也不能提供架构约束。

## 决策

- 手写文档只保留原则、约束、ADR
- 组件清单、依赖图、类似 inventory 的事实文档统一自动生成
- 生成入口统一为 `npm run docs:generate`
- 漂移检查统一为 `npm run docs:check`
- `npm run lint` 必须包含文档漂移检查

## 后果

- 文档会更少，但可信度更高
- 架构讨论回到“原则是什么”，而不是维护一份很快过期的清单
- 如果代码结构变化，更新生成脚本比手改多份清单更便宜
