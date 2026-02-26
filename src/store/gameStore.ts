import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Item system ───────────────────────────────────────────────────────────────
export type EquipSlot   = 'weapon' | 'helmet' | 'armor' | 'boots' | 'shield' | 'ring';
export type ItemRarity  = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

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
  level: number; gold: number;
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

interface GameState {
  hero:           Hero;
  dungeonLevel:   number;
  enemy:          Enemy;
  equipped:       Record<EquipSlot, Item | null>;
  inventory:      Item[];
  pendingChest:   Item[] | null;
  atkUpgradeCost: number;
  hpUpgradeCost:  number;
  heroExp:        number;
  fragments:      Record<FragmentType, number>;

  // Dungeon auto-run state
  dungeonRunning:    boolean;
  dungeonChestQueue: Item[][];
  dungeonDeathFloor: number | null;

  setHero:        (partial: Partial<Hero>) => void;
  gainGold:       (amount: number) => void;
  spendGold:      (amount: number) => boolean;
  levelUpHero:    () => void;
  addExp:         (amount: number) => void;
  forgeItem:      (itemId: string) => void;
  advanceDungeon: () => void;
  damageEnemy:    (amount: number) => void;
  damageHero:     (amount: number) => void;
  spawnEnemy:     () => void;
  equipItem:      (item: Item) => void;
  unequipItem:    (slot: EquipSlot) => void;
  setPendingChest:    (items: Item[]) => void;
  collectChest:       () => void;
  checkpointFloor:    number;
  saveCheckpoint:     () => void;
  returnToCheckpoint: () => void;
  resetGame:          () => void;

  // Dungeon auto-run actions
  startDungeonRun:      () => void;
  stopDungeonRun:       (floor: number) => void;
  addDungeonChest:      (items: Item[]) => void;
  openNextDungeonChest: () => void;
}

const INITIAL_HERO: Hero = {
  hp: 100, maxHp: 100, attack: 10, defense: 5, level: 1, gold: 0,
};

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
  hero:            INITIAL_HERO,
  dungeonLevel:    1,
  enemy:           buildEnemy(1),
  equipped:        { ...EMPTY_EQUIPPED },
  inventory:       [],
  pendingChest:    null,
  checkpointFloor: 1,
  atkUpgradeCost:  10,
  hpUpgradeCost:   40,
  heroExp:         0,
  fragments:       { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 },
  dungeonRunning:    false,
  dungeonChestQueue: [],
  dungeonDeathFloor: null,

  setHero: (partial) =>
    set(s => ({ hero: { ...s.hero, ...partial } })),

  gainGold: (amount) =>
    set(s => ({ hero: { ...s.hero, gold: s.hero.gold + amount } })),

  spendGold: (amount) => {
    if (get().hero.gold < amount) return false;
    set(s => ({ hero: { ...s.hero, gold: s.hero.gold - amount } }));
    return true;
  },

  levelUpHero: () => {
    const s = get();
    const req = getLevelRequirements(s.hero.level);
    if (s.heroExp < req.exp) return;
    if (s.hero.gold < req.gold) return;
    for (const [type, needed] of Object.entries(req.fragments)) {
      if ((s.fragments[type as FragmentType] ?? 0) < (needed ?? 0)) return;
    }
    const newFragments = { ...s.fragments };
    for (const [type, needed] of Object.entries(req.fragments)) {
      newFragments[type as FragmentType] -= needed ?? 0;
    }
    const newMaxHp = s.hero.maxHp + 10;
    set({
      heroExp:   0,
      fragments: newFragments,
      hero: {
        ...s.hero,
        gold:    s.hero.gold - req.gold,
        level:   s.hero.level + 1,
        maxHp:   newMaxHp,
        hp:      newMaxHp,
        attack:  s.hero.attack + 3,
      },
    });
  },

  addExp: (amount) =>
    set(s => ({ heroExp: s.heroExp + amount })),

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
      const dmg = Math.max(1, amount - s.hero.defense);
      return { hero: { ...s.hero, hp: Math.max(0, s.hero.hp - dmg) } };
    }),

  spawnEnemy: () =>
    set(s => ({ enemy: buildEnemy(s.dungeonLevel) })),

  equipItem: (item) =>
    set(s => {
      const old    = s.equipped[item.slot];
      const newInv = s.inventory.filter(i => i.id !== item.id);
      if (old) newInv.push(old);
      const newMaxHp = s.hero.maxHp - (old?.bonusHp ?? 0) + item.bonusHp;
      return {
        equipped:  { ...s.equipped, [item.slot]: item },
        inventory: newInv,
        hero: {
          ...s.hero,
          attack:  s.hero.attack  - (old?.bonusAttack  ?? 0) + item.bonusAttack,
          defense: s.hero.defense - (old?.bonusDefense ?? 0) + item.bonusDefense,
          maxHp:   newMaxHp,
          hp:      Math.min(s.hero.hp + item.bonusHp, newMaxHp),
        },
      };
    }),

  unequipItem: (slot) =>
    set(s => {
      const item = s.equipped[slot];
      if (!item) return s;
      const newMaxHp = Math.max(1, s.hero.maxHp - item.bonusHp);
      return {
        equipped:  { ...s.equipped, [slot]: null },
        inventory: [...s.inventory, item],
        hero: {
          ...s.hero,
          attack:  s.hero.attack  - item.bonusAttack,
          defense: s.hero.defense - item.bonusDefense,
          maxHp:   newMaxHp,
          hp:      Math.min(s.hero.hp, newMaxHp),
        },
      };
    }),

  setPendingChest: (items) => set({ pendingChest: items }),

  collectChest: () =>
    set(s => ({
      inventory:    [...s.inventory, ...(s.pendingChest ?? [])],
      pendingChest: null,
    })),

  // Saves current dungeonLevel as checkpoint (called after advanceDungeon, so it stores the new level)
  saveCheckpoint: () =>
    set(s => ({ checkpointFloor: s.dungeonLevel })),

  // Teleports back to checkpoint floor and restores hero HP
  returnToCheckpoint: () =>
    set(s => ({
      dungeonLevel: s.checkpointFloor,
      enemy:        buildEnemy(s.checkpointFloor),
      hero:         { ...s.hero, hp: s.hero.maxHp },
    })),

  startDungeonRun: () =>
    set({ dungeonRunning: true, dungeonDeathFloor: null }),

  stopDungeonRun: (floor) =>
    set(s => ({
      dungeonRunning:    false,
      dungeonDeathFloor: floor,
      hero:              { ...s.hero, hp: 0 },
    })),

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

  resetGame: () =>
    set({
      hero:              { ...INITIAL_HERO },
      dungeonLevel:      1,
      enemy:             buildEnemy(1),
      equipped:          { ...EMPTY_EQUIPPED },
      inventory:         [],
      pendingChest:      null,
      checkpointFloor:   1,
      atkUpgradeCost:    10,
      hpUpgradeCost:     40,
      heroExp:           0,
      fragments:         { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 },
      dungeonRunning:    false,
      dungeonChestQueue: [],
      dungeonDeathFloor: null,
    }),
  }),
  {
    name:    'dungeon-crawler-save',
    storage: createJSONStorage(() => AsyncStorage),
    partialize: (s) => ({
      hero:              s.hero,
      dungeonLevel:      s.dungeonLevel,
      equipped:          s.equipped,
      inventory:         s.inventory,
      checkpointFloor:   s.checkpointFloor,
      atkUpgradeCost:    s.atkUpgradeCost,
      hpUpgradeCost:     s.hpUpgradeCost,
      heroExp:           s.heroExp,
      fragments:         s.fragments,
      dungeonChestQueue: s.dungeonChestQueue,
      dungeonDeathFloor: s.dungeonDeathFloor,
    }),
  }
));
