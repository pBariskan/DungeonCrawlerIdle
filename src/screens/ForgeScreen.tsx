import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import {
  useGameStore,
  FRAGMENT_INFO, FORGE_YIELD, RARITY_COLOR,
  type Item, type FragmentType,
} from '../store/gameStore';

const PIXEL = 'PressStart2P_400Regular';
const { width: SW } = Dimensions.get('window');
const ITEM_SIZE = Math.floor((SW - 32 - 4 * 4) / 4);

// ─── Inventory item cell ───────────────────────────────────────────────────────
function ItemCell({ item, selected, onPress }: {
  item: Item; selected: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        ic.cell,
        { borderColor: selected ? '#ffffff' : RARITY_COLOR[item.rarity] },
        selected && ic.selectedBg,
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={ic.emoji}>{item.emoji}</Text>
    </TouchableOpacity>
  );
}
const ic = StyleSheet.create({
  cell: {
    width: ITEM_SIZE, height: ITEM_SIZE,
    backgroundColor: '#243a6a',
    borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
    margin: 2,
  },
  selectedBg: { backgroundColor: '#2d4880' },
  emoji: { fontSize: 24 },
});

// ─── Main screen ───────────────────────────────────────────────────────────────
export default function ForgeScreen() {
  const { inventory, fragments, forgeItem } = useGameStore();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const selectedItem = inventory.find(i => i.id === selectedItemId) ?? null;

  const handleForge = () => {
    if (!selectedItemId) return;
    forgeItem(selectedItemId);
    setSelectedItemId(null);
  };

  const handleItemPress = (item: Item) => {
    setSelectedItemId(prev => prev === item.id ? null : item.id);
  };

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.container}>

      {/* ── Fragment counters ── */}
      <View style={s.fragsBox}>
        <Text style={s.sectionTitle}>FRAGMENTS</Text>
        <View style={s.fragsRow}>
          {(Object.keys(FRAGMENT_INFO) as FragmentType[]).map(type => {
            const info = FRAGMENT_INFO[type];
            return (
              <View key={type} style={s.fragChip}>
                <Text style={s.fragEmoji}>{info.emoji}</Text>
                <Text style={[s.fragCount, { color: info.color }]}>{fragments[type] ?? 0}</Text>
                <Text style={s.fragName} numberOfLines={1}>{info.name.split(' ')[0].toUpperCase()}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* ── Inventory grid ── */}
      <View style={s.invBox}>
        <Text style={s.sectionTitle}>SELECT ITEM TO FORGE  ({inventory.length})</Text>
        {inventory.length === 0 ? (
          <Text style={s.emptyText}>Defeat bosses to get loot chests!</Text>
        ) : (
          <View style={s.invGrid}>
            {inventory.map(item => (
              <ItemCell
                key={item.id}
                item={item}
                selected={item.id === selectedItemId}
                onPress={() => handleItemPress(item)}
              />
            ))}
          </View>
        )}
      </View>

      {/* ── Preview + Forge button ── */}
      <View style={s.previewBox}>
        {selectedItem ? (
          <>
            <View style={[s.previewItem, { borderLeftColor: RARITY_COLOR[selectedItem.rarity] }]}>
              <Text style={s.previewEmoji}>{selectedItem.emoji}</Text>
              <View style={s.previewInfo}>
                <Text style={s.previewName} numberOfLines={1}>
                  {selectedItem.name.toUpperCase()}
                </Text>
                <Text style={[s.previewRarity, { color: RARITY_COLOR[selectedItem.rarity] }]}>
                  {selectedItem.rarity.toUpperCase()}
                </Text>
              </View>
            </View>
            <View style={s.yieldRow}>
              <Text style={s.yieldArrow}>FORGE  →</Text>
              {(() => {
                const yld  = FORGE_YIELD[selectedItem.rarity];
                const info = FRAGMENT_INFO[yld.type];
                return (
                  <Text style={[s.yieldText, { color: info.color }]}>
                    {yld.min}–{yld.max}×  {info.emoji}  {info.name.toUpperCase()}
                  </Text>
                );
              })()}
            </View>
            <TouchableOpacity style={s.forgeBtn} onPress={handleForge} activeOpacity={0.8}>
              <Text style={s.forgeBtnText}>🔥  FORGE</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={s.emptyText}>SELECT AN ITEM ABOVE{'\n'}TO SEE FORGE PREVIEW</Text>
        )}
      </View>

    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  scroll:    { flex: 1, backgroundColor: '#1e3158' },
  container: { padding: 16 },

  sectionTitle: {
    fontFamily: PIXEL, color: '#a0c0f0', fontSize: 7,
    letterSpacing: 1, marginBottom: 12,
  },

  // Fragments
  fragsBox:  { backgroundColor: '#243a6a', borderWidth: 1, borderColor: '#3d5ca8', padding: 14, marginBottom: 16 },
  fragsRow:  { flexDirection: 'row', justifyContent: 'space-around' },
  fragChip:  { alignItems: 'center', minWidth: 52 },
  fragEmoji: { fontSize: 18, marginBottom: 4 },
  fragCount: { fontFamily: PIXEL, fontSize: 10, marginBottom: 3 },
  fragName:  { fontFamily: PIXEL, color: '#80a8e0', fontSize: 5 },

  // Inventory
  invBox:    { backgroundColor: '#243a6a', borderWidth: 1, borderColor: '#3d5ca8', padding: 14, marginBottom: 16 },
  invGrid:   { flexDirection: 'row', flexWrap: 'wrap' },
  emptyText: { fontFamily: PIXEL, color: '#6090d0', fontSize: 7, textAlign: 'center', lineHeight: 16, paddingVertical: 20 },

  // Preview
  previewBox: {
    backgroundColor: '#1a2a50',
    borderWidth: 1, borderColor: '#3d5ca8',
    padding: 16, marginBottom: 32,
    alignItems: 'center',
  },
  previewItem: {
    flexDirection: 'row', alignItems: 'center',
    width: '100%',
    backgroundColor: '#182848',
    borderLeftWidth: 4,
    paddingVertical: 10, paddingHorizontal: 12,
    marginBottom: 12,
  },
  previewEmoji: { fontSize: 28, marginRight: 12 },
  previewInfo:  { flex: 1 },
  previewName:  { fontFamily: PIXEL, color: '#fff', fontSize: 7, marginBottom: 4 },
  previewRarity:{ fontFamily: PIXEL, fontSize: 6 },
  yieldRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  yieldArrow:{ fontFamily: PIXEL, color: '#80a8e0', fontSize: 7 },
  yieldText: { fontFamily: PIXEL, fontSize: 7 },
  forgeBtn: {
    width: '100%', paddingVertical: 14, alignItems: 'center',
    backgroundColor: '#6a1a00',
    borderTopWidth: 3, borderLeftWidth: 3, borderBottomWidth: 5, borderRightWidth: 5,
    borderTopColor: '#ff7744', borderLeftColor: '#ff7744',
    borderBottomColor: '#2a0a00', borderRightColor: '#2a0a00',
  },
  forgeBtnText: { fontFamily: PIXEL, color: '#fff', fontSize: 11, letterSpacing: 2 },
});
