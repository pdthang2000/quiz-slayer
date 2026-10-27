import '../i18n';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
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
              <Stack>
                <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
                <Stack.Screen
                  name="card/edit"
                  options={{ presentation: 'modal', title: t('cards.edit') }}
                />
              </Stack>
            </ToastProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </AppearanceProvider>
    </GestureHandlerRootView>
  );
}
