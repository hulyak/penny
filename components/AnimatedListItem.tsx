import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle, StyleProp } from 'react-native';

interface AnimatedListItemProps {
  children: React.ReactNode;
  index: number;
  style?: StyleProp<ViewStyle>;
  delay?: number;
  duration?: number;
}

/**
 * Wraps a list item with a staggered fade-in and slide-up animation
 */
export function AnimatedListItem({
  children,
  index,
  style,
  delay = 50,
  duration = 300,
}: AnimatedListItemProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    const staggerDelay = index * delay;

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration,
        delay: staggerDelay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration,
        delay: staggerDelay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, translateY, index, delay, duration]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: fadeAnim,
          transform: [{ translateY }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

interface AnimatedFadeInProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  delay?: number;
  duration?: number;
}

/**
 * Simple fade-in animation for content
 */
export function AnimatedFadeIn({
  children,
  style,
  delay = 0,
  duration = 400,
}: AnimatedFadeInProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration,
      delay,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, delay, duration]);

  return (
    <Animated.View style={[style, { opacity: fadeAnim }]}>
      {children}
    </Animated.View>
  );
}

interface AnimatedScaleInProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  delay?: number;
  duration?: number;
}

/**
 * Scale-in animation (great for cards, modals)
 */
export function AnimatedScaleIn({
  children,
  style,
  delay = 0,
  duration = 300,
}: AnimatedScaleInProps) {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        delay,
        useNativeDriver: true,
        tension: 100,
        friction: 10,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, fadeAnim, delay, duration]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

interface PulseAnimationProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  active?: boolean;
}

/**
 * Subtle pulse animation for live data indicators
 */
export function PulseAnimation({
  children,
  style,
  active = true,
}: PulseAnimationProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!active) return;

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim, active]);

  return (
    <Animated.View
      style={[
        style,
        active && { transform: [{ scale: pulseAnim }] },
      ]}
    >
      {children}
    </Animated.View>
  );
}
