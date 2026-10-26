import { fireEvent, render, screen } from '@testing-library/react-native';
import '../../i18n';
import type { Card, TagWithCount } from '../../api/types';
import { CardRow } from './CardRow';
import { TagChipInput } from './TagChipInput';

const card: Card = {
  id: 'c1',
  front: '你好',
  back: 'xin chào',
  tags: [],
  createdAt: '2026-10-26T00:00:00.000Z',
  version: 0,
};

const tag = (name: string, cardCount = 1): TagWithCount => ({
  id: `t-${name}`,
  name,
  color: 'blue',
  version: 0,
  cardCount,
});

describe('CardRow', () => {
  it('UI-10: shows the front; a tap flips it to the back and back again', async () => {
    await render(<CardRow card={card} onMenu={() => {}} />);
    expect(screen.getByText('你好')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('card-c1'));
    expect(screen.getByText('xin chào')).toBeTruthy();
    expect(screen.queryByText('你好')).toBeNull();
    await fireEvent.press(screen.getByTestId('card-c1'));
    expect(screen.getByText('你好')).toBeTruthy();
  });

  it('UI-10: "⋯" opens the menu for this card', async () => {
    const onMenu = jest.fn();
    await render(<CardRow card={card} onMenu={onMenu} />);
    await fireEvent.press(screen.getByTestId('card-menu-c1'));
    expect(onMenu).toHaveBeenCalledWith(card);
  });
});

describe('TagChipInput', () => {
  it('UI-01: Enter commits a chip; spaces stay inside it; # is only shown', async () => {
    const onChange = jest.fn();
    await render(<TagChipInput value={[]} onChange={onChange} allTags={[]} />);
    const input = screen.getByTestId('tag-input');
    await fireEvent.changeText(input, 'pit bull');
    await fireEvent(input, 'submitEditing');
    expect(onChange).toHaveBeenCalledWith(['pit bull']);
  });

  it('UI-01: tapping a chip removes it', async () => {
    const onChange = jest.fn();
    await render(
      <TagChipInput value={['Animals', 'HSK1']} onChange={onChange} allTags={[]} />,
    );
    expect(screen.getByText('#Animals')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Remove tag Animals'));
    expect(onChange).toHaveBeenCalledWith(['HSK1']);
  });

  it('UI-02: suggestions filter all tags on the phone, ignoring case', async () => {
    const onChange = jest.fn();
    await render(
      <TagChipInput
        value={[]}
        onChange={onChange}
        allTags={[tag('Animals', 312), tag('HSK1'), tag('apple')]}
      />,
    );
    await fireEvent.changeText(screen.getByTestId('tag-input'), 'ANIM');
    expect(screen.getByText('#Animals')).toBeTruthy();
    expect(screen.queryByText('#HSK1')).toBeNull();
    await fireEvent.press(screen.getByText('#Animals'));
    expect(onChange).toHaveBeenCalledWith(['Animals']);
  });

  it('UI-02: a tag already on the card is not suggested again', async () => {
    await render(
      <TagChipInput value={['Animals']} onChange={() => {}} allTags={[tag('Animals')]} />,
    );
    await fireEvent.changeText(screen.getByTestId('tag-input'), 'anim');
    expect(screen.getAllByText('#Animals')).toHaveLength(1); // the chip only
  });
});
