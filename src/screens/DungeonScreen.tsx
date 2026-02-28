import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Animated,
} from 'react-native';
import { useGameStore, RARITY_COLOR, COMPANIONS, type Item } from '../store/gameStore';
import { startDungeonCombat } from '../services/dungeonCombat';

const PIXEL = 'PressStart2P_400Regular';

// ─── Smooth HP bar ─────────────────────────────────────────────────────────────
function SmoothBar({ pct, color }: { pct: number; color: string }) {
  const anim = useRef(new Animated.Value(pct)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: pct,
      duration: 150,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  const width = anim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  return (
    <View style={sb.track}>
      <Animated.View style={[sb.fill, { width, backgroundColor: color }]} />
    </View>
  );
}
const sb = StyleSheet.create({
  track: {
    alignSelf: 'stretch',
    height: 10,
    backgroundColor: '#1a2840',
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: 8,
  },
  fill: { height: '100%', borderRadius: 5 },
});

// ─── Item card ─────────────────────────────────────────────────────────────────
function ItemCard({ item }: { item: Item }) {
  return (
    <View style={[ic.row, { borderLeftColor: RARITY_COLOR[item.rarity] }]}>
      <Text style={ic.emoji}>{item.emoji}</Text>
      <View style={ic.info}>
        <Text style={ic.name} numberOfLines={1}>{item.name.toUpperCase()}</Text>
        <Text style={[ic.rarity, { color: RARITY_COLOR[item.rarity] }]}>
          {item.rarity.toUpperCase()}
        </Text>
        <Text style={ic.stats}>
          {[
            item.bonusAttack  > 0 && `+${item.bonusAttack} ATK`,
            item.bonusDefense > 0 && `+${item.bonusDefense} DEF`,
            item.bonusHp      > 0 && `+${item.bonusHp} HP`,
          ].filter(Boolean).join('  ')}
        </Text>
      </View>
    </View>
  );
}
const ic = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#182848',
    borderLeftWidth: 4,
    paddingVertical: 10, paddingHorizontal: 12,
    marginBottom: 8,
  },
  emoji:  { fontSize: 28, marginRight: 12 },
  info:   { flex: 1 },
  name:   { fontFamily: PIXEL, color: '#fff', fontSize: 7, marginBottom: 3 },
  rarity: { fontFamily: PIXEL, fontSize: 6, marginBottom: 3 },
  stats:  { fontFamily: PIXEL, color: '#80a8e0', fontSize: 6 },
});

// ─── Hero stats panel (always visible) ────────────────────────────────────────
function HeroStatsPanel({ hero }: { hero: { maxHp: number; attack: number; defense: number; level: number } }) {
  return (
    <View style={hs.box}>
      <View style={hs.row}>
        <View style={hs.cell}>
          <Text style={hs.label}>LV</Text>
          <Text style={[hs.value, { color: '#f1c40f' }]}>{hero.level}</Text>
        </View>
        <View style={hs.sep} />
        <View style={hs.cell}>
          <Text style={hs.label}>HP</Text>
          <Text style={[hs.value, { color: '#2ecc71' }]}>{hero.maxHp}</Text>
        </View>
        <View style={hs.sep} />
        <View style={hs.cell}>
          <Text style={hs.label}>ATK</Text>
          <Text style={[hs.value, { color: '#e74c3c' }]}>{hero.attack}</Text>
        </View>
        <View style={hs.sep} />
        <View style={hs.cell}>
          <Text style={hs.label}>DEF</Text>
          <Text style={[hs.value, { color: '#3498db' }]}>{hero.defense}</Text>
        </View>
      </View>
    </View>
  );
}
const hs = StyleSheet.create({
  box: {
    backgroundColor: '#111d36',
    borderTopWidth: 2, borderTopColor: '#2a3d6a',
    paddingVertical: 10, paddingHorizontal: 4,
  },
  row:   { flexDirection: 'row', alignItems: 'center' },
  cell:  { flex: 1, alignItems: 'center', gap: 4 },
  sep:   { width: 1, height: 28, backgroundColor: '#2a3d6a' },
  label: { fontFamily: 'PressStart2P_400Regular', color: '#4a6080', fontSize: 5, letterSpacing: 1 },
  value: { fontFamily: 'PressStart2P_400Regular', fontSize: 9, letterSpacing: 1 },
});

// ─── Main screen ───────────────────────────────────────────────────────────────
export default function DungeonScreen() {
  const {
    heroes, enemy, dungeonLevel,
    dungeonRunning, dungeonChestQueue, dungeonDeathFloor, dungeonPendingGold,
    checkpointFloor, openNextDungeonChest, returnToCheckpoint,
  } = useGameStore();
  const assignedDungeon = useGameStore(s => s.assignedCompanions.dungeon);
  const hero = heroes[assignedDungeon ?? 'ironGuard'];

  // Track items from the most recently opened chest to display them
  const [lastOpenedItems, setLastOpenedItems] = useState<Item[] | null>(null);

  // ── Derive screen phase from store state ────────────────────────────────────
  // running → RUNNING view
  // death floor set + chests queued → CHEST OPEN view
  // death floor set + no chests     → DEATH SUMMARY + START view
  // no death floor                  → INITIAL START view
  const screenPhase =
    dungeonRunning                                     ? 'running'
    : dungeonDeathFloor !== null && dungeonChestQueue.length > 0 ? 'chest'
    : dungeonDeathFloor !== null                       ? 'deathSummary'
    : 'start';

  const heroHpPct  = (hero.hp  / Math.max(1, hero.maxHp))  * 100;
  const enemyHpPct = (enemy.hp / Math.max(1, enemy.maxHp)) * 100;

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleStartDungeon = () => {
    setLastOpenedItems(null);
    returnToCheckpoint();
    startDungeonCombat();
  };

  const handleOpenChest = () => {
    const items = dungeonChestQueue[0];
    openNextDungeonChest();
    useGameStore.getState().gainAccountExp(10);
    setLastOpenedItems(items ?? null);
  };

  // ── RUNNING view ─────────────────────────────────────────────────────────────
  if (screenPhase === 'running') {
    return (
      <View style={s.container}>
        <View style={s.header}>
          <Text style={s.floorLabel}>
            {enemy.isBoss ? '⚡ BOSS ' : 'FLOOR '}{String(dungeonLevel).padStart(2, '0')}
          </Text>
        </View>

        {checkpointFloor > 1 && (
          <View style={s.cpBanner}>
            <Text style={s.cpBannerText}>⚑  CHECKPOINT: FLOOR {String(checkpointFloor).padStart(2, '0')}</Text>
          </View>
        )}

        <View style={s.battleSection}>
          {enemy.isBoss && <Text style={s.bossBadge}>★ BOSS ★</Text>}
          <Text style={[s.enemySprite, enemy.isBoss && s.bossSprite]}>{enemy.emoji}</Text>
          <Text style={s.enemyName}>{enemy.name.toUpperCase()}</Text>
          <SmoothBar pct={enemyHpPct} color={enemy.isBoss ? '#f39c12' : '#e74c3c'} />

          <View style={s.divider} />

          <Text style={s.heroSprite}>
            {COMPANIONS[assignedDungeon ?? 'ironGuard'].emoji}
          </Text>
          <Text style={s.heroName}>HERO LV.{hero.level}</Text>
          <SmoothBar pct={heroHpPct} color="#2ecc71" />
        </View>

        {/* Run progress bar */}
        <View style={s.runBar}>
          <View style={s.runBarItem}>
            <Text style={s.runBarLabel}>GOLD EARNED</Text>
            <Text style={s.runBarGold}>💰 {dungeonPendingGold}</Text>
          </View>
          <View style={s.runBarDivider} />
          <View style={s.runBarItem}>
            <Text style={s.runBarLabel}>CHESTS</Text>
            <Text style={s.runBarChests}>📦 {dungeonChestQueue.length}</Text>
          </View>
        </View>

        <View style={s.statusArea}>
          <Text style={s.inProgressText}>⏳ IN PROGRESS...</Text>
          <Text style={s.inProgressSub}>AUTO-FIGHTING — CHECK BACK LATER</Text>
        </View>

        <HeroStatsPanel hero={hero} />
      </View>
    );
  }

  // ── CHEST OPEN view ──────────────────────────────────────────────────────────
  if (screenPhase === 'chest') {
    const totalChests = dungeonChestQueue.length + (lastOpenedItems ? 1 : 0);
    const openedSoFar = lastOpenedItems ? 1 : 0;
    const remaining   = dungeonChestQueue.length;
    const chestIndex  = openedSoFar + 1;

    return (
      <View style={s.container}>
        <View style={s.header}>
          <Text style={s.floorLabel}>✖ DEFEATED AT FLOOR {String(dungeonDeathFloor ?? 0).padStart(2, '0')}</Text>
        </View>

        <ScrollView contentContainerStyle={s.chestScroll}>
          <Text style={s.chestTitle}>📦 CHEST FOUND!</Text>
          <Text style={s.chestSub}>{remaining} CHEST{remaining !== 1 ? 'S' : ''} REMAINING</Text>

          {lastOpenedItems && (
            <View style={s.openedSection}>
              <Text style={s.openedLabel}>ITEMS RECEIVED:</Text>
              {lastOpenedItems.map(item => <ItemCard key={item.id} item={item} />)}
            </View>
          )}

          <TouchableOpacity style={s.actionBtn} onPress={handleOpenChest} activeOpacity={0.85}>
            <Text style={s.actionBtnText}>
              OPEN CHEST {chestIndex} OF {totalChests}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        <HeroStatsPanel hero={hero} />
      </View>
    );
  }

  // ── DEATH SUMMARY / START view ───────────────────────────────────────────────
  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.floorLabel}>DUNGEON</Text>
      </View>

      <ScrollView contentContainerStyle={s.startScroll}>
        {screenPhase === 'deathSummary' && (
          <View style={s.deathBanner}>
            <Text style={s.deathTitle}>✖ DEFEATED</Text>
            <Text style={s.deathSub}>FLOOR {String(dungeonDeathFloor ?? 0).padStart(2, '0')}</Text>
            {lastOpenedItems && (
              <View style={s.openedSection}>
                <Text style={s.openedLabel}>LAST CHEST ITEMS:</Text>
                {lastOpenedItems.map(item => <ItemCard key={item.id} item={item} />)}
              </View>
            )}
          </View>
        )}

        {checkpointFloor > 1 && (
          <View style={s.checkpointInfo}>
            <Text style={s.checkpointInfoText}>
              ⚑  STARTS FROM FLOOR {String(checkpointFloor).padStart(2, '0')}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[s.actionBtn, s.startDungeonBtn]}
          onPress={handleStartDungeon}
          activeOpacity={0.85}
        >
          <Text style={s.actionBtnText}>
            {screenPhase === 'deathSummary' ? 'RETRY DUNGEON' : 'START DUNGEON'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <HeroStatsPanel hero={hero} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e3158' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: '#182848',
    borderBottomWidth: 2, borderBottomColor: '#3d5ca8',
  },
  floorLabel: { fontFamily: PIXEL, color: '#e0c97f', fontSize: 9, letterSpacing: 2, flex: 1 },

  cpBanner: {
    paddingVertical: 6, paddingHorizontal: 20,
    backgroundColor: '#102840',
    borderBottomWidth: 1, borderBottomColor: '#1a3a60',
    alignItems: 'center',
  },
  cpBannerText: { fontFamily: PIXEL, color: '#4ad0ff', fontSize: 7, letterSpacing: 1 },

  // ── Running view ──────────────────────────────────────────────────────────
  battleSection: {
    alignItems: 'center',
    paddingVertical: 28, paddingHorizontal: 24,
    backgroundColor: '#243a6a',
    borderBottomWidth: 2, borderBottomColor: '#3d5ca8',
  },
  bossBadge:   { fontFamily: PIXEL, color: '#f39c12', fontSize: 7, letterSpacing: 1, marginBottom: 4 },
  enemySprite: { fontSize: 56, marginBottom: 6 },
  bossSprite:  { fontSize: 64 },
  enemyName:   { fontFamily: PIXEL, color: '#80a8e0', fontSize: 7, letterSpacing: 1, marginBottom: 4 },
  divider:     { height: 1, alignSelf: 'stretch', backgroundColor: '#3d5ca8', marginVertical: 20 },
  heroSprite:  { fontSize: 52, marginBottom: 6 },
  heroName:    { fontFamily: PIXEL, color: '#80a8e0', fontSize: 7, letterSpacing: 1, marginBottom: 4 },

  // Run progress bar (gold + chests during active run)
  runBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0e1a30',
    borderTopWidth: 1, borderTopColor: '#2a3d6a',
    borderBottomWidth: 1, borderBottomColor: '#2a3d6a',
    paddingVertical: 10,
  },
  runBarItem:    { flex: 1, alignItems: 'center', gap: 4 },
  runBarDivider: { width: 1, height: 32, backgroundColor: '#2a3d6a' },
  runBarLabel:   { fontFamily: PIXEL, color: '#4a6080', fontSize: 5, letterSpacing: 1 },
  runBarGold:    { fontFamily: PIXEL, color: '#f1c40f', fontSize: 10, letterSpacing: 1 },
  runBarChests:  { fontFamily: PIXEL, color: '#f39c12', fontSize: 10, letterSpacing: 1 },

  statusArea: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: '#182848',
  },
  inProgressText: { fontFamily: PIXEL, color: '#e0c97f', fontSize: 10, letterSpacing: 2 },
  inProgressSub:  { fontFamily: PIXEL, color: '#4a6080', fontSize: 6, letterSpacing: 1 },

  // ── Chest / Death / Start shared ─────────────────────────────────────────
  chestScroll: { padding: 20, alignItems: 'center' },
  startScroll: { padding: 20, alignItems: 'center' },

  chestTitle: { fontFamily: PIXEL, color: '#f39c12', fontSize: 12, letterSpacing: 2, marginBottom: 6 },
  chestSub:   { fontFamily: PIXEL, color: '#80a8e0', fontSize: 7, marginBottom: 20 },

  openedSection: { alignSelf: 'stretch', marginBottom: 16 },
  openedLabel:   { fontFamily: PIXEL, color: '#2ecc71', fontSize: 7, letterSpacing: 1, marginBottom: 8 },

  actionBtn: {
    width: '100%', paddingVertical: 18,
    alignItems: 'center',
    backgroundColor: '#7a4d00',
    borderTopWidth: 3, borderLeftWidth: 3, borderBottomWidth: 5, borderRightWidth: 5,
    borderTopColor: '#f39c12', borderLeftColor: '#f39c12',
    borderBottomColor: '#3a2000', borderRightColor: '#3a2000',
    marginBottom: 16,
  },
  startDungeonBtn: {
    backgroundColor: '#1a6b1a',
    borderTopColor: '#77ff77', borderLeftColor: '#77ff77',
    borderBottomColor: '#0a3010', borderRightColor: '#0a3010',
  },
  actionBtnText: { fontFamily: PIXEL, color: '#fff', fontSize: 10, letterSpacing: 2 },

  deathBanner: { alignSelf: 'stretch', marginBottom: 20 },
  deathTitle:  { fontFamily: PIXEL, color: '#e74c3c', fontSize: 14, letterSpacing: 2, marginBottom: 6, textAlign: 'center' },
  deathSub:    { fontFamily: PIXEL, color: '#80a8e0', fontSize: 8, textAlign: 'center', marginBottom: 16 },

  checkpointInfo: {
    alignSelf: 'stretch', marginBottom: 16,
    paddingVertical: 8, paddingHorizontal: 12,
    backgroundColor: '#102840',
    borderTopWidth: 1, borderLeftWidth: 1, borderBottomWidth: 2, borderRightWidth: 2,
    borderTopColor: '#4ad0ff', borderLeftColor: '#4ad0ff',
    borderBottomColor: '#0a1a40', borderRightColor: '#0a1a40',
    alignItems: 'center',
  },
  checkpointInfoText: { fontFamily: PIXEL, color: '#4ad0ff', fontSize: 7, letterSpacing: 1 },

});
