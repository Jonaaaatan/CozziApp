import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from './routes';
import { colors } from '../theme';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import WhatCanICookScreen from '../screens/WhatCanICookScreen';
import RecipeDetailScreen from '../screens/RecipeDetailScreen';
import CookWithMeScreen from '../screens/CookWithMeScreen';
import ShoppingListScreen from '../screens/ShoppingListScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MyRecipesScreen from '../screens/MyRecipesScreen';

const Stack = createNativeStackNavigator();

// Flujo condicional: sin sesión -> Login/Registro; con sesión -> app.
export default function RootNavigator() {
  const { user, loading, storageError, continueAsGuest } = useAuth();
  const [guestError, setGuestError] = useState('');
  // Mientras se restaura la sesión guardada evitamos parpadear la pantalla de login.
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  if (storageError) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.bg }}>
        <Text style={{ color: colors.primary, textAlign: 'center' }}>{storageError}</Text>
        <Pressable
          onPress={() => continueAsGuest({ clearSavedSession: true }).catch((error) => setGuestError(error.message))}
          style={{ marginTop: 20 }}
        >
          <Text style={{ color: colors.primary, fontWeight: '700' }}>Continuar sin cuenta</Text>
        </Pressable>
        {!!guestError && <Text style={{ color: colors.primary, marginTop: 8 }}>{guestError}</Text>}
      </View>
    );
  }
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          <Stack.Screen name={ROUTES.HOME} component={HomeScreen} />
          <Stack.Screen name={ROUTES.SEARCH} component={SearchScreen} />
          <Stack.Screen name={ROUTES.PANTRY} component={WhatCanICookScreen} />
          <Stack.Screen name={ROUTES.RECIPE} component={RecipeDetailScreen} />
          <Stack.Screen name={ROUTES.COOK} component={CookWithMeScreen} />
          <Stack.Screen name={ROUTES.SHOPPING} component={ShoppingListScreen} />
          <Stack.Screen name={ROUTES.PROFILE} component={ProfileScreen} />
          <Stack.Screen name={ROUTES.MY_RECIPES} component={MyRecipesScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name={ROUTES.LOGIN} component={LoginScreen} />
          <Stack.Screen name={ROUTES.REGISTER} component={RegisterScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
