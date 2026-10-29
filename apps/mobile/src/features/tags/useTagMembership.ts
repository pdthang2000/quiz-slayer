import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { errorMessageKey } from '../../api/errors';
import { keys } from '../../api/hooks';
import { tagsApi } from '../../api/tags';
import type { CardVersion, Tag } from '../../api/types';
import { useToast } from '../../components/Toast';

type Change = { tag: Tag; cards: CardVersion[] };

/**
 * CARDTAG-07 remove and CARDTAG-08 add, all or nothing (ADR-011). The tag's version goes in
 * If-Match (TAG-16), each card's version in the body (CARD-08). A stale screen reloads.
 */
export function useTagMembership(options: { onAdded?: () => void; onDone?: () => void } = {}) {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();

  const reload = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: keys.tags }), // versions and counts
      queryClient.invalidateQueries({ queryKey: keys.cards }),
    ]);

  // Every outcome reloads (onSettled), so a stale screen (CONFLICT-01) only needs the message.
  const showError = (error: unknown) => toast({ message: t(errorMessageKey(error)) });

  const add = useMutation({
    mutationFn: ({ tag, cards }: Change) => tagsApi.addCards(tag, cards),
    onSuccess: (_, { tag }) => {
      toast({ message: t('tags.cards.added', { name: tag.name }) });
      options.onAdded?.();
    },
    onError: showError,
    onSettled: () => {
      options.onDone?.();
      return reload();
    },
  });

  const remove = useMutation({
    mutationFn: ({ tag, cards }: Change) => tagsApi.removeCards(tag, cards),
    // CARDTAG-07: "Removed from #Dog · Undo" puts them back, with the versions just returned.
    onSuccess: (result, { tag }) =>
      toast({
        message: t('tags.cards.removed', { name: tag.name }),
        action: {
          label: t('common.undo'),
          onPress: () =>
            add.mutate({ tag: { ...tag, version: result.tag.version }, cards: result.cards }),
        },
      }),
    onError: showError,
    onSettled: () => {
      options.onDone?.();
      return reload();
    },
  });

  return { add, remove };
}
