import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const CHANNEL_ID = 'cooking-timers-v2';
let channelSetup;

async function ensureNotificationPermission() {
  if (Platform.OS === 'android') {
    if (!channelSetup) {
      channelSetup = Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Temporizadores de cocina',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }
    await channelSetup;
  }

  let permissions = await Notifications.getPermissionsAsync();
  if (!permissions.granted && permissions.canAskAgain) {
    permissions = await Notifications.requestPermissionsAsync();
  }
  const provisional = permissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  if (!permissions.granted && !provisional) {
    throw new Error('Activa las notificaciones de Cozzi en los ajustes del dispositivo.');
  }
}

export async function scheduleTimerNotification(timer, recipeTitle) {
  if (Platform.OS === 'web') return null;
  await ensureNotificationPermission();

  return Notifications.scheduleNotificationAsync({
    identifier: timer.id,
    content: {
      title: `Temporizador terminado: ${recipeTitle}`,
      body: `Terminó el temporizador de ${timer.label}.`,
      sound: true,
      data: { timerId: timer.id, recipeId: timer.recipeId },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(timer.endsAt),
      channelId: Platform.OS === 'android' ? CHANNEL_ID : undefined,
      delivery: 'bestEffort',
    },
  });
}

export async function cancelTimerNotification(notificationId) {
  if (notificationId && Platform.OS !== 'web') {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }
}
