import React, { useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert,
} from 'react-native';
import { useGameStore, COMPANION_IDS, FRAGMENT_INFO, type FragmentType } from '../store/gameStore';
import { stopDungeonCombat } from '../services/dungeonCombat';

const PIXEL = 'PressStart2P_400Regular';

// ── Small action button ────────────────────────────────────────────────────────
function DevBtn({ label, sub, onPress, color = '#1a3060' }: {
  label: string; sub?: string; onPress: () => void; color?: string;
}) {
  return (
    <TouchableOpacity
      style={[db.btn, { backgroundColor: color }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={db.label}>{label}</Text>
      {sub && <Text style={db.sub}>{sub}</Text>}
    </TouchableOpacity>
  );
}
const db = StyleSheet.create({
  btn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderTopWidth: 2, borderLeftWidth: 2,
    borderBottomWidth: 4, borderRightWidth: 4,
    borderTopColor: '#5aa0f0', borderLeftColor: '#5aa0f0',
    borderBottomColor: '#0a1838', borderRightColor: '#0a1838',
    marginHorizontal: 4,
  },
  label: { fontFamily: PIXEL, color: '#7ec8f7', fontSize: 7, letterSpacing: 1 },
  sub:   { fontFamily: PIXEL, color: '#f1c40f', fontSize: 6, marginTop: 4 },
});

// ── Section header ─────────────────────────────────────────────────────────────
function Section({ title }: { title: string }) {
  return (
    <View style={sec.wrap}>
      <Text style={sec.text}>── {title} ──</Text>
    </View>
  );
}
const sec = StyleSheet.create({
  wrap: { paddingVertical: 10, paddingHorizontal: 16 },
  text: { fontFamily: PIXEL, color: '#4a6080', fontSize: 7, letterSpacing: 2 },
});

// ── Main modal ─────────────────────────────────────────────────────────────────
export default function DevScreen({ visible, onClose }: {
  visible: boolean;
  onClose: () => void;
}) {
  const store = useGameStore();

  // ── Gold ──────────────────────────────────────────────────────────────────────
  const addGold = (amount: number) => store.gainGold(amount);

  // ── Level up all heroes (bypass requirements) ─────────────────────────────────
  const levelUpAll = (times: number) => {
    for (const cid of COMPANION_IDS) {
      const h = useGameStore.getState().heroes[cid];
      useGameStore.getState().setHero(cid, {
        level:  h.level  + times,
        maxHp:  h.maxHp  + 10 * times,
        hp:     h.maxHp  + 10 * times,
        attack: h.attack +  3 * times,
      });
    }
  };

  // ── Add fragments ─────────────────────────────────────────────────────────────
  const addFragments = (amount: number) => {
    const s = useGameStore.getState();
    const newFragments = { ...s.fragments };
    for (const type of Object.keys(FRAGMENT_INFO) as FragmentType[]) {
      newFragments[type] = (newFragments[type] ?? 0) + amount;
    }
    useGameStore.setState({ fragments: newFragments });
  };

  // ── Reset ─────────────────────────────────────────────────────────────────────
  const handleReset = () => {
    Alert.alert(
      'RESET GAME',
      'All progress will be deleted. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'RESET', style: 'destructive',
          onPress: () => {
            stopDungeonCombat();
            store.resetGame();
            onClose();
          },
        },
      ],
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <View style={s.panel}>

          {/* Header */}
          <View style={s.header}>
            <Text style={s.title}>DEV PANEL</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.8} style={s.closeBtn}>
              <Text style={s.closeTxt}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>

            {/* Gold */}
            <Section title="GOLD" />
            <View style={s.row}>
              <DevBtn label="+1K"    sub="+1,000G"   onPress={() => addGold(1_000)} />
              <DevBtn label="+10K"   sub="+10,000G"  onPress={() => addGold(10_000)} />
              <DevBtn label="+100K"  sub="+100,000G" onPress={() => addGold(100_000)} />
            </View>

            {/* Level */}
            <Section title="HERO LEVEL" />
            <View style={s.row}>
              <DevBtn label="+1 LV"  sub="all heroes" onPress={() => levelUpAll(1)} />
              <DevBtn label="+5 LV"  sub="all heroes" onPress={() => levelUpAll(5)} />
              <DevBtn label="+10 LV" sub="all heroes" onPress={() => levelUpAll(10)} />
            </View>

            {/* Fragments */}
            <Section title="FRAGMENTS" />
            <View style={s.row}>
              <DevBtn label="+10"  sub="each type" onPress={() => addFragments(10)} />
              <DevBtn label="+50"  sub="each type" onPress={() => addFragments(50)} />
              <DevBtn label="+100" sub="each type" onPress={() => addFragments(100)} />
            </View>
            {/* Fragment preview */}
            <View style={s.fragRow}>
              {(Object.keys(FRAGMENT_INFO) as FragmentType[]).map(type => {
                const info = FRAGMENT_INFO[type];
                return (
                  <View key={type} style={s.fragChip}>
                    <Text style={s.fragEmoji}>{info.emoji}</Text>
                    <Text style={[s.fragCount, { color: info.color }]}>
                      {store.fragments[type] ?? 0}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Reset */}
            <Section title="DANGER ZONE" />
            <View style={s.row}>
              <DevBtn
                label="RESET GAME"
                sub="cannot undo"
                onPress={handleReset}
                color="#2a1010"
              />
            </View>

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  panel: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#0a0f1e',
    borderTopWidth: 2, borderLeftWidth: 2,
    borderBottomWidth: 5, borderRightWidth: 5,
    borderTopColor: '#3d5ca8', borderLeftColor: '#3d5ca8',
    borderBottomColor: '#0a1020', borderRightColor: '#0a1020',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#08080f',
    borderBottomWidth: 2,
    borderBottomColor: '#1a1a2e',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { fontFamily: PIXEL, color: '#e0c97f', fontSize: 10, letterSpacing: 2 },
  closeBtn: {
    width: 30, height: 30,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#2a1010',
    borderTopWidth: 1, borderLeftWidth: 1,
    borderBottomWidth: 3, borderRightWidth: 3,
    borderTopColor: '#c0392b', borderLeftColor: '#c0392b',
    borderBottomColor: '#5a0a0a', borderRightColor: '#5a0a0a',
  },
  closeTxt: { fontFamily: PIXEL, color: '#e74c3c', fontSize: 11 },

  body: { paddingBottom: 20 },

  row: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 4,
  },

  fragRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#080c18',
    marginHorizontal: 16,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#1a2a40',
  },
  fragChip:  { alignItems: 'center' },
  fragEmoji: { fontSize: 18, marginBottom: 3 },
  fragCount: { fontFamily: PIXEL, fontSize: 7 },
});
