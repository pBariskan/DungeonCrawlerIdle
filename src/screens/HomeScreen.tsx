import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useGameStore } from '../store/gameStore';

const { width: SW } = Dimensions.get('window');
const PIXEL  = 'PressStart2P_400Regular';
const LANE_H = 72;

// Bullet travel range (px from battle area left edge)
// Player sprite: left:14, width:56 → right edge ~70. Bullet starts just after.
// Enemy sprite:  right:14, width:56 → left edge ~SW-70. Bullet starts just before.
const BLT_P_START = 74;        // player bullet X start
const BLT_P_END   = SW - 88;   // player bullet X end (just before enemy)
const BLT_E_START = SW - 88;   // enemy bullet X start
const BLT_E_END   = 74;        // enemy bullet X end (just before player)
const BLT_P_OFF   = SW + 50;   // player bullet off-screen target (right)
const BLT_E_OFF   = -50;       // enemy bullet off-screen target (left)

// Travel durations to the character zone (hit-check moment)
const TRAVEL_P = 420;   // ms — player bullet
const TRAVEL_E = 650;   // ms — enemy bullet
// Full off-screen duration at the SAME velocity (start → off-screen)
const TOTAL_P  = Math.round(TRAVEL_P * (BLT_P_OFF - BLT_P_START) / (BLT_P_END - BLT_P_START));
const TOTAL_E  = Math.round(TRAVEL_E * (BLT_E_START - BLT_E_OFF) / (BLT_E_START - BLT_E_END));

type GamePhase = 'idle' | 'playing' | 'paused' | 'dead';

type Bullet = {
  id: number;
  lane: number;
  anim: Animated.Value;
  fromEnemy: boolean;
};

type ShooterEnemy = {
  hp: number; maxHp: number; attack: number;
  goldReward: number; expReward: number;
  emoji: string; isBoss: boolean;
};

const ENEMY_EMOJIS = ['👾', '🦇', '🐸', '🕷️', '🐙'];

// ── Upgrade button ─────────────────────────────────────────────────────────────
function UpgradeBtn({ label, sub, onPress, disabled }: {
  label: string; sub: string; onPress: () => void; disabled: boolean;
}) {
  return (
    <TouchableOpacity style={[ub.btn, disabled && ub.off]} onPress={onPress} disabled={disabled} activeOpacity={0.8}>
      <Text style={[ub.label, disabled && ub.dim]}>{label}</Text>
      <Text style={[ub.sub,   disabled && ub.dim]}>{sub}</Text>
    </TouchableOpacity>
  );
}
const ub = StyleSheet.create({
  btn: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
    backgroundColor: '#1a3060',
    borderTopWidth: 3, borderLeftWidth: 3, borderBottomWidth: 5, borderRightWidth: 5,
    borderTopColor: '#5aa0f0', borderLeftColor: '#5aa0f0',
    borderBottomColor: '#0a1838', borderRightColor: '#0a1838',
  },
  off: {
    backgroundColor: '#1a2040',
    borderTopColor: '#2a3a60', borderLeftColor: '#2a3a60',
    borderBottomColor: '#0a1020', borderRightColor: '#0a1020',
  },
  label: { fontFamily: PIXEL, color: '#7ec8f7', fontSize: 8, letterSpacing: 1 },
  sub:   { fontFamily: PIXEL, color: '#f1c40f', fontSize: 7, marginTop: 4 },
  dim:   { color: '#3a5080' },
});

function buildShooterEnemy(wave: number): ShooterEnemy {
  const hp = 12 + wave * 6;
  return {
    hp, maxHp: hp,
    attack:     2 + Math.floor(wave * 1.2),
    goldReward: 3 + wave * 2,
    expReward:  4 + wave * 2,
    emoji:      wave % 5 === 0 ? '💀' : ENEMY_EMOJIS[wave % 5],
    isBoss:     wave % 5 === 0,
  };
}

// ── Pixel HP bar ──────────────────────────────────────────────────────────────
function PixelBar({ pct, color }: { pct: number; color: string }) {
  const BLOCKS = 8;
  const filled = Math.max(0, Math.round(Math.max(0, Math.min(100, pct)) / 100 * BLOCKS));
  return (
    <View style={{ flexDirection: 'row', gap: 3 }}>
      {Array.from({ length: BLOCKS }).map((_, i) => (
        <View
          key={i}
          style={{ width: 11, height: 11, backgroundColor: i < filled ? color : '#1a2840' }}
        />
      ))}
    </View>
  );
}


// ── Home Screen ───────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { hero, spendGold, setHero } = useGameStore();
  const atkUpgradeCost = useGameStore(s => s.atkUpgradeCost);
  const hpUpgradeCost  = useGameStore(s => s.hpUpgradeCost);

  const [phase,      setPhase]      = useState<GamePhase>('idle');
  const [playerLane, setPlayerLane] = useState(1);
  const [enemyLane,  setEnemyLane]  = useState(1);
  const [playerHp,   setPlayerHp]   = useState(hero.maxHp);
  const [enemy,      setEnemy]      = useState<ShooterEnemy>(() => buildShooterEnemy(1));
  const [bullets,    setBullets]    = useState<Bullet[]>([]);
  const [canFire,    setCanFire]    = useState(true);
  const [wave,       setWave]       = useState(1);

  // ── Refs (stale-closure safety) ──────────────────────────────────────────────
  const playerLaneRef = useRef(1);
  const enemyLaneRef  = useRef(1);
  const playerHpRef   = useRef(hero.maxHp);
  const enemyRef      = useRef<ShooterEnemy>(buildShooterEnemy(1));
  const phaseRef      = useRef<GamePhase>('idle');
  const waveRef       = useRef(1);
  const bulletIdRef   = useRef(0);
  const canFireRef    = useRef(true);
  const moveInterval  = useRef<ReturnType<typeof setInterval> | null>(null);
  const fireInterval  = useRef<ReturnType<typeof setInterval> | null>(null);

  // Latest-function refs: always-fresh, no stale closures in intervals/animations
  const clearIntervalsFn   = useRef<() => void>(() => {});
  const spawnBulletFn      = useRef<(fromEnemy: boolean) => void>(() => {});
  const startIntervalsFn   = useRef<() => void>(() => {});
  const handleEnemyDeathFn = useRef<() => void>(() => {});

  // Fire cooldown: levels 1–11+ scale from 800ms → 200ms
  const fireCooldownMs = Math.max(200, 800 - (hero.level - 1) * 60);

  // ── Assign latest function bodies each render ────────────────────────────────
  clearIntervalsFn.current = () => {
    if (moveInterval.current) { clearInterval(moveInterval.current); moveInterval.current = null; }
    if (fireInterval.current) { clearInterval(fireInterval.current); fireInterval.current = null; }
  };

  handleEnemyDeathFn.current = () => {
    clearIntervalsFn.current();
    const { goldReward, expReward } = enemyRef.current;
    useGameStore.getState().gainGold(goldReward);
    useGameStore.getState().addExp(expReward);
    const nextWave = waveRef.current + 1;
    waveRef.current = nextWave;
    setWave(nextWave);
    const nextEnemy = buildShooterEnemy(nextWave);
    enemyRef.current = nextEnemy;
    setEnemy(nextEnemy);
    enemyLaneRef.current = 1;
    setEnemyLane(1);
    startIntervalsFn.current();
  };

  spawnBulletFn.current = (fromEnemy: boolean) => {
    const lane = fromEnemy ? enemyLaneRef.current : playerLaneRef.current;
    const anim = new Animated.Value(0);
    const id   = ++bulletIdRef.current;

    setBullets(prev => [...prev, { id, lane, anim, fromEnemy }]);

    // Single constant-speed animation: start → off-screen
    Animated.timing(anim, {
      toValue: 1,
      duration: fromEnemy ? TOTAL_E : TOTAL_P,
      useNativeDriver: true,
    }).start(() => {
      // Bullet exited screen — clean up
      setBullets(prev => prev.filter(b => b.id !== id));
    });

    // Hit/miss check fires exactly when the bullet reaches the character zone
    setTimeout(() => {
      if (phaseRef.current !== 'playing') return;

      let didHit = false;

      if (!fromEnemy) {
        if (lane === enemyLaneRef.current) {
          didHit = true;
          const atk   = useGameStore.getState().hero.attack;
          const newHp = Math.max(0, enemyRef.current.hp - atk);
          enemyRef.current = { ...enemyRef.current, hp: newHp };
          setEnemy(prev => ({ ...prev, hp: newHp }));
          if (newHp <= 0) handleEnemyDeathFn.current();
        }
      } else {
        if (lane === playerLaneRef.current) {
          didHit = true;
          const def   = useGameStore.getState().hero.defense;
          const dmg   = Math.max(1, enemyRef.current.attack - def);
          const newHp = Math.max(0, playerHpRef.current - dmg);
          playerHpRef.current = newHp;
          setPlayerHp(newHp);
          if (newHp <= 0) {
            clearIntervalsFn.current();
            phaseRef.current = 'dead';
            setPhase('dead');
          }
        }
      }

      if (didHit) {
        // Stop animation at impact and remove bullet
        anim.stopAnimation();
        setBullets(prev => prev.filter(b => b.id !== id));
      }
      // Miss: animation continues off-screen uninterrupted
    }, fromEnemy ? TRAVEL_E : TRAVEL_P);
  };

  startIntervalsFn.current = () => {
    clearIntervalsFn.current();

    // Enemy movement: drift to adjacent lane every 1500ms
    moveInterval.current = setInterval(() => {
      if (phaseRef.current !== 'playing') return;
      const delta = Math.floor(Math.random() * 3) - 1; // -1, 0, +1
      const next  = Math.max(0, Math.min(2, enemyLaneRef.current + delta));
      enemyLaneRef.current = next;
      setEnemyLane(next);
    }, 1500);

    // Enemy fires every 2000ms
    fireInterval.current = setInterval(() => {
      if (phaseRef.current !== 'playing') return;
      spawnBulletFn.current(true);
    }, 2000);
  };

  // Clean up intervals on unmount
  useEffect(() => () => { clearIntervalsFn.current(); }, []);

  // Pause when leaving tab, resume when returning
  useFocusEffect(
    React.useCallback(() => {
      if (phaseRef.current === 'paused') {
        phaseRef.current = 'playing';
        setPhase('playing');
        startIntervalsFn.current();
      }
      return () => {
        if (phaseRef.current === 'playing') {
          phaseRef.current = 'paused';
          setPhase('paused');
          clearIntervalsFn.current();
        }
      };
    }, []),
  );

  // ── Event handlers ───────────────────────────────────────────────────────────
  const handleStart = () => {
    if (phase === 'paused') {
      phaseRef.current = 'playing';
      setPhase('playing');
      startIntervalsFn.current();
      return;
    }
    if (phase === 'dead') {
      const freshHp = useGameStore.getState().hero.maxHp;
      playerHpRef.current   = freshHp;  setPlayerHp(freshHp);
      const e1              = buildShooterEnemy(1);
      enemyRef.current      = e1;       setEnemy(e1);
      waveRef.current       = 1;        setWave(1);
      playerLaneRef.current = 1;        setPlayerLane(1);
      enemyLaneRef.current  = 1;        setEnemyLane(1);
      setBullets([]);
    }
    phaseRef.current   = 'playing';
    setPhase('playing');
    canFireRef.current = true;
    setCanFire(true);
    startIntervalsFn.current();
  };

  const handleMoveUp = () => {
    const next = Math.max(0, playerLaneRef.current - 1);
    playerLaneRef.current = next;
    setPlayerLane(next);
  };

  const handleMoveDown = () => {
    const next = Math.min(2, playerLaneRef.current + 1);
    playerLaneRef.current = next;
    setPlayerLane(next);
  };

  const handleFire = () => {
    if (!canFireRef.current) return;
    canFireRef.current = false;
    setCanFire(false);
    spawnBulletFn.current(false);
    setTimeout(() => {
      canFireRef.current = true;
      setCanFire(true);
    }, fireCooldownMs);
  };

  // ── Upgrade handlers ─────────────────────────────────────────────────────────
  const handleUpgradeAttack = () => {
    if (spendGold(atkUpgradeCost)) {
      setHero({ attack: useGameStore.getState().hero.attack + 2 });
      useGameStore.setState({ atkUpgradeCost: Math.round(atkUpgradeCost * 1.25) });
    }
  };
  const handleUpgradeHp = () => {
    if (spendGold(hpUpgradeCost)) {
      const h = useGameStore.getState().hero;
      setHero({ maxHp: h.maxHp + 20, hp: h.hp + 20 });
      useGameStore.setState({ hpUpgradeCost: Math.round(hpUpgradeCost * 1.25) });
    }
  };

  // ── Derived values ───────────────────────────────────────────────────────────
  const playerHpPct = Math.max(0, playerHp / Math.max(1, hero.maxHp) * 100);
  const enemyHpPct  = Math.max(0, enemy.hp  / Math.max(1, enemy.maxHp) * 100);
  const isPlaying   = phase === 'playing';
  const kills       = wave - 1;

  const startCfg =
    phase === 'dead'
      ? { label: 'RETRY  WAVE 01', bg: '#6b4a00', hi: '#ffaa44', lo: '#2a1a00' }
    : phase === 'paused'
      ? { label: `RESUME WAVE ${String(wave).padStart(2, '0')}`, bg: '#1a3a6b', hi: '#66aaff', lo: '#0a1838' }
    : { label: `START WAVE ${String(wave).padStart(2, '0')}`, bg: '#1a6b1a', hi: '#77ff77', lo: '#0a3010' };

  return (
    <View style={s.container}>

      {/* ── Header ── */}
      <View style={s.header}>
        <Text style={s.hdrWave}>WAVE {String(wave).padStart(2, '0')}</Text>
        <Text style={s.hdrKill}>KILL: {kills}</Text>
        <Text style={s.hdrHp}>{playerHp}/{hero.maxHp} HP</Text>
      </View>

      {/* ── Battle area (3 × 72px lanes) ── */}
      <View style={s.battleArea}>

        {/* Alternating lane backgrounds */}
        {[0, 1, 2].map(l => (
          <View key={l} style={[s.lane, { top: l * LANE_H }, l % 2 === 0 && s.laneDark]} />
        ))}

        {/* Player-lane highlight */}
        <View
          pointerEvents="none"
          style={[s.laneHighlight, { top: playerLane * LANE_H }]}
        />

        {/* Player sprite */}
        <View style={[s.spriteWrap, { top: playerLane * LANE_H + 8, left: 14 }]}>
          <Text style={s.sprite}>🧙</Text>
        </View>

        {/* Enemy sprite */}
        <View style={[s.spriteWrap, { top: enemyLane * LANE_H + 8, right: 14 }]}>
          <Text style={[s.sprite, enemy.isBoss && s.bossSprite]}>{enemy.emoji}</Text>
        </View>

        {/* Bullets */}
        {bullets.map(b => {
          const tx = b.anim.interpolate({
            inputRange:  [0, 1],
            outputRange: b.fromEnemy
              ? [BLT_E_START, BLT_E_OFF]
              : [BLT_P_START, BLT_P_OFF],
          });
          return (
            <Animated.View
              key={b.id}
              style={[
                s.bullet,
                {
                  top:             b.lane * LANE_H + 32,
                  backgroundColor: b.fromEnemy ? '#e74c3c' : '#f1c40f',
                  transform:       [{ translateX: tx }],
                },
              ]}
            />
          );
        })}

      </View>

      {/* ── HP bars ── */}
      <View style={s.hpRow}>
        <View style={s.hpSide}>
          <Text style={s.hpLabel}>{enemy.isBoss ? '★ BOSS' : 'ENEMY'}</Text>
          <PixelBar pct={enemyHpPct} color={enemy.isBoss ? '#f39c12' : '#e74c3c'} />
        </View>
        <View style={s.hpSide}>
          <Text style={s.hpLabel}>HERO</Text>
          <PixelBar pct={playerHpPct} color="#2ecc71" />
        </View>
      </View>

      {/* ── Bottom section: upgrade panel (1x) + controls/start (2x) ── */}
      <View style={s.bottomSection}>

        {/* ── Upgrade buttons (always visible) ── */}
        <View style={s.upgradePanel}>
          <UpgradeBtn
            label="+2 ATK"  sub={`${atkUpgradeCost}G`}
            onPress={handleUpgradeAttack}
            disabled={hero.gold < atkUpgradeCost}
          />
          <View style={{ width: 12 }} />
          <UpgradeBtn
            label="+MAX HP" sub={`${hpUpgradeCost}G`}
            onPress={handleUpgradeHp}
            disabled={hero.gold < hpUpgradeCost}
          />
        </View>

        {/* ── Controls or Start/Retry button ── */}
        {!isPlaying ? (
          <View style={s.startArea}>
            {phase === 'dead' && <Text style={s.defeatText}>DEFEATED...</Text>}
            <TouchableOpacity
              style={[
                s.startBtn,
                {
                  backgroundColor:   startCfg.bg,
                  borderTopColor:    startCfg.hi,
                  borderLeftColor:   startCfg.hi,
                  borderBottomColor: startCfg.lo,
                  borderRightColor:  startCfg.lo,
                },
              ]}
              onPress={handleStart}
              activeOpacity={0.85}
            >
              <Text style={s.startBtnText}>{startCfg.label}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.ctrlRow}>
            {/* LEFT: UP + DOWN stacked — left thumb */}
            <View style={s.dpadCol}>
              <TouchableOpacity
                style={[s.dpadBtn, playerLane === 0 && s.dpadBtnOff]}
                onPress={handleMoveUp}
                disabled={playerLane === 0}
                activeOpacity={0.8}
              >
                <Text style={[s.dpadTxt, playerLane === 0 && s.dpadTxtDim]}>▲</Text>
              </TouchableOpacity>
              <View style={s.dpadGap} />
              <TouchableOpacity
                style={[s.dpadBtn, playerLane === 2 && s.dpadBtnOff]}
                onPress={handleMoveDown}
                disabled={playerLane === 2}
                activeOpacity={0.8}
              >
                <Text style={[s.dpadTxt, playerLane === 2 && s.dpadTxtDim]}>▼</Text>
              </TouchableOpacity>
            </View>

            {/* RIGHT: round FIRE — right thumb */}
            <View style={s.fireCol}>
              <TouchableOpacity
                style={[s.fireBtn, !canFire && s.fireBtnOff]}
                onPress={handleFire}
                disabled={!canFire}
                activeOpacity={0.75}
              >
                <Text style={s.fireBtnEmoji}>🔥</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

      </View>

    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1e3a' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#182848',
    borderBottomWidth: 2, borderBottomColor: '#3d5ca8',
  },
  hdrWave: { fontFamily: PIXEL, color: '#e0c97f', fontSize: 8, letterSpacing: 1 },
  hdrKill: { fontFamily: PIXEL, color: '#80a8e0', fontSize: 8, letterSpacing: 1 },
  hdrHp:   { fontFamily: PIXEL, color: '#2ecc71', fontSize: 8, letterSpacing: 1 },

  battleArea: {
    height: LANE_H * 3,
    overflow: 'hidden',
    borderBottomWidth: 2, borderBottomColor: '#3d5ca8',
  },
  lane: {
    position: 'absolute', left: 0, right: 0,
    height: LANE_H, backgroundColor: '#152035',
  },
  laneDark: { backgroundColor: '#0f1828' },

  laneHighlight: {
    position: 'absolute', left: 0, right: 0, height: LANE_H,
    backgroundColor: 'rgba(46,204,113,0.07)',
    borderTopWidth: 1, borderBottomWidth: 1,
    borderTopColor: 'rgba(46,204,113,0.2)', borderBottomColor: 'rgba(46,204,113,0.2)',
  },

  spriteWrap: {
    position: 'absolute', width: 56, height: 56,
    alignItems: 'center', justifyContent: 'center',
  },
  sprite:     { fontSize: 36 },
  bossSprite: { fontSize: 44 },

  bullet: {
    position: 'absolute', left: 0,
    width: 14, height: 8, borderRadius: 4,
  },

  hpRow: {
    flexDirection: 'row',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#182848',
    borderBottomWidth: 2, borderBottomColor: '#3d5ca8',
    gap: 20,
  },
  hpSide:  { flex: 1, alignItems: 'center', gap: 6 },
  hpLabel: { fontFamily: PIXEL, color: '#80a8e0', fontSize: 6, letterSpacing: 1 },

  bottomSection: { flex: 1 },
  upgradePanel: {
    flex: 1, flexDirection: 'row', padding: 16,
    backgroundColor: '#182848',
    borderBottomWidth: 2, borderBottomColor: '#3d5ca8',
  },

  startArea: {
    flex: 6, alignItems: 'center', justifyContent: 'center',
    gap: 16, backgroundColor: '#182848',
  },
  defeatText:   { fontFamily: PIXEL, color: '#e74c3c', fontSize: 12, letterSpacing: 2 },
  startBtn: {
    width: 260, height: 52,
    alignItems: 'center', justifyContent: 'center',
    borderTopWidth: 3, borderLeftWidth: 3, borderBottomWidth: 6, borderRightWidth: 6,
  },
  startBtnText: { fontFamily: PIXEL, color: '#fff', fontSize: 9, letterSpacing: 2 },

  ctrlRow: {
    flex: 6, flexDirection: 'row', alignItems: 'stretch',
    backgroundColor: '#182848',
  },
  // D-pad (left)
  dpadCol: { flex: 1, flexDirection: 'column', paddingHorizontal: 12, paddingVertical: 10 },
  dpadGap: { height: 8 },
  dpadBtn: {
    flex: 1,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#1a3060',
    borderTopWidth: 3, borderLeftWidth: 3, borderBottomWidth: 6, borderRightWidth: 6,
    borderTopColor: '#5aa0f0', borderLeftColor: '#5aa0f0',
    borderBottomColor: '#0a1838', borderRightColor: '#0a1838',
  },
  dpadBtnOff: {
    backgroundColor: '#1a2040',
    borderTopColor: '#2a3a60', borderLeftColor: '#2a3a60',
    borderBottomColor: '#0a1020', borderRightColor: '#0a1020',
  },
  dpadTxt:    { fontFamily: PIXEL, color: '#fff', fontSize: 22 },
  dpadTxtDim: { color: '#3a5080' },
  // Fire (right)
  fireCol: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fireBtn: {
    width: '88%', aspectRatio: 1, borderRadius: 9999,
    backgroundColor: '#6b1a0a',
    borderWidth: 4, borderColor: '#ff7744',
    alignItems: 'center', justifyContent: 'center',
  },
  fireBtnOff:   { backgroundColor: '#2a1020', borderColor: '#441010' },
  fireBtnEmoji: { fontSize: 56 },
});
