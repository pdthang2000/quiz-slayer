import { Card } from './card';
import { CardBack, CardFront } from './card-text';
import {
  CardIsNotTrashed,
  CardIsTrashed,
  TagNotOnCard,
  TooManyTags,
} from './errors';
import { CardId, TagId, UserId } from './ids';

const front = (text = 'Dog') => CardFront.create(text);
const back = (text = 'a mammal that barks') => CardBack.create(text);
const CARD = CardId('card-1');
const USER = UserId('user-1');
const NOW = new Date('2026-10-23T10:00:00Z');
const tagIds = (n: number) =>
  Array.from({ length: n }, (_, i) => TagId(`tag-${i}`));

function newCard(tags: TagId[] = []): Card {
  const card = Card.create({
    id: CARD,
    userId: USER,
    front: front(),
    back: back(),
    tagIds: tags,
  });
  card.pullEvents();
  return card;
}

function trashedCard(tags: TagId[] = []): Card {
  const card = newCard(tags);
  card.moveToTrash(NOW);
  card.pullEvents();
  return card;
}

describe('Card', () => {
  describe('create', () => {
    it('CARD-04: a card belongs to one user', () => {
      expect(newCard().userId).toBe('user-1');
    });

    it('creates an Active card with its tags and records CardCreated', () => {
      const card = Card.create({
        id: CARD,
        userId: USER,
        front: front(),
        back: back(),
        tagIds: [TagId('animals'), TagId('pitbull')],
      });
      expect(card.state).toBe('Active');
      expect(card.tagIds).toEqual(['animals', 'pitbull']);
      expect(card.pullEvents()).toEqual([
        {
          type: 'CardCreated',
          cardId: 'card-1',
          userId: 'user-1',
          tagIds: ['animals', 'pitbull'],
        },
      ]);
    });

    it('CARDTAG-03: a card is created with at most 20 tags', () => {
      expect(newCard(tagIds(20)).tagIds).toHaveLength(20);
      expect(() => newCard(tagIds(21))).toThrow(TooManyTags);
    });

    it('CARDTAG-06: the same tag twice is kept once, and the limit is checked after', () => {
      expect(newCard([TagId('animals'), TagId('animals')]).tagIds).toEqual([
        'animals',
      ]);
      expect(newCard([...tagIds(20), TagId('tag-0')]).tagIds).toHaveLength(20);
    });
  });

  describe('edit', () => {
    it('changes front and back and records CardEdited', () => {
      const card = newCard();
      card.edit(front('Cat'), back('a mammal that meows'));
      expect(card.front.value).toBe('Cat');
      expect(card.back.value).toBe('a mammal that meows');
      expect(card.pullEvents()).toEqual([
        { type: 'CardEdited', cardId: 'card-1', userId: 'user-1' },
      ]);
    });

    it('CARD-06: saving the same front and back is a no-op with no CardEdited', () => {
      const card = newCard();
      card.edit(front(' Dog '), back());
      expect(card.pullEvents()).toEqual([]);
    });

    it('TRASH-02: a trashed card cannot be edited', () => {
      expect(() => trashedCard().edit(front('Cat'), back())).toThrow(
        CardIsTrashed,
      );
    });
  });

  describe('addTag / removeTag', () => {
    it('adds a tag and records CardTagged', () => {
      const card = newCard();
      card.addTag(TagId('animals'));
      expect(card.tagIds).toEqual(['animals']);
      expect(card.pullEvents()).toEqual([
        {
          type: 'CardTagged',
          cardId: 'card-1',
          userId: 'user-1',
          tagId: 'animals',
        },
      ]);
    });

    it('CARDTAG-01: removing a tag removes only that CardTag', () => {
      const card = newCard([TagId('animals'), TagId('pitbull')]);
      card.removeTag(TagId('pitbull'));
      expect(card.tagIds).toEqual(['animals']);
      expect(card.pullEvents()).toEqual([
        {
          type: 'CardUntagged',
          cardId: 'card-1',
          userId: 'user-1',
          tagId: 'pitbull',
        },
      ]);
    });

    it('CARDTAG-02: a trashed card cannot be tagged or untagged', () => {
      const card = trashedCard([TagId('animals')]);
      expect(() => card.addTag(TagId('pitbull'))).toThrow(CardIsTrashed);
      expect(() => card.removeTag(TagId('animals'))).toThrow(CardIsTrashed);
      expect(card.tagIds).toEqual(['animals']);
    });

    it('CARDTAG-03: a 21st tag is rejected', () => {
      const card = newCard(tagIds(20));
      expect(() => card.addTag(TagId('one-more'))).toThrow(TooManyTags);
      expect(card.tagIds).toHaveLength(20);
    });

    it('CARDTAG-05: adding a tag the card has, or removing one it lacks, is a no-op with no event', () => {
      const card = newCard(tagIds(20));
      card.addTag(TagId('tag-0')); // no TooManyTags: nothing is added
      card.removeTag(TagId('not-on-card'));
      expect(card.tagIds).toHaveLength(20);
      expect(card.pullEvents()).toEqual([]);
    });
  });

  describe('setTags', () => {
    it('CARD-07: applies only the difference and records one event per changed tag', () => {
      const card = newCard([TagId('pitbull'), TagId('english')]);
      card.setTags([TagId('english'), TagId('animals')]);
      expect(card.tagIds.sort()).toEqual(['animals', 'english']);
      expect(card.pullEvents()).toEqual([
        {
          type: 'CardUntagged',
          cardId: 'card-1',
          userId: 'user-1',
          tagId: 'pitbull',
        },
        {
          type: 'CardTagged',
          cardId: 'card-1',
          userId: 'user-1',
          tagId: 'animals',
        },
      ]);
    });

    it('CARD-07: the same tags again change nothing and record nothing', () => {
      const card = newCard([TagId('a'), TagId('b')]);
      card.setTags([TagId('b'), TagId('a'), TagId('a')]);
      expect(card.pullEvents()).toEqual([]);
    });

    it('CARDTAG-03: setTags rejects more than 20 tags without changing the card', () => {
      const card = newCard(tagIds(3));
      expect(() => card.setTags([...tagIds(20), TagId('one-more')])).toThrow(
        TooManyTags,
      );
      expect(card.tagIds).toEqual(tagIds(3));
    });

    it('CARDTAG-03: swapping a tag on a card with 20 tags works', () => {
      const card = newCard(tagIds(20));
      card.setTags([...tagIds(20).slice(1), TagId('new')]);
      expect(card.tagIds).toHaveLength(20);
      expect(card.hasTag(TagId('new'))).toBe(true);
    });

    it('CARDTAG-02: a trashed card cannot get new tags via setTags', () => {
      expect(() => trashedCard().setTags([TagId('a')])).toThrow(CardIsTrashed);
    });
  });

  describe('replaceTagForMerge', () => {
    it('CARDTAG-04: card has A, not B → A becomes B, count unchanged', () => {
      const card = newCard([TagId('pitbull'), TagId('animals')]);
      card.replaceTagForMerge(TagId('pitbull'), TagId('dogs'));
      expect(card.tagIds.sort()).toEqual(['animals', 'dogs']);
    });

    it('CARDTAG-04: card has A and B → A removed, count −1, not an error', () => {
      const card = newCard([TagId('pitbull'), TagId('dogs')]);
      card.replaceTagForMerge(TagId('pitbull'), TagId('dogs'));
      expect(card.tagIds).toEqual(['dogs']);
    });

    it('CARDTAG-04: card does not have A → throws so the merge rolls back', () => {
      const card = newCard([TagId('dogs')]);
      expect(() =>
        card.replaceTagForMerge(TagId('pitbull'), TagId('dogs')),
      ).toThrow(TagNotOnCard);
      expect(card.tagIds).toEqual(['dogs']);
    });

    it('CARDTAG-04: never increases the tag count, even at 20 tags', () => {
      const card = newCard(tagIds(20));
      card.replaceTagForMerge(TagId('tag-0'), TagId('merged'));
      expect(card.tagIds).toHaveLength(20);
    });

    it('CARDTAG-04: records no per-card event (the merge raises TagsMerged)', () => {
      const card = newCard([TagId('pitbull')]);
      card.replaceTagForMerge(TagId('pitbull'), TagId('dogs'));
      expect(card.pullEvents()).toEqual([]);
    });

    it('TAG-09: a merge also replaces the tag on a trashed card', () => {
      const card = trashedCard([TagId('pitbull')]);
      card.replaceTagForMerge(TagId('pitbull'), TagId('dogs'));
      expect(card.tagIds).toEqual(['dogs']);
      expect(card.state).toBe('Trashed');
    });
  });

  describe('trash', () => {
    it('TRASH-01: moving to trash makes the card Trashed, not gone', () => {
      const card = newCard();
      card.moveToTrash(NOW);
      expect(card.state).toBe('Trashed');
      expect(card.pullEvents()).toEqual([
        { type: 'CardMovedToTrash', cardId: 'card-1', userId: 'user-1' },
      ]);
    });

    it('TRASH-04: CardTags are kept in the Trash, so restore brings the tags back', () => {
      const card = newCard([TagId('hsk1'), TagId('greeting')]);
      card.moveToTrash(NOW);
      expect(card.tagIds).toEqual(['hsk1', 'greeting']);
      card.restore();
      expect(card.state).toBe('Active');
      expect(card.tagIds).toEqual(['hsk1', 'greeting']);
      expect(card.pullEvents().map((e) => e.type)).toEqual([
        'CardMovedToTrash',
        'CardRestored',
      ]);
    });

    it('TRASH-12: moving to trash sets trashedAt; restore clears it', () => {
      const card = newCard();
      expect(card.trashedAt).toBeNull();
      card.moveToTrash(NOW);
      expect(card.trashedAt).toEqual(NOW);
      card.restore();
      expect(card.trashedAt).toBeNull();
    });

    it('TRASH-09: a card can be deleted permanently only from the Trash', () => {
      expect(() => newCard().deletePermanently()).toThrow(CardIsNotTrashed);
      const card = trashedCard();
      card.deletePermanently();
      expect(card.pullEvents()).toEqual([
        { type: 'CardDeletedPermanently', cardId: 'card-1', userId: 'user-1' },
      ]);
    });

    it('TRASH-10: moving a trashed card to the trash fails with CardIsTrashed', () => {
      expect(() => trashedCard().moveToTrash(NOW)).toThrow(CardIsTrashed);
    });

    it('TRASH-10: restoring an active card fails with CardIsNotTrashed', () => {
      expect(() => newCard().restore()).toThrow(CardIsNotTrashed);
    });
  });
});
