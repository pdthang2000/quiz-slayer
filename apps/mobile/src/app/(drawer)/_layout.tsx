import { Drawer } from 'expo-router/drawer';
import { useTranslation } from 'react-i18next';
import { DrawerContent } from '../../features/navigation/DrawerContent';

/** UI-09: a left side drawer. No bottom tab bar. Its items: DrawerContent. */
export default function DrawerLayout() {
  const { t } = useTranslation();
  return (
    <Drawer
      screenOptions={{ drawerPosition: 'left' }}
      drawerContent={(props) => <DrawerContent {...props} />}
    >
      <Drawer.Screen name="index" options={{ title: t('nav.cards') }} />
      <Drawer.Screen name="tags" options={{ title: t('nav.tags') }} />
      <Drawer.Screen name="trash" options={{ title: t('nav.trash') }} />
      <Drawer.Screen name="settings" options={{ title: t('nav.settings') }} />
    </Drawer>
  );
}
