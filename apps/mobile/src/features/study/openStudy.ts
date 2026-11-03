import { router } from 'expo-router';
import type { CardFilter } from '../../api/types';

/** STUDY-07: opens Study for exactly what the list shows (STUDY-01). */
export function openStudy(filter: CardFilter) {
  const params: Record<string, string> = {};
  if (filter.search) params.q = filter.search;
  if (filter.tagIds?.length) params.tag = filter.tagIds.join(',');
  router.push({ pathname: '/study', params });
}
