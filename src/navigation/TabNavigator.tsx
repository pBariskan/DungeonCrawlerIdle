import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import DungeonScreen from '../screens/DungeonScreen';
import HeroScreen from '../screens/HeroScreen';
import ShopScreen from '../screens/ShopScreen';
import ForgeScreen from '../screens/ForgeScreen';
import { useGameStore } from '../store/gameStore';

const PIXEL = 'PressStart2P_400Regular';

function GoldDisplay() {
  const gold = useGameStore(s => s.hero.gold);
  return <Text style={{ fontFamily: PIXEL, color: '#f1c40f', fontSize: 8, marginRight: 14 }}>★ {gold}G</Text>;
}

export type RootTabParamList = {
  Home:    undefined;
  Dungeon: undefined;
  Hero:    undefined;
  Village: undefined;
  Forge:   undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

const ICONS: Record<string, string> = {
  Home:    '🏠',
  Dungeon: '⚔️',
  Hero:    '🧙',
  Village: '🏘️',
  Forge:   '🔥',
};

export default function TabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        tabBarIcon: () => <Text style={{ fontSize: 20 }}>{ICONS[route.name]}</Text>,
        tabBarActiveTintColor: '#e0c97f',
        tabBarInactiveTintColor: '#5580c0',
        tabBarStyle: { backgroundColor: '#182848', borderTopColor: '#3d5ca8' },
        headerStyle: { backgroundColor: '#182848' },
        headerTintColor: '#e0c97f',
        headerTitleStyle: { fontWeight: 'bold' },
        headerRight: () => <GoldDisplay />,
      })}
    >
      <Tab.Screen name="Hero" component={HeroScreen} />
      <Tab.Screen name="Dungeon" component={DungeonScreen} />
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Forge" component={ForgeScreen} />
      <Tab.Screen name="Village" component={ShopScreen} />
    </Tab.Navigator>
  );
}
