import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert,
} from 'react-native';
import { useGameStore, RARITY_COLOR, type Item } from '../store/gameStore';
import { startDungeonCombat } from '../services/dungeonCombat';

const PIXEL = 'PressStart2P_400Regular';

// ─── Pixel HP bar ──────────────────────────────────────────────────────────────
function PixelHpBar({ pct, color }: { pct: number; color: string }) {
  const BLOCKS = 8;
  const filled = Math.max(0, Math.round((Math.max(0, Math.min(100, pct)) / 100) * BLOCKS));
  return (
    <View style={hp.row}>
      {Array.from({ length: BLOCKS }).map((_, i) => (
        <View key={i} style={[hp.block, { backgroundColor: i < filled ? color : '#2a3d6a' }]} />
      ))}
    </View>
  );
}
const hp = StyleSheet.create({
  row:   { flexDirection: 'row', gap: 3, marginTop: 8 },
  block: { width: 11, height: 11 },
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

// ─── Main screen ───────────────────────────────────────────────────────────────
export default function DungeonScreen() {
  const {
    hero, enemy, dungeonLevel,
    dungeonRunning, dungeonChestQueue, dungeonDeathFloor,
    checkpointFloor, openNextDungeonChest, returnToCheckpoint, resetGame,
  } = useGameStore();

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
    setLastOpenedItems(items ?? null);
  };

  const handleReset = () => {
    Alert.alert(
      'RESET GAME',
      'Tüm ilerleme silinecek. Emin misin?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'SIFIRLA', style: 'destructive',
          onPress: () => { resetGame(); setLastOpenedItems(null); },
        },
      ],
    );
  };

  // ── RUNNING view ─────────────────────────────────────────────────────────────
  if (screenPhase === 'running') {
    return (
      <View style={s.container}>
        <View style={s.header}>
          <Text style={s.floorLabel}>
            {enemy.isBoss ? '⚡ BOSS ' : 'FLOOR '}{String(dungeonLevel).padStart(2, '0')}
          </Text>
          <TouchableOpacity style={s.resetBtn} onPress={handleReset} activeOpacity={0.75}>
            <Text style={s.resetBtnText}>↺</Text>
          </TouchableOpacity>
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
          <PixelHpBar pct={enemyHpPct} color={enemy.isBoss ? '#f39c12' : '#e74c3c'} />

          <View style={s.divider} />

          <Text style={s.heroSprite}>🧙</Text>
          <Text style={s.heroName}>HERO LV.{hero.level}</Text>
          <PixelHpBar pct={heroHpPct} color="#2ecc71" />
        </View>

        <View style={s.statusArea}>
          <Text style={s.inProgressText}>⏳ IN PROGRESS...</Text>
          <Text style={s.inProgressSub}>AUTO-FIGHTING — CHECK BACK LATER</Text>
        </View>
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
          <TouchableOpacity style={s.resetBtn} onPress={handleReset} activeOpacity={0.75}>
            <Text style={s.resetBtnText}>↺</Text>
          </TouchableOpacity>
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
      </View>
    );
  }

  // ── DEATH SUMMARY / START view ───────────────────────────────────────────────
  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.floorLabel}>DUNGEON</Text>
        <TouchableOpacity style={s.resetBtn} onPress={handleReset} activeOpacity={0.75}>
          <Text style={s.resetBtnText}>↺</Text>
        </TouchableOpacity>
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

        <View style={s.heroStatsBox}>
          <Text style={s.heroStatsTitle}>HERO STATS</Text>
          <View style={s.statsGrid}>
            <Text style={[s.statItem, { color: '#2ecc71' }]}>HP {hero.maxHp}</Text>
            <Text style={[s.statItem, { color: '#e74c3c' }]}>ATK {hero.attack}</Text>
            <Text style={[s.statItem, { color: '#3498db' }]}>DEF {hero.defense}</Text>
            <Text style={[s.statItem, { color: '#f1c40f' }]}>LV {hero.level}</Text>
          </View>
        </View>
      </ScrollView>
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

  resetBtn: {
    width: 32, height: 32,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#2a1010',
    borderTopWidth: 2, borderLeftWidth: 2, borderBottomWidth: 4, borderRightWidth: 4,
    borderTopColor: '#c0392b', borderLeftColor: '#c0392b',
    borderBottomColor: '#5a0a0a', borderRightColor: '#5a0a0a',
  },
  resetBtnText: { fontFamily: PIXEL, color: '#e74c3c', fontSize: 14 },

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

  heroStatsBox: {
    alignSelf: 'stretch',
    backgroundColor: '#182848',
    borderTopWidth: 2, borderLeftWidth: 2, borderBottomWidth: 4, borderRightWidth: 4,
    borderTopColor: '#3d5ca8', borderLeftColor: '#3d5ca8',
    borderBottomColor: '#0a1838', borderRightColor: '#0a1838',
    padding: 16,
  },
  heroStatsTitle: { fontFamily: PIXEL, color: '#e0c97f', fontSize: 7, letterSpacing: 1, marginBottom: 12, textAlign: 'center' },
  statsGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  statItem:       { fontFamily: PIXEL, fontSize: 8, letterSpacing: 1 },
});
