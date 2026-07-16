import { useQuery } from '@tanstack/react-query';

import { useCurrentRole } from '@/hooks/use-current-role';
import { queryKeys } from '@/lib/query-keys';
import { getSpotChecks } from '@/features/spot-checks/api/get-spot-checks';
import type { SpotCheck } from '@/features/spot-checks/types/spot-check';

export const getSpotCheckBatchPeers = async (batchId: string) => {
  const pageSize = 100;
  let page = 1;
  const all: SpotCheck[] = [];

  while (true) {
    const response = await getSpotChecks({ page, pageSize, batchId });
    all.push(...response.results);
    if (page >= response.total_pages || response.results.length === 0) break;
    page += 1;
  }

  return all;
};

export const useSpotCheckBatchPeers = (batchId: string | null | undefined) => {
  const currentRole = useCurrentRole();

  return useQuery({
    queryKey: queryKeys.spotChecks.batchPeers({ currentRole, batchId: batchId ?? '' }),
    queryFn: () => getSpotCheckBatchPeers(batchId!),
    enabled: currentRole !== null && Boolean(batchId),
  });
};
