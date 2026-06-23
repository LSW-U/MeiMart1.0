import type { Coordinates } from '@/src/types/common';

import { request } from './api';

export async function reportLocation(coordinates: Coordinates): Promise<void> {
  await request<void>('/location/report', {
    method: 'POST',
    body: JSON.stringify(coordinates),
  });
}
