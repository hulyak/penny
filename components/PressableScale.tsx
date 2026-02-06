import React, { useRef } from 'react';
import {
  Pressable,
  Animated,
  ViewStyle,
  StyleProp,
  PressableProps,
  GestureResponderEvent,
} from 'react-native';
import haptics from '@/lib/haptics';

interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleValue?: number;
  haptic?: 'light' | 'medium' | 'heavy' | 'selection' | 'none';
}

/**
 * Enhanced Pressable with scale animation and haptic feedback
 * Use this for cards, buttons, and other tappable elements
 */
export function PressableScale({
  children,
  style,
  scaleValue = 0.97,
  haptic = 'light',
  onPressIn,
  onPressOut,
  onPress,
  ...props
}: PressableScaleProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = (e: GestureResponderEvent) => {
    Animated.spring(scaleAnim, {
      toValue: scaleValue,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
    onPressIn?.(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
    onPressOut?.(e);
  };

  const handlePress = (e: GestureResponderEvent) => {
    // Trigger haptic feedback
    switch (haptic) {
      case 'light':
        haptics.lightTap();
        break;
      case 'medium':
        haptics.mediumTap();
        break;
      case 'heavy':
        haptics.heavyTap();
        break;
      case 'selection':
        haptics.selectionChanged();
        break;
    }
    onPress?.(e);
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      {...props}
    >
      <Animated.View
        style={[
          style,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

/**
 * A card variant with more subtle scale and shadow effect
 */
export function PressableCard({
  children,
  style,
  ...props
}: PressableScaleProps) {
  return (
    <PressableScale
      style={style}
      scaleValue={0.98}
      haptic="light"
      {...props}
    >
      {children}
    </PressableScale>
  );
}
