import { useQuery } from '@tanstack/react-query';
import { practiceApi } from '../../api/practice';

export const practiceKeys = {
  all: ['practice'] as const,
  today: ['practice', 'today'] as const,
  session: (id: string) => ['practice', 'session', id] as const,
  history: (trackId: string) => ['practice', 'history', trackId] as const,
  tracks: ['practice', 'tracks'] as const,
  options: ['practice', 'options'] as const,
};

export const useToday = () => useQuery({ queryKey: practiceKeys.today, queryFn: practiceApi.today });

export const useSession = (id: string) =>
  useQuery({ queryKey: practiceKeys.session(id), queryFn: () => practiceApi.session(id) });

export const useHistory = (trackId: string) =>
  useQuery({ queryKey: practiceKeys.history(trackId), queryFn: () => practiceApi.history(trackId) });

export const useTracks = () => useQuery({ queryKey: practiceKeys.tracks, queryFn: practiceApi.tracks });

export const useTrackOptions = () =>
  useQuery({ queryKey: practiceKeys.options, queryFn: practiceApi.trackOptions });

/** "2026-11-07" → "Sat, Nov 7" in the phone's language. A plain day: no timezone shift. */
export function formatDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}
