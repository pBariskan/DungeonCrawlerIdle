import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Dimensions, PanResponder,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useGameStore, COMPANIONS } from '../store/gameStore';

const { width: SW } = Dimensions.get('window');
const PIXEL = 'PressStart2P_400Regular';

// ── Game arena: full width, fixed height (replaces 3×72 lanes)
const ARENA_W    = SW;
const ARENA_H    = 216;   // same total height as before (3 × 72)
const PLAYER_SIZE = 48;
const ENEMY_SIZE  = 48;
const BULLET_R    = 6;    // bullet circle radius
const BULLET_SPD  = 13;   // px per tick
const ENEMY_SPD   = 2.2;  // px per tick toward player
const HIT_RADIUS  = 28;   // collision distance (center-to-center)
const TICK_MS     = 33;   // ~30 fps

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

type GamePhase = 'idle' | 'playing' | 'paused' | 'dead';

type Vec2 = { x: number; y: number };

const pickWanderTarget = (): Vec2 => ({
  x: ARENA_W / 2 + Math.random() * (ARENA_W / 2 - ENEMY_SIZE),
  y: Math.random() * (ARENA_H - ENEMY_SIZE),
});

type Bullet2D = {
  id: number;
  x: number; y: number;
  dx: number; dy: number;
  fromEnemy: boolean;
  r: number;       // visual radius
  hitR: number;    // collision radius
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

// ── Smooth HP bar ─────────────────────────────────────────────────────────────
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
    alignSelf: 'stretch', height: 10,
    backgroundColor: '#1a2840', borderRadius: 5, overflow: 'hidden', marginTop: 8,
  },
  fill: { height: '100%', borderRadius: 5 },
});

// Initial positions
const PLAYER_INIT: Vec2 = { x: 20, y: ARENA_H / 2 - PLAYER_SIZE / 2 };
const enemyInit   = (): Vec2 => ({ x: ARENA_W - ENEMY_SIZE - 20, y: ARENA_H / 2 - ENEMY_SIZE / 2 });

// ── Home Screen ───────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const spendGold              = useGameStore(s => s.spendGold);
  const setHero                = useGameStore(s => s.setHero);
  const atkUpgradeCost         = useGameStore(s => s.atkUpgradeCost);
  const hpUpgradeCost          = useGameStore(s => s.hpUpgradeCost);
  const bulletSizeLevel        = useGameStore(s => s.bulletSizeLevel);
  const bulletSizeUpgradeCost  = useGameStore(s => s.bulletSizeUpgradeCost);
  const upgradeBulletSize      = useGameStore(s => s.upgradeBulletSize);
  const assignedHome           = useGameStore(s => s.assignedCompanions.home);
  const hero                   = useGameStore(s => s.heroes[s.assignedCompanions.home ?? 'ironGuard']);
  const gold                   = useGameStore(s => s.gold);

  const [phase,     setPhase]     = useState<GamePhase>('idle');
  const [playerPos, setPlayerPos] = useState<Vec2>(PLAYER_INIT);
  const [enemyPos,  setEnemyPos]  = useState<Vec2>(enemyInit());
  const [playerHp,  setPlayerHp]  = useState(hero.maxHp);
  const [enemy,     setEnemy]     = useState<ShooterEnemy>(() => buildShooterEnemy(1));
  const [bullets,   setBullets]   = useState<Bullet2D[]>([]);
  const [wave,      setWave]      = useState(1);

  // Refs
  const playerPosRef = useRef<Vec2>(PLAYER_INIT);
  const enemyPosRef  = useRef<Vec2>(enemyInit());
  const playerHpRef  = useRef(hero.maxHp);
  const enemyRef     = useRef<ShooterEnemy>(buildShooterEnemy(1));
  const phaseRef     = useRef<GamePhase>('idle');
  const waveRef      = useRef(1);
  const bulletIdRef  = useRef(0);
  const bulletsRef   = useRef<Bullet2D[]>([]);
  const lastTouchRef    = useRef<Vec2>({ x: 0, y: 0 });
  const wanderTargetRef = useRef<Vec2>(pickWanderTarget());
  const bulletRadiusRef = useRef(BULLET_R);
  bulletRadiusRef.current = BULLET_R + bulletSizeLevel * 3;

  const gameLoopRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoFireRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const enemyFireRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Latest-function refs
  const clearIntervalsFn   = useRef<() => void>(() => {});
  const startIntervalsFn   = useRef<() => void>(() => {});
  const handleEnemyDeathFn = useRef<() => void>(() => {});
  const spawnBulletFn      = useRef<(fromEnemy: boolean) => void>(() => {});

  // Fire cooldown: levels 1–11+ scale from 800ms → 200ms
  const fireCooldownMs = Math.max(200, 800 - (hero.level - 1) * 60);

  // ── Trackpad PanResponder ────────────────────────────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      // Accept touch when playing OR paused (paused touch resumes)
      onStartShouldSetPanResponder: () =>
        phaseRef.current === 'playing' || phaseRef.current === 'paused',
      onMoveShouldSetPanResponder: () => phaseRef.current === 'playing',

      onPanResponderGrant: (e) => {
        lastTouchRef.current = {
          x: e.nativeEvent.locationX,
          y: e.nativeEvent.locationY,
        };
        // Resume if paused by finger-lift
        if (phaseRef.current === 'paused') {
          phaseRef.current = 'playing';
          setPhase('playing');
          startIntervalsFn.current();
        }
      },

      onPanResponderMove: (e) => {
        if (phaseRef.current !== 'playing') return;
        const dx = e.nativeEvent.locationX - lastTouchRef.current.x;
        const dy = e.nativeEvent.locationY - lastTouchRef.current.y;
        lastTouchRef.current = {
          x: e.nativeEvent.locationX,
          y: e.nativeEvent.locationY,
        };
        const nx = clamp(playerPosRef.current.x + dx, 0, ARENA_W - PLAYER_SIZE);
        const ny = clamp(playerPosRef.current.y + dy, 0, ARENA_H - PLAYER_SIZE);
        playerPosRef.current = { x: nx, y: ny };
        setPlayerPos({ x: nx, y: ny });
      },

      onPanResponderRelease: () => {
        if (phaseRef.current === 'playing') {
          phaseRef.current = 'paused';
          setPhase('paused');
          clearIntervalsFn.current();
        }
      },
    })
  ).current;

  // ── Assign latest function bodies each render ────────────────────────────────
  clearIntervalsFn.current = () => {
    if (gameLoopRef.current)  { clearInterval(gameLoopRef.current);  gameLoopRef.current  = null; }
    if (autoFireRef.current)  { clearInterval(autoFireRef.current);  autoFireRef.current  = null; }
    if (enemyFireRef.current) { clearInterval(enemyFireRef.current); enemyFireRef.current = null; }
  };

  spawnBulletFn.current = (fromEnemy: boolean) => {
    const origin = fromEnemy ? enemyPosRef.current : playerPosRef.current;
    const sz     = fromEnemy ? ENEMY_SIZE : PLAYER_SIZE;
    const cx = origin.x + sz / 2;
    const cy = origin.y + sz / 2;

    let dx: number, dy: number;
    if (!fromEnemy) {
      // Player bullets always travel straight right
      dx = BULLET_SPD;
      dy = 0;
    } else {
      // Enemy bullets aim at player center
      const tx = playerPosRef.current.x + PLAYER_SIZE / 2;
      const ty = playerPosRef.current.y + PLAYER_SIZE / 2;
      const dist = Math.hypot(tx - cx, ty - cy) || 1;
      dx = (tx - cx) / dist * BULLET_SPD;
      dy = (ty - cy) / dist * BULLET_SPD;
    }

    const r    = fromEnemy ? BULLET_R : bulletRadiusRef.current;
    const hitR = fromEnemy ? HIT_RADIUS : HIT_RADIUS + (bulletRadiusRef.current - BULLET_R) * 2;
    bulletsRef.current = [...bulletsRef.current, { id: ++bulletIdRef.current, x: cx, y: cy, dx, dy, fromEnemy, r, hitR }];
  };

  handleEnemyDeathFn.current = () => {
    clearIntervalsFn.current();
    const { goldReward, expReward } = enemyRef.current;
    useGameStore.getState().gainGold(goldReward);
    const _homeCid = useGameStore.getState().assignedCompanions.home ?? 'ironGuard';
    useGameStore.getState().addExp(expReward, _homeCid);
    const nextWave  = waveRef.current + 1;
    waveRef.current = nextWave;
    setWave(nextWave);
    const nextEnemy   = buildShooterEnemy(nextWave);
    enemyRef.current  = nextEnemy;
    setEnemy(nextEnemy);
    const epos = enemyInit();
    enemyPosRef.current = epos;
    setEnemyPos(epos);
    bulletsRef.current = [];
    setBullets([]);
    wanderTargetRef.current = pickWanderTarget();
    startIntervalsFn.current();
  };

  startIntervalsFn.current = () => {
    clearIntervalsFn.current();

    // Game loop: move bullets, collision, enemy chase
    gameLoopRef.current = setInterval(() => {
      if (phaseRef.current !== 'playing') return;

      // Move bullets + collision check + OOB removal
      const surviving: Bullet2D[] = [];
      for (const b of bulletsRef.current.map(b => ({ ...b, x: b.x + b.dx, y: b.y + b.dy }))) {
        if (b.x < -20 || b.x > ARENA_W + 20 || b.y < -20 || b.y > ARENA_H + 20) continue;

        const tgt = b.fromEnemy ? playerPosRef.current : enemyPosRef.current;
        const tsz = b.fromEnemy ? PLAYER_SIZE : ENEMY_SIZE;
        const dist = Math.hypot(b.x - (tgt.x + tsz / 2), b.y - (tgt.y + tsz / 2));

        if (dist < b.hitR) {
          if (b.fromEnemy) {
            const state2 = useGameStore.getState();
            const cId2   = state2.assignedCompanions.home ?? 'ironGuard';
            const def    = state2.heroes[cId2].defense;
            const dmg    = Math.max(1, enemyRef.current.attack - def);
            const newHp = Math.max(0, playerHpRef.current - dmg);
            playerHpRef.current = newHp;
            setPlayerHp(newHp);
            if (newHp <= 0) {
              clearIntervalsFn.current();
              phaseRef.current = 'dead';
              setPhase('dead');
            }
          } else {
            const state = useGameStore.getState();
            const cId   = state.assignedCompanions.home ?? 'ironGuard';
            const atk   = state.heroes[cId].attack;
            const newHp    = Math.max(0, enemyRef.current.hp - atk);
            enemyRef.current = { ...enemyRef.current, hp: newHp };
            setEnemy({ ...enemyRef.current });
            if (newHp <= 0) handleEnemyDeathFn.current();
          }
          continue; // bullet consumed
        }
        surviving.push(b);
      }
      bulletsRef.current = surviving;
      setBullets([...surviving]);

      // Enemy chase (right half) or roam (player out of reach)
      const ep = enemyPosRef.current;
      const pp = playerPosRef.current;
      const playerReachable = pp.x + PLAYER_SIZE / 2 > ARENA_W / 2;
      const target = playerReachable ? pp : wanderTargetRef.current;
      const d = Math.hypot(target.x - ep.x, target.y - ep.y);
      if (d > PLAYER_SIZE * 0.8) {
        const nep = {
          x: clamp(ep.x + (target.x - ep.x) / d * ENEMY_SPD, ARENA_W / 2, ARENA_W - ENEMY_SIZE),
          y: clamp(ep.y + (target.y - ep.y) / d * ENEMY_SPD, 0, ARENA_H - ENEMY_SIZE),
        };
        enemyPosRef.current = nep;
        setEnemyPos({ ...nep });
      } else if (!playerReachable) {
        // Wander target'a ulaştı → yeni rastgele hedef seç
        wanderTargetRef.current = pickWanderTarget();
      }
    }, TICK_MS);

    // Player auto-fire (scales with hero level)
    autoFireRef.current = setInterval(() => {
      if (phaseRef.current === 'playing') spawnBulletFn.current(false);
    }, fireCooldownMs);

    // Enemy fire every 1400ms
    enemyFireRef.current = setInterval(() => {
      if (phaseRef.current === 'playing') spawnBulletFn.current(true);
    }, 1400);
  };

  // Clean up on unmount
  useEffect(() => () => { clearIntervalsFn.current(); }, []);

  // Pause on tab blur only; resume happens via trackpad touch
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        if (phaseRef.current === 'playing') {
          phaseRef.current = 'paused';
          setPhase('paused');
          clearIntervalsFn.current();
        }
      };
    }, []),
  );

  // ── Event handlers ────────────────────────────────────────────────────────────
  const handleStart = () => {
    if (phase === 'dead') {
      const _s            = useGameStore.getState();
      const freshHp       = _s.heroes[_s.assignedCompanions.home ?? 'ironGuard'].maxHp;
      playerHpRef.current = freshHp; setPlayerHp(freshHp);
      const e1            = buildShooterEnemy(1);
      enemyRef.current    = e1;      setEnemy(e1);
      waveRef.current     = 1;       setWave(1);
      const ppos = { ...PLAYER_INIT };
      const epos = enemyInit();
      playerPosRef.current = ppos; setPlayerPos(ppos);
      enemyPosRef.current  = epos; setEnemyPos(epos);
      bulletsRef.current   = [];   setBullets([]);
    }
    phaseRef.current = 'playing';
    setPhase('playing');
    startIntervalsFn.current();
  };

  // ── Upgrade handlers ──────────────────────────────────────────────────────────
  const handleUpgradeAttack = () => {
    if (spendGold(atkUpgradeCost)) {
      const cid = useGameStore.getState().assignedCompanions.home ?? 'ironGuard';
      setHero(cid, { attack: useGameStore.getState().heroes[cid].attack + 2 });
      useGameStore.setState({ atkUpgradeCost: Math.round(atkUpgradeCost * 1.25) });
    }
  };
  const handleUpgradeHp = () => {
    if (spendGold(hpUpgradeCost)) {
      const cid = useGameStore.getState().assignedCompanions.home ?? 'ironGuard';
      const h = useGameStore.getState().heroes[cid];
      setHero(cid, { maxHp: h.maxHp + 20, hp: h.hp + 20 });
      useGameStore.setState({ hpUpgradeCost: Math.round(hpUpgradeCost * 1.25) });
    }
  };

  const handleUpgradeBulletSize = () => {
    upgradeBulletSize();
  };

  // ── Derived values ────────────────────────────────────────────────────────────
  const playerHpPct = Math.max(0, playerHp / Math.max(1, hero.maxHp) * 100);
  const enemyHpPct  = Math.max(0, enemy.hp  / Math.max(1, enemy.maxHp) * 100);
  const kills       = wave - 1;

  const startCfg =
    phase === 'dead'
      ? { label: 'RETRY  WAVE 01', bg: '#6b4a00', hi: '#ffaa44', lo: '#2a1a00' }
    : { label: `START WAVE ${String(wave).padStart(2, '0')}`, bg: '#1a6b1a', hi: '#77ff77', lo: '#0a3010' };

  return (
    <View style={s.container}>

      {/* ── Header ── */}
      <View style={s.header}>
        <Text style={s.hdrWave}>WAVE {String(wave).padStart(2, '0')}</Text>
        <Text style={s.hdrKill}>KILL: {kills}</Text>
        <Text style={s.hdrHp}>{playerHp}/{hero.maxHp} HP</Text>
      </View>

      {/* ── Arena (free 2D, no lanes) ── */}
      <View style={s.arena}>
        {/* Player sprite */}
        <Text style={[s.sprite, { left: playerPos.x, top: playerPos.y }]}>
          {COMPANIONS[assignedHome ?? 'ironGuard'].emoji}
        </Text>

        {/* Enemy sprite */}
        <Text style={[s.sprite, s.enemySprite, enemy.isBoss && s.bossSprite,
                      { left: enemyPos.x, top: enemyPos.y }]}>
          {enemy.emoji}
        </Text>

        {/* Bullets */}
        {bullets.map(b => (
          <View
            key={b.id}
            style={[s.bullet, {
              left:            b.x - b.r,
              top:             b.y - b.r,
              width:           b.r * 2,
              height:          b.r * 2,
              borderRadius:    b.r,
              backgroundColor: b.fromEnemy ? '#e74c3c' : '#f1c40f',
            }]}
          />
        ))}

        {/* Pause overlay on arena */}
        {phase === 'paused' && (
          <View style={s.arenaOverlay}>
            <Text style={s.arenaOverlayText}>⏸ PAUSED</Text>
          </View>
        )}

        {/* Death overlay on arena */}
        {phase === 'dead' && (
          <View style={s.arenaDeadOverlay}>
            <Text style={s.arenaDeadSkull}>💀</Text>
            <Text style={s.arenaDeadText}>GAME OVER</Text>
            <Text style={s.arenaDeadWave}>WAVE {String(wave).padStart(2, '0')}</Text>
          </View>
        )}
      </View>

      {/* ── HP bars ── */}
      <View style={s.hpRow}>
        <View style={s.hpSide}>
          <Text style={s.hpLabel}>{enemy.isBoss ? '★ BOSS' : 'ENEMY'}</Text>
          <SmoothBar pct={enemyHpPct} color={enemy.isBoss ? '#f39c12' : '#e74c3c'} />
        </View>
        <View style={s.hpSide}>
          <Text style={s.hpLabel}>HERO</Text>
          <SmoothBar pct={playerHpPct} color="#2ecc71" />
        </View>
      </View>

      {/* ── Bottom section ── */}
      <View style={s.bottomSection}>

        {/* Upgrade buttons */}
        <View style={s.upgradePanel}>
          <UpgradeBtn
            label="+2 ATK"  sub={`${atkUpgradeCost}G`}
            onPress={handleUpgradeAttack}
            disabled={gold < atkUpgradeCost}
          />
          <View style={{ width: 12 }} />
          <UpgradeBtn
            label="+MAX HP" sub={`${hpUpgradeCost}G`}
            onPress={handleUpgradeHp}
            disabled={gold < hpUpgradeCost}
          />
          <View style={{ width: 12 }} />
          <UpgradeBtn
            label="BULLET" sub={`${bulletSizeUpgradeCost}G`}
            onPress={handleUpgradeBulletSize}
            disabled={gold < bulletSizeUpgradeCost}
          />
        </View>

        {/* Controls row: trackpad (playing/paused) or start/retry (idle/dead) */}
        <View style={s.controlRow}>
          {phase === 'idle' || phase === 'dead' ? (
            <View style={s.startArea}>
              {phase === 'dead' && <Text style={s.defeatText}>DEFEATED</Text>}
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
            // playing or paused — trackpad fills everything
            <View style={s.trackpad} {...panResponder.panHandlers}>
              {phase === 'paused' ? (
                <>
                  <Text style={s.trackpadPaused}>PAUSED</Text>
                  <Text style={s.trackpadHint}>TAP TO RESUME</Text>
                </>
              ) : (
                <Text style={s.trackpadHint}>DRAG TO MOVE</Text>
              )}
            </View>
          )}
        </View>

      </View>

    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
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

  arena: {
    width: ARENA_W, height: ARENA_H,
    backgroundColor: '#0d1b2a',
    borderBottomWidth: 2, borderBottomColor: '#3d5ca8',
    overflow: 'hidden',
  },

  sprite: {
    position: 'absolute',
    fontSize: 34,
    width: PLAYER_SIZE,
    textAlign: 'center',
  },
  enemySprite: { fontSize: 34 },
  bossSprite:  { fontSize: 42 },

  bullet: {
    position: 'absolute',
    width: BULLET_R * 2, height: BULLET_R * 2, borderRadius: BULLET_R,
  },

  hpRow: {
    flexDirection: 'row',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#182848',
    borderBottomWidth: 2, borderBottomColor: '#3d5ca8',
    gap: 20,
  },
  hpSide:  { flex: 1, alignItems: 'center' },
  hpLabel: { fontFamily: PIXEL, color: '#80a8e0', fontSize: 6, letterSpacing: 1 },

  bottomSection: { flex: 1 },
  upgradePanel: {
    flexDirection: 'row', padding: 12,
    backgroundColor: '#182848',
    borderBottomWidth: 2, borderBottomColor: '#3d5ca8',
  },

  controlRow: {
    flex: 1,
    backgroundColor: '#182848',
  },

  trackpad: {
    flex: 1,
    alignSelf: 'stretch',
    backgroundColor: '#0e1a30',
    borderTopWidth: 2,
    borderTopColor: '#2a4a8a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackpadPaused: {
    fontFamily: PIXEL, color: '#5a8abf', fontSize: 10, letterSpacing: 2, marginBottom: 8,
  },
  trackpadHint: {
    fontFamily: PIXEL, color: '#2a4a6a', fontSize: 7, letterSpacing: 1,
  },

  startArea: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },

  defeatText: { fontFamily: PIXEL, color: '#e74c3c', fontSize: 9, letterSpacing: 1, marginBottom: 10 },
  startBtn: {
    width: '100%', paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center',
    borderTopWidth: 3, borderLeftWidth: 3, borderBottomWidth: 6, borderRightWidth: 6,
  },
  startBtnText: { fontFamily: PIXEL, color: '#fff', fontSize: 7, letterSpacing: 1 },

  arenaOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8, 12, 30, 0.65)',
  },
  arenaOverlayText: {
    fontFamily: PIXEL,
    color: '#5a8abf',
    fontSize: 14,
    letterSpacing: 3,
  },

  arenaDeadOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(40, 0, 0, 0.82)',
  },
  arenaDeadSkull: {
    fontSize: 52,
    marginBottom: 10,
  },
  arenaDeadText: {
    fontFamily: PIXEL,
    color: '#e74c3c',
    fontSize: 12,
    letterSpacing: 3,
    marginBottom: 8,
  },
  arenaDeadWave: {
    fontFamily: PIXEL,
    color: '#c0392b',
    fontSize: 7,
    letterSpacing: 2,
  },
});
