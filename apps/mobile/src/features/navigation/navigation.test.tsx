import type { ReactNode } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import '../../i18n';
import { DrawerContent } from './DrawerContent';

// The real drawer pieces need Reanimated, which has no native side in Jest.
jest.mock('expo-router/drawer', () => {
  const { Pressable: P, Text: T, View: V } = jest.requireActual('react-native');
  return {
    DrawerContentScrollView: ({ children, testID }: { children: ReactNode; testID?: string }) => (
      <V testID={testID}>{children}</V>
    ),
    DrawerItem: ({ label, onPress }: { label: string; onPress: () => void }) => (
      <P accessibilityRole="button" onPress={onPress}>
        <T>{label}</T>
      </P>
    ),
  };
});

function drawerProps(current: string) {
  const routes = ['index', 'tags', 'trash', 'settings'].map((name) => ({ key: name, name }));
  const navigate = jest.fn();
  return {
    navigate,
    props: {
      state: { index: routes.findIndex((r) => r.name === current), routes },
      navigation: { navigate },
      descriptors: {},
    } as unknown as Parameters<typeof DrawerContent>[0],
  };
}

const texts = (node: ReturnType<typeof screen.getByTestId>) =>
  within(node)
    .getAllByText(/./)
    .map((n) => n.props.children);

describe('Navigation', () => {
  it('UI-09: the drawer lists Cards, Tags, Trash; Settings sits apart at the bottom', async () => {
    await render(<DrawerContent {...drawerProps('index').props} />);
    expect(texts(screen.getByTestId('drawer-items'))).toEqual(['Cards', 'Tags', 'Trash']);
    expect(texts(screen.getByTestId('drawer-footer'))).toEqual(['Settings']);
  });

  it('UI-09: an item opens its screen', async () => {
    const { props, navigate } = drawerProps('index');
    await render(<DrawerContent {...props} />);
    await fireEvent.press(screen.getByText('Trash'));
    expect(navigate).toHaveBeenCalledWith('trash');
    await fireEvent.press(screen.getByText('Settings'));
    expect(navigate).toHaveBeenCalledWith('settings');
  });
});
