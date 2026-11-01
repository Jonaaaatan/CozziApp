import React, { useState } from 'react';
import { View, ScrollView, Pressable, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import SideMenu from './SideMenu';
import BottomBar from './BottomBar';
import { colors } from '../theme';

// Contenedor común de pantallas.
//  menu: botón hamburguesa | back: flecha atrás | bottomBar: barra inferior
export default function AppScreen({ children, menu = false, back = false, bottomBar = false, scroll = true, contentStyle }) {
  const nav = useNavigation();
  const [open, setOpen] = useState(false);
  const Body = scroll ? ScrollView : View;

  return (
    <SafeAreaView style={s.safe}>
      {(menu || back) && (
        <View style={s.header}>
          {back ? (
            <Pressable onPress={() => nav.goBack()} hitSlop={12}><Text style={s.back}>←</Text></Pressable>
          ) : (
            <Pressable onPress={() => setOpen(true)} hitSlop={12} style={s.burger}>
              <View style={s.line} /><View style={s.line} /><View style={s.line} />
            </Pressable>
          )}
        </View>
      )}
      <Body
        style={s.flex}
        contentContainerStyle={scroll ? [s.content, contentStyle] : undefined}
        keyboardShouldPersistTaps="handled"
      >
        {scroll ? children : <View style={[s.content, contentStyle]}>{children}</View>}
      </Body>
      {bottomBar && <BottomBar />}
      {menu && <SideMenu visible={open} onClose={() => setOpen(false)} />}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: { padding: 20, flexGrow: 1 },
  header: { paddingHorizontal: 20, paddingTop: 12 },
  burger: { width: 30, gap: 5 },
  line: { height: 3, backgroundColor: '#444', borderRadius: 2 },
  back: { fontSize: 26, color: colors.primary },
});
