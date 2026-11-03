import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

/** STUDY-04: which side a card shows first. Default: the front. */
export type StudySide = 'front' | 'back';

/** STUDY-10: remembered on this phone for the next session. */
export const STUDY_SIDE_KEY = 'study.side';

export function useStudySide() {
  const [side, setState] = useState<StudySide>('front');

  useEffect(() => {
    AsyncStorage.getItem(STUDY_SIDE_KEY)
      .then((saved) => {
        if (saved === 'front' || saved === 'back') setState(saved);
      })
      .catch(() => {}); // unreadable storage: keep the default
  }, []);

  const setSide = useCallback((next: StudySide) => {
    setState(next);
    AsyncStorage.setItem(STUDY_SIDE_KEY, next).catch(() => {});
  }, []);

  return [side, setSide] as const;
}
