import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, ViewStyle } from 'react-native';
import Colors from '@/constants/colors';
import { Spacing, BorderRadius } from '@/constants/design';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * Animated skeleton placeholder for loading states
 */
export function Skeleton({
  width = '100%' as `${number}%`,
  height = 20,
  borderRadius = BorderRadius.sm,
  style
}: SkeletonProps) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width, height, borderRadius, opacity },
        style,
      ]}
    />
  );
}

/**
 * Skeleton for a single holding card
 */
export function HoldingCardSkeleton() {
  return (
    <View style={styles.holdingCard}>
      <Skeleton width={44} height={44} borderRadius={BorderRadius.md} />
      <View style={styles.holdingInfo}>
        <Skeleton width="60%" height={16} style={{ marginBottom: Spacing.xs }} />
        <Skeleton width="40%" height={12} />
      </View>
      <View style={styles.holdingValue}>
        <Skeleton width={70} height={16} style={{ marginBottom: Spacing.xs }} />
        <Skeleton width={50} height={12} />
      </View>
    </View>
  );
}

/**
 * Skeleton for the portfolio value card
 */
export function ValueCardSkeleton() {
  return (
    <View style={styles.valueCard}>
      <Skeleton width={120} height={14} style={{ marginBottom: Spacing.sm }} />
      <Skeleton width={180} height={40} style={{ marginBottom: Spacing.md }} />
      <View style={styles.changeRow}>
        <Skeleton width={80} height={28} borderRadius={BorderRadius.xl} />
        <Skeleton width={100} height={14} />
      </View>
    </View>
  );
}

/**
 * Skeleton for stats row (3 cards)
 */
export function StatsRowSkeleton() {
  return (
    <View style={styles.statsRow}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.statCard}>
          <Skeleton width={36} height={36} borderRadius={BorderRadius.sm + 2} style={{ marginBottom: Spacing.sm }} />
          <Skeleton width={40} height={20} style={{ marginBottom: Spacing.xs }} />
          <Skeleton width={50} height={11} />
        </View>
      ))}
    </View>
  );
}

/**
 * Full portfolio loading skeleton
 */
export function PortfolioSkeleton() {
  return (
    <View style={styles.container}>
      <ValueCardSkeleton />
      <StatsRowSkeleton />
      <View style={styles.section}>
        <Skeleton width={100} height={18} style={{ marginBottom: Spacing.md }} />
        <HoldingCardSkeleton />
        <HoldingCardSkeleton />
        <HoldingCardSkeleton />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: Colors.surface,
  },
  container: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  holdingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md + 2,
    padding: Spacing.md + 2,
    marginBottom: Spacing.md - 2,
  },
  holdingInfo: {
    flex: 1,
    marginLeft: Spacing.md,
    marginRight: Spacing.sm,
  },
  holdingValue: {
    alignItems: 'flex-end',
  },
  valueCard: {
    backgroundColor: Colors.primary + '30',
    borderRadius: BorderRadius.xxl,
    padding: Spacing.xxl,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md - 2,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md + 2,
    alignItems: 'center',
  },
  section: {
    marginTop: Spacing.sm,
  },
});
