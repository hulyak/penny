import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { HelpCircle, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface WhatWouldChangeProps {
  items: string[];
  compact?: boolean;
}

export function WhatWouldChange({ items, compact = false }: WhatWouldChangeProps) {
  const [expanded, setExpanded] = useState(false);
  const rotateAnim = React.useRef(new Animated.Value(0)).current;

  const toggleExpand = () => {
    Animated.spring(rotateAnim, {
      toValue: expanded ? 0 : 1,
      useNativeDriver: true,
    }).start();
    setExpanded(!expanded);
  };

  if (!items || items.length === 0) return null;

  if (compact) {
    return (
      <Pressable style={styles.compactContainer} onPress={toggleExpand}>
        <View style={styles.compactHeader}>
          <HelpCircle size={14} color={Colors.accent} />
          <Text style={styles.compactLabel}>What would change this?</Text>
          {expanded ? (
            <ChevronUp size={14} color={Colors.textMuted} />
          ) : (
            <ChevronDown size={14} color={Colors.textMuted} />
          )}
        </View>
        {expanded && (
          <View style={styles.compactContent}>
            {items.map((item, index) => (
              <View key={index} style={styles.compactItem}>
                <View style={styles.bulletPoint} />
                <Text style={styles.compactItemText}>{item}</Text>
              </View>
            ))}
          </View>
        )}
      </Pressable>
    );
  }

  return (
    <View style={styles.container}>
      <Pressable style={styles.header} onPress={toggleExpand}>
        <View style={styles.iconContainer}>
          <Lightbulb size={16} color={Colors.accent} />
        </View>
        <Text style={styles.label}>What would change this?</Text>
        <View style={styles.expandIcon}>
          {expanded ? (
            <ChevronUp size={18} color={Colors.textMuted} />
          ) : (
            <ChevronDown size={18} color={Colors.textMuted} />
          )}
        </View>
      </Pressable>
      
      {expanded && (
        <View style={styles.content}>
          {items.map((item, index) => (
            <View key={index} style={styles.item}>
              <View style={styles.itemNumber}>
                <Text style={styles.itemNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.itemText}>{item}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.accentMuted,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  label: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.accent,
  },
  expandIcon: {
    marginLeft: 8,
  },
  content: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  itemNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.accent + '30',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  itemNumberText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.accent,
  },
  itemText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
  },
  compactContainer: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    color: Colors.accent,
  },
  compactContent: {
    marginTop: 8,
    gap: 4,
  },
  compactItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bulletPoint: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.accent,
    marginRight: 8,
    marginTop: 6,
  },
  compactItemText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
});
