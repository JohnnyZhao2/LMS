# Frontend Dependency Graph

> 自动生成文件。请勿手改；执行 `npm run docs:generate` 更新。

## 顶层层级依赖

```mermaid
flowchart LR
  app["app"]
  features["features"]
  entities["entities"]
  session["session"]
  components["components"]
  hooks["hooks"]
  lib["lib"]
  utils["utils"]
  config["config"]
  types["types"]
  app -->|28| features
  app -->|4| entities
  app -->|21| session
  app -->|12| components
  app -->|6| lib
  app -->|2| utils
  app -->|10| config
  app -->|8| types
  features -->|80| entities
  features -->|44| session
  features -->|235| components
  features -->|3| hooks
  features -->|119| lib
  features -->|21| utils
  features -->|11| config
  features -->|80| types
  entities -->|1| features
  entities -->|11| session
  entities -->|51| components
  entities -->|2| hooks
  entities -->|69| lib
  entities -->|5| utils
  entities -->|66| types
  session -->|2| lib
  session -->|1| config
  session -->|4| types
  components -->|2| entities
  components -->|3| session
  components -->|46| lib
  components -->|1| config
  lib -->|1| utils
  lib -->|2| config
  lib -->|3| types
  utils -->|1| lib
  config -->|1| lib
  config -->|1| types
```

| From | To | Imports |
|------|----|---------|
| `app` | `features` | 28 |
| `app` | `entities` | 4 |
| `app` | `session` | 21 |
| `app` | `components` | 12 |
| `app` | `lib` | 6 |
| `app` | `utils` | 2 |
| `app` | `config` | 10 |
| `app` | `types` | 8 |
| `features` | `entities` | 80 |
| `features` | `session` | 44 |
| `features` | `components` | 235 |
| `features` | `hooks` | 3 |
| `features` | `lib` | 119 |
| `features` | `utils` | 21 |
| `features` | `config` | 11 |
| `features` | `types` | 80 |
| `entities` | `features` | 1 |
| `entities` | `session` | 11 |
| `entities` | `components` | 51 |
| `entities` | `hooks` | 2 |
| `entities` | `lib` | 69 |
| `entities` | `utils` | 5 |
| `entities` | `types` | 66 |
| `session` | `lib` | 2 |
| `session` | `config` | 1 |
| `session` | `types` | 4 |
| `components` | `entities` | 2 |
| `components` | `session` | 3 |
| `components` | `lib` | 46 |
| `components` | `config` | 1 |
| `lib` | `utils` | 1 |
| `lib` | `config` | 2 |
| `lib` | `types` | 3 |
| `utils` | `lib` | 1 |
| `config` | `lib` | 1 |
| `config` | `types` | 1 |

## Cross-feature 直接依赖

当前未发现 feature 对其他 feature 的直接源码依赖。

## 边界监控

- `feature -> app`：0
- `cross-feature`：0
- `shared -> feature`：0
- `shared -> app`：0
- `session -> feature`：0
- `session -> app`：0
