import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../navigation/routes';
import { colors } from '../theme';

const items = [
  { label: 'Inicio', route: ROUTES.HOME },
  { label: 'Buscar recetas', route: ROUTES.SEARCH },
  { label: '¿Qué puedo cocinar?', route: ROUTES.PANTRY },
  { label: 'Lista de compras', route: ROUTES.SHOPPING },
  { label: 'Mis recetas', route: ROUTES.MY_RECIPES },
  { label: 'Perfil', route: ROUTES.PROFILE },
];

// Menú lateral del botón hamburguesa (sin dependencias nativas extra).
export default function SideMenu({ visible, onClose }) {
  const nav = useNavigation();
  const { signOut } = useAuth();
  const go = (route) => { onClose(); nav.navigate(route); };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <SafeAreaView style={s.panel}>
          <Text style={s.brand}>Cozzi</Text>
          {items.map((i) => (
            <Pressable key={i.route} onPress={() => go(i.route)} style={s.item}>
              <Text style={s.itemText}>{i.label}</Text>
            </Pressable>
          ))}
          <Pressable onPress={() => { onClose(); signOut(); }} style={[s.item, { marginTop: 24 }]}>
            <Text style={[s.itemText, { color: colors.textMuted }]}>Cerrar sesión</Text>
          </Pressable>
        </SafeAreaView>
        <Pressable style={s.backdrop} onPress={onClose} />
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, flexDirection: 'row' },
  panel: { width: 270, backgroundColor: colors.surface, paddingHorizontal: 20 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  brand: { color: colors.primary, fontSize: 28, fontWeight: '800', marginVertical: 20 },
  item: { paddingVertical: 14 },
  itemText: { color: colors.text, fontSize: 16, fontWeight: '600' },
});
