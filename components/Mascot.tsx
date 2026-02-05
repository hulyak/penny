import React from 'react';
import { Image, View, StyleSheet } from 'react-native';
import { PENNY_MASCOT } from '@/constants/images';

interface MascotProps {
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  showBubble?: boolean;
  mood?: 'happy' | 'neutral' | 'thinking';
}

const SIZES = {
  small: 44,
  medium: 64,
  large: 100,
  xlarge: 140,
};

export function Mascot({ size = 'medium', showBubble = false }: MascotProps) {
  const dimension = SIZES[size];

  return (
    <View style={styles.container}>
      <Image
        source={PENNY_MASCOT}
        style={{ width: dimension, height: dimension }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
