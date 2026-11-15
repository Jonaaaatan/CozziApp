import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { CookingProvider } from './src/context/CookingContext';
import TimerAlerts from './src/components/TimerAlerts';
import RootNavigator from './src/navigation/RootNavigator';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <CookingProvider>
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
          <TimerAlerts />
          <StatusBar style="dark" />
        </CookingProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
