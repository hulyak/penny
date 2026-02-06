import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';

interface ProgressBarProps {
  current: number;
  goal: number;
  label?: string;
  color?: string;
  showPercentage?: boolean;
  height?: number;
}

export function ProgressBar({
  current,
  goal,
  label,
  color = Colors.accent,
  showPercentage = true,
  height = 8,
}: ProgressBarProps) {
  const percentage = Math.min(100, (current / goal) * 100);
  const remaining = Math.max(0, goal - current);

  return (
    <View style={styles.container}>
      {label && (
        <View style={styles.header}>
          <Text style={styles.label}>{label}</Text>
          {showPercentage && (
            <Text style={[styles.percentage, { color }]}>
              {percentage.toFixed(0)}%
            </Text>
          )}
        </View>
      )}
      
      <View style={[styles.track, { height }]}>
        <View 
          style={[
            styles.fill, 
            { 
              width: `${percentage}%`,
              backgroundColor: color,
              height 
            }
          ]} 
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          ${current.toLocaleString()} received
        </Text>
        <Text style={styles.footerText}>
          ${remaining.toLocaleString()} remaining
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  percentage: {
    fontSize: 15,
    fontWeight: '700',
  },
  track: {
    width: '100%',
    backgroundColor: Colors.border,
    borderRadius: 100,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: 100,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  footerText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
});
