import { Alert, Platform } from 'react-native';

// Alert.alert no hace nada en web, así que ahí usamos window.alert.
export function notify(title, message) {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
}
