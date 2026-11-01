import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import AppScreen from '../components/AppScreen';
import Input from '../components/Input';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../navigation/routes';
import { colors } from '../theme';

export default function LoginScreen({ navigation }) {
  const { signIn } = useAuth();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      const res = await signIn({ email, password });
      if (!res.ok) setError(res.error);
    } catch (e) {
      setError(`No se pudo iniciar sesión: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppScreen contentStyle={s.center}>
      <Text style={s.logo}>Cozzi</Text>
      <Input placeholder="Correo electrónico" keyboardType="email-address" value={email} onChangeText={setEmail} autoCorrect={false} />
      <Input placeholder="Contraseña" secureTextEntry value={password} onChangeText={setPassword} />
      {!!error && <Text style={s.error}>{error}</Text>}
      <Button title={busy ? 'Entrando…' : 'Iniciar sesión'} onPress={submit} style={{ marginTop: 8, opacity: busy ? 0.6 : 1 }} />
      {/* TODO: recuperación de contraseña */}
      <Text style={s.muted}>¿Olvidaste tu contraseña?</Text>
      <Pressable onPress={() => navigation.navigate(ROUTES.REGISTER)}>
        <Text style={s.muted}>¿No tienes cuenta? <Text style={s.link}>Crear cuenta</Text></Text>
      </Pressable>
    </AppScreen>
  );
}

const s = StyleSheet.create({
  center: { justifyContent: 'center' },
  logo: { color: colors.primary, fontSize: 30, fontWeight: '800', textAlign: 'center', marginBottom: 28 },
  muted: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 18 },
  error: { color: colors.primary, fontSize: 12, textAlign: 'center', marginBottom: 4 },
  link: { color: colors.primary, fontWeight: '700' },
});
