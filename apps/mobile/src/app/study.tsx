import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { StudyScreen } from '../features/study/StudyScreen';

/** STUDY-01: opened with the list's filter: ?q=<search>&tag=<id>,<id>. */
export default function StudyRoute() {
  const { q, tag } = useLocalSearchParams<{ q?: string; tag?: string }>();
  const filter = useMemo(
    () => ({ search: q || undefined, tagIds: tag ? tag.split(',') : undefined }),
    [q, tag],
  );
  return <StudyScreen filter={filter} onClose={() => router.back()} />;
}
