import React, { useCallback, useEffect, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import AppScreen from '../components/AppScreen';
import CheckRow from '../components/CheckRow';
import Button from '../components/Button';
import SectionTitle from '../components/SectionTitle';
import { useAuth } from '../context/AuthContext';
import { clearShoppingList, getShoppingList, toggleShoppingItem } from '../services/storage';
import { colors } from '../theme';

export default function ShoppingListScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const reload = useCallback(() => setItems(getShoppingList(user.id)), [user.id]);

  useEffect(() => {
    try {
      reload();
    } catch (e) {
      setError(`No se pudo cargar la lista: ${e.message}`);
    }
  }, [reload]);

  const toggle = (id) => {
    try {
      toggleShoppingItem(id, user.id);
      reload();
    } catch (e) {
      setError(`No se pudo actualizar el ingrediente: ${e.message}`);
    }
  };

  const clear = () => {
    try {
      clearShoppingList(user.id);
      reload();
    } catch (e) {
      setError(`No se pudo vaciar la lista: ${e.message}`);
    }
  };

  const sections = [...new Set(items.map((item) => item.category))].map((category) => ({
    category,
    items: items.filter((item) => item.category === category),
  }));

  return (
    <AppScreen menu>
      <View style={s.heading}>
        <SectionTitle>Lista de compras</SectionTitle>
        {items.length > 0 && <Text style={s.clear} onPress={clear}>Vaciar</Text>}
      </View>
      {sections.map((section) => (
        <View key={section.category}>
          <SectionTitle>{section.category}</SectionTitle>
          {section.items.map((item) => (
            <CheckRow
              key={item.id}
              label={item.label}
              checked={item.done}
              onPress={() => toggle(item.id)}
            />
          ))}
        </View>
      ))}
      {items.length === 0 && <Text style={s.empty}>Tu lista está vacía. Agrega ingredientes desde el detalle de una receta.</Text>}
      {!!error && <Text style={s.error}>{error}</Text>}
      {items.length > 0 && (
        <Button title="Vaciar lista" variant="outline" onPress={clear} style={{ marginTop: 16 }} />
      )}
    </AppScreen>
  );
}

const s = StyleSheet.create({
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  clear: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  empty: { color: colors.textMuted, fontSize: 13, marginTop: 8 },
  error: { color: colors.primary, fontSize: 12, marginTop: 8 },
});
