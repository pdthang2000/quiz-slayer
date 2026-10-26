import { Alert, Text } from 'react-native';
import { router, Stack } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '../../i18n';
import { ToastProvider } from '../../components/Toast';
import CardEditor from '../../app/card/edit';

const fetchMock = jest.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;

function Layout() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: 0 } } });
  return (
    <QueryClientProvider client={client}>
      <ToastProvider>
        <Stack />
      </ToastProvider>
    </QueryClientProvider>
  );
}

/** Opens the editor for a new card on top of a home screen, so there is somewhere to go back to. */
async function openNewCardEditor() {
  fetchMock.mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve('[]') });
  const view = await renderRouter(
    { _layout: Layout, index: () => <Text>home</Text>, 'card/edit': CardEditor },
    { initialUrl: '/' },
  );
  await act(() => router.push('/card/edit'));
  expect(view.getPathname()).toBe('/card/edit');
  return view;
}

beforeEach(() => fetchMock.mockReset());
afterEach(() => jest.restoreAllMocks());

describe('card editor', () => {
  it('UI-15: Cancel with no changes leaves at once', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    const view = await openNewCardEditor();
    await fireEvent.press(screen.getByText('Cancel'));
    expect(alert).not.toHaveBeenCalled();
    expect(view.getPathname()).toBe('/');
  });

  it('UI-15: Cancel after a change asks "Discard changes?"; Discard leaves', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    const view = await openNewCardEditor();
    await fireEvent.changeText(screen.getByTestId('front'), 'Hello');
    await fireEvent.press(screen.getByText('Cancel'));
    expect(alert).toHaveBeenCalledTimes(1);
    expect(alert.mock.calls[0][0]).toBe('Discard changes?');
    expect(view.getPathname()).toBe('/card/edit'); // still here until the user decides

    const buttons = alert.mock.calls[0][2]!;
    await act(() => buttons.find((b) => b.text === 'Discard')!.onPress!());
    expect(view.getPathname()).toBe('/');
  });

  it('UI-15: a new chip counts as a change', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    await openNewCardEditor();
    const input = screen.getByTestId('tag-input');
    await fireEvent.changeText(input, 'Animals');
    await fireEvent(input, 'submitEditing');
    await fireEvent.press(screen.getByText('Cancel'));
    expect(alert).toHaveBeenCalledTimes(1);
  });

  it('UI-15: typing then undoing the change leaves at once', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    const view = await openNewCardEditor();
    await fireEvent.changeText(screen.getByTestId('front'), 'Hello');
    await fireEvent.changeText(screen.getByTestId('front'), '');
    await fireEvent.press(screen.getByText('Cancel'));
    expect(alert).not.toHaveBeenCalled();
    expect(view.getPathname()).toBe('/');
  });

  it('UI-15: Save leaves without asking', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    const view = await openNewCardEditor();
    await fireEvent.changeText(screen.getByTestId('front'), 'Hello');
    await fireEvent.changeText(screen.getByTestId('back'), 'Xin chào');
    await fireEvent.press(screen.getByTestId('save'));
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/cards$/),
      expect.objectContaining({ method: 'POST' }),
    );
    expect(alert).not.toHaveBeenCalled();
    expect(view.getPathname()).toBe('/');
  });
});
