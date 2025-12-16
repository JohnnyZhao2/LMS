# React 项目结构规范

## 总体结构
```
src/
├── app/                 # 应用层配置
│   ├── routes/         # 路由配置 (或 pages 文件夹)
│   ├── app.tsx         # 根组件
│   ├── provider.tsx    # 全局 Provider (Context, Redux, etc.)
│   └── router.tsx      # 路由器配置
├── assets/             # 静态资源 (图片、字体、图标等)
├── components/         # 全局共享组件 (跨多个 feature 使用)
├── config/             # 全局配置 (环境变量、常量等)
├── features/           # 功能模块 (核心架构，按业务功能划分)
├── hooks/              # 全局共享 Hooks
├── lib/                # 第三方库的封装配置
├── stores/             # 全局状态管理 (Redux/Zustand/Jotai)
├── testing/            # 测试工具和 Mock 数据
├── types/              # 全局 TypeScript 类型定义
└── utils/              # 全局工具函数
```

## Feature 模块结构
- 每个业务功能独立成一个 feature 文件夹，内部包含该功能的所有代码
- 避免跨 feature 引用，在应用层组合不同的 feature
- 使用 `index.ts` 作为 feature 的公共 API，只导出需要对外暴露的内容

**注意：并非每个 feature 都需要以下所有文件夹，只包含该 feature 必需的部分即可。**

```
src/features/awesome-feature/
├── api/                # 数据获取相关：API 请求函数 + React Query/SWR hooks
├── assets/             # 该 feature 专属的静态资源
├── components/         # 该 feature 内部组件 (不对外暴露)
├── hooks/              # UI 逻辑和工具 hooks (非数据获取)
├── stores/             # 该 feature 的状态管理
├── types/              # 该 feature 的 TypeScript 类型
├── utils/              # 该 feature 的工具函数
└── index.ts            # 公共 API，导出对外接口
```

### api/ vs hooks/ 区别
```typescript
// ✅ api/ - 数据获取相关的 hooks
// src/features/products/api/get-products.ts
export const useGetProducts = () => {
  return useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
  });
};

// ✅ hooks/ - UI 逻辑和工具 hooks
// src/features/products/hooks/use-product-filter.ts
export const useProductFilter = (products) => {
  const [filter, setFilter] = useState('');
  const filtered = useMemo(() => 
    products.filter(p => p.name.includes(filter))
  , [products, filter]);
  return { filtered, setFilter };
};
```

## 测试和 Mock 数据规范
- 所有测试工具配置、Mock 数据、测试辅助函数统一放在 `src/testing/` 目录
- 单元测试文件和被测代码放在同一目录，使用 `.test.tsx` 或 `.spec.tsx` 后缀
- **禁止在组件或 feature 内部创建 `__mocks__` 或 `mocks/` 文件夹**，统一使用 `src/testing/mocks/`

```
src/testing/
├── mocks/              # Mock 数据统一存放处
│   ├── handlers.ts     # MSW API mock handlers
│   ├── db.ts           # Mock 数据库 (如 @mswjs/data)
│   └── data/           # 静态 Mock 数据
│       ├── users.ts    # 用户 Mock 数据
│       └── products.ts # 产品 Mock 数据
├── test-utils.tsx      # 测试工具函数 (自定义 render 等)
└── setup-tests.ts      # 测试环境配置
```

### Mock 数据使用示例
```typescript
// ✅ 正确：从 testing 导入
import { mockUsers } from '@/testing/mocks/data/users';

// ❌ 错误：在组件目录创建 mock
// src/features/users/mocks/users.ts
```

### 测试文件位置示例
```
src/features/product-list/
├── components/
│   ├── product-item.tsx
│   └── product-item.test.tsx    # ✅ 测试文件和组件同级
└── api/
    ├── get-products.ts
    └── get-products.test.ts
```

## 组件命名和组织
- 组件文件使用 `kebab-case.tsx` 或 `PascalCase.tsx`，团队统一即可
- 复杂组件可以创建文件夹，包含组件、样式、测试等
- 共享 UI 组件放在 `src/components/ui/` 下 (如 Button, Modal, Card)
- 业务组件放在对应的 feature 下

```
src/components/
├── ui/                 # 基础 UI 组件库
│   ├── button/
│   │   ├── button.tsx
│   │   ├── button.test.tsx
│   │   └── index.ts
│   ├── modal/
│   └── card/
└── layout/             # 布局组件 (Header, Footer, Sidebar)
    ├── header.tsx
    └── footer.tsx
```

## 关键原则
- 使用路径别名 `@/` 替代相对路径 `../../../`，在 `tsconfig.json` 配置
- 禁止跨 feature 导入，使用 ESLint 规则 `import/no-restricted-paths` 强制约束
- ~~避免使用 barrel files (index.ts 导出所有)~~，直接导入具体文件以优化 tree-shaking
- 测试文件和被测代码放在同一目录下，使用 `.test.tsx` 或 `.spec.tsx` 后缀
- 如果 API 调用在多个 feature 间共享，可以考虑创建独立的 `src/api/` 文件夹

## lib 文件夹说明
- 用于封装第三方库的配置，提供统一接口
- 例如：`src/lib/react-query.ts` 配置 React Query，`src/lib/axios.ts` 配置 Axios 实例

```typescript
// src/lib/axios.ts
import Axios from 'axios';

export const axios = Axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});
```

## 状态管理建议
- 优先使用 React Query / SWR 管理服务端状态
- 使用 Context 管理低频更新的全局状态 (用户信息、主题)
- 中高频状态考虑 Zustand / Jotai 等原子化状态库
- Feature 内部状态尽量使用 `useState` / `useReducer` 本地管理

## 配置文件示例
```typescript
// src/config/index.ts
export const config = {
  apiUrl: import.meta.env.VITE_API_URL,
  appName: 'My App',
  isDev: import.meta.env.DEV,
};
```

## 代码组织最佳实践
- 当文件超过 10 个时才考虑创建子文件夹，避免过早优化
- 组件嵌套不超过 2 层 (`list/` → `list-item/` ✅，再嵌套 ❌)
- 使用 ESLint 和 Prettier 统一代码风格
- 删除功能时直接删除对应的 feature 文件夹即可