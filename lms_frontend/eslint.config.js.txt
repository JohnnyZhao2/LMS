import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

const configDir = path.dirname(fileURLToPath(import.meta.url))
const featureRoot = path.join(configDir, 'src', 'features')
const featureNames = fs.readdirSync(featureRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)

const featureBoundaryConfigs = featureNames.map((featureName) => ({
  files: [`src/features/${featureName}/**/*.{ts,tsx}`],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        {
          group: [
            '@/features/*',
            `!@/features/${featureName}`,
            `!@/features/${featureName}/*`,
          ],
          message: '禁止跨 feature 直接依赖，请下沉到 entities/session 或在 app 层组合。',
        },
        {
          group: ['@/app', '@/app/*'],
          message: 'feature 不应依赖 app，请把路由和页面拼装留在 app 层。',
        },
      ],
    }],
  },
}))

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    files: [
      'src/components/**/*.{ts,tsx}',
      'src/hooks/**/*.{ts,tsx}',
      'src/lib/**/*.{ts,tsx}',
      'src/types/**/*.{ts,tsx}',
      'src/utils/**/*.{ts,tsx}',
      'src/config/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['@/features/*'],
            message: '共享层不应依赖 feature。',
          },
          {
            group: ['@/app', '@/app/*'],
            message: '共享层不应依赖 app。',
          },
        ],
      }],
    },
  },
  {
    files: ['src/session/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['@/features/*'],
            message: 'session 层不应依赖 feature。',
          },
          {
            group: ['@/app', '@/app/*'],
            message: 'session 层不应依赖 app。',
          },
        ],
      }],
    },
  },
  ...featureBoundaryConfigs,
])
