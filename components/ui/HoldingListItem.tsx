import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Colors from '@/constants/colors';

interface HoldingListItemProps {
  symbol: string;
  name: string;
  shares: number;
  price: number;
  value: number;
  change: number;
  changePercent: number;
  iconUrl?: string;
  onPress: () => void;
}

export default function HoldingListItem({
  symbol,
  name,
  shares,
  price,
  value,
  change,
  changePercent,
  iconUrl,
  onPress,
}: HoldingListItemProps) {
  const isPositive = change >= 0;
  const changeColor = isPositive ? Colors.success : Colors.danger;
  const changeSymbol = isPositive ? '+' : '';

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={Colors.pressed.opacity}
    >
      {/* Icon */}
      <View style={styles.iconContainer}>
        {iconUrl ? (
          <Image source={{ uri: iconUrl }} style={styles.icon} />
        ) : (
          <View style={[styles.icon, styles.iconPlaceholder]}>
            <Text style={styles.iconText}>{symbol.charAt(0)}</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        <Text style={styles.details}>
          {shares} shares • ${price.toFixed(2)}
        </Text>
      </View>

      {/* Value and Change */}
      <View style={styles.values}>
        <Text style={styles.value}>${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
        <Text style={[styles.change, { color: changeColor }]}>
          {changeSymbol}${Math.abs(change).toFixed(2)} {changeSymbol}{changePercent.toFixed(2)}%
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  iconContainer: {
    marginRight: 12,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  iconPlaceholder: {
    backgroundColor: Colors.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
  },
  info: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  details: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  values: {
    alignItems: 'flex-end',
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  change: {
    fontSize: 13,
    fontWeight: '600',
  },
});
