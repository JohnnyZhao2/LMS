export const FIELD_CHROME_CLASSNAME = [
  "border border-border/70 bg-white",
  "transition-[border-color,box-shadow,background-color,color] duration-200",
  "hover:border-interaction-border",
  "focus:outline-none focus:border-primary-300 focus:shadow-[inset_0_0_0_1px_var(--theme-interaction-outline)]",
].join(" ")

export const FILLED_PLAIN_FIELD_CLASSNAME = [
  "border border-transparent bg-interaction-surface-strong",
  "shadow-none",
  "transition-[background-color,color] duration-200",
  "hover:border-transparent hover:bg-interaction-surface-strong",
  "focus:outline-none focus:border-transparent focus:bg-interaction-surface-strong focus:shadow-none",
].join(" ")

export const QUIET_OUTLINE_FIELD_CLASSNAME = [
  "border border-border/70 bg-white",
  "shadow-none",
  "transition-[border-color,box-shadow,background-color,color] duration-200",
  "hover:border-border/70 hover:bg-white",
  "focus:outline-none focus:border-primary-300 focus:shadow-[inset_0_0_0_1px_var(--theme-interaction-outline)]",
].join(" ")

export const QUIET_OUTLINE_FIELD_WITHIN_CLASSNAME = [
  "border border-border/70 bg-white",
  "shadow-none",
  "transition-[border-color,box-shadow,background-color,color] duration-200",
  "hover:border-border/70 hover:bg-white",
  "focus-within:outline-none focus-within:border-primary-300 focus-within:shadow-[inset_0_0_0_1px_var(--theme-interaction-outline)]",
].join(" ")

export const LIST_ROW_HOVER_CLASSNAME = [
  "transition-colors duration-150",
  "hover:bg-interaction-surface-strong",
  "data-[state=selected]:bg-interaction-surface-strong",
].join(" ")

export const SUBTLE_SURFACE_HOVER_CLASSNAME = [
  "transition-[border-color,background-color,color,box-shadow] duration-150",
  "hover:border-interaction-border",
  "hover:bg-interaction-surface",
].join(" ")

export const MENU_ITEM_HOVER_CLASSNAME = [
  "transition-colors duration-150",
  "data-[highlighted]:bg-interaction-surface-strong",
  "data-[highlighted]:text-foreground",
  "data-[state=open]:bg-interaction-surface-strong",
].join(" ")

export const GHOST_ACCENT_HOVER_CLASSNAME = [
  "transition-colors duration-150",
  "hover:bg-interaction-surface-strong",
  "hover:text-foreground",
].join(" ")
