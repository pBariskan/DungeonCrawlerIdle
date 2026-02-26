import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useFonts, PressStart2P_400Regular } from '@expo-google-fonts/press-start-2p';
import TabNavigator from './src/navigation/TabNavigator';

export default function App() {
  const [fontsLoaded] = useFonts({ PressStart2P_400Regular });

  if (!fontsLoaded) return null;

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <TabNavigator />
    </NavigationContainer>
  );
}
