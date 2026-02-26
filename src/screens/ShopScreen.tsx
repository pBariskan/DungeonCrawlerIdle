import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useGameStore } from '../store/gameStore';
import type { Hero } from '../store/gameStore';

interface ShopItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  apply: (hero: Hero) => Partial<Hero>;
}

const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'health_potion',
    name: 'Health Potion',
    description: 'Restore 30 HP',
    cost: 15,
    apply: (hero) => ({ hp: Math.min(hero.maxHp, hero.hp + 30) }),
  },
  {
    id: 'sharpening_stone',
    name: 'Sharpening Stone',
    description: '+3 Attack permanently',
    cost: 30,
    apply: (hero) => ({ attack: hero.attack + 3 }),
  },
  {
    id: 'iron_shield',
    name: 'Iron Shield',
    description: '+2 Defense permanently',
    cost: 25,
    apply: (hero) => ({ defense: hero.defense + 2 }),
  },
  {
    id: 'life_crystal',
    name: 'Life Crystal',
    description: '+25 Max HP',
    cost: 40,
    apply: (hero) => ({ maxHp: hero.maxHp + 25, hp: hero.hp + 25 }),
  },
];

export default function ShopScreen() {
  const { hero, spendGold, setHero } = useGameStore();

  const handleBuy = (item: ShopItem) => {
    if (spendGold(item.cost)) {
      setHero(item.apply(useGameStore.getState().hero));
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Shop</Text>
      <Text style={styles.gold}>Gold: {hero.gold}</Text>

      {SHOP_ITEMS.map((item) => (
        <View key={item.id} style={styles.card}>
          <View style={styles.info}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemDesc}>{item.description}</Text>
          </View>
          <TouchableOpacity
            style={[styles.buyBtn, hero.gold < item.cost && styles.btnDisabled]}
            onPress={() => handleBuy(item)}
            disabled={hero.gold < item.cost}
          >
            <Text style={styles.buyText}>{item.cost}g</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#1e3158' },
  container: { alignItems: 'center', padding: 20 },
  title: { fontSize: 22, color: '#e0c97f', fontWeight: 'bold', marginBottom: 6 },
  gold: { color: '#f1c40f', fontSize: 16, marginBottom: 20 },
  card: {
    width: '100%',
    backgroundColor: '#243a6a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  info: { flex: 1, marginRight: 12 },
  itemName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  itemDesc: { color: '#aaa', fontSize: 13, marginTop: 2 },
  buyBtn: { backgroundColor: '#27ae60', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20 },
  btnDisabled: { backgroundColor: '#444' },
  buyText: { color: '#fff', fontWeight: 'bold' },
});
