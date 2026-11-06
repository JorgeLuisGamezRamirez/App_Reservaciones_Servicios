import { Platform } from 'react-native';

// En web no hay notificaciones nativas; ahí se muestran dentro de la app
let Notifications = null;
if (Platform.OS !== 'web') {
  Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function sendLocalPush(title, body) {
  if (!Notifications) return;
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;
    await Notifications.scheduleNotificationAsync({ content: { title, body }, trigger: null });
  } catch {
    // Si el permiso o el envío fallan, la notificación igual queda en la app
  }
}
