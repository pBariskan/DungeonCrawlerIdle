import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import DungeonScreen from '../screens/DungeonScreen';
import HeroScreen from '../screens/HeroScreen';
import ShopScreen from '../screens/ShopScreen';
import ForgeScreen from '../screens/ForgeScreen';
import DevScreen from '../screens/DevScreen';
import { useGameStore } from '../store/gameStore';

const PIXEL = 'PressStart2P_400Regular';

function GoldDisplay() {
  const gold = useGameStore(s => s.gold);
  return <Text style={{ fontFamily: PIXEL, color: '#f1c40f', fontSize: 8, marginRight: 14 }}>★ {gold}</Text>;
}

function DevButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        activeOpacity={0.75}
        style={{
          marginLeft: 14,
          width: 32, height: 32,
          alignItems: 'center', justifyContent: 'center',
          backgroundColor: '#0e1a38',
          borderTopWidth: 2, borderLeftWidth: 2, borderBottomWidth: 4, borderRightWidth: 4,
          borderTopColor: '#3d5ca8', borderLeftColor: '#3d5ca8',
          borderBottomColor: '#0a1020', borderRightColor: '#0a1020',
        }}
      >
        <Text style={{ fontFamily: PIXEL, color: '#7ec8f7', fontSize: 12 }}>⚙</Text>
      </TouchableOpacity>
      <DevScreen visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

function AccountLevelWidget() {
  const level  = useGameStore(s => s.accountLevel);
  const exp    = useGameStore(s => s.accountExp);
  const needed = 30 * level;
  const pct    = exp / needed;
  return (
    <View style={{ marginLeft: 8, justifyContent: 'center' }}>
      <Text style={{ fontFamily: PIXEL, color: '#e0c97f', fontSize: 7 }}>
        LV.{level}
      </Text>
      <View style={{ width: 64, height: 7, backgroundColor: '#4a3a10',
                     marginTop: 3, borderRadius: 2, overflow: 'hidden',
                     borderWidth: 1, borderColor: '#7a6020' }}>
        <View style={{ width: `${Math.min(100, pct * 100)}%`,
                       height: '100%', backgroundColor: '#f1c40f', borderRadius: 1 }} />
      </View>
    </View>
  );
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
        headerLeft:  () => (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <DevButton />
            <AccountLevelWidget />
          </View>
        ),
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
