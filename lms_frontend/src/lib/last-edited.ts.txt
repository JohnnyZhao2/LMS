export const getLastEditedByName = (
  updatedByName?: string | null,
  createdByName?: string | null,
  fallback = '系统',
) => updatedByName || createdByName || fallback;
