import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface AccountListItemProps {
  icon: React.ReactNode;
  name: string;
  type: string;
  amount: number;
  lastUpdate?: string;
  percentOfTotal?: number;
  onPress?: () => void;
}

export function AccountListItem({
  icon,
  name,
  type,
  amount,
  lastUpdate,
  percentOfTotal,
  onPress,
}: AccountListItemProps) {
  const isPositive = amount >= 0;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.iconWrapper}>
        {icon}
      </View>

      <View style={styles.content}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.type}>{type}</Text>
        {lastUpdate && (
          <Text style={styles.lastUpdate}>{lastUpdate}</Text>
        )}
      </View>

      <View style={styles.rightContent}>
        <Text style={[styles.amount, { color: isPositive ? Colors.text : Colors.danger }]}>
          {isPositive ? '' : '-'}${Math.abs(amount).toLocaleString()}
        </Text>
        {percentOfTotal !== undefined && (
          <Text style={styles.percentage}>
            {percentOfTotal.toFixed(1)}% of assets
          </Text>
        )}
      </View>

      {onPress && (
        <ChevronRight size={20} color={Colors.textMuted} style={styles.chevron} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginBottom: 10,
  },
  pressed: {
    opacity: 0.7,
  },
  iconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.accentMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 3,
  },
  type: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  lastUpdate: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  rightContent: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  amount: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 3,
  },
  percentage: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  chevron: {
    marginLeft: 4,
  },
});
