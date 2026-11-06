import { InvalidDailySize, InvalidTrackKinds, TrackChanged } from './errors';
import { TrackId, UserId } from './ids';
import { Track } from './track';

const add = (over: Partial<Parameters<typeof Track.add>[0]> = {}) =>
  Track.add({
    id: TrackId('t1'),
    userId: UserId('u1'),
    tagName: 'HSK4',
    ...over,
  });

describe('Track', () => {
  it('DP-11: a track is one question tag', () => {
    const track = add();
    expect(track.tagName).toBe('HSK4');
    expect(track.pullEvents()).toEqual([
      { type: 'TrackAdded', trackId: 't1', userId: 'u1', tagName: 'HSK4' },
    ]);
  });

  it('DP-12, DP-55: daily size 10 and every kind by default; size allowed 1–50', () => {
    const track = add();
    expect(track.dailySize).toBe(10);
    expect(track.kinds).toEqual([
      'single',
      'singleAudio',
      'readingGroup',
      'audioGroup',
    ]);
    expect(add({ dailySize: 1 }).dailySize).toBe(1);
    expect(add({ dailySize: 50 }).dailySize).toBe(50);
    expect(() => add({ dailySize: 0 })).toThrow(InvalidDailySize);
    expect(() => add({ dailySize: 51 })).toThrow(InvalidDailySize);
    expect(() => add({ dailySize: 2.5 })).toThrow(InvalidDailySize);
  });

  it('DP-12, DP-55: kinds are chosen per track; unknown kinds and no kind at all are refused', () => {
    expect(add({ kinds: ['readingGroup', 'single'] }).kinds).toEqual([
      'single',
      'readingGroup',
    ]);
    expect(() => add({ kinds: [] })).toThrow(InvalidTrackKinds);
    expect(() => add({ kinds: ['listening'] })).toThrow(InvalidTrackKinds);
  });

  it('DP-13: changing settings records the change; the same settings are a no-op', () => {
    const track = add();
    track.pullEvents();
    track.changeSettings({ dailySize: 20, kinds: ['single'] });
    expect(track.dailySize).toBe(20);
    expect(track.pullEvents()).toEqual([
      {
        type: 'TrackSettingsChanged',
        trackId: 't1',
        userId: 'u1',
        kinds: ['single'],
        dailySize: 20,
      },
    ]);
    track.changeSettings({ dailySize: 20 });
    expect(track.pullEvents()).toEqual([]);
  });

  it('DP-15: removing keeps the track; adding the same tag again makes it active again', () => {
    const track = add({ dailySize: 7 });
    track.remove();
    expect(track.isActive).toBe(false);
    track.addAgain();
    expect(track.isActive).toBe(true);
    expect(track.id).toBe('t1');
    expect(track.dailySize).toBe(7);
    expect(track.pullEvents().map((e) => e.type)).toEqual([
      'TrackAdded',
      'TrackRemoved',
      'TrackAdded',
    ]);
    track.addAgain();
    track.remove();
    track.remove();
    expect(track.pullEvents().map((e) => e.type)).toEqual(['TrackRemoved']);
  });
});

describe('DP-53: CONFLICT-01 for tracks', () => {
  it('DP-53: an outdated version → TrackChanged; the shown one passes', () => {
    const track = Track.add({
      id: TrackId('t1'),
      userId: UserId('u1'),
      tagName: 'HSK4',
    });
    expect(() => track.assertVersion(1)).toThrow(TrackChanged);
    expect(() => track.assertVersion(0)).not.toThrow();
  });
});
