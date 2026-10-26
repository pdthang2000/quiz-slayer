import { Drawer } from 'expo-router/drawer';
import { useTranslation } from 'react-i18next';

/** UI-09: a left side drawer with Cards, Tags, Trash. No bottom tab bar. */
export default function DrawerLayout() {
  const { t } = useTranslation();
  return (
    <Drawer screenOptions={{ drawerPosition: 'left' }}>
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
    </Drawer>
  );
}
