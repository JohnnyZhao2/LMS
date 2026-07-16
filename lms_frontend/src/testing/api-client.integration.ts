import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { apiClient } from '@/lib/api-client';

describe('apiClient', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('unwraps and validates a successful API envelope', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: 'SUCCESS',
      message: 'ok',
      data: { id: 7 },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })));

    const result = await apiClient.get('/testing/', {
      skipAuth: true,
      schema: z.object({ id: z.number().int() }),
    });

    expect(result).toEqual({ id: 7 });
  });

  it('rejects malformed response envelopes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      value: { id: 7 },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })));

    await expect(apiClient.get('/testing/', { skipAuth: true })).rejects.toBeInstanceOf(z.ZodError);
  });
});
