import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import {
  useGameStore, COMPANIONS,
  type CompanionId,
} from '../store/gameStore';

const PIXEL = 'PressStart2P_400Regular';
const COMPANION_IDS: CompanionId[] = ['ironGuard', 'shadowStriker'];

export default function ShopScreen() {
  const gold               = useGameStore(s => s.gold);
  const assignedCompanions = useGameStore(s => s.assignedCompanions);
  const assignCompanion    = useGameStore(s => s.assignCompanion);

  const handleAssign = (mode: 'home' | 'dungeon', id: CompanionId) => {
    if (assignedCompanions[mode] === id) {
      assignCompanion(mode, null);
    } else {
      assignCompanion(mode, id);
    }
  };

  return (
    <ScrollView style={st.scroll} contentContainerStyle={st.content}>
      <View style={st.header}>
        <Text style={st.title}>VILLAGE</Text>
      </View>

      {/* ── HEROES section ── */}
      <View style={st.sectionHeader}>
        <Text style={st.sectionTitle}>── HEROES ──</Text>
      </View>

      {COMPANION_IDS.map(id => {
        const c             = COMPANIONS[id];
        const homeActive    = assignedCompanions.home    === id;
        const dungeonActive = assignedCompanions.dungeon === id;

        return (
          <View key={id} style={st.card}>
            <Text style={st.cardEmoji}>{c.emoji}</Text>
            <Text style={st.cardName}>{c.name.toUpperCase()}</Text>
            <Text style={st.cardDesc}>{c.description}</Text>

            <View style={st.statRow}>
              <Text style={st.statAtk}>ATK +{c.bonusAttack}</Text>
              <Text style={st.statDef}>DEF +{c.bonusDefense}</Text>
            </View>

            <View style={st.assignRow}>
              <TouchableOpacity
                style={[st.assignBtn, homeActive && st.assignBtnActive]}
                onPress={() => handleAssign('home', id)}
                activeOpacity={0.8}
              >
                <Text style={[st.assignText, homeActive && st.assignTextActive]}>
                  {homeActive ? '✓ HOME' : '○ HOME'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[st.assignBtn, dungeonActive && st.assignBtnActive]}
                onPress={() => handleAssign('dungeon', id)}
                activeOpacity={0.8}
              >
                <Text style={[st.assignText, dungeonActive && st.assignTextActive]}>
                  {dungeonActive ? '✓ DUNGEON' : '○ DUNGEON'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      {/* Gold display at the bottom */}
      <View style={st.goldRow}>
        <Text style={st.goldLabel}>GOLD</Text>
        <Text style={st.goldValue}>💰 {gold}</Text>
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  scroll:  { flex: 1, backgroundColor: '#0a0a12' },
  content: { paddingBottom: 32 },

  header: {
    backgroundColor: '#08080f',
    borderBottomWidth: 2,
    borderBottomColor: '#1a1a2e',
    paddingVertical: 14,
    alignItems: 'center',
  },
  title: {
    fontFamily: PIXEL, color: '#e0c97f', fontSize: 11, letterSpacing: 3,
  },

  sectionHeader: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  sectionTitle: {
    fontFamily: PIXEL, color: '#4a6080', fontSize: 7, letterSpacing: 2,
  },

  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#0e1830',
    borderTopWidth: 2, borderLeftWidth: 2,
    borderBottomWidth: 4, borderRightWidth: 4,
    borderTopColor: '#3d5ca8', borderLeftColor: '#3d5ca8',
    borderBottomColor: '#0a1020', borderRightColor: '#0a1020',
    padding: 16,
    alignItems: 'center',
  },
  cardEmoji: { fontSize: 44, marginBottom: 8 },
  cardName:  { fontFamily: PIXEL, color: '#e0c97f', fontSize: 8, letterSpacing: 2, marginBottom: 6 },
  cardDesc:  { fontFamily: PIXEL, color: '#4a6080', fontSize: 6, textAlign: 'center', lineHeight: 12, marginBottom: 10 },

  statRow:  { flexDirection: 'row', gap: 20, marginBottom: 14 },
  statAtk:  { fontFamily: PIXEL, color: '#e74c3c', fontSize: 7, letterSpacing: 1 },
  statDef:  { fontFamily: PIXEL, color: '#3498db', fontSize: 7, letterSpacing: 1 },

  recruitBtn: {
    paddingVertical: 10, paddingHorizontal: 20,
    backgroundColor: '#7a4d00',
    borderTopWidth: 2, borderLeftWidth: 2,
    borderBottomWidth: 4, borderRightWidth: 4,
    borderTopColor: '#f39c12', borderLeftColor: '#f39c12',
    borderBottomColor: '#3a2000', borderRightColor: '#3a2000',
  },
  recruitDisabled: {
    backgroundColor: '#1a1a2a',
    borderTopColor: '#2a2a3a', borderLeftColor: '#2a2a3a',
    borderBottomColor: '#0a0a12', borderRightColor: '#0a0a12',
  },
  recruitText:    { fontFamily: PIXEL, color: '#fff', fontSize: 7, letterSpacing: 1 },
  recruitTextDim: { color: '#3a3a5a' },

  assignRow: { flexDirection: 'row', gap: 10 },
  assignBtn: {
    paddingVertical: 8, paddingHorizontal: 12,
    backgroundColor: '#182848',
    borderTopWidth: 2, borderLeftWidth: 2,
    borderBottomWidth: 3, borderRightWidth: 3,
    borderTopColor: '#3d5ca8', borderLeftColor: '#3d5ca8',
    borderBottomColor: '#0a1020', borderRightColor: '#0a1020',
  },
  assignBtnActive: {
    backgroundColor: '#1a5a1a',
    borderTopColor: '#2ecc71', borderLeftColor: '#2ecc71',
    borderBottomColor: '#0a2a0a', borderRightColor: '#0a2a0a',
  },
  assignText:       { fontFamily: PIXEL, color: '#4a6080', fontSize: 6, letterSpacing: 1 },
  assignTextActive: { color: '#2ecc71' },

  goldRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 14,
    marginHorizontal: 16,
    borderTopWidth: 1, borderTopColor: '#1a1a2e',
  },
  goldLabel: { fontFamily: PIXEL, color: '#4a6080', fontSize: 6, letterSpacing: 1 },
  goldValue: { fontFamily: PIXEL, color: '#f1c40f', fontSize: 9, letterSpacing: 1 },
});
