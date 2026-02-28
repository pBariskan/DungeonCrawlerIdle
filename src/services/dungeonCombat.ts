import { useGameStore, generateChestItems } from '../store/gameStore';

let combatTimeout: ReturnType<typeof setTimeout> | null = null;

export function startDungeonCombat() {
  stopDungeonCombat();
  useGameStore.getState().startDungeonRun();
  scheduleRound(300);
}

export function stopDungeonCombat() {
  if (combatTimeout) {
    clearTimeout(combatTimeout);
    combatTimeout = null;
  }
}

function scheduleRound(ms: number) {
  combatTimeout = setTimeout(runRound, ms);
}

function runRound() {
  const s = useGameStore.getState();
  if (!s.dungeonRunning) return;

  const cid = s.assignedCompanions.dungeon ?? 'ironGuard';

  // Hero attacks
  s.damageEnemy(s.heroes[cid].attack);
  const afterHeroAtk = useGameStore.getState();

  if (afterHeroAtk.enemy.hp <= 0) {
    handleEnemyDied(afterHeroAtk);
    return;
  }

  // Enemy counter-attacks 220ms later
  combatTimeout = setTimeout(() => {
    const s2 = useGameStore.getState();
    if (!s2.dungeonRunning) return;

    s2.damageHero(s2.enemy.attack);
    const afterEnemyAtk = useGameStore.getState();

    const cid2 = afterEnemyAtk.assignedCompanions.dungeon ?? 'ironGuard';
    if (afterEnemyAtk.heroes[cid2].hp <= 0) {
      handleHeroDied();
      return;
    }

    scheduleRound(450);
  }, 220);
}

function handleEnemyDied(snap: ReturnType<typeof useGameStore.getState>) {
  const level = snap.dungeonLevel;
  const cid   = snap.assignedCompanions.dungeon ?? 'ironGuard';

  snap.addDungeonPendingGold(snap.enemy.goldReward);

  if (snap.enemy.isBoss) {
    snap.addDungeonChest(generateChestItems(level));
  }

  const expGain = snap.enemy.isBoss ? level * 3 : level;
  snap.advanceDungeon();
  snap.addExp(expGain, cid);

  // Checkpoint: every 10 floors (compare pre-advance level)
  if (level % 10 === 0) {
    useGameStore.getState().saveCheckpoint();
  }

  // 20% HP heal for dungeon companion
  const s2  = useGameStore.getState();
  const cid2 = s2.assignedCompanions.dungeon ?? 'ironGuard';
  const h   = s2.heroes[cid2];
  s2.setHero(cid2, { hp: Math.min(h.maxHp, h.hp + Math.floor(h.maxHp * 0.20)) });

  scheduleRound(300);
}

function handleHeroDied() {
  const level = useGameStore.getState().dungeonLevel;
  stopDungeonCombat();
  useGameStore.getState().stopDungeonRun(level);
}
