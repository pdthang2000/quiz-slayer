import { StyleSheet, View } from 'react-native';
import {
  Drawer,
  type DrawerContentComponentProps,
  DrawerContentScrollView,
  DrawerItem,
  DrawerItemList,
} from 'expo-router/drawer';
import { useTranslation } from 'react-i18next';
import { spacing, useTheme } from '../../theme';

/**
 * UI-09: a left side drawer with Cards, Tags, Trash. No bottom tab bar.
 * Settings sits apart at the bottom of the drawer (UI-17).
 */
export default function DrawerLayout() {
  const { t } = useTranslation();
  return (
    <Drawer
      screenOptions={{ drawerPosition: 'left' }}
      drawerContent={(props) => <DrawerContent {...props} />}
    >
      <Drawer.Screen
        name="index"
        options={{ title: t('nav.cards'), drawerLabel: t('nav.cards') }}
      />
      <Drawer.Screen
        name="tags"
        options={{ title: t('nav.tags'), drawerLabel: t('nav.tags') }}
      />
      <Drawer.Screen
        name="trash"
        options={{ title: t('nav.trash'), drawerLabel: t('nav.trash') }}
      />
      <Drawer.Screen
        name="settings"
        options={{
          title: t('nav.settings'),
          drawerItemStyle: { display: 'none' }, // shown at the bottom instead
        }}
      />
    </Drawer>
  );
}

function DrawerContent(props: DrawerContentComponentProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { state, navigation } = props;
  const settingsFocused = state.routes[state.index]?.name === 'settings';
  return (
    <View style={styles.fill}>
      <DrawerContentScrollView {...props}>
        <DrawerItemList {...props} />
      </DrawerContentScrollView>
      <View style={[styles.footer, { borderColor: colors.border }]}>
        <DrawerItem
          label={t('nav.settings')}
          focused={settingsFocused}
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
