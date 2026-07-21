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
  features -->|306| components
  features -->|61| hooks
  features -->|335| lib
  features -->|3| utils
  features -->|19| config
  features -->|179| types
  components -->|45| lib
  hooks -->|2| lib
  hooks -->|2| config
  lib -->|1| config
  lib -->|4| types
  utils -->|1| config
  utils -->|1| types
  config -->|3| types
  testing -->|1| features
  testing -->|1| components
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
| `features` | `components` | 306 |
| `features` | `hooks` | 61 |
| `features` | `lib` | 335 |
| `features` | `utils` | 3 |
| `features` | `config` | 19 |
| `features` | `types` | 179 |
| `components` | `lib` | 45 |
| `hooks` | `lib` | 2 |
| `hooks` | `config` | 2 |
| `lib` | `config` | 1 |
| `lib` | `types` | 4 |
| `utils` | `config` | 1 |
| `utils` | `types` | 1 |
| `config` | `types` | 3 |
| `testing` | `features` | 1 |
| `testing` | `components` | 1 |
| `testing` | `lib` | 1 |

## Cross-feature 直接依赖

当前未发现 feature 对其他 feature 的直接源码依赖。

## 边界监控

- `feature -> app`：0
- `cross-feature`：0
- `shared -> feature`：0
- `shared -> app`：0
