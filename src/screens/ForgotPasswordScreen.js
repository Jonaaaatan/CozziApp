import React, { useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import AppScreen from '../components/AppScreen';
import Button from '../components/Button';
import Input from '../components/Input';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';

export default function ForgotPasswordScreen({ route }) {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState(route.params?.email || '');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const result = await requestPasswordReset(email);
      if (!result.ok) {
        setError(result.error);
      } else {
        setNotice('Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña.');
      }
    } catch (requestError) {
      setError(`No se pudo solicitar la recuperación: ${requestError.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppScreen back contentStyle={s.content}>
      <Text style={s.title}>Recuperar contraseña</Text>
      <Text style={s.description}>
        Escribe el correo de tu cuenta y te enviaremos un enlace para crear una contraseña nueva.
      </Text>
      <Input
        placeholder="Correo electrónico"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        value={email}
        onChangeText={setEmail}
      />
      {!!error && <Text style={s.error}>{error}</Text>}
      {!!notice && <Text style={s.notice}>{notice}</Text>}
      <Button
        title={busy ? 'Enviando…' : 'Enviar enlace'}
        onPress={submit}
        style={{ marginTop: 8, opacity: busy ? 0.6 : 1 }}
      />
    </AppScreen>
  );
}

const s = StyleSheet.create({
  content: { justifyContent: 'center' },
  title: { color: colors.primary, fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 10 },
  description: { color: colors.textMuted, fontSize: 13, lineHeight: 19, textAlign: 'center', marginBottom: 20 },
  error: { color: colors.primary, fontSize: 12, textAlign: 'center', marginBottom: 4 },
  notice: { color: colors.success, fontSize: 12, lineHeight: 18, textAlign: 'center', marginBottom: 4 },
});
