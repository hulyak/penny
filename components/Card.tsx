import React from 'react';
import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';
import Colors from '@/constants/colors';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'outlined';
  onPress?: () => void;
}

export function Card({ children, style, variant = 'default', onPress }: CardProps) {
  const cardStyle = [
    styles.card,
    variant === 'elevated' && styles.elevated,
    variant === 'outlined' && styles.outlined,
    style,
  ];

  if (onPress) {
    return (
      <Pressable 
        style={({ pressed }) => [cardStyle, pressed && styles.pressed]}
        onPress={onPress}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  outlined: {
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
});
