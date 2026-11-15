import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import AppScreen from '../components/AppScreen';
import Button from '../components/Button';
import Input from '../components/Input';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';

export default function ResetPasswordScreen() {
  const {
    passwordRecoveryStatus,
    passwordRecoveryError,
    updatePassword,
    dismissPasswordRecovery,
  } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [updated, setUpdated] = useState(false);

  const submit = async () => {
    if (busy) return;
    setError('');
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setBusy(true);
    try {
      await updatePassword(password);
      setUpdated(true);
    } catch (updateError) {
      setError(`No se pudo actualizar la contraseña: ${updateError.message}`);
    } finally {
      setBusy(false);
    }
  };

  if (passwordRecoveryStatus === 'processing') {
    return (
      <AppScreen scroll={false} contentStyle={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={s.description}>Validando el enlace de recuperación…</Text>
      </AppScreen>
    );
  }

  if (passwordRecoveryStatus === 'error') {
    return (
      <AppScreen scroll={false} contentStyle={s.center}>
        <Text style={s.title}>No se pudo validar el enlace</Text>
        <Text style={s.error}>{passwordRecoveryError}</Text>
        <Button title="Volver a iniciar sesión" onPress={dismissPasswordRecovery} style={s.button} />
      </AppScreen>
    );
  }

  if (updated) {
    return (
      <AppScreen scroll={false} contentStyle={s.center}>
        <Text style={s.title}>Contraseña actualizada</Text>
        <Text style={s.description}>Tu nueva contraseña ya está lista para usar.</Text>
        <Button title="Continuar a Cozzi" onPress={dismissPasswordRecovery} style={s.button} />
      </AppScreen>
    );
  }

  return (
    <AppScreen contentStyle={s.content}>
      <Text style={s.title}>Crear contraseña nueva</Text>
      <Text style={s.description}>Elige una contraseña de al menos 6 caracteres.</Text>
      <Input
        placeholder="Nueva contraseña"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        autoCapitalize="none"
      />
      <Input
        placeholder="Confirmar contraseña"
        secureTextEntry
        value={confirm}
        onChangeText={setConfirm}
        autoCapitalize="none"
      />
      {!!error && <Text style={s.error}>{error}</Text>}
      <Button
        title={busy ? 'Guardando…' : 'Guardar contraseña'}
        onPress={submit}
        style={[s.button, { opacity: busy ? 0.6 : 1 }]}
      />
    </AppScreen>
  );
}

const s = StyleSheet.create({
  content: { justifyContent: 'center' },
  center: { justifyContent: 'center', alignItems: 'stretch' },
  title: { color: colors.primary, fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 10 },
  description: { color: colors.textMuted, fontSize: 13, lineHeight: 19, textAlign: 'center', marginBottom: 20, marginTop: 8 },
  error: { color: colors.primary, fontSize: 12, lineHeight: 18, textAlign: 'center', marginBottom: 8 },
  button: { marginTop: 8 },
});
