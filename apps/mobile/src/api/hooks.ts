import { useEffect, useEffectEvent, useState } from 'react';
import { useNavigation } from 'expo-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { cardsApi } from './cards';
import { tagsApi } from './tags';
import { trashApi } from './trash';
import type { CardFilter } from './types';

export const keys = {
  cards: ['cards'] as const,
  cardList: (filter: CardFilter) => ['cards', 'list', filter] as const,
  card: (id: string) => ['cards', 'one', id] as const,
  // Under 'cards' so any card change (e.g. move to trash) also refreshes the Trash tab.
  trash: ['cards', 'trash'] as const,
  tags: ['tags'] as const,
  cardTags: (cardId: string) => ['tags', 'ofCard', cardId] as const,
  tagPicker: (tagId: string, search: string) =>
    ['cards', 'toAddToTag', tagId, search] as const,
};

/** READ-02: "load more" pages of Active cards for the current filter. */
export function useCardList(filter: CardFilter, enabled = true) {
  return useInfiniteQuery({
    enabled,
    queryKey: keys.cardList(filter),
    queryFn: ({ pageParam }) => cardsApi.list(filter, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

/** TRASH-12: "load more" pages of trashed cards, most recently trashed first. */
export function useTrash() {
  return useInfiniteQuery({
    queryKey: keys.trash,
    queryFn: ({ pageParam }) => trashApi.list(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

/** UI-02: all of the user's tags, loaded once, filtered on the phone. */
export function useTags() {
  return useQuery({ queryKey: keys.tags, queryFn: tagsApi.list });
}

/** UI-14: one card's tags with their Active counts. */
export function useCardTags(cardId: string) {
  return useQuery({
    queryKey: keys.cardTags(cardId),
    queryFn: () => cardsApi.tagsOf(cardId),
  });
}

/** CARDTAG-08: cards that can be added to the tag, newest first, 20 at a time. */
export function useTagPicker(tagId: string, search: string) {
  return useInfiniteQuery({
    queryKey: keys.tagPicker(tagId, search),
    queryFn: ({ pageParam }) => tagsApi.cardsToAdd(tagId, search, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
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
