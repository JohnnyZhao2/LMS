import avatar01 from '@/assets/avatars/avatar-01.webp'
import avatar02 from '@/assets/avatars/avatar-02.webp'
import avatar03 from '@/assets/avatars/avatar-03.webp'
import avatar04 from '@/assets/avatars/avatar-04.webp'
import avatar05 from '@/assets/avatars/avatar-05.webp'
import avatar06 from '@/assets/avatars/avatar-06.webp'
import avatar07 from '@/assets/avatars/avatar-07.webp'
import avatar08 from '@/assets/avatars/avatar-08.webp'

export const DEFAULT_AVATAR_KEYS = [
  'avatar-01',
  'avatar-02',
  'avatar-03',
  'avatar-04',
  'avatar-05',
  'avatar-06',
  'avatar-07',
  'avatar-08',
] as const

export type DefaultAvatarKey = (typeof DEFAULT_AVATAR_KEYS)[number]

export interface DefaultAvatarOption {
  key: DefaultAvatarKey
  label: string
  src: string
}

export const DEFAULT_AVATAR_OPTIONS: DefaultAvatarOption[] = [
  { key: 'avatar-01', label: '头像 01', src: avatar01 },
  { key: 'avatar-02', label: '头像 02', src: avatar02 },
  { key: 'avatar-03', label: '头像 03', src: avatar03 },
  { key: 'avatar-04', label: '头像 04', src: avatar04 },
  { key: 'avatar-05', label: '头像 05', src: avatar05 },
  { key: 'avatar-06', label: '头像 06', src: avatar06 },
  { key: 'avatar-07', label: '头像 07', src: avatar07 },
  { key: 'avatar-08', label: '头像 08', src: avatar08 },
]

const avatarSrcMap: Record<DefaultAvatarKey, string> = DEFAULT_AVATAR_OPTIONS.reduce(
  (accumulator, option) => {
    accumulator[option.key] = option.src
    return accumulator
  },
  {} as Record<DefaultAvatarKey, string>,
)

export const isDefaultAvatarKey = (value: string | null | undefined): value is DefaultAvatarKey =>
  typeof value === 'string' && DEFAULT_AVATAR_KEYS.includes(value as DefaultAvatarKey)

export const getDefaultAvatarSrc = (avatarKey: string | null | undefined): string | null => {
  if (!isDefaultAvatarKey(avatarKey)) {
    return null
  }
  return avatarSrcMap[avatarKey]
}
