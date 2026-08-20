// 默认头像资源
import avatar01 from '@/assets/avatars/avatar-01.webp'
import avatar02 from '@/assets/avatars/avatar-02.webp'
import avatar05 from '@/assets/avatars/avatar-05.webp'
import avatar06 from '@/assets/avatars/avatar-06.webp'
import avatar07 from '@/assets/avatars/avatar-07.webp'
import avatar08 from '@/assets/avatars/avatar-08.webp'

// 彩色表情头像
import coloremoji1 from '@/assets/avatars/coloremoji/avatar_1.webp'
import coloremoji2 from '@/assets/avatars/coloremoji/avatar_2.webp'
import coloremoji3 from '@/assets/avatars/coloremoji/avatar_3.webp'
import coloremoji4 from '@/assets/avatars/coloremoji/avatar_4.webp'
import coloremoji5 from '@/assets/avatars/coloremoji/avatar_5.webp'
import coloremoji6 from '@/assets/avatars/coloremoji/avatar_6.webp'
import coloremoji7 from '@/assets/avatars/coloremoji/avatar_7.webp'
import coloremoji8 from '@/assets/avatars/coloremoji/avatar_8.webp'
import coloremoji9 from '@/assets/avatars/coloremoji/avatar_9.webp'
import coloremoji10 from '@/assets/avatars/coloremoji/avatar_10.webp'
import coloremoji11 from '@/assets/avatars/coloremoji/avatar_11.webp'
import coloremoji12 from '@/assets/avatars/coloremoji/avatar_12.webp'
import coloremoji13 from '@/assets/avatars/coloremoji/avatar_13.webp'
import coloremoji14 from '@/assets/avatars/coloremoji/avatar_14.webp'
import coloremoji15 from '@/assets/avatars/coloremoji/avatar_15.webp'

// 彩色动物头像
import coloranimals1 from '@/assets/avatars/coloranimals/avatar_1.webp'
import coloranimals2 from '@/assets/avatars/coloranimals/avatar_2.webp'
import coloranimals3 from '@/assets/avatars/coloranimals/avatar_3.webp'
import coloranimals4 from '@/assets/avatars/coloranimals/avatar_4.webp'
import coloranimals5 from '@/assets/avatars/coloranimals/avatar_5.webp'
import coloranimals6 from '@/assets/avatars/coloranimals/avatar_6.webp'
import coloranimals7 from '@/assets/avatars/coloranimals/avatar_7.webp'
import coloranimals8 from '@/assets/avatars/coloranimals/avatar_8.webp'
import coloranimals9 from '@/assets/avatars/coloranimals/avatar_9.webp'

// 表情头像
import emoji1 from '@/assets/avatars/emoji/avatar_1.webp'
import emoji2 from '@/assets/avatars/emoji/avatar_2.webp'
import emoji3 from '@/assets/avatars/emoji/avatar_3.webp'
import emoji4 from '@/assets/avatars/emoji/avatar_4.webp'
import emoji5 from '@/assets/avatars/emoji/avatar_5.webp'
import emoji6 from '@/assets/avatars/emoji/avatar_6.webp'
import emoji7 from '@/assets/avatars/emoji/avatar_7.webp'
import emoji8 from '@/assets/avatars/emoji/avatar_8.webp'
import emoji9 from '@/assets/avatars/emoji/avatar_9.webp'
import emoji10 from '@/assets/avatars/emoji/avatar_10.webp'

// 动物头像
import animals1 from '@/assets/avatars/animals/avatar_1.webp'
import animals2 from '@/assets/avatars/animals/avatar_2.webp'
import animals3 from '@/assets/avatars/animals/avatar_3.webp'
import animals4 from '@/assets/avatars/animals/avatar_4.webp'
import animals5 from '@/assets/avatars/animals/avatar_5.webp'
import animals6 from '@/assets/avatars/animals/avatar_6.webp'
import animals7 from '@/assets/avatars/animals/avatar_7.webp'
import animals8 from '@/assets/avatars/animals/avatar_8.webp'
import animals9 from '@/assets/avatars/animals/avatar_9.webp'
import animals10 from '@/assets/avatars/animals/avatar_10.webp'
import animals11 from '@/assets/avatars/animals/avatar_11.webp'
import animals12 from '@/assets/avatars/animals/avatar_12.webp'
import animals13 from '@/assets/avatars/animals/avatar_13.webp'
import animals14 from '@/assets/avatars/animals/avatar_14.webp'
import animals15 from '@/assets/avatars/animals/avatar_15.webp'
import animals16 from '@/assets/avatars/animals/avatar_16.webp'
import animals17 from '@/assets/avatars/animals/avatar_17.webp'
import animals18 from '@/assets/avatars/animals/avatar_18.webp'
import animals19 from '@/assets/avatars/animals/avatar_19.webp'
import animals20 from '@/assets/avatars/animals/avatar_20.webp'

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

// 头像分类配置
export const AVATAR_CATEGORIES: AvatarCategory[] = [
  {
    id: 'original',
    name: '默认',
    avatars: [
      { key: 'avatar-01', label: '头像 01', src: avatar01 },
      { key: 'avatar-02', label: '头像 02', src: avatar02 },
    ],
  },
  {
    id: 'coloremoji',
    name: '心情',
    avatars: [
      { key: 'coloremoji-1', label: '彩色表情 1', src: coloremoji1 },
      { key: 'coloremoji-2', label: '彩色表情 2', src: coloremoji2 },
      { key: 'coloremoji-3', label: '彩色表情 3', src: coloremoji3 },
      { key: 'coloremoji-4', label: '彩色表情 4', src: coloremoji4 },
      { key: 'coloremoji-5', label: '彩色表情 5', src: coloremoji5 },
      { key: 'coloremoji-6', label: '彩色表情 6', src: coloremoji6 },
      { key: 'coloremoji-7', label: '彩色表情 7', src: coloremoji7 },
      { key: 'coloremoji-8', label: '彩色表情 8', src: coloremoji8 },
      { key: 'coloremoji-9', label: '彩色表情 9', src: coloremoji9 },
      { key: 'coloremoji-10', label: '彩色表情 10', src: coloremoji10 },
      { key: 'coloremoji-11', label: '彩色表情 11', src: coloremoji11 },
      { key: 'coloremoji-12', label: '彩色表情 12', src: coloremoji12 },
      { key: 'coloremoji-13', label: '彩色表情 13', src: coloremoji13 },
      { key: 'coloremoji-14', label: '彩色表情 14', src: coloremoji14 },
      { key: 'coloremoji-15', label: '彩色表情 15', src: coloremoji15 },
    ],
  },
  {
    id: 'coloranimals',
    name: '萌宠',
    avatars: [
      { key: 'coloranimals-1', label: '彩色动物 1', src: coloranimals1 },
      { key: 'coloranimals-2', label: '彩色动物 2', src: coloranimals2 },
      { key: 'coloranimals-3', label: '彩色动物 3', src: coloranimals3 },
      { key: 'coloranimals-4', label: '彩色动物 4', src: coloranimals4 },
      { key: 'coloranimals-5', label: '彩色动物 5', src: coloranimals5 },
      { key: 'coloranimals-6', label: '彩色动物 6', src: coloranimals6 },
      { key: 'coloranimals-7', label: '彩色动物 7', src: coloranimals7 },
      { key: 'coloranimals-8', label: '彩色动物 8', src: coloranimals8 },
      { key: 'coloranimals-9', label: '彩色动物 9', src: coloranimals9 },
      { key: 'avatar-05', label: '头像 05', src: avatar05 },
      { key: 'avatar-06', label: '头像 06', src: avatar06 },
      { key: 'avatar-07', label: '头像 07', src: avatar07 },
      { key: 'avatar-08', label: '头像 08', src: avatar08 },
    ],
  },
  {
    id: 'emoji',
    name: '简笔',
    avatars: [
      { key: 'emoji-1', label: '表情 1', src: emoji1 },
      { key: 'emoji-2', label: '表情 2', src: emoji2 },
      { key: 'emoji-3', label: '表情 3', src: emoji3 },
      { key: 'emoji-4', label: '表情 4', src: emoji4 },
      { key: 'emoji-5', label: '表情 5', src: emoji5 },
      { key: 'emoji-6', label: '表情 6', src: emoji6 },
      { key: 'emoji-7', label: '表情 7', src: emoji7 },
      { key: 'emoji-8', label: '表情 8', src: emoji8 },
      { key: 'emoji-9', label: '表情 9', src: emoji9 },
      { key: 'emoji-10', label: '表情 10', src: emoji10 },
    ],
  },
  {
    id: 'animals',
    name: '森林',
    avatars: [
      { key: 'animals-1', label: '动物 1', src: animals1 },
      { key: 'animals-2', label: '动物 2', src: animals2 },
      { key: 'animals-3', label: '动物 3', src: animals3 },
      { key: 'animals-4', label: '动物 4', src: animals4 },
      { key: 'animals-5', label: '动物 5', src: animals5 },
      { key: 'animals-6', label: '动物 6', src: animals6 },
      { key: 'animals-7', label: '动物 7', src: animals7 },
      { key: 'animals-8', label: '动物 8', src: animals8 },
      { key: 'animals-9', label: '动物 9', src: animals9 },
      { key: 'animals-10', label: '动物 10', src: animals10 },
      { key: 'animals-11', label: '动物 11', src: animals11 },
      { key: 'animals-12', label: '动物 12', src: animals12 },
      { key: 'animals-13', label: '动物 13', src: animals13 },
      { key: 'animals-14', label: '动物 14', src: animals14 },
      { key: 'animals-15', label: '动物 15', src: animals15 },
      { key: 'animals-16', label: '动物 16', src: animals16 },
      { key: 'animals-17', label: '动物 17', src: animals17 },
      { key: 'animals-18', label: '动物 18', src: animals18 },
      { key: 'animals-19', label: '动物 19', src: animals19 },
      { key: 'animals-20', label: '动物 20', src: animals20 },
    ],
  },
]

// 所有头像的扁平列表（用于快速查找）
const ALL_AVATARS = AVATAR_CATEGORIES.flatMap(category => category.avatars)

// 头像 key 到 src 的映射
const avatarSrcMap = ALL_AVATARS.reduce(
  (acc, avatar) => {
    acc[avatar.key] = avatar.src
    return acc
  },
  {} as Record<string, string>,
)

// 所有有效的头像 key
const VALID_AVATAR_KEYS = ALL_AVATARS.map(a => a.key)

const isValidAvatarKey = (value: string | null | undefined): value is string =>
  typeof value === 'string' && VALID_AVATAR_KEYS.includes(value)

export const getDefaultAvatarSrc = (avatarKey: string | null | undefined): string | null => {
  if (!isValidAvatarKey(avatarKey)) {
    return null
  }
  return avatarSrcMap[avatarKey] || null
}
