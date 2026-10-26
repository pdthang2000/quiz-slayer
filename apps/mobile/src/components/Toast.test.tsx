import { Pressable, Text } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TOAST_MS, ToastProvider, useToast } from './Toast';

function ShowButton() {
  const toast = useToast();
  return (
    <Pressable onPress={() => toast({ message: 'Moved to Trash' })}>
      <Text>show</Text>
    </Pressable>
  );
}

describe('Toast', () => {
  it('UI-13: the toast stays 5 seconds', async () => {
    jest.useFakeTimers();
    try {
      expect(TOAST_MS).toBe(5000);
      await render(
        <SafeAreaProvider
          initialMetrics={{
            frame: { x: 0, y: 0, width: 390, height: 844 },
            insets: { top: 0, left: 0, right: 0, bottom: 0 },
          }}
        >
          <ToastProvider>
            <ShowButton />
          </ToastProvider>
        </SafeAreaProvider>,
      );
      await fireEvent.press(screen.getByText('show'));
      await act(() => jest.advanceTimersByTime(4999));
      expect(screen.getByText('Moved to Trash')).toBeTruthy();
      await act(() => jest.advanceTimersByTime(1));
      expect(screen.queryByText('Moved to Trash')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });
});
