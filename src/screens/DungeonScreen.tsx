import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Dimensions, Alert,
} from 'react-native';
import { useGameStore, generateChestItems, RARITY_COLOR, type Item } from '../store/gameStore';

const { width: SW } = Dimensions.get('window');
const PIXEL      = 'PressStart2P_400Regular';
const HERO_LUNGE = SW * 0.22;

type WavePhase = 'idle' | 'fighting' | 'won' | 'dead';

// ─── Pixel HP bar ──────────────────────────────────────────────────────────────
function PixelHpBar({ pct, color }: { pct: number; color: string }) {
  const BLOCKS = 8;
  const filled = Math.max(0, Math.round((pct / 100) * BLOCKS));
  return (
    <View style={hp.row}>
      {Array.from({ length: BLOCKS }).map((_, i) => (
        <View key={i} style={[hp.block, { backgroundColor: i < filled ? color : '#2a3d6a' }]} />
      ))}
    </View>
  );
}
const hp = StyleSheet.create({
  row: { flexDirection: 'row', gap: 3, marginTop: 10 },
  block: { width: 11, height: 11 },
});

// ─── Chest overlay (shown after boss kill) ─────────────────────────────────────
function ChestOverlay({ items, onCollect }: { items: Item[]; onCollect: () => void }) {
  return (
    <View style={co.backdrop}>
      <View style={co.box}>
        <Text style={co.chest}>📦</Text>
        <Text style={co.title}>CHEST FOUND!</Text>
        <Text style={co.subtitle}>BOSS DEFEATED</Text>

        {items.map(item => (
          <View key={item.id} style={[co.itemRow, { borderLeftColor: RARITY_COLOR[item.rarity], borderLeftWidth: 4 }]}>
            <Text style={co.itemEmoji}>{item.emoji}</Text>
            <View style={co.itemInfo}>
              <Text style={co.itemName} numberOfLines={1}>{item.name.toUpperCase()}</Text>
              <Text style={[co.itemRarity, { color: RARITY_COLOR[item.rarity] }]}>
                {item.rarity.toUpperCase()}
              </Text>
              <Text style={co.itemStats}>
                {[
                  item.bonusAttack  > 0 && `+${item.bonusAttack} ATK`,
                  item.bonusDefense > 0 && `+${item.bonusDefense} DEF`,
                  item.bonusHp      > 0 && `+${item.bonusHp} HP`,
                ].filter(Boolean).join('  ')}
              </Text>
            </View>
          </View>
        ))}

        <TouchableOpacity style={co.btn} onPress={onCollect} activeOpacity={0.85}>
          <Text style={co.btnText}>COLLECT ALL</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
const co = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  box: {
    width: SW - 48,
    backgroundColor: '#243a6a',
    borderTopWidth: 3, borderLeftWidth: 3, borderBottomWidth: 6, borderRightWidth: 6,
    borderTopColor: '#f39c12', borderLeftColor: '#f39c12',
    borderBottomColor: '#7a4d00', borderRightColor: '#7a4d00',
    padding: 20,
    alignItems: 'center',
  },
  chest:    { fontSize: 48, marginBottom: 4 },
  title:    { fontFamily: PIXEL, color: '#f39c12', fontSize: 12, letterSpacing: 2, marginBottom: 2 },
  subtitle: { fontFamily: PIXEL, color: '#80a8e0', fontSize: 7, marginBottom: 16 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#182848',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  itemEmoji:  { fontSize: 28, marginRight: 12 },
  itemInfo:   { flex: 1 },
  itemName:   { fontFamily: PIXEL, color: '#fff', fontSize: 7, marginBottom: 3 },
  itemRarity: { fontFamily: PIXEL, fontSize: 6, marginBottom: 3 },
  itemStats:  { fontFamily: PIXEL, color: '#80a8e0', fontSize: 6 },
  btn: {
    marginTop: 12,
    width: '100%',
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#7a4d00',
    borderTopWidth: 3, borderLeftWidth: 3, borderBottomWidth: 5, borderRightWidth: 5,
    borderTopColor: '#f39c12', borderLeftColor: '#f39c12',
    borderBottomColor: '#3a2000', borderRightColor: '#3a2000',
  },
  btnText: { fontFamily: PIXEL, color: '#fff', fontSize: 11, letterSpacing: 2 },
});

// ─── Main screen ───────────────────────────────────────────────────────────────
export default function DungeonScreen() {
  const {
    hero, enemy, dungeonLevel,
    damageEnemy, damageHero, gainGold, advanceDungeon,
    spawnEnemy, setHero,
    setPendingChest, collectChest, pendingChest,
    checkpointFloor, saveCheckpoint, returnToCheckpoint,
    resetGame, addExp,
  } = useGameStore();

  const [phase, setPhase] = useState<WavePhase>('idle');

  const combatActive = useRef(false);
  const roundTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animated values
  const heroX      = useRef(new Animated.Value(0)).current;
  const heroFlash  = useRef(new Animated.Value(0)).current;
  const enemyX     = useRef(new Animated.Value(0)).current;
  const enemyFlash = useRef(new Animated.Value(0)).current;
  const enemyScale = useRef(new Animated.Value(1)).current;
  const enemyOp    = useRef(new Animated.Value(1)).current;

  const heroFlashBg = heroFlash.interpolate({
    inputRange: [0, 1], outputRange: ['rgba(255,0,0,0)', 'rgba(255,0,0,0.65)'],
  });
  const enemyFlashBg = enemyFlash.interpolate({
    inputRange: [0, 1], outputRange: ['rgba(255,0,0,0)', 'rgba(255,0,0,0.72)'],
  });

  useEffect(() => () => {
    combatActive.current = false;
    if (roundTimeout.current) clearTimeout(roundTimeout.current);
  }, []);

  // ── Combat loop ──────────────────────────────────────────────────────────────
  const runRound = () => {
    if (!combatActive.current) return;

    // Hero attacks
    Animated.sequence([
      Animated.timing(heroX, { toValue: HERO_LUNGE, duration: 130, useNativeDriver: true }),
      Animated.timing(heroX, { toValue: 0,           duration: 120, useNativeDriver: true }),
    ]).start(() => {
      if (!combatActive.current) return;

      damageEnemy(useGameStore.getState().hero.attack);
      const freshEnemy = useGameStore.getState().enemy;

      if (freshEnemy.hp <= 0) {
        combatActive.current = false;
        gainGold(freshEnemy.goldReward);

        Animated.parallel([
          Animated.timing(enemyOp,    { toValue: 0,    duration: 550, useNativeDriver: true }),
          Animated.timing(enemyScale, { toValue: 0.05, duration: 550, useNativeDriver: true }),
        ]).start(() => {
          enemyOp.setValue(1);
          enemyScale.setValue(1);

          if (freshEnemy.isBoss) {
            // Boss: open chest overlay, defer advance until collected
            setPendingChest(generateChestItems(dungeonLevel));
          } else {
            const expGain = useGameStore.getState().dungeonLevel;
            advanceDungeon();
            addExp(expGain);
            const h = useGameStore.getState().hero;
            setHero({ hp: Math.min(h.maxHp, h.hp + Math.floor(h.maxHp * 0.20)) });
            setPhase('won');
          }
        });
        return;
      }

      // Enemy counter-attacks
      roundTimeout.current = setTimeout(() => {
        if (!combatActive.current) return;

        // Flash (non-native, fire-and-forget)
        Animated.sequence([
          Animated.timing(enemyFlash, { toValue: 1, duration: 60,  useNativeDriver: false }),
          Animated.timing(enemyFlash, { toValue: 0, duration: 220, useNativeDriver: false }),
        ]).start();

        // Lunge left (native)
        Animated.sequence([
          Animated.timing(enemyX, { toValue: -HERO_LUNGE, duration: 130, useNativeDriver: true }),
          Animated.timing(enemyX, { toValue: 0,            duration: 120, useNativeDriver: true }),
        ]).start(() => {
          if (!combatActive.current) return;

          damageHero(useGameStore.getState().enemy.attack);
          const freshHero = useGameStore.getState().hero;

          if (freshHero.hp <= 0) {
            combatActive.current = false;
            Animated.sequence([
              Animated.timing(heroFlash, { toValue: 1, duration: 80,  useNativeDriver: false }),
              Animated.timing(heroFlash, { toValue: 0, duration: 500, useNativeDriver: false }),
            ]).start(() => setPhase('dead'));
            return;
          }

          roundTimeout.current = setTimeout(runRound, 450);
        });
      }, 220);
    });
  };

  const startWave = () => {
    if (phase === 'dead') {
      setHero({ hp: useGameStore.getState().hero.maxHp });
      spawnEnemy();
    }
    combatActive.current = true;
    setPhase('fighting');
    runRound();
  };

  const handleCollectChest = () => {
    const expGain = useGameStore.getState().dungeonLevel * 3;
    collectChest();
    advanceDungeon();   // dungeonLevel++
    saveCheckpoint();   // checkpoint = new dungeonLevel (floor after beaten boss)
    addExp(expGain);
    const h = useGameStore.getState().hero;
    setHero({ hp: Math.min(h.maxHp, h.hp + Math.floor(h.maxHp * 0.20)) });
    setPhase('won');
  };

  const handleReturnToCheckpoint = () => {
    returnToCheckpoint();   // resets dungeonLevel, enemy, restores hero HP
    setPhase('idle');
  };

  const handleReset = () => {
    Alert.alert(
      'RESET GAME',
      'Tüm ilerleme silinecek. Emin misin?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'SIFIRLA', style: 'destructive',
          onPress: () => { resetGame(); setPhase('idle'); },
        },
      ],
    );
  };

  const heroHpPct  = (hero.hp  / hero.maxHp)  * 100;
  const enemyHpPct = (enemy.hp / enemy.maxHp) * 100;
  const enemyHpColor = enemy.isBoss ? '#f39c12' : '#e74c3c';

  type BtnCfg = { label: string; bg: string; hi: string; lo: string };
  const waveCfg: Record<WavePhase, BtnCfg> = {
    idle:     { label: `ENTER FLOOR ${dungeonLevel}`, bg: '#8b1a1a', hi: '#ff7777', lo: '#4a0000' },
    fighting: { label: 'FIGHTING...',                  bg: '#252525', hi: '#444',    lo: '#111'    },
    won:      { label: `ENTER FLOOR ${dungeonLevel}`, bg: '#1a6b1a', hi: '#77ff77', lo: '#0a3010' },
    dead:     { label: `RETRY FLOOR ${dungeonLevel}`, bg: '#6b4a00', hi: '#ffaa44', lo: '#2a1a00' },
  };
  const cfg = waveCfg[phase];

  const statusText: Record<WavePhase, string> = {
    idle:     'READY',
    fighting: enemy.isBoss ? 'BOSS FIGHT!' : 'BATTLE!',
    won:      'VICTORY!',
    dead:     'DEFEATED...',
  };
  const statusColor: Record<WavePhase, string> = {
    idle: '#6080b8', fighting: enemy.isBoss ? '#f39c12' : '#e0c97f', won: '#2ecc71', dead: '#e74c3c',
  };

  return (
    <View style={s.container}>

      {/* ── Header ── */}
      <View style={s.header}>
        <Text style={s.floorLabel}>
          {enemy.isBoss ? '⚡ BOSS ' : 'FLOOR '}{String(dungeonLevel).padStart(2, '0')}
        </Text>
        <Text style={[s.statusLabel, { color: statusColor[phase] }]}>
          {statusText[phase]}
        </Text>
        <TouchableOpacity style={s.resetBtn} onPress={handleReset} activeOpacity={0.75}>
          <Text style={s.resetBtnText}>↺</Text>
        </TouchableOpacity>
      </View>

      {/* ── Checkpoint banner (shown once a checkpoint exists) ── */}
      {checkpointFloor > 1 && (
        <View style={s.cpBanner}>
          <Text style={s.cpBannerText}>⚑  CHECKPOINT: FLOOR {String(checkpointFloor).padStart(2, '0')}</Text>
        </View>
      )}

      {/* ── Battle row ── */}
      <View style={s.battleRow}>

        {/* Hero */}
        <View style={s.fighterCol}>
          <Animated.View style={[s.spriteWrap, { transform: [{ translateX: heroX }] }]}>
            <Text style={s.sprite}>🧙</Text>
            <Animated.View
              style={[StyleSheet.absoluteFillObject, { backgroundColor: heroFlashBg }]}
              pointerEvents="none"
            />
          </Animated.View>
          <PixelHpBar pct={heroHpPct} color="#2ecc71" />
          <Text style={s.fighterName}>HERO LV.{hero.level}</Text>
        </View>

        <Text style={s.sword}>⚔</Text>

        {/* Enemy */}
        <View style={s.fighterCol}>
          {enemy.isBoss && <Text style={s.bossBadge}>★ BOSS ★</Text>}
          <Animated.View
            style={[
              s.spriteWrap,
              { transform: [{ translateX: enemyX }, { scale: enemyScale }], opacity: enemyOp },
            ]}
          >
            <Text style={[s.sprite, enemy.isBoss && s.bossSprite]}>{enemy.emoji}</Text>
            <Animated.View
              style={[StyleSheet.absoluteFillObject, { backgroundColor: enemyFlashBg }]}
              pointerEvents="none"
            />
          </Animated.View>
          <PixelHpBar pct={enemyHpPct} color={enemyHpColor} />
          <Text style={s.fighterName} numberOfLines={1}>{enemy.name.toUpperCase()}</Text>
        </View>

      </View>

      {/* ── Wave button + checkpoint return ── */}
      <View style={s.waveBtnArea}>
        <TouchableOpacity
          style={[s.waveBtn, { backgroundColor: cfg.bg, borderTopColor: cfg.hi, borderLeftColor: cfg.hi, borderBottomColor: cfg.lo, borderRightColor: cfg.lo }]}
          onPress={startWave}
          disabled={phase === 'fighting'}
          activeOpacity={0.85}
        >
          <Text style={[s.waveBtnLabel, phase === 'fighting' && { color: '#555' }]}>
            {cfg.label}
          </Text>
        </TouchableOpacity>

        {/* Checkpoint return — only visible when dead and checkpoint is at a different floor */}
        {phase === 'dead' && checkpointFloor !== dungeonLevel && (
          <TouchableOpacity style={s.cpBtn} onPress={handleReturnToCheckpoint} activeOpacity={0.85}>
            <Text style={s.cpBtnTop}>↩  RETURN TO CHECKPOINT</Text>
            <Text style={s.cpBtnSub}>FLOOR {String(checkpointFloor).padStart(2, '0')}  ·  HP RESTORED</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Chest overlay (boss reward) ── */}
      {pendingChest && (
        <ChestOverlay items={pendingChest} onCollect={handleCollectChest} />
      )}

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const PIXEL_FONT = 'PressStart2P_400Regular';

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e3158' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: '#182848',
    borderBottomWidth: 2, borderBottomColor: '#3d5ca8',
  },
  floorLabel:  { fontFamily: PIXEL_FONT, color: '#e0c97f', fontSize: 10, letterSpacing: 2 },
  statusLabel: { fontFamily: PIXEL_FONT, fontSize: 9, letterSpacing: 1 },

  battleRow: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingVertical: 28,
    backgroundColor: '#243a6a',
    borderBottomWidth: 2, borderBottomColor: '#3d5ca8',
  },
  fighterCol: { flex: 1, alignItems: 'center' },
  sword:      { fontSize: 22, alignSelf: 'center', marginTop: 14, marginHorizontal: 4 },

  bossBadge: {
    fontFamily: PIXEL_FONT, color: '#f39c12', fontSize: 6,
    letterSpacing: 1, marginBottom: 4,
  },
  spriteWrap: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  sprite:     { fontSize: 52 },
  bossSprite: { fontSize: 58 },
  fighterName:{ fontFamily: PIXEL_FONT, color: '#80a8e0', fontSize: 6, marginTop: 8, letterSpacing: 1, textAlign: 'center' },

  // Checkpoint banner (below header)
  cpBanner: {
    paddingVertical: 6, paddingHorizontal: 20,
    backgroundColor: '#102840',
    borderBottomWidth: 1, borderBottomColor: '#1a3a60',
    alignItems: 'center',
  },
  cpBannerText: { fontFamily: PIXEL_FONT, color: '#4ad0ff', fontSize: 7, letterSpacing: 1 },

  // Bottom area with wave button and optional checkpoint button
  waveBtnArea: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: 14, backgroundColor: '#182848',
  },

  // Checkpoint return button
  cpBtn: {
    width: 252, paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: '#0e2850',
    borderTopWidth: 2, borderLeftWidth: 2, borderBottomWidth: 4, borderRightWidth: 4,
    borderTopColor: '#4a9af0', borderLeftColor: '#4a9af0',
    borderBottomColor: '#0a1a40', borderRightColor: '#0a1a40',
  },
  cpBtnTop: { fontFamily: PIXEL_FONT, color: '#4a9af0', fontSize: 8, letterSpacing: 1 },
  cpBtnSub: { fontFamily: PIXEL_FONT, color: '#3060b0', fontSize: 6, marginTop: 5 },

  waveBtn: {
    width: 252, height: 52,
    alignItems: 'center', justifyContent: 'center',
    borderTopWidth: 3, borderLeftWidth: 3, borderBottomWidth: 6, borderRightWidth: 6,
  },
  waveBtnLabel: { fontFamily: PIXEL_FONT, color: '#fff', fontSize: 10, letterSpacing: 2 },

  resetBtn: {
    width: 32, height: 32,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#2a1010',
    borderTopWidth: 2, borderLeftWidth: 2, borderBottomWidth: 4, borderRightWidth: 4,
    borderTopColor: '#c0392b', borderLeftColor: '#c0392b',
    borderBottomColor: '#5a0a0a', borderRightColor: '#5a0a0a',
  },
  resetBtnText: { fontFamily: PIXEL_FONT, color: '#e74c3c', fontSize: 14 },
});
