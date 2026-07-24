/**
 * 默认头像注册表：扫描 assets/avatars，按分类元数据生成选项与 src 映射。
 * 新增头像只需往对应目录丢文件，无需改本文件。
 */

interface AvatarOption {
  key: string
  label: string
  src: string
}

interface AvatarCategory {
  id: string
  name: string
  avatars: AvatarOption[]
}

interface CategoryMeta {
  id: string
  name: string
  /** 相对 avatars 根的子目录；空字符串表示根目录 */
  dir: string
  labelPrefix: string
}

/** 五个分类的展示元数据；文件归属由 dir 决定 */
const CATEGORY_META: CategoryMeta[] = [
  { id: 'original', name: '默认', dir: '', labelPrefix: '头像' },
  { id: 'coloremoji', name: '心情', dir: 'coloremoji', labelPrefix: '彩色表情' },
  { id: 'coloranimals', name: '萌宠', dir: 'coloranimals', labelPrefix: '彩色动物' },
  { id: 'emoji', name: '简笔', dir: 'emoji', labelPrefix: '表情' },
  { id: 'animals', name: '森林', dir: 'animals', labelPrefix: '动物' },
]

const avatarModules = import.meta.glob('../../assets/avatars/**/*.webp', {
  eager: true,
  import: 'default',
}) as Record<string, string>

/**
 * 判断 glob 路径是否属于某分类目录。
 */
const isInCategoryDir = (path: string, dir: string): boolean => {
  if (dir === '') {
    return /\/avatars\/[^/]+\.webp$/.test(path)
  }
  return path.includes(`/avatars/${dir}/`)
}

/**
 * 从文件名解析序号，用于自然排序。
 */
const parseSortIndex = (filename: string): number => {
  const match = filename.match(/(\d+)/)
  return match ? Number(match[1]) : 0
}

/**
 * 由资源路径与分类元数据生成头像选项（保持既有 key 约定）。
 */
const toAvatarOption = (path: string, src: string, meta: CategoryMeta): AvatarOption => {
  const filename = path.slice(path.lastIndexOf('/') + 1, -'.webp'.length)

  if (meta.dir === '') {
    const num = filename.replace(/^avatar-/, '')
    return { key: filename, label: `${meta.labelPrefix} ${num}`, src }
  }

  const num = filename.replace(/^avatar_/, '')
  return { key: `${meta.id}-${num}`, label: `${meta.labelPrefix} ${num}`, src }
}

export const AVATAR_CATEGORIES: AvatarCategory[] = CATEGORY_META.map(meta => {
  const avatars = Object.entries(avatarModules)
    .filter(([path]) => isInCategoryDir(path, meta.dir))
    .map(([path, src]) => toAvatarOption(path, src, meta))
    .sort((a, b) => parseSortIndex(a.key) - parseSortIndex(b.key))

  return { id: meta.id, name: meta.name, avatars }
})

const avatarSrcMap: Record<string, string> = Object.fromEntries(
  AVATAR_CATEGORIES.flatMap(category => category.avatars.map(a => [a.key, a.src])),
)

const isValidAvatarKey = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value in avatarSrcMap

/**
 * 根据头像 key 解析默认头像 URL；无效 key 返回 null。
 */
export const getDefaultAvatarSrc = (avatarKey: string | null | undefined): string | null => {
  if (!isValidAvatarKey(avatarKey)) {
    return null
  }
  return avatarSrcMap[avatarKey]
}
