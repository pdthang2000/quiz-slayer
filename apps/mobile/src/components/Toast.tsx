import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, useTheme } from '../theme';

type ToastOptions = {
  message: string;
  /** e.g. UI-13 "Undo". */
  action?: { label: string; onPress: () => void };
};

type Show = (options: ToastOptions) => void;

const ToastContext = createContext<Show>(() => {});

/** How long a toast stays (technical default; see open question C-47). */
export const TOAST_MS = 5000;

/** One toast at a time, at the bottom of the screen. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastOptions | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const show = useCallback<Show>((options) => {
    if (timer.current) clearTimeout(timer.current);
    setToast(options);
    timer.current = setTimeout(() => setToast(null), TOAST_MS);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <View
          accessibilityRole="alert"
          style={[
            styles.toast,
            { backgroundColor: colors.toast, bottom: insets.bottom + spacing.lg },
          ]}
        >
          <Text style={[styles.message, { color: colors.onToast }]}>
            {toast.message}
          </Text>
          {toast.action && (
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => {
                toast.action?.onPress();
                setToast(null);
              }}
            >
              <Text style={[styles.action, { color: colors.onToast }]}>
                {toast.action.label}
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    borderRadius: 10,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  message: { flex: 1, fontSize: 15 },
  action: { fontSize: 15, fontWeight: '700', textTransform: 'uppercase' },
});
