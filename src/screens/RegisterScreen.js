import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AppScreen from '../components/AppScreen';
import Input from '../components/Input';
import Button from '../components/Button';
import Chip from '../components/Chip';
import SectionTitle from '../components/SectionTitle';
import { useAuth } from '../context/AuthContext';
import { allergyOptions } from '../data/mock';
import { colors } from '../theme';

export default function RegisterScreen({ navigation }) {
  const { signUp } = useAuth();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [allergies, setAllergies] = useState([]);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const toggle = (a) => setAllergies((l) => (l.includes(a) ? l.filter((x) => x !== a) : [...l, a]));

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      const res = await signUp({ ...form, allergies });
      if (!res.ok) setError(res.error);
    } catch (e) {
      setError(`No se pudo crear la cuenta: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppScreen back contentStyle={{ paddingTop: 8 }}>
      <Text style={s.title}>Crear cuenta</Text>
      <Input placeholder="Nombre completo" autoCapitalize="words" value={form.name} onChangeText={set('name')} />
      <Input placeholder="Correo electrónico" keyboardType="email-address" value={form.email} onChangeText={set('email')} />
      <Input placeholder="Contraseña" secureTextEntry value={form.password} onChangeText={set('password')} />
      <Input placeholder="Confirmar contraseña" secureTextEntry value={form.confirm} onChangeText={set('confirm')} />
      <SectionTitle>Alergias (opcional)</SectionTitle>
      <View style={s.chips}>
        {allergyOptions.map((a) => (
          <Chip key={a} label={a} active={allergies.includes(a)} onPress={() => toggle(a)} />
        ))}
      </View>
      {!!error && <Text style={s.error}>{error}</Text>}
      <Button title={busy ? 'Creando cuenta…' : 'Registrarme'} onPress={submit} style={{ marginTop: 8, opacity: busy ? 0.6 : 1 }} />
    </AppScreen>
  );
}

const s = StyleSheet.create({
  title: { color: colors.primary, fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 16 },
  error: { color: colors.primary, fontSize: 12, textAlign: 'center', marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
});
