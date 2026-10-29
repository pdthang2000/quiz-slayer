import { StyleSheet, View } from 'react-native';
import {
  type DrawerContentComponentProps,
  DrawerContentScrollView,
  DrawerItem,
} from 'expo-router/drawer';
import { useTranslation } from 'react-i18next';
import { spacing, useTheme } from '../../theme';

/** UI-09: the drawer's items, in this order. Route name → i18n label. */
export const DRAWER_ITEMS = [
  { route: 'index', label: 'nav.cards' },
  { route: 'tags', label: 'nav.tags' },
  { route: 'trash', label: 'nav.trash' },
] as const;

/**
 * UI-09: Cards, Tags, Trash; Settings sits apart at the bottom of the drawer (UI-17).
 * The items are listed here, not taken from the routes, so a new screen never shows up in
 * the drawer by accident.
 */
export function DrawerContent(props: DrawerContentComponentProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { state, navigation } = props;
  const current = state.routes[state.index]?.name;
  return (
    <View style={styles.fill}>
      <DrawerContentScrollView {...props} testID="drawer-items">
        {DRAWER_ITEMS.map(({ route, label }) => (
          <DrawerItem
            key={route}
            label={t(label)}
            focused={current === route}
            onPress={() => navigation.navigate(route)}
          />
        ))}
      </DrawerContentScrollView>
      <View style={[styles.footer, { borderColor: colors.border }]} testID="drawer-footer">
        <DrawerItem
          label={t('nav.settings')}
          focused={current === 'settings'}
          onPress={() => navigation.navigate('settings')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
});
