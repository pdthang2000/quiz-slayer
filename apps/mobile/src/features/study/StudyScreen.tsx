import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cardsApi } from '../../api/cards';
import { errorMessageKey } from '../../api/errors';
import type { Card, CardFilter } from '../../api/types';
import { spacing, useTheme } from '../../theme';
import {
  again,
  idsToFetch,
  isDone,
  next,
  prev,
  shuffleUnseen,
  skipMissing,
  startSession,
  type StudySession,
  swipeMove,
} from './session';
import { useStudySide } from './useStudySide';

type Props = {
  /** STUDY-01: the filter of the list Study was pressed on. */
  filter: CardFilter;
  onClose: () => void;
};

/**
 * STUDY-01..STUDY-12. The ids are loaded once when the screen opens (the session's
 * snapshot, STUDY-02); content is fetched 20 at a time, ahead of need. Nothing is stored
 * (STUDY-05); leaving closes the session (STUDY-11).
 */
export function StudyScreen({ filter, onClose }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [side, setSide] = useStudySide();

  const [session, setSession] = useState<StudySession | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [batchError, setBatchError] = useState<unknown>(null);
  const [cards, setCards] = useState<ReadonlyMap<string, Card>>(new Map());
  const [flipped, setFlipped] = useState(false);
  const fetched = useRef(new Set<string>());
  const inFlight = useRef(false);

  // The filter is fixed for the life of the screen: the ids are the session's snapshot (STUDY-02).
  const [initialFilter] = useState(filter);
  const fetchIds = useCallback(
    () =>
      cardsApi
        .studyIds(initialFilter)
        .then(({ ids }) => setSession(startSession(ids)))
        .catch(setLoadError),
    [initialFilter],
  );
  useEffect(() => {
    void fetchIds();
  }, [fetchIds]);
  const retryIds = () => {
    setLoadError(null);
    void fetchIds();
  };

  // Fetch the next batch of content when the position gets close to the unfetched part.
  useEffect(() => {
    if (!session || inFlight.current || batchError) return;
    const ids = idsToFetch(session, fetched.current);
    if (ids.length === 0) return;
    inFlight.current = true;
    cardsApi
      .byIds(ids)
      .then((found) => {
        ids.forEach((id) => fetched.current.add(id));
        const foundIds = new Set(found.map((c) => c.id));
        setCards((old) => {
          const map = new Map(old);
          found.forEach((c) => map.set(c.id, c));
          return map;
        });
        // STUDY-02, STUDY-12: trashed or deleted meanwhile → skipped.
        const missing = new Set(ids.filter((id) => !foundIds.has(id)));
        setSession((s) => (s ? skipMissing(s, missing) : s));
      })
      .catch(setBatchError)
      .finally(() => {
        inFlight.current = false;
      });
  }, [session, batchError]);

  const move = useCallback((change: (s: StudySession) => StudySession) => {
    setFlipped(false);
    setSession((s) => (s ? change(s) : s));
  }, []);

  // STUDY-08: swipe left = next, swipe right = previous. Taps go to the card (flip).
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderRelease: (_, g) => {
          const change = swipeMove(g.dx);
          if (change) move(change);
        },
      }),
    [move],
  );

  const header = (content: React.ReactNode) => (
    <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
      {content}
      <Pressable
        onPress={onClose}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={t('study.close')}
        testID="study-close"
      >
        <Text style={[styles.close, { color: colors.textMuted }]}>✕</Text>
      </Pressable>
    </View>
  );

  const screen = (children: React.ReactNode) => (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>{children}</View>
  );

  if (loadError) {
    return screen(
      <>
        {header(<View style={styles.flex} />)}
        <View style={styles.center}>
          <Text style={{ color: colors.textMuted }}>{t(errorMessageKey(loadError))}</Text>
          <Pressable onPress={retryIds} accessibilityRole="button">
            <Text style={[styles.link, { color: colors.primary }]}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      </>,
    );
  }

  if (!session) {
    return screen(
      <>
        {header(<View style={styles.flex} />)}
        <ActivityIndicator style={styles.center} color={colors.textMuted} />
      </>,
    );
  }

  const total = session.order.length;

  // STUDY-11: after the last card.
  if (isDone(session)) {
    const restart = (shuffle: boolean) => {
      setFlipped(false);
      setSession(again(session.order, shuffle));
    };
    return screen(
      <>
        {header(<View style={styles.flex} />)}
        <View style={styles.center} testID="study-done">
          <Text style={[styles.doneTitle, { color: colors.text }]}>
            {total === 0 ? t('study.nothing') : t('study.done', { count: total })}
          </Text>
          {total > 0 ? (
            <>
              <Pressable onPress={() => restart(false)} accessibilityRole="button" testID="study-again">
                <Text style={[styles.link, { color: colors.primary }]}>{t('study.again')}</Text>
              </Pressable>
              <Pressable
                onPress={() => restart(true)}
                accessibilityRole="button"
                testID="study-shuffle-again"
              >
                <Text style={[styles.link, { color: colors.primary }]}>
                  {t('study.shuffleAgain')}
                </Text>
              </Pressable>
            </>
          ) : null}
          <Pressable onPress={onClose} accessibilityRole="button" testID="study-done-close">
            <Text style={[styles.link, { color: colors.primary }]}>{t('study.close')}</Text>
          </Pressable>
        </View>
      </>,
    );
  }

  const card = cards.get(session.order[session.position]);
  // STUDY-04: the chosen side first; a tap shows the other one.
  const showBack = (side === 'back') !== flipped;

  return screen(
    <>
      {header(
        <>
          <Text style={[styles.progress, { color: colors.text }]} testID="study-progress">
            {t('study.progress', { position: session.position + 1, total })}
          </Text>
          <Pressable
            onPress={() => setSide(side === 'front' ? 'back' : 'front')}
            accessibilityRole="button"
            testID="study-side"
          >
            <Text style={[styles.headerAction, { color: colors.primary }]}>
              {side === 'front' ? t('study.frontFirst') : t('study.backFirst')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => move(shuffleUnseen)}
            accessibilityRole="button"
            testID="study-shuffle"
          >
            <Text style={[styles.headerAction, { color: colors.primary }]}>
              {t('study.shuffle')}
            </Text>
          </Pressable>
        </>,
      )}

      <View style={styles.cardArea} {...pan.panHandlers} testID="study-swipe">
        {card ? (
          <Pressable
            onPress={() => setFlipped((f) => !f)}
            accessibilityRole="button"
            testID="study-card"
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Text style={[styles.cardText, { color: colors.text }]}>
              {showBack ? card.back : card.front}
            </Text>
          </Pressable>
        ) : batchError ? (
          <View style={styles.center}>
            <Text style={{ color: colors.textMuted }}>{t(errorMessageKey(batchError))}</Text>
            <Pressable onPress={() => setBatchError(null)} accessibilityRole="button">
              <Text style={[styles.link, { color: colors.primary }]}>{t('common.retry')}</Text>
            </Pressable>
          </View>
        ) : (
          <ActivityIndicator style={styles.center} color={colors.textMuted} />
        )}
      </View>

      <View style={[styles.nav, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Pressable
          onPress={() => move(prev)}
          disabled={session.position === 0}
          accessibilityRole="button"
          testID="study-prev"
          style={[styles.navButton, { borderColor: colors.border, opacity: session.position === 0 ? 0.4 : 1 }]}
        >
          <Text style={[styles.navText, { color: colors.text }]}>{t('study.prev')}</Text>
        </Pressable>
        <Pressable
          onPress={() => move(next)}
          accessibilityRole="button"
          testID="study-next"
          style={[styles.navButton, { borderColor: colors.border }]}
        >
          <Text style={[styles.navText, { color: colors.text }]}>{t('study.next')}</Text>
        </Pressable>
      </View>
    </>,
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  progress: { flex: 1, fontSize: 17, fontWeight: '600' },
  headerAction: { fontSize: 15, fontWeight: '600' },
  close: { fontSize: 22 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  link: { fontSize: 17, fontWeight: '600' },
  doneTitle: { fontSize: 24, fontWeight: '700' },
  cardArea: { flex: 1, padding: spacing.lg },
  card: {
    flex: 1,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  cardText: { fontSize: 28, textAlign: 'center' },
  nav: { flexDirection: 'row', gap: spacing.lg, paddingHorizontal: spacing.lg },
  navButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  navText: { fontSize: 17, fontWeight: '600' },
});
