import fs from 'node:fs'
import path from 'node:path'

const rootDir = process.cwd()
const srcDir = path.join(rootDir, 'src')
const docDir = path.join(rootDir, 'docs')
const generatedDocDir = path.join(docDir, 'generated')
const inventoryPath = path.join(generatedDocDir, 'component-inventory.md')
const dependencyGraphPath = path.join(generatedDocDir, 'feature-dependency-graph.md')
const checkMode = process.argv.includes('--check')

const sourceExtensions = ['.ts', '.tsx']
const sharedLayers = new Set(['components', 'hooks', 'lib', 'utils', 'config', 'types'])
const layerOrder = ['app', 'features', 'entities', 'session', 'components', 'hooks', 'lib', 'utils', 'config', 'types']

function toPosix(filePath) {
  return filePath.split(path.sep).join('/')
}

function isCodeFile(filePath) {
  return sourceExtensions.some((extension) => filePath.endsWith(extension))
    && !filePath.endsWith('.d.ts')
    && !filePath.includes('.test.')
    && !filePath.includes('.spec.')
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
      console.error(`文档已漂移: ${path.relative(rootDir, targetPath)}`)
      process.exitCode = 1
    }
    return
  }

  fs.mkdirSync(path.dirname(targetPath), { recursive: true })
  fs.writeFileSync(targetPath, nextContent, 'utf8')
  console.log(`updated ${path.relative(rootDir, targetPath)}`)
}

writeOrCheckFile(inventoryPath, renderInventory())
writeOrCheckFile(dependencyGraphPath, renderDependencyGraph())

if (checkMode && process.exitCode) {
  process.exit(process.exitCode)
}
