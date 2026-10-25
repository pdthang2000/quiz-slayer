import { TagChanged, TagMergeNotAllowed } from './errors';
import { TagId, UserId } from './ids';
import { Tag } from './tag';
import { TagColor } from './tag-color';
import { TagName } from './tag-name';

function newTag(id: string, name: string, userId = 'user-1'): Tag {
  const tag = Tag.create({
    id: TagId(id),
    userId: UserId(userId),
    name: TagName.create(name),
    color: TagColor.from('blue'),
  });
  tag.pullEvents();
  return tag;
}

describe('Tag', () => {
  it('CARD-04: a tag belongs to one user', () => {
    expect(newTag('t1', 'Animals').userId).toBe('user-1');
  });

  it('records TagCreated with the normalized name', () => {
    const tag = Tag.create({
      id: TagId('t1'),
      userId: UserId('user-1'),
      name: TagName.create(' pit   bull '),
      color: TagColor.from('red'),
    });
    expect(tag.pullEvents()).toEqual([
      { type: 'TagCreated', tagId: 't1', userId: 'user-1', name: 'pit bull' },
    ]);
  });

  it('TAG-11: a rename changes only the tag; its id stays, so cards are untouched', () => {
    const tag = newTag('t1', 'Animals');
    tag.rename(TagName.create('Mammals'));
    expect(tag.id).toBe('t1');
    expect(tag.name.value).toBe('Mammals');
    expect(tag.pullEvents()).toEqual([
      {
        type: 'TagRenamed',
        tagId: 't1',
        userId: 'user-1',
        from: 'Animals',
        to: 'Mammals',
      },
    ]);
  });

  it('TAG-12: a rename keeps the color', () => {
    const tag = newTag('t1', 'Animals');
    tag.rename(TagName.create('Mammals'));
    expect(tag.color.value).toBe('blue');
  });

  it('TAG-14: renaming to the current name (after TAG-01) is a no-op with no event', () => {
    const tag = newTag('t1', 'Animals');
    tag.rename(TagName.create(' Animals '));
    expect(tag.name.value).toBe('Animals');
    expect(tag.pullEvents()).toEqual([]);
  });

  it('TAG-02: renaming to a different case is a real rename', () => {
    const tag = newTag('t1', 'animals');
    tag.rename(TagName.create('Animals'));
    expect(tag.name.value).toBe('Animals');
  });

  it('TAG-08: merging A into B records TagsMerged; B keeps its name and color', () => {
    const pitbull = newTag('a', 'pitbull');
    const dogs = newTag('b', 'Dogs');
    pitbull.mergeInto(dogs);
    expect(pitbull.pullEvents()).toEqual([
      { type: 'TagsMerged', userId: 'user-1', tagId: 'a', intoTagId: 'b' },
    ]);
    expect(dogs.name.value).toBe('Dogs');
    expect(dogs.color.value).toBe('blue');
    expect(dogs.pullEvents()).toEqual([]);
  });

  it('TAG-08: a tag cannot merge into itself', () => {
    const tag = newTag('a', 'Dogs');
    expect(() => tag.mergeInto(tag)).toThrow(TagMergeNotAllowed);
  });

  it("CARD-04: a tag cannot merge into another user's tag", () => {
    const mine = newTag('a', 'Dogs', 'user-1');
    const theirs = newTag('b', 'Dogs', 'user-2');
    expect(() => mine.mergeInto(theirs)).toThrow(TagMergeNotAllowed);
  });

  it('TAG-16: a new tag starts at version 0', () => {
    expect(newTag('t1', 'Animals').version).toBe(0);
  });

  it('TAG-16: a change based on an outdated version fails with TagChanged', () => {
    const tag = newTag('t1', 'Animals');
    expect(() => tag.assertVersion(0)).not.toThrow();
    expect(() => tag.assertVersion(3)).toThrow(TagChanged);
  });

  it('TAG-06: deleting a tag records TagDeleted', () => {
    const tag = newTag('t1', 'Animals');
    tag.delete();
    expect(tag.pullEvents()).toEqual([
      { type: 'TagDeleted', tagId: 't1', userId: 'user-1' },
    ]);
  });
});
