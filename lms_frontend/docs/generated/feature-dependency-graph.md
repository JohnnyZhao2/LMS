# Frontend Dependency Graph

> 自动生成文件。请勿手改；执行 `npm run docs:generate` 更新。

## 顶层层级依赖

```mermaid
flowchart LR
  app["app"]
  features["features"]
  components["components"]
  hooks["hooks"]
  lib["lib"]
  utils["utils"]
  config["config"]
  testing["testing"]
  types["types"]
  app -->|47| features
  app -->|15| components
  app -->|3| hooks
  app -->|20| lib
  app -->|20| config
  app -->|8| types
  features -->|310| components
  features -->|61| hooks
  features -->|323| lib
  features -->|3| utils
  features -->|19| config
  features -->|165| types
  components -->|45| lib
  hooks -->|2| lib
  hooks -->|2| config
  lib -->|1| config
  lib -->|4| types
  utils -->|1| config
  utils -->|1| types
  config -->|3| types
  testing -->|4| features
  testing -->|2| components
  testing -->|1| lib
```

| From | To | Imports |
|------|----|---------|
| `app` | `features` | 47 |
| `app` | `components` | 15 |
| `app` | `hooks` | 3 |
| `app` | `lib` | 20 |
| `app` | `config` | 20 |
| `app` | `types` | 8 |
| `features` | `components` | 310 |
| `features` | `hooks` | 61 |
| `features` | `lib` | 323 |
| `features` | `utils` | 3 |
| `features` | `config` | 19 |
| `features` | `types` | 165 |
| `components` | `lib` | 45 |
| `hooks` | `lib` | 2 |
| `hooks` | `config` | 2 |
| `lib` | `config` | 1 |
| `lib` | `types` | 4 |
| `utils` | `config` | 1 |
| `utils` | `types` | 1 |
| `config` | `types` | 3 |
| `testing` | `features` | 4 |
| `testing` | `components` | 2 |
| `testing` | `lib` | 1 |

## Cross-feature 直接依赖

当前未发现 feature 对其他 feature 的直接源码依赖。

## 边界监控

- `feature -> app`：0
- `cross-feature`：0
- `shared -> feature`：0
- `shared -> app`：0
