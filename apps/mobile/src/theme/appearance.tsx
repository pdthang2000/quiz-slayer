import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { Appearance as RNAppearance } from 'react-native';

/** UI-17: the user's theme choice. "system" follows the phone (UI-12). */
export type Appearance = 'system' | 'light' | 'dark';

export const APPEARANCES: Appearance[] = ['system', 'light', 'dark'];

/** Kept on this phone only (C-51). */
const STORAGE_KEY = 'appearance';

type Value = { appearance: Appearance; setAppearance: (a: Appearance) => void };

const AppearanceContext = createContext<Value>({
  appearance: 'system',
  setAppearance: () => {},
});

function apply(appearance: Appearance) {
  // Overrides useColorScheme() for the whole app, native parts (keyboard, alerts) included.
  RNAppearance.setColorScheme(appearance === 'system' ? 'auto' : appearance);
}

const isAppearance = (v: unknown): v is Appearance =>
  APPEARANCES.includes(v as Appearance);

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [appearance, setState] = useState<Appearance>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (isAppearance(saved)) {
          apply(saved);
          setState(saved);
        }
      })
      .catch(() => {}); // unreadable storage: keep following the phone
  }, []);

  const setAppearance = useCallback((next: Appearance) => {
    apply(next);
    setState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  return (
    <AppearanceContext.Provider value={{ appearance, setAppearance }}>
      {children}
    </AppearanceContext.Provider>
  );
}

export const useAppearance = () => useContext(AppearanceContext);
