import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import {
  useGameStore,
  COMPANIONS, COMPANION_IDS,
  SLOT_EMOJI, SLOT_LABEL, RARITY_COLOR, FRAGMENT_INFO, getLevelRequirements,
  type Item, type EquipSlot, type FragmentType, type CompanionId,
} from '../store/gameStore';

const PIXEL = 'PressStart2P_400Regular';
const { width: SW } = Dimensions.get('window');

// Slot column width — leaves room for hero center
const SLOT_W    = 76;
// Inventory: 4 items per row with 4px gaps
const ITEM_SIZE = Math.floor((SW - 32 - 4 * 4) / 4);

// ─── Equipment slot box ────────────────────────────────────────────────────────
function SlotBox({ slot, item, highlighted, onPress }: {
  slot:        EquipSlot;
  item:        Item | null;
  highlighted: boolean;   // true when a matching inventory item is selected
  onPress:     () => void;
}) {
  const borderColor = highlighted
    ? '#e0c97f'
    : item
      ? RARITY_COLOR[item.rarity]
      : '#3d5ca8';

  return (
    <TouchableOpacity
      style={[sl.box, { borderColor, borderWidth: highlighted || item ? 2 : 1 }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={sl.emoji}>{item ? item.emoji : SLOT_EMOJI[slot]}</Text>
      <Text
        style={[sl.label, item && { color: RARITY_COLOR[item.rarity] }]}
        numberOfLines={1}
      >
        {item ? item.name.split(' ')[0] : SLOT_LABEL[slot]}
      </Text>
    </TouchableOpacity>
  );
}
const sl = StyleSheet.create({
  box: {
    width: SLOT_W - 4, height: 72,
    backgroundColor: '#243a6a',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  emoji: { fontSize: 22 },
  label: { fontFamily: PIXEL, fontSize: 5, color: '#80a8e0', marginTop: 4, textAlign: 'center' },
});

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
export default function HeroScreen() {
  const { heroes, companionEquipped, companionExp, gold, inventory, equipItem, unequipItem, levelUpHero, fragments } = useGameStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewedCompanion, setViewedCompanion] = useState<CompanionId>('ironGuard');

  const hero     = heroes[viewedCompanion];
  const equipped = companionEquipped[viewedCompanion];
  const heroExp  = companionExp[viewedCompanion];

  const activeIdx = COMPANION_IDS.indexOf(viewedCompanion);
  const handlePrev = () =>
    setViewedCompanion(COMPANION_IDS[(activeIdx - 1 + COMPANION_IDS.length) % COMPANION_IDS.length]);
  const handleNext = () =>
    setViewedCompanion(COMPANION_IDS[(activeIdx + 1) % COMPANION_IDS.length]);

  const selectedItem = inventory.find(i => i.id === selectedId) ?? null;

  const handleInventoryPress = (item: Item) => {
    setSelectedId(prev => prev === item.id ? null : item.id);
  };

  const handleSlotPress = (slot: EquipSlot) => {
    if (selectedItem) {
      if (selectedItem.slot === slot) {
        equipItem(selectedItem, viewedCompanion);
        setSelectedId(null);
      }
      // Wrong slot: hint text already guides the user — do nothing else
    } else {
      if (equipped[slot]) unequipItem(slot, viewedCompanion);
    }
  };

  const heroHpPct = Math.max(0, (hero.hp / hero.maxHp) * 100);

  // Stat rows for the 2×2 grid
  const statRows = [
    { label: 'HP',    value: String(hero.maxHp),          color: '#2ecc71' },
    { label: 'ATK',   value: String(hero.attack),         color: '#e74c3c' },
    { label: 'DEF',   value: String(hero.defense),        color: '#3498db' },
    { label: 'LEVEL', value: String(hero.level),          color: '#e0c97f' },
  ];

  const req = getLevelRequirements(hero.level);
  const expPct = Math.min(100, (heroExp / req.exp) * 100);
  const hasEnoughExp  = heroExp >= req.exp;
  const hasEnoughGold = gold >= req.gold;
  const hasEnoughFrags = Object.entries(req.fragments).every(
    ([t, n]) => (fragments[t as FragmentType] ?? 0) >= (n ?? 0),
  );
  const canLevelUp = hasEnoughExp && hasEnoughGold && hasEnoughFrags;

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.container}>

      {/* ── Gold chip ── */}
      <View style={s.goldChip}>
        <Text style={s.goldText}>★  {gold}  GOLD</Text>
      </View>

      {/* ── Paperdoll ── */}
      <View style={s.paperdoll}>

        {/* Left: helmet, armor, boots */}
        <View style={s.slotCol}>
          {(['helmet', 'armor', 'boots'] as EquipSlot[]).map(slot => (
            <SlotBox
              key={slot}
              slot={slot}
              item={equipped[slot]}
              highlighted={selectedItem?.slot === slot}
              onPress={() => handleSlotPress(slot)}
            />
          ))}
        </View>

        {/* Center: companion navigator + HP bar */}
        <View style={s.heroCenter}>
          <View style={s.companionNav}>
            <TouchableOpacity style={s.navBtn} onPress={handlePrev} activeOpacity={0.8}>
              <Text style={s.navArrow}>◀</Text>
            </TouchableOpacity>

            <View style={s.companionInfo}>
              <Text style={s.heroSprite}>{COMPANIONS[viewedCompanion].emoji}</Text>
              <Text style={s.companionName}>{COMPANIONS[viewedCompanion].name.toUpperCase()}</Text>
            </View>

            <TouchableOpacity style={s.navBtn} onPress={handleNext} activeOpacity={0.8}>
              <Text style={s.navArrow}>▶</Text>
            </TouchableOpacity>
          </View>

          <View style={s.hpBarBg}>
            <View style={[s.hpBarFill, { width: `${heroHpPct}%` }]} />
          </View>
          <Text style={s.heroLv}>LV.{hero.level}</Text>
        </View>

        {/* Right: weapon, shield, ring */}
        <View style={s.slotCol}>
          {(['weapon', 'shield', 'ring'] as EquipSlot[]).map(slot => (
            <SlotBox
              key={slot}
              slot={slot}
              item={equipped[slot]}
              highlighted={selectedItem?.slot === slot}
              onPress={() => handleSlotPress(slot)}
            />
          ))}
        </View>

      </View>

      {/* ── Equip hint bar ── */}
      <View style={s.hintBar}>
        {selectedItem ? (
          <>
            <Text style={s.hintItemName}>
              {selectedItem.emoji}  {selectedItem.name.toUpperCase()}
            </Text>
            <Text style={[s.hintSub, { color: RARITY_COLOR[selectedItem.rarity] }]}>
              {selectedItem.rarity.toUpperCase()}  ·  TAP {SLOT_LABEL[selectedItem.slot]} SLOT TO EQUIP
            </Text>
            {(selectedItem.bonusAttack > 0 || selectedItem.bonusDefense > 0 || selectedItem.bonusHp > 0) && (
              <Text style={s.hintStats}>
                {[
                  selectedItem.bonusAttack  > 0 && `+${selectedItem.bonusAttack} ATK`,
                  selectedItem.bonusDefense > 0 && `+${selectedItem.bonusDefense} DEF`,
                  selectedItem.bonusHp      > 0 && `+${selectedItem.bonusHp} HP`,
                ].filter(Boolean).join('   ')}
              </Text>
            )}
          </>
        ) : (
          <Text style={s.hintSub}>SELECT ITEM FROM INVENTORY  ·  TAP SLOT TO UNEQUIP</Text>
        )}
      </View>

      {/* ── Stats (2×2 grid) ── */}
      <View style={s.statsBox}>
        <View style={s.statsGrid}>
          {statRows.map((r, i) => (
            <View
              key={r.label}
              style={[
                s.statCell,
                i % 2 === 1 && s.cellBorderL,
                i >= 2      && s.cellBorderT,
              ]}
            >
              <Text style={s.statLabel}>{r.label}</Text>
              <Text style={[s.statValue, { color: r.color }]}>{r.value}</Text>
            </View>
          ))}
        </View>
        {/* EXP bar */}
        <View style={s.expSection}>
          <View style={s.expBarBg}>
            <View style={[s.expBarFill, { width: `${expPct}%` }]} />
          </View>
          <Text style={s.expLabel}>EXP  {heroExp} / {req.exp}</Text>
        </View>
      </View>

      {/* ── Level-up section ── */}
      <View style={s.levelUpBox}>
        <Text style={s.levelUpTitle}>LEVEL UP  →  LV.{hero.level + 1}</Text>
        <Text style={s.levelUpSub}>+10 MAX HP  ·  +3 ATK</Text>

        {/* Requirements list */}
        <View style={s.reqList}>
          <View style={s.reqRow}>
            <Text style={[s.reqCheck, hasEnoughExp ? s.checkOk : s.checkNo]}>
              {hasEnoughExp ? '✓' : '✗'}
            </Text>
            <Text style={s.reqText}>EXP  {heroExp}/{req.exp}</Text>
          </View>
          <View style={s.reqRow}>
            <Text style={[s.reqCheck, hasEnoughGold ? s.checkOk : s.checkNo]}>
              {hasEnoughGold ? '✓' : '✗'}
            </Text>
            <Text style={s.reqText}>GOLD  {gold}/{req.gold}</Text>
          </View>
          {Object.entries(req.fragments).map(([type, needed]) => {
            const have = fragments[type as FragmentType] ?? 0;
            const ok   = have >= (needed ?? 0);
            const info = FRAGMENT_INFO[type as FragmentType];
            return (
              <View key={type} style={s.reqRow}>
                <Text style={[s.reqCheck, ok ? s.checkOk : s.checkNo]}>
                  {ok ? '✓' : '✗'}
                </Text>
                <Text style={[s.reqText, { color: info.color }]}>
                  {info.emoji} {info.name.toUpperCase()}  {have}/{needed}
                </Text>
              </View>
            );
          })}
        </View>

        <TouchableOpacity
          style={[s.levelUpBtn, !canLevelUp && s.levelUpBtnOff]}
          onPress={() => levelUpHero(viewedCompanion)}
          disabled={!canLevelUp}
          activeOpacity={0.8}
        >
          <Text style={[s.levelUpBtnText, !canLevelUp && s.levelUpBtnTextOff]}>
            LEVEL UP
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Fragments ── */}
      <View style={s.fragsBox}>
        <Text style={s.fragsTitle}>FRAGMENTS</Text>
        <View style={s.fragsRow}>
          {(Object.keys(FRAGMENT_INFO) as FragmentType[]).map(type => {
            const info = FRAGMENT_INFO[type];
            return (
              <View key={type} style={s.fragChip}>
                <Text style={s.fragEmoji}>{info.emoji}</Text>
                <Text style={[s.fragCount, { color: info.color }]}>{fragments[type] ?? 0}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* ── Inventory ── */}
      <View style={s.invSection}>
        <Text style={s.invHeader}>INVENTORY  ({inventory.length})</Text>
        {inventory.length === 0 ? (
          <Text style={s.invEmpty}>Defeat bosses every 5 floors{'\n'}to unlock loot chests!</Text>
        ) : (
          <View style={s.invGrid}>
            {inventory.map(item => (
              <ItemCell
                key={item.id}
                item={item}
                selected={item.id === selectedId}
                onPress={() => handleInventoryPress(item)}
              />
            ))}
          </View>
        )}
      </View>

    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  scroll:    { flex: 1, backgroundColor: '#1e3158' },
  container: { padding: 16 },

  // Gold
  goldChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#1a2000',
    borderWidth: 2, borderColor: '#f39c12',
    paddingHorizontal: 14, paddingVertical: 7,
    marginBottom: 20,
  },
  goldText: { fontFamily: PIXEL, color: '#f1c40f', fontSize: 9, letterSpacing: 2 },

  // Paperdoll
  paperdoll:  { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  slotCol:    { width: SLOT_W, alignItems: 'center' },
  heroCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  companionNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
  },
  navBtn: {
    paddingHorizontal: 8, paddingVertical: 6,
    backgroundColor: '#243a6a',
    borderTopWidth: 2, borderLeftWidth: 2,
    borderBottomWidth: 3, borderRightWidth: 3,
    borderTopColor: '#3d5ca8', borderLeftColor: '#3d5ca8',
    borderBottomColor: '#0a1020', borderRightColor: '#0a1020',
  },
  navArrow: { fontFamily: PIXEL, color: '#7ec8f7', fontSize: 9 },
  companionInfo: { alignItems: 'center', minWidth: 80 },
  companionName: { fontFamily: PIXEL, color: '#e0c97f', fontSize: 5, marginTop: 4, textAlign: 'center' },
  heroSprite: { fontSize: 58, marginBottom: 0 },
  hpBarBg:    { width: '85%', height: 8, backgroundColor: '#2a3d6a', marginBottom: 6 },
  hpBarFill:  { height: '100%', backgroundColor: '#2ecc71' },
  heroLv:     { fontFamily: PIXEL, color: '#80a8e0', fontSize: 7 },

  // Hint bar
  hintBar: {
    backgroundColor: '#243a6a',
    borderWidth: 1, borderColor: '#3d5ca8',
    padding: 12, marginBottom: 14,
    alignItems: 'center', minHeight: 52,
  },
  hintItemName: { fontFamily: PIXEL, color: '#e8f0ff', fontSize: 7, marginBottom: 5 },
  hintSub:      { fontFamily: PIXEL, color: '#80a8e0', fontSize: 6, textAlign: 'center' },
  hintStats:    { fontFamily: PIXEL, color: '#c8dcff', fontSize: 6, marginTop: 5 },

  // Stats
  statsBox: {
    backgroundColor: '#243a6a',
    borderWidth: 1, borderColor: '#3d5ca8',
    marginBottom: 20,
  },
  statsGrid:  { flexDirection: 'row', flexWrap: 'wrap' },
  statCell:   { width: '50%', padding: 16, alignItems: 'center' },
  cellBorderL:{ borderLeftWidth: 1,  borderLeftColor:  '#3d5ca8' },
  cellBorderT:{ borderTopWidth: 1,   borderTopColor:   '#3d5ca8' },
  statLabel:  { fontFamily: PIXEL, color: '#80a8e0', fontSize: 7, marginBottom: 8 },
  statValue:  { fontFamily: PIXEL, fontSize: 14 },

  // EXP bar (inside statsBox)
  expSection:  { padding: 14, borderTopWidth: 1, borderTopColor: '#3d5ca8' },
  expBarBg:    { height: 8, backgroundColor: '#2a3d6a', marginBottom: 6 },
  expBarFill:  { height: '100%', backgroundColor: '#9b59b6' },
  expLabel:    { fontFamily: PIXEL, color: '#b080e0', fontSize: 6, textAlign: 'center' },

  // Level-up section
  levelUpBox: {
    backgroundColor: '#1a2a50',
    borderWidth: 1, borderColor: '#3d5ca8',
    padding: 14, marginBottom: 14,
  },
  levelUpTitle: { fontFamily: PIXEL, color: '#e0c97f', fontSize: 9, letterSpacing: 1, marginBottom: 4, textAlign: 'center' },
  levelUpSub:   { fontFamily: PIXEL, color: '#80a8e0', fontSize: 6, textAlign: 'center', marginBottom: 12 },
  reqList:      { marginBottom: 14 },
  reqRow:       { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  reqCheck:     { fontFamily: PIXEL, fontSize: 8, marginRight: 8, width: 14 },
  checkOk:      { color: '#2ecc71' },
  checkNo:      { color: '#e74c3c' },
  reqText:      { fontFamily: PIXEL, color: '#c8dcff', fontSize: 6 },
  levelUpBtn: {
    paddingVertical: 13, alignItems: 'center',
    backgroundColor: '#1a5a1a',
    borderTopWidth: 3, borderLeftWidth: 3, borderBottomWidth: 5, borderRightWidth: 5,
    borderTopColor: '#77ff77', borderLeftColor: '#77ff77',
    borderBottomColor: '#0a3010', borderRightColor: '#0a3010',
  },
  levelUpBtnOff: {
    backgroundColor: '#1a2a1a',
    borderTopColor: '#2a4a2a', borderLeftColor: '#2a4a2a',
    borderBottomColor: '#0a1008', borderRightColor: '#0a1008',
  },
  levelUpBtnText:    { fontFamily: PIXEL, color: '#fff', fontSize: 10, letterSpacing: 2 },
  levelUpBtnTextOff: { color: '#3a6a3a' },

  // Fragments row
  fragsBox:   { backgroundColor: '#243a6a', borderWidth: 1, borderColor: '#3d5ca8', padding: 12, marginBottom: 20 },
  fragsTitle: { fontFamily: PIXEL, color: '#a0c0f0', fontSize: 7, letterSpacing: 1, marginBottom: 10 },
  fragsRow:   { flexDirection: 'row', justifyContent: 'space-around' },
  fragChip:   { alignItems: 'center' },
  fragEmoji:  { fontSize: 18, marginBottom: 4 },
  fragCount:  { fontFamily: PIXEL, fontSize: 8 },

  // Inventory
  invSection: { marginBottom: 32 },
  invHeader:  { fontFamily: PIXEL, color: '#a0c0f0', fontSize: 8, letterSpacing: 1, marginBottom: 12 },
  invEmpty:   { fontFamily: PIXEL, color: '#6090d0', fontSize: 7, textAlign: 'center', lineHeight: 16, paddingVertical: 24 },
  invGrid:    { flexDirection: 'row', flexWrap: 'wrap' },
});
