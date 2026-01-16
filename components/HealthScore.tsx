import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FinancialSnapshot } from '@/types';
import Colors from '@/constants/colors';

interface HealthScoreProps {
  snapshot: FinancialSnapshot;
}

export function HealthScore({ snapshot }: HealthScoreProps) {
  const getHealthColor = () => {
    if (snapshot.healthScore >= 80) return Colors.health.excellent;
    if (snapshot.healthScore >= 60) return Colors.health.strong;
    if (snapshot.healthScore >= 40) return Colors.health.stable;
    if (snapshot.healthScore >= 20) return Colors.health.needsAttention;
    return Colors.health.critical;
  };

  const healthColor = getHealthColor();

  return (
    <View style={styles.container}>
      <View style={styles.scoreContainer}>
        <View style={styles.svgContainer}>
          <View style={[styles.backgroundCircle, { borderColor: Colors.border }]} />
          <View 
            style={[
              styles.progressCircle, 
              { 
                borderColor: healthColor,
                transform: [{ rotate: '-90deg' }],
              }
            ]} 
          />
          <View style={styles.scoreTextContainer}>
            <Text style={[styles.score, { color: healthColor }]}>{snapshot.healthScore}</Text>
            <Text style={styles.maxScore}>/100</Text>
          </View>
        </View>
      </View>
      <View style={styles.labelContainer}>
        <View style={[styles.dot, { backgroundColor: healthColor }]} />
        <Text style={styles.label}>{snapshot.healthLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  scoreContainer: {
    width: 120,
    height: 120,
    position: 'relative',
  },
  svgContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundCircle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 8,
  },
  progressCircle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 8,
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  scoreTextContainer: {
    alignItems: 'center',
  },
  score: {
    fontSize: 32,
    fontWeight: '700',
  },
  maxScore: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: -4,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
});
