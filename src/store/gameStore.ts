import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Item system ───────────────────────────────────────────────────────────────
export type EquipSlot   = 'weapon' | 'helmet' | 'armor' | 'boots' | 'shield' | 'ring';
export type ItemRarity  = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

// ─── Companion system ───────────────────────────────────────────────────────────
export type CompanionId = 'ironGuard' | 'shadowStriker';

export interface Companion {
  id:           CompanionId;
  name:         string;
  emoji:        string;
  description:  string;
  bonusAttack:  number;
  bonusDefense: number;
  recruitCost:  number;
}

export const COMPANION_IDS: CompanionId[] = ['ironGuard', 'shadowStriker'];

export const COMPANIONS: Record<CompanionId, Companion> = {
  ironGuard: {
    id: 'ironGuard', name: 'Iron Guard', emoji: '🦁',
    description: 'A steadfast defender. Low damage, high resilience.',
    bonusAttack: 4, bonusDefense: 18, recruitCost: 100,
  },
  shadowStriker: {
    id: 'shadowStriker', name: 'Shadow Striker', emoji: '🥷',
    description: 'A swift assassin. High damage, fragile defense.',
    bonusAttack: 18, bonusDefense: 4, recruitCost: 100,
  },
};

// ─── Fragment system ────────────────────────────────────────────────────────────
export type FragmentType = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export const FRAGMENT_INFO: Record<FragmentType, { name: string; emoji: string; color: string }> = {
  common:    { name: 'Common Shard',      emoji: '🔩', color: '#888888' },
  uncommon:  { name: 'Uncommon Shard',    emoji: '💠', color: '#2ecc71' },
  rare:      { name: 'Rare Crystal',      emoji: '🔮', color: '#3498db' },
  epic:      { name: 'Epic Core',         emoji: '⚡', color: '#9b59b6' },
  legendary: { name: 'Legendary Essence', emoji: '✨', color: '#f39c12' },
};

export const FORGE_YIELD: Record<ItemRarity, { type: FragmentType; min: number; max: number }> = {
  common:    { type: 'common',    min: 1, max: 2 },
  uncommon:  { type: 'uncommon',  min: 1, max: 3 },
  rare:      { type: 'rare',      min: 1, max: 3 },
  epic:      { type: 'epic',      min: 1, max: 2 },
  legendary: { type: 'legendary', min: 1, max: 2 },
};

export function getLevelRequirements(level: number): {
  exp: number;
  gold: number;
  fragments: Partial<Record<FragmentType, number>>;
} {
  return {
    exp:  20 + level * 12,
    gold: 10 + level * 7,
    fragments: (
      level <= 2 ? { common: 1 } :
      level <= 4 ? { common: 2, uncommon: 1 } :
      level <= 6 ? { uncommon: 2, rare: 1 } :
      level <= 8 ? { rare: 1, epic: 1 } :
                   { epic: 1, legendary: 1 }
    ),
  };
}

export interface Item {
  id:           string;
  name:         string;
  slot:         EquipSlot;
  rarity:       ItemRarity;
  emoji:        string;
  bonusAttack:  number;
  bonusDefense: number;
  bonusHp:      number;
}

export const ALL_SLOTS: EquipSlot[] = ['weapon', 'helmet', 'armor', 'boots', 'shield', 'ring'];

export const SLOT_EMOJI: Record<EquipSlot, string> = {
  weapon: '⚔️', helmet: '🪖', armor: '🧥', boots: '👢', shield: '🛡️', ring: '💍',
};

export const SLOT_LABEL: Record<EquipSlot, string> = {
  weapon: 'WEAPON', helmet: 'HELMET', armor: 'ARMOR',
  boots:  'BOOTS',  shield: 'SHIELD', ring:  'RING',
};

export const RARITY_COLOR: Record<ItemRarity, string> = {
  common:    '#888888',
  uncommon:  '#2ecc71',
  rare:      '#3498db',
  epic:      '#9b59b6',
  legendary: '#f39c12',
};

// ─── Item generation ───────────────────────────────────────────────────────────
const RARITY_ADJ: Record<ItemRarity, string[]> = {
  common:    ['Rusty',   'Worn',    'Cracked'],
  uncommon:  ['Iron',    'Steel',   'Solid'],
  rare:      ['Crystal', 'Mystic',  'Enchanted'],
  epic:      ['Shadow',  'Void',    'Thunder'],
  legendary: ['Divine',  'Ancient', 'Eternal'],
};
const SLOT_NOUN: Record<EquipSlot, string> = {
  weapon: 'Blade', helmet: 'Helm',    armor:  'Plate',
  boots:  'Tread', shield: 'Bulwark', ring:   'Band',
};
const RARITY_MULT: Record<ItemRarity, number> = {
  common: 1, uncommon: 1.8, rare: 3, epic: 5, legendary: 8,
};

function rollRarity(): ItemRarity {
  const r = Math.random();
  if (r > 0.95) return 'legendary';
  if (r > 0.80) return 'epic';
  if (r > 0.55) return 'rare';
  if (r > 0.25) return 'uncommon';
  return 'common';
}

function generateItem(dungeonLevel: number): Item {
  const rarity = rollRarity();
  const slot   = ALL_SLOTS[Math.floor(Math.random() * ALL_SLOTS.length)];
  const base   = Math.max(1, Math.floor(dungeonLevel / 5)) * RARITY_MULT[rarity];

  let bonusAttack = 0, bonusDefense = 0, bonusHp = 0;
  switch (slot) {
    case 'weapon': bonusAttack  = Math.round(base * 3);            break;
    case 'shield': bonusDefense = Math.round(base * 2);            break;
    case 'helmet': bonusDefense = Math.round(base);
                   bonusHp      = Math.round(base * 5);            break;
    case 'armor':  bonusDefense = Math.round(base * 1.5);
                   bonusHp      = Math.round(base * 4);            break;
    case 'boots':  bonusDefense = Math.round(base * 0.8);          break;
    case 'ring':
      if (Math.random() > 0.5) bonusAttack = Math.round(base * 1.5);
      else                     bonusHp     = Math.round(base * 6);
      break;
  }

  const adj  = RARITY_ADJ[rarity][Math.floor(Math.random() * 3)];
  return {
    id:           `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name:         `${adj} ${SLOT_NOUN[slot]}`,
    slot, rarity,
    emoji:        SLOT_EMOJI[slot],
    bonusAttack, bonusDefense, bonusHp,
  };
}

export function generateChestItems(dungeonLevel: number): Item[] {
  return [generateItem(dungeonLevel), generateItem(dungeonLevel), generateItem(dungeonLevel)];
}

// ─── Enemy ─────────────────────────────────────────────────────────────────────
const BOSS_NAMES  = ['Stone Golem', 'Fire Drake', 'Lich King', 'Demon Lord', 'Death Knight', 'Shadow Titan'];
const BOSS_EMOJIS = ['👹', '🐲', '💀', '🔥', '☠️', '🌑'];

export interface Hero {
  hp: number; maxHp: number;
  attack: number; defense: number;
  level: number;
}

export interface Enemy {
  name:       string;
  hp:         number;
  maxHp:      number;
  attack:     number;
  defense:    number;
  goldReward: number;
  isBoss:     boolean;
  emoji:      string;
}

function buildEnemy(level: number): Enemy {
  const isBoss = level % 20 === 0;
  if (isBoss) {
    const bi = Math.floor(level / 20) - 1;
    const hp = (20 + level * 10) * 3;
    return {
      name:       BOSS_NAMES[bi % BOSS_NAMES.length],
      hp, maxHp:  hp,
      attack:     Math.round((3 + level * 2) * 1.8),
      defense:    Math.round((1 + level)     * 1.5),
      goldReward: (5 + level * 3) * 5,
      isBoss:     true,
      emoji:      BOSS_EMOJIS[bi % BOSS_EMOJIS.length],
    };
  }
  const hp = 20 + level * 10;
  return {
    name: `Goblin Lv.${level}`, hp, maxHp: hp,
    attack: 3 + level * 2, defense: 1 + level,
    goldReward: 5 + level * 3,
    isBoss: false, emoji: '👾',
  };
}

// ─── Store ─────────────────────────────────────────────────────────────────────
const EMPTY_EQUIPPED: Record<EquipSlot, Item | null> = {
  weapon: null, helmet: null, armor: null, boots: null, shield: null, ring: null,
};

function makeInitialHero(cid: CompanionId): Hero {
  return {
    hp: 100, maxHp: 100, level: 1,
    attack:  10 + COMPANIONS[cid].bonusAttack,
    defense:  5 + COMPANIONS[cid].bonusDefense,
  };
}

interface GameState {
  // Per-companion hero state
  heroes:            Record<CompanionId, Hero>;
  companionEquipped: Record<CompanionId, Record<EquipSlot, Item | null>>;
  companionExp:      Record<CompanionId, number>;

  // Shared resources
  gold:           number;

  dungeonLevel:   number;
  enemy:          Enemy;
  inventory:      Item[];
  pendingChest:   Item[] | null;
  atkUpgradeCost:      number;
  hpUpgradeCost:       number;
  bulletSizeLevel:     number;
  bulletSizeUpgradeCost: number;
  fragments:      Record<FragmentType, number>;

  // Dungeon auto-run state
  dungeonRunning:    boolean;
  dungeonChestQueue: Item[][];
  dungeonDeathFloor: number | null;
  dungeonPendingGold: number;

  setHero:        (companionId: CompanionId, partial: Partial<Hero>) => void;
  gainGold:       (amount: number) => void;
  spendGold:      (amount: number) => boolean;
  levelUpHero:    (companionId: CompanionId) => void;
  addExp:         (amount: number, companionId: CompanionId) => void;
  forgeItem:      (itemId: string) => void;
  advanceDungeon: () => void;
  damageEnemy:    (amount: number) => void;
  damageHero:     (amount: number) => void;
  spawnEnemy:     () => void;
  equipItem:      (item: Item, companionId: CompanionId) => void;
  unequipItem:    (slot: EquipSlot, companionId: CompanionId) => void;
  setPendingChest:    (items: Item[]) => void;
  collectChest:       () => void;
  checkpointFloor:       number;
  saveCheckpoint:        () => void;
  returnToCheckpoint:    () => void;
  upgradeBulletSize:     () => void;
  resetGame:             () => void;

  // Companion actions
  unlockedCompanions:  CompanionId[];
  assignedCompanions:  { home: CompanionId | null; dungeon: CompanionId | null };
  recruitCompanion:    (id: CompanionId) => void;
  assignCompanion:     (mode: 'home' | 'dungeon', id: CompanionId | null) => void;

  // Dungeon auto-run actions
  startDungeonRun:       () => void;
  stopDungeonRun:        (floor: number) => void;
  addDungeonChest:       (items: Item[]) => void;
  openNextDungeonChest:  () => void;
  addDungeonPendingGold: (amount: number) => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
  heroes: {
    ironGuard:     makeInitialHero('ironGuard'),
    shadowStriker: makeInitialHero('shadowStriker'),
  },
  companionEquipped: {
    ironGuard:     { ...EMPTY_EQUIPPED },
    shadowStriker: { ...EMPTY_EQUIPPED },
  },
  companionExp: { ironGuard: 0, shadowStriker: 0 },
  gold:            0,
  dungeonLevel:    1,
  enemy:           buildEnemy(1),
  inventory:       [],
  pendingChest:    null,
  checkpointFloor: 1,
  atkUpgradeCost:       10,
  hpUpgradeCost:        40,
  bulletSizeLevel:      0,
  bulletSizeUpgradeCost: 200,
  fragments:       { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 },
  dungeonRunning:     false,
  dungeonChestQueue:  [],
  dungeonDeathFloor:  null,
  dungeonPendingGold: 0,
  unlockedCompanions:  ['ironGuard', 'shadowStriker'],
  assignedCompanions:  { home: 'ironGuard' as CompanionId, dungeon: 'ironGuard' as CompanionId },

  setHero: (cid, partial) =>
    set(s => ({ heroes: { ...s.heroes, [cid]: { ...s.heroes[cid], ...partial } } })),

  gainGold: (amount) =>
    set(s => ({ gold: s.gold + amount })),

  spendGold: (amount) => {
    if (get().gold < amount) return false;
    set(s => ({ gold: s.gold - amount }));
    return true;
  },

  levelUpHero: (cid) => {
    const s = get();
    const h = s.heroes[cid];
    const req = getLevelRequirements(h.level);
    if (s.companionExp[cid] < req.exp) return;
    if (s.gold < req.gold) return;
    for (const [type, needed] of Object.entries(req.fragments)) {
      if ((s.fragments[type as FragmentType] ?? 0) < (needed ?? 0)) return;
    }
    const newFragments = { ...s.fragments };
    for (const [type, needed] of Object.entries(req.fragments)) {
      newFragments[type as FragmentType] -= needed ?? 0;
    }
    const newMaxHp = h.maxHp + 10;
    set({
      gold:         s.gold - req.gold,
      fragments:    newFragments,
      companionExp: { ...s.companionExp, [cid]: 0 },
      heroes: {
        ...s.heroes,
        [cid]: {
          ...h,
          level:   h.level + 1,
          maxHp:   newMaxHp,
          hp:      newMaxHp,
          attack:  h.attack + 3,
        },
      },
    });
  },

  addExp: (amount, cid) =>
    set(s => ({
      companionExp: { ...s.companionExp, [cid]: s.companionExp[cid] + amount },
    })),

  forgeItem: (itemId) =>
    set(s => {
      const item = s.inventory.find(i => i.id === itemId);
      if (!item) return s;
      const yld   = FORGE_YIELD[item.rarity];
      const count = yld.min + Math.floor(Math.random() * (yld.max - yld.min + 1));
      return {
        inventory: s.inventory.filter(i => i.id !== itemId),
        fragments: { ...s.fragments, [yld.type]: s.fragments[yld.type] + count },
      };
    }),

  advanceDungeon: () =>
    set(s => { const n = s.dungeonLevel + 1; return { dungeonLevel: n, enemy: buildEnemy(n) }; }),

  damageEnemy: (amount) =>
    set(s => {
      const dmg = Math.max(1, amount - s.enemy.defense);
      return { enemy: { ...s.enemy, hp: Math.max(0, s.enemy.hp - dmg) } };
    }),

  damageHero: (amount) =>
    set(s => {
      const cid = s.assignedCompanions.dungeon ?? 'ironGuard';
      const h = s.heroes[cid];
      const dmg = Math.max(1, amount - h.defense);
      return {
        heroes: { ...s.heroes, [cid]: { ...h, hp: Math.max(0, h.hp - dmg) } },
      };
    }),

  spawnEnemy: () =>
    set(s => ({ enemy: buildEnemy(s.dungeonLevel) })),

  equipItem: (item, cid) =>
    set(s => {
      const old    = s.companionEquipped[cid][item.slot];
      const newInv = s.inventory.filter(i => i.id !== item.id);
      if (old) newInv.push(old);
      const h = s.heroes[cid];
      const newMaxHp = h.maxHp - (old?.bonusHp ?? 0) + item.bonusHp;
      return {
        companionEquipped: {
          ...s.companionEquipped,
          [cid]: { ...s.companionEquipped[cid], [item.slot]: item },
        },
        inventory: newInv,
        heroes: {
          ...s.heroes,
          [cid]: {
            ...h,
            attack:  h.attack  - (old?.bonusAttack  ?? 0) + item.bonusAttack,
            defense: h.defense - (old?.bonusDefense ?? 0) + item.bonusDefense,
            maxHp:   newMaxHp,
            hp:      Math.min(h.hp + item.bonusHp, newMaxHp),
          },
        },
      };
    }),

  unequipItem: (slot, cid) =>
    set(s => {
      const item = s.companionEquipped[cid][slot];
      if (!item) return s;
      const h = s.heroes[cid];
      const newMaxHp = Math.max(1, h.maxHp - item.bonusHp);
      return {
        companionEquipped: {
          ...s.companionEquipped,
          [cid]: { ...s.companionEquipped[cid], [slot]: null },
        },
        inventory: [...s.inventory, item],
        heroes: {
          ...s.heroes,
          [cid]: {
            ...h,
            attack:  h.attack  - item.bonusAttack,
            defense: h.defense - item.bonusDefense,
            maxHp:   newMaxHp,
            hp:      Math.min(h.hp, newMaxHp),
          },
        },
      };
    }),

  setPendingChest: (items) => set({ pendingChest: items }),

  collectChest: () =>
    set(s => ({
      inventory:    [...s.inventory, ...(s.pendingChest ?? [])],
      pendingChest: null,
    })),

  saveCheckpoint: () =>
    set(s => ({ checkpointFloor: s.dungeonLevel })),

  returnToCheckpoint: () =>
    set(s => {
      const cid = s.assignedCompanions.dungeon ?? 'ironGuard';
      const h = s.heroes[cid];
      return {
        dungeonLevel: s.checkpointFloor,
        enemy:        buildEnemy(s.checkpointFloor),
        heroes: { ...s.heroes, [cid]: { ...h, hp: h.maxHp } },
      };
    }),

  upgradeBulletSize: () => {
    const s = get();
    if (s.gold < s.bulletSizeUpgradeCost) return;
    set({
      gold:                  s.gold - s.bulletSizeUpgradeCost,
      bulletSizeLevel:       s.bulletSizeLevel + 1,
      bulletSizeUpgradeCost: Math.round(s.bulletSizeUpgradeCost * 1.8),
    });
  },

  startDungeonRun: () =>
    set({ dungeonRunning: true, dungeonDeathFloor: null, dungeonPendingGold: 0 }),

  stopDungeonRun: (floor) =>
    set(s => {
      const cid = s.assignedCompanions.dungeon ?? 'ironGuard';
      return {
        dungeonRunning:     false,
        dungeonDeathFloor:  floor,
        dungeonPendingGold: 0,
        gold:               s.gold + s.dungeonPendingGold,
        heroes: { ...s.heroes, [cid]: { ...s.heroes[cid], hp: 0 } },
      };
    }),

  addDungeonChest: (items) =>
    set(s => ({ dungeonChestQueue: [...s.dungeonChestQueue, items] })),

  openNextDungeonChest: () =>
    set(s => {
      const [first, ...rest] = s.dungeonChestQueue;
      return {
        dungeonChestQueue: rest,
        inventory: first ? [...s.inventory, ...first] : s.inventory,
      };
    }),

  addDungeonPendingGold: (amount) =>
    set(s => ({ dungeonPendingGold: s.dungeonPendingGold + amount })),

  recruitCompanion: (id) => {
    const s = get();
    if (s.unlockedCompanions.includes(id)) return;
    if (!s.spendGold(COMPANIONS[id].recruitCost)) return;
    set(s2 => ({ unlockedCompanions: [...s2.unlockedCompanions, id] }));
  },

  assignCompanion: (mode, id) =>
    set(s => ({ assignedCompanions: { ...s.assignedCompanions, [mode]: id } })),

  resetGame: () =>
    set({
      heroes: {
        ironGuard:     makeInitialHero('ironGuard'),
        shadowStriker: makeInitialHero('shadowStriker'),
      },
      companionEquipped: {
        ironGuard:     { ...EMPTY_EQUIPPED },
        shadowStriker: { ...EMPTY_EQUIPPED },
      },
      companionExp: { ironGuard: 0, shadowStriker: 0 },
      gold:              0,
      dungeonLevel:      1,
      enemy:             buildEnemy(1),
      inventory:         [],
      pendingChest:      null,
      checkpointFloor:   1,
      atkUpgradeCost:        10,
      hpUpgradeCost:         40,
      bulletSizeLevel:       0,
      bulletSizeUpgradeCost: 200,
      fragments:         { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 },
      dungeonRunning:     false,
      dungeonChestQueue:  [],
      dungeonDeathFloor:  null,
      dungeonPendingGold: 0,
      unlockedCompanions:  ['ironGuard', 'shadowStriker'],
      assignedCompanions:  { home: 'ironGuard' as CompanionId, dungeon: 'ironGuard' as CompanionId },
    }),
  }),
  {
    name:    'dungeon-crawler-save',
    storage: createJSONStorage(() => AsyncStorage),
    version: 3,
    migrate: (persisted: any, version) => {
      if (version < 2) {
        const BASE_HERO = { hp: 100, maxHp: 100, attack: 10, defense: 5, level: 1 };
        const oldHero = persisted.hero ?? { ...BASE_HERO, gold: 0 };
        persisted = {
          ...persisted,
          gold: oldHero.gold ?? 0,
          heroes: {
            ironGuard: {
              hp:      oldHero.hp,
              maxHp:   oldHero.maxHp,
              attack:  oldHero.attack,
              defense: oldHero.defense,
              level:   oldHero.level,
            },
            shadowStriker: { ...BASE_HERO },
          },
          companionEquipped: {
            ironGuard:     persisted.equipped ?? { ...EMPTY_EQUIPPED },
            shadowStriker: { ...EMPTY_EQUIPPED },
          },
          companionExp: {
            ironGuard:     persisted.heroExp ?? 0,
            shadowStriker: 0,
          },
        };
      }
      if (version < 3) {
        const h = persisted.heroes ?? {};
        persisted = {
          ...persisted,
          heroes: {
            ironGuard: {
              ...(h.ironGuard ?? {}),
              attack:  ((h.ironGuard?.attack  ?? 10) + COMPANIONS.ironGuard.bonusAttack),
              defense: ((h.ironGuard?.defense ??  5) + COMPANIONS.ironGuard.bonusDefense),
            },
            shadowStriker: {
              ...(h.shadowStriker ?? {}),
              attack:  ((h.shadowStriker?.attack  ?? 10) + COMPANIONS.shadowStriker.bonusAttack),
              defense: ((h.shadowStriker?.defense ??  5) + COMPANIONS.shadowStriker.bonusDefense),
            },
          },
        };
      }
      return persisted;
    },
    partialize: (s) => ({
      heroes:            s.heroes,
      companionEquipped: s.companionEquipped,
      companionExp:      s.companionExp,
      gold:              s.gold,
      dungeonLevel:      s.dungeonLevel,
      inventory:         s.inventory,
      checkpointFloor:   s.checkpointFloor,
      atkUpgradeCost:        s.atkUpgradeCost,
      hpUpgradeCost:         s.hpUpgradeCost,
      bulletSizeLevel:       s.bulletSizeLevel,
      bulletSizeUpgradeCost: s.bulletSizeUpgradeCost,
      fragments:         s.fragments,
      dungeonChestQueue:  s.dungeonChestQueue,
      dungeonDeathFloor:  s.dungeonDeathFloor,
      dungeonPendingGold: s.dungeonPendingGold,
      unlockedCompanions:  s.unlockedCompanions,
      assignedCompanions:  s.assignedCompanions,
    }),
  }
));
