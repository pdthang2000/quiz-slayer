import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import '../../i18n';
import { AppearanceProvider } from '../../theme/appearance';
import { AppearancePicker } from './AppearancePicker';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const renderPicker = () =>
  render(
    <AppearanceProvider>
      <AppearancePicker />
    </AppearanceProvider>,
  );

const selected = (option: string) =>
  screen.getByTestId(`appearance-${option}`).props.accessibilityState.selected;

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.restoreAllMocks();
});

describe('Settings → Appearance', () => {
  it('UI-17: offers System, Light and Dark; System is the default', async () => {
    await renderPicker();
    expect(screen.getByText('Appearance')).toBeTruthy();
    for (const label of ['System', 'Light', 'Dark']) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    expect(selected('system')).toBe(true);
  });

  it('UI-17: picking Dark switches the app to dark and keeps it on this phone', async () => {
    const setColorScheme = jest.spyOn(Appearance, 'setColorScheme');
    await renderPicker();
    await fireEvent.press(screen.getByTestId('appearance-dark'));
    expect(setColorScheme).toHaveBeenLastCalledWith('dark');
    expect(selected('dark')).toBe(true);
    expect(await AsyncStorage.getItem('appearance')).toBe('dark');
  });

  it('UI-12: picking System follows the phone again', async () => {
    const setColorScheme = jest.spyOn(Appearance, 'setColorScheme');
    await renderPicker();
    await fireEvent.press(screen.getByTestId('appearance-light'));
    await fireEvent.press(screen.getByTestId('appearance-system'));
    expect(setColorScheme).toHaveBeenLastCalledWith('auto');
  });

  it('UI-17: the saved choice comes back when the app starts', async () => {
    await AsyncStorage.setItem('appearance', 'light');
    const setColorScheme = jest.spyOn(Appearance, 'setColorScheme');
    await renderPicker();
    await waitFor(() => expect(selected('light')).toBe(true));
    expect(setColorScheme).toHaveBeenCalledWith('light');
  });
});
