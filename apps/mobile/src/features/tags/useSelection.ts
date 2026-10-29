import { useCallback, useState } from 'react';
import { MAX_CARDS_PER_ACTION } from '../../api/tags';

/**
 * Ticked cards for "Remove (n)" / "Add (n)", keyed by id, keeping the version the row
 * showed (CARD-08). CARDTAG-07/08: at most 100 per action; a 101st tick is refused and
 * `toggle` returns false so the screen can say why.
 */
export function useSelection(max = MAX_CARDS_PER_ACTION) {
  const [selected, setSelected] = useState<Map<string, number>>(new Map());

  const toggle = useCallback(
    (card: { id: string; version: number }): boolean => {
      if (!selected.has(card.id) && selected.size >= max) return false;
      setSelected((current) => {
        const next = new Map(current);
        if (next.has(card.id)) next.delete(card.id);
        else next.set(card.id, card.version);
        return next;
      });
      return true;
    },
    [selected, max],
  );

  const clear = useCallback(() => setSelected(new Map()), []);

  return {
    count: selected.size,
    has: (id: string) => selected.has(id),
    cards: () => [...selected].map(([id, version]) => ({ id, version })),
    toggle,
    clear,
  };
}
