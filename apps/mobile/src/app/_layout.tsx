import '../i18n';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
// expo-router ships its own React Navigation; its ThemeProvider is the one its
// navigators (drawer, headers) read. The one from @react-navigation/native is not.
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  focusManager,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ToastProvider } from '../components/Toast';
import { useTheme } from '../theme';
import { AppearanceProvider } from '../theme/appearance';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 0 },
    mutations: { retry: 0 },
  },
});

/** TanStack Query refetches when the app comes back to the foreground. */
function useAppStateFocus() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = AppState.addEventListener('change', (status) =>
      focusManager.setFocused(status === 'active'),
    );
    return () => sub.remove();
  }, []);
}

export default function RootLayout() {
  useAppStateFocus();
  const { scheme, colors } = useTheme();
  const { t } = useTranslation();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      primary: colors.primary,
    },
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppearanceProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider value={navTheme}>
            <ToastProvider>
              <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
              {/* Back buttons show only the arrow, never a route name such as "(drawer)". */}
              <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
                <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
                <Stack.Screen
                  name="card/edit"
                  options={{ presentation: 'modal', title: t('cards.edit') }}
                />
                <Stack.Screen name="card/tags" options={{ title: t('tags.ofCard.title') }} />
                <Stack.Screen name="tag/[id]/index" options={{ title: '' }} />
                <Stack.Screen name="tag/[id]/add" options={{ presentation: 'modal' }} />
              </Stack>
            </ToastProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </AppearanceProvider>
    </GestureHandlerRootView>
  );
}
