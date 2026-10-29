import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { errorMessageKey } from '../../api/errors';
import { keys } from '../../api/hooks';
import { tagsApi } from '../../api/tags';
import type { CardVersion, Tag, TagCards } from '../../api/types';
import { useToast } from '../../components/Toast';

type Change = { tag: Tag; cards: CardVersion[] };

/**
 * CARDTAG-07 remove and CARDTAG-08 add, all or nothing (ADR-011). The tag's version goes in
 * If-Match (TAG-16), each card's version in the body (CARD-08). Every outcome reloads, so a
 * stale screen (CONFLICT-01) only needs the message.
 *
 * Both show a toast with Undo. Undo sends the opposite action with the versions just
 * returned. It is a plain call, not a mutation of this hook: the picker that added the cards
 * has closed by the time Undo is tapped. An Undo's own toast has no Undo.
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

  const showError = (error: unknown) => toast({ message: t(errorMessageKey(error)) });

  /** Undo with the versions the action returned. */
  const undo = async (
    tag: Tag,
    result: TagCards,
    send: typeof tagsApi.addCards,
    doneKey: string,
  ) => {
    try {
      await send({ ...tag, version: result.tag.version }, result.cards);
      toast({ message: t(doneKey, { name: tag.name }) });
    } catch (error) {
      showError(error);
    } finally {
      await reload();
    }
  };

  const add = useMutation({
    mutationFn: ({ tag, cards }: Change) => tagsApi.addCards(tag, cards),
    // CARDTAG-08: "Added to #Dog · Undo"; Undo removes those cards again (C-55).
    onSuccess: (result, { tag }) => {
      toast({
        message: t('tags.cards.added', { name: tag.name }),
        action: {
          label: t('common.undo'),
          onPress: () => void undo(tag, result, tagsApi.removeCards, 'tags.cards.undoneAdd'),
        },
      });
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
    // CARDTAG-07: "Removed from #Dog · Undo"; Undo puts them back: "Put back in #Dog".
    onSuccess: (result, { tag }) =>
      toast({
        message: t('tags.cards.removed', { name: tag.name }),
        action: {
          label: t('common.undo'),
          onPress: () => void undo(tag, result, tagsApi.addCards, 'tags.cards.putBack'),
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
