import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const projectRootDir = findProjectRoot(process.cwd())
const rootDir = path.join(projectRootDir, 'lms_frontend')
const srcDir = path.join(rootDir, 'src')
const docDir = path.join(rootDir, 'docs')
const generatedDocDir = path.join(docDir, 'generated')
const inventoryPath = path.join(generatedDocDir, 'component-inventory.md')
const dependencyGraphPath = path.join(generatedDocDir, 'feature-dependency-graph.md')
const updateLogPath = path.join(generatedDocDir, 'project-update-log.md')
const backendDir = path.join(projectRootDir, 'lms_backend')
const backendGeneratedDocDir = path.join(backendDir, 'docs', 'generated')
const backendModuleMapPath = path.join(backendGeneratedDocDir, 'backend-module-map.md')
const checkMode = process.argv.includes('--check')

const sourceExtensions = ['.ts', '.tsx']
const sharedLayers = new Set(['components', 'hooks', 'lib', 'utils', 'config', 'types'])
const layerOrder = ['app', 'features', 'entities', 'session', 'components', 'hooks', 'lib', 'utils', 'config', 'types']

function findProjectRoot(startDir) {
  let currentDir = startDir
  while (true) {
    if (
      fs.existsSync(path.join(currentDir, 'README.md'))
      && fs.existsSync(path.join(currentDir, 'lms_backend'))
      && fs.existsSync(path.join(currentDir, 'lms_frontend'))
    ) {
      return currentDir
    }

    const parentDir = path.dirname(currentDir)
    if (parentDir === currentDir) {
      throw new Error(`无法定位项目根目录: ${startDir}`)
    }
    currentDir = parentDir
  }
}

function toPosix(filePath) {
  return filePath.split(path.sep).join('/')
}

function isCodeFile(filePath) {
  return sourceExtensions.some((extension) => filePath.endsWith(extension))
    && !filePath.endsWith('.d.ts')
    && !filePath.includes('.test.')
    && !filePath.includes('.spec.')
}

function isPythonSourceFile(filePath) {
  return filePath.endsWith('.py')
    && !filePath.includes(`${path.sep}__pycache__${path.sep}`)
    && !filePath.endsWith(`${path.sep}__init__.py`)
}

function walkFiles(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return []
  }

  return fs.readdirSync(dirPath, { withFileTypes: true })
    .flatMap((entry) => {
      const fullPath = path.join(dirPath, entry.name)
      if (entry.isDirectory()) {
        return walkFiles(fullPath)
      }
      return [fullPath]
    })
}

function formatCount(count, unit = '个') {
  return `${count} ${unit}`
}

function formatList(values) {
  return values.length ? values.map((value) => `\`${value}\``).join('<br>') : '-'
}

function formatPathList(values) {
  return values.length ? values.map((value) => `\`${toPosix(value)}\``).join('<br>') : '-'
}

function escapeMermaidLabel(label) {
  return label.replace(/"/g, '\\"')
}

function groupBy(items, getKey) {
  return items.reduce((map, item) => {
    const key = getKey(item)
    const bucket = map.get(key)
    if (bucket) {
      bucket.push(item)
    } else {
      map.set(key, [item])
    }
    return map
  }, new Map())
}

function collectSharedComponents() {
  const componentRoot = path.join(srcDir, 'components')
  const files = walkFiles(componentRoot)
    .filter((filePath) => filePath.endsWith('.tsx') && !filePath.includes('.test.') && !filePath.includes('.spec.'))
    .map((filePath) => toPosix(path.relative(componentRoot, filePath)))
    .sort()

  return groupBy(files, (relativePath) => relativePath.split('/')[0] ?? 'root')
}

function collectFeatureVisuals() {
  const featureRoot = path.join(srcDir, 'features')
  if (!fs.existsSync(featureRoot)) {
    return new Map()
  }

  const featureNames = fs.readdirSync(featureRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()

  const featureMap = new Map()

  for (const featureName of featureNames) {
    const files = walkFiles(path.join(featureRoot, featureName))
      .filter((filePath) => filePath.endsWith('.tsx') && !filePath.includes('.test.') && !filePath.includes('.spec.'))
      .map((filePath) => toPosix(path.relative(path.join(featureRoot, featureName), filePath)))
      .filter((relativePath) => relativePath.startsWith('components/') || relativePath.startsWith('pages/'))
      .sort()

    if (files.length > 0) {
      featureMap.set(featureName, groupBy(files, (relativePath) => relativePath.split('/')[0]))
    }
  }

  return featureMap
}

function extractSpecifiers(fileContent) {
  const specifiers = new Set()
  const staticPattern = /\b(?:import|export)\b[\s\S]*?\bfrom\s*['"]([^'"]+)['"]|(?:^|\s)import\s*['"]([^'"]+)['"]/gm
  const dynamicPattern = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/gm

  for (const match of fileContent.matchAll(staticPattern)) {
    const specifier = match[1] ?? match[2]
    if (specifier) {
      specifiers.add(specifier)
    }
  }

  for (const match of fileContent.matchAll(dynamicPattern)) {
    const specifier = match[1]
    if (specifier) {
      specifiers.add(specifier)
    }
  }

  return [...specifiers]
}

function resolveSourceFile(candidatePath) {
  const options = [
    candidatePath,
    ...sourceExtensions.map((extension) => `${candidatePath}${extension}`),
    ...sourceExtensions.map((extension) => path.join(candidatePath, `index${extension}`)),
  ]

  for (const option of options) {
    if (fs.existsSync(option) && fs.statSync(option).isFile() && isCodeFile(option)) {
      return option
    }
  }

  return null
}

function resolveImport(sourceFile, specifier) {
  if (specifier.startsWith('@/')) {
    return resolveSourceFile(path.join(srcDir, specifier.slice(2)))
  }

  if (specifier.startsWith('.')) {
    return resolveSourceFile(path.resolve(path.dirname(sourceFile), specifier))
  }

  return null
}

function getLayerMeta(filePath) {
  const relativePath = toPosix(path.relative(srcDir, filePath))
  const segments = relativePath.split('/')
  const topLevel = segments[0]

  if (segments.length === 1) {
    return {
      layer: 'app',
      feature: null,
      path: relativePath,
    }
  }

  if (topLevel === 'features') {
    return {
      layer: 'features',
      feature: segments[1],
      path: relativePath,
    }
  }

  return {
    layer: topLevel,
    feature: null,
    path: relativePath,
  }
}

function incrementCounter(counter, key) {
  counter.set(key, (counter.get(key) ?? 0) + 1)
}

function extractPythonClassNames(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  return [...content.matchAll(/^class\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/gm)]
    .map((match) => match[1])
}

function collectBackendModules() {
  const appsDir = path.join(backendDir, 'apps')
  const appNames = fs.readdirSync(appsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('__'))
    .map((entry) => entry.name)
    .sort()

  return appNames.map((appName) => {
    const appDir = path.join(appsDir, appName)
    const files = walkFiles(appDir).filter(isPythonSourceFile).sort()
    const sourceFiles = files.filter((filePath) => !filePath.includes(`${path.sep}migrations${path.sep}`))
    const migrationFiles = files.filter((filePath) => filePath.includes(`${path.sep}migrations${path.sep}`))
    const modelFiles = sourceFiles.filter((filePath) => path.basename(filePath) === 'models.py')
    const serviceFiles = sourceFiles.filter((filePath) => {
      const basename = path.basename(filePath)
      return basename === 'services.py' || basename.endsWith('_service.py') || basename === 'workflows.py'
    })
    const selectorFiles = sourceFiles.filter((filePath) => path.basename(filePath) === 'selectors.py' || path.basename(filePath).endsWith('_queries.py'))
    const serializerFiles = sourceFiles.filter((filePath) => path.basename(filePath) === 'serializers.py')
    const authorizationFiles = sourceFiles.filter((filePath) => path.basename(filePath) === 'authorization.py')
    const viewFiles = sourceFiles.filter((filePath) => {
      const relativePath = toPosix(path.relative(appDir, filePath))
      return relativePath === 'views.py' || relativePath.startsWith('views/')
    })

    return {
      appName,
      modelClasses: modelFiles.flatMap(extractPythonClassNames).sort(),
      serviceFiles: serviceFiles.map((filePath) => path.relative(backendDir, filePath)).sort(),
      selectorFiles: selectorFiles.map((filePath) => path.relative(backendDir, filePath)).sort(),
      serializerFiles: serializerFiles.map((filePath) => path.relative(backendDir, filePath)).sort(),
      authorizationFiles: authorizationFiles.map((filePath) => path.relative(backendDir, filePath)).sort(),
      viewFiles: viewFiles.map((filePath) => path.relative(backendDir, filePath)).sort(),
      migrationCount: migrationFiles.length,
    }
  })
}

function renderBackendModuleMap() {
  const modules = collectBackendModules()
  const modelCount = modules.reduce((sum, item) => sum + item.modelClasses.length, 0)
  const serviceFileCount = modules.reduce((sum, item) => sum + item.serviceFiles.length, 0)
  const viewFileCount = modules.reduce((sum, item) => sum + item.viewFiles.length, 0)

  const lines = [
    '# 后端模块地图',
    '',
    '> 自动生成文件。请勿手改；执行 `npm run docs:generate` 更新。',
    '',
    `- 业务模块：${formatCount(modules.length)}`,
    `- 模型相关类：${formatCount(modelCount)}`,
    `- Service/Workflow 文件：${formatCount(serviceFileCount)}`,
    `- View 文件：${formatCount(viewFileCount)}`,
    '',
    '## 模块清单',
    '',
    '| 模块 | 模型相关类 | Service / Workflow | Selector / Query | Serializer | View | 权限声明 | 迁移 |',
    '|------|--------|--------------------|------------------|------------|------|----------|------|',
  ]

  for (const moduleInfo of modules) {
    lines.push(
      `| \`${moduleInfo.appName}\` | ${formatList(moduleInfo.modelClasses)} | ${formatPathList(moduleInfo.serviceFiles)} | ${formatPathList(moduleInfo.selectorFiles)} | ${formatPathList(moduleInfo.serializerFiles)} | ${formatPathList(moduleInfo.viewFiles)} | ${formatPathList(moduleInfo.authorizationFiles)} | ${moduleInfo.migrationCount} |`,
    )
  }

  return `${lines.join('\n').trim()}\n`
}

function sanitizeMarkdownCell(value) {
  return value.replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim()
}

function truncateText(value, maxLength = 140) {
  if (value.length <= maxLength) {
    return value
  }
  return `${value.slice(0, maxLength - 3)}...`
}

function renderProjectUpdateLog() {
  const rawLog = execFileSync(
    'git',
    ['-C', projectRootDir, 'log', '-n', '30', '--date=short', '--pretty=format:%h%x1f%cs%x1f%s'],
    { encoding: 'utf8' },
  ).trim()

  const lines = [
    '# 项目更新记录',
    '',
    '> 自动生成文件。请勿手改；执行 `npm run docs:generate` 更新。',
    '',
    '来源：最近 30 条 git commit。未提交改动不会进入本文件。',
    '',
  ]

  if (!rawLog) {
    lines.push('当前没有提交记录。')
    return `${lines.join('\n').trim()}\n`
  }

  lines.push('| Commit | 日期 | 内容 |')
  lines.push('|--------|------|------|')
  for (const row of rawLog.split('\n')) {
    const [hash, date, subject] = row.split('\x1f')
    lines.push(`| \`${hash}\` | ${date} | ${truncateText(sanitizeMarkdownCell(subject))} |`)
  }

  return `${lines.join('\n').trim()}\n`
}

function collectDependencyData() {
  const sourceFiles = walkFiles(srcDir)
    .filter((filePath) => isCodeFile(filePath))
    .sort()

  const layerEdges = new Map()
  const crossFeatureEdges = new Map()

  for (const sourceFile of sourceFiles) {
    const sourceMeta = getLayerMeta(sourceFile)
    const sourceContent = fs.readFileSync(sourceFile, 'utf8')
    const specifiers = extractSpecifiers(sourceContent)

    for (const specifier of specifiers) {
      const resolvedTarget = resolveImport(sourceFile, specifier)
      if (!resolvedTarget || resolvedTarget === sourceFile) {
        continue
      }

      const targetMeta = getLayerMeta(resolvedTarget)
      if (!targetMeta.layer || !sourceMeta.layer) {
        continue
      }

      if (sourceMeta.layer !== targetMeta.layer) {
        incrementCounter(layerEdges, `${sourceMeta.layer}->${targetMeta.layer}`)
      }

      if (
        sourceMeta.layer === 'features'
        && targetMeta.layer === 'features'
        && sourceMeta.feature
        && targetMeta.feature
        && sourceMeta.feature !== targetMeta.feature
      ) {
        incrementCounter(crossFeatureEdges, `${sourceMeta.feature}->${targetMeta.feature}`)
      }
    }
  }

  return { layerEdges, crossFeatureEdges }
}

function renderInventory() {
  const sharedComponents = collectSharedComponents()
  const featureVisuals = collectFeatureVisuals()

  const sharedCount = [...sharedComponents.values()].reduce((sum, bucket) => sum + bucket.length, 0)
  const featureCount = [...featureVisuals.values()].reduce(
    (sum, sectionMap) => sum + [...sectionMap.values()].reduce((sectionSum, bucket) => sectionSum + bucket.length, 0),
    0,
  )

  const lines = [
    '# 组件清单',
    '',
    '> 自动生成文件。请勿手改；执行 `npm run docs:generate` 更新。',
    '',
    `- 共享组件：${formatCount(sharedCount)}`,
    `- Feature 作用域视觉组件：${formatCount(featureCount)}`,
    '',
    '## 共享组件',
    '',
  ]

  for (const [sectionName, files] of [...sharedComponents.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    lines.push(`### ${sectionName} (${formatCount(files.length)})`)
    lines.push('')
    for (const relativePath of files) {
      lines.push(`- \`src/components/${relativePath}\``)
    }
    lines.push('')
  }

  lines.push('## Feature 作用域视觉组件')
  lines.push('')

  for (const [featureName, sectionMap] of [...featureVisuals.entries()]) {
    const featureTotal = [...sectionMap.values()].reduce((sum, bucket) => sum + bucket.length, 0)
    lines.push(`### ${featureName} (${formatCount(featureTotal)})`)
    lines.push('')

    for (const [sectionName, files] of [...sectionMap.entries()].sort(([left], [right]) => left.localeCompare(right))) {
      lines.push(`#### ${sectionName}`)
      lines.push('')
      for (const relativePath of files) {
        lines.push(`- \`src/features/${featureName}/${relativePath}\``)
      }
      lines.push('')
    }
  }

  return `${lines.join('\n').trim()}\n`
}

function buildLayerEdgeRows(layerEdges) {
  return [...layerEdges.entries()]
    .map(([edge, count]) => {
      const [from, to] = edge.split('->')
      return { from, to, count }
    })
    .sort((left, right) => {
      const fromDiff = layerOrder.indexOf(left.from) - layerOrder.indexOf(right.from)
      if (fromDiff !== 0) {
        return fromDiff
      }
      return layerOrder.indexOf(left.to) - layerOrder.indexOf(right.to)
    })
}

function renderDependencyGraph() {
  const { layerEdges, crossFeatureEdges } = collectDependencyData()
  const layerRows = buildLayerEdgeRows(layerEdges)
  const crossFeatureRows = [...crossFeatureEdges.entries()]
    .map(([edge, count]) => {
      const [from, to] = edge.split('->')
      return { from, to, count }
    })
    .sort((left, right) => {
      if (left.from !== right.from) {
        return left.from.localeCompare(right.from)
      }
      return left.to.localeCompare(right.to)
    })

  const lines = [
    '# Frontend Dependency Graph',
    '',
    '> 自动生成文件。请勿手改；执行 `npm run docs:generate` 更新。',
    '',
    '## 顶层层级依赖',
    '',
    '```mermaid',
    'flowchart LR',
  ]

  const activeLayers = new Set(layerRows.flatMap(({ from, to }) => [from, to]))
  for (const layer of layerOrder) {
    if (activeLayers.has(layer)) {
      lines.push(`  ${layer}["${escapeMermaidLabel(layer)}"]`)
    }
  }
  for (const row of layerRows) {
    lines.push(`  ${row.from} -->|${row.count}| ${row.to}`)
  }
  lines.push('```')
  lines.push('')
  lines.push('| From | To | Imports |')
  lines.push('|------|----|---------|')
  for (const row of layerRows) {
    lines.push(`| \`${row.from}\` | \`${row.to}\` | ${row.count} |`)
  }
  lines.push('')
  lines.push('## Cross-feature 直接依赖')
  lines.push('')

  if (crossFeatureRows.length === 0) {
    lines.push('当前未发现 feature 对其他 feature 的直接源码依赖。')
  } else {
    lines.push('| From Feature | To Feature | Imports |')
    lines.push('|--------------|------------|---------|')
    for (const row of crossFeatureRows) {
      lines.push(`| \`${row.from}\` | \`${row.to}\` | ${row.count} |`)
    }
  }

  lines.push('')
  lines.push('## 边界监控')
  lines.push('')

  const sharedToFeature = layerRows
    .filter((row) => sharedLayers.has(row.from) && row.to === 'features')
    .reduce((sum, row) => sum + row.count, 0)
  const sharedToApp = layerRows
    .filter((row) => sharedLayers.has(row.from) && row.to === 'app')
    .reduce((sum, row) => sum + row.count, 0)
  const sessionToFeature = layerRows
    .filter((row) => row.from === 'session' && row.to === 'features')
    .reduce((sum, row) => sum + row.count, 0)
  const sessionToApp = layerRows
    .filter((row) => row.from === 'session' && row.to === 'app')
    .reduce((sum, row) => sum + row.count, 0)
  const crossFeatureTotal = crossFeatureRows.reduce((sum, row) => sum + row.count, 0)

  lines.push(`- \`feature -> app\`：${layerRows.filter((row) => row.from === 'features' && row.to === 'app').reduce((sum, row) => sum + row.count, 0)}`)
  lines.push(`- \`cross-feature\`：${crossFeatureTotal}`)
  lines.push(`- \`shared -> feature\`：${sharedToFeature}`)
  lines.push(`- \`shared -> app\`：${sharedToApp}`)
  lines.push(`- \`session -> feature\`：${sessionToFeature}`)
  lines.push(`- \`session -> app\`：${sessionToApp}`)
  lines.push('')

  return `${lines.join('\n').trim()}\n`
}

function writeOrCheckFile(targetPath, nextContent) {
  const currentContent = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, 'utf8') : null

  if (checkMode) {
    if (currentContent !== nextContent) {
      console.error(`文档已漂移: ${path.relative(projectRootDir, targetPath)}`)
      process.exitCode = 1
    }
    return
  }

  fs.mkdirSync(path.dirname(targetPath), { recursive: true })
  fs.writeFileSync(targetPath, nextContent, 'utf8')
  console.log(`updated ${path.relative(projectRootDir, targetPath)}`)
}

writeOrCheckFile(inventoryPath, renderInventory())
writeOrCheckFile(dependencyGraphPath, renderDependencyGraph())
writeOrCheckFile(backendModuleMapPath, renderBackendModuleMap())
writeOrCheckFile(updateLogPath, renderProjectUpdateLog())

if (checkMode && process.exitCode) {
  process.exit(process.exitCode)
}
