import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';

export type TimePeriod = '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL';

interface TimePeriodSelectorProps {
  selected: TimePeriod;
  onSelect: (period: TimePeriod) => void;
}

const periods: TimePeriod[] = ['1D', '1W', '1M', '3M', '1Y', 'ALL'];

export default function TimePeriodSelector({ selected, onSelect }: TimePeriodSelectorProps) {
  return (
    <View style={styles.container}>
      {periods.map((period) => (
        <TouchableOpacity
          key={period}
          style={[
            styles.button,
            selected === period && styles.buttonActive,
          ]}
          onPress={() => onSelect(period)}
          activeOpacity={Colors.pressed.opacity}
        >
          <Text
            style={[
              styles.text,
              selected === period && styles.textActive,
            ]}
          >
            {period}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceHighlight,
    borderRadius: 8,
    padding: 4,
    gap: 4,
  },
  button: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonActive: {
    backgroundColor: Colors.primary,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  textActive: {
    color: Colors.text,
  },
});
