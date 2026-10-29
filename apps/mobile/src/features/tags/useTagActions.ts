import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../../api/client';
import { errorMessageKey, isStale } from '../../api/errors';
import { keys } from '../../api/hooks';
import { tagsApi } from '../../api/tags';
import type { MergePreview, Tag, TagWithCount } from '../../api/types';
import { useToast } from '../../components/Toast';

/** Asks a yes/no question with a native dialog; resolves true on the action button. */
export function confirm(message: string, action: string, cancel: string, danger = false) {
  return new Promise<boolean>((resolve) =>
    Alert.alert(message, undefined, [
      { text: cancel, style: 'cancel', onPress: () => resolve(false) },
      { text: action, style: danger ? 'destructive' : 'default', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) }),
  );
}

/** TAG-08 / TAG-15: the question the merge preview asks. */
export function mergeQuestion(
  t: (key: string, options?: Record<string, unknown>) => string,
  from: string,
  to: string,
  preview: MergePreview,
) {
  return preview.into
    ? t('tags.merge.confirm', { ...preview, into: preview.into, from })
    : t('tags.merge.renameConfirm', { from, to }); // C-38: nobody holds the name any more
}

/**
 * Rename (TAG-11, TAG-14, TAG-15) and delete (TAG-06, UI-03) from the Tag list. Both send
 * the version the screen showed (TAG-16); a stale screen reloads (CONFLICT-01).
 */
export function useTagActions() {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();

  const reload = useCallback(
    () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: keys.tags }), // UI-02: names changed
        queryClient.invalidateQueries({ queryKey: keys.cards }), // cards show tag names
      ]),
    [queryClient],
  );

  const showError = useCallback(
    (error: unknown) => {
      toast({ message: t(errorMessageKey(error)) });
      const gone = error instanceof ApiError && error.code === 'TagNotFound';
      if (isStale(error) || gone) void reload();
    },
    [toast, t, reload],
  );

  /**
   * Resolves true when renamed (or merged), false when the user said no to the merge.
   * Throws the API error otherwise, so the dialog can show input errors next to the field.
   */
  const rename = useCallback(
    (tag: Tag, name: string): Promise<boolean> => {
      const attempt = async (confirmMerge: boolean): Promise<boolean> => {
        try {
          await tagsApi.rename(tag, name, confirmMerge);
        } catch (error) {
          if (!(error instanceof ApiError) || error.code !== 'TagMergeNeedsConfirmation') {
            throw error;
          }
          // TAG-15: never merge silently; show the preview and send again if confirmed.
          // The preview may be a fresh one (C-38): then the question is asked again.
          const preview = error.body as unknown as MergePreview;
          const yes = await confirm(
            mergeQuestion(t, tag.name, name, preview),
            preview.into ? t('tags.merge.action') : t('tags.merge.renameAction'),
            t('common.cancel'),
          );
          if (!yes) return false;
          return attempt(preview.into !== null);
        }
        await reload();
        return true;
      };
      return attempt(false);
    },
    [t, reload],
  );

  /** UI-03: "Animals is on 312 cards. Delete?" TAG-16: if the tag changed, ask again. */
  const askDelete = useCallback(
    (first: TagWithCount): Promise<void> => {
      const ask = async (tag: TagWithCount): Promise<void> => {
        const yes = await confirm(
          t('tags.delete.confirm', { name: tag.name, count: tag.cardCount }),
          t('tags.delete.action'),
          t('common.cancel'),
          true,
        );
        if (!yes) return;
        try {
          await tagsApi.delete(tag);
          await reload();
        } catch (error) {
          if (!(error instanceof ApiError) || error.code !== 'TagChanged') {
            showError(error);
            return;
          }
          toast({ message: t(errorMessageKey(error)) });
          void reload();
          const tags = await queryClient.fetchQuery({
            queryKey: keys.tags,
            queryFn: tagsApi.list,
            staleTime: 0,
          });
          const fresh = tags.find((x) => x.id === tag.id);
          if (fresh) await ask(fresh); // the new count
        }
      };
      return ask(first);
    },
    [t, toast, reload, showError, queryClient],
  );

  return { rename, askDelete, showError, reload };
}
