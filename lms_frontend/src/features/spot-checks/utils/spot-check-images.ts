/** 与后端 image_utils 对齐的贴图校验 */
export const MAX_SPOT_CHECK_IMAGES = 5;
export const MAX_SPOT_CHECK_IMAGE_BYTES = 1_500_000;
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

/**
 * 将粘贴/选择的图片转为 data URL。
 * 返回 { urls, error? }：urls 为通过校验并入列的图；error 为首个阻断提示。
 */
export async function appendPasteImages(
  files: File[],
  current: string[],
): Promise<{ urls: string[]; error?: string }> {
  const next = [...current];
  let error: string | undefined;

  for (const file of files) {
    const mime = file.type === 'image/jpg' ? 'image/jpeg' : file.type;
    if (!ALLOWED_TYPES.has(mime)) {
      error = error ?? '仅支持 png/jpeg/webp 贴图';
      continue;
    }
    if (file.size > MAX_SPOT_CHECK_IMAGE_BYTES) {
      error = error ?? '单张贴图不能超过 1.5MB';
      continue;
    }
    if (next.length >= MAX_SPOT_CHECK_IMAGES) {
      error = error ?? `贴图最多 ${MAX_SPOT_CHECK_IMAGES} 张`;
      break;
    }
    next.push(await readFileAsDataUrl(file));
  }

  return { urls: next, error };
}
