import { useEffect, useEffectEvent, useState } from 'react';
import { useNavigation } from 'expo-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { cardsApi, tagsApi } from './cards';
import type { CardFilter } from './types';

export const keys = {
  cards: ['cards'] as const,
  cardList: (filter: CardFilter) => ['cards', 'list', filter] as const,
  card: (id: string) => ['cards', 'one', id] as const,
  tags: ['tags'] as const,
};

/** READ-02: "load more" pages of Active cards for the current filter. */
export function useCardList(filter: CardFilter) {
  return useInfiniteQuery({
    queryKey: keys.cardList(filter),
    queryFn: ({ pageParam }) => cardsApi.list(filter, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

/** UI-02: all of the user's tags, loaded once, filtered on the phone. */
export function useTags() {
  return useQuery({ queryKey: keys.tags, queryFn: tagsApi.list });
}

/** A screen reloads when you return to it after leaving (not on its first show). */
export function useRefetchOnFocus(refetch: () => unknown) {
  const navigation = useNavigation();
  const onReturn = useEffectEvent(() => void refetch());
  useEffect(() => {
    let wasAway = false;
    const offBlur = navigation.addListener('blur', () => {
      wasAway = true;
    });
    const offFocus = navigation.addListener('focus', () => {
      if (!wasAway) return;
      wasAway = false;
      onReturn();
    });
    return () => {
      offBlur();
      offFocus();
    };
  }, [navigation]);
}

/** Waits until typing pauses before searching. */
export function useDebounced<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}
