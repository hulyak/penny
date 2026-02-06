import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Calendar, TrendingUp, DollarSign, AlertCircle } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { MarketEvent } from '@/types';

interface MarketEventItemProps {
  event: MarketEvent;
  onPress?: () => void;
}

export default function MarketEventItem({ event, onPress }: MarketEventItemProps) {
  const getImpactColor = () => {
    switch (event.impact) {
      case 'high': return Colors.impact.high;
      case 'medium': return Colors.impact.medium;
      case 'low': return Colors.impact.low;
      default: return Colors.textSecondary;
    }
  };

  const getImpactLabel = () => {
    switch (event.impact) {
      case 'high': return 'High';
      case 'medium': return 'Medium';
      case 'low': return 'Low';
      default: return '';
    }
  };

  const getIcon = () => {
    switch (event.type) {
      case 'earnings': return DollarSign;
      case 'fed_decision': return TrendingUp;
      case 'economic_data': return AlertCircle;
      default: return Calendar;
    }
  };

  const Icon = getIcon();
  const impactColor = getImpactColor();

  // Format time
  const eventDate = new Date(event.date);
  const timeString = event.time || eventDate.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });

  return (
    <Pressable
      style={styles.container}
      onPress={onPress}
      disabled={!onPress}
    >
      {/* Timeline dot */}
      <View style={styles.timeline}>
        <View style={[styles.dot, { backgroundColor: impactColor }]} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.time}>{timeString}</Text>
          <View style={[styles.impactBadge, { borderColor: impactColor }]}>
            <View style={[styles.impactDot, { backgroundColor: impactColor }]} />
            <Text style={[styles.impactText, { color: impactColor }]}>
              {getImpactLabel()}
            </Text>
          </View>
        </View>

        <View style={styles.body}>
          <View style={[styles.iconContainer, { backgroundColor: impactColor + '20' }]}>
            <Icon size={18} color={impactColor} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.title}>{event.title}</Text>
            <Text style={styles.description} numberOfLines={2}>
              {event.description}
            </Text>
            {event.symbol && (
              <Text style={styles.symbol}>{event.symbol}</Text>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timeline: {
    width: 40,
    alignItems: 'center',
    paddingTop: 8,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  content: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  time: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  impactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  impactDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  impactText: {
    fontSize: 12,
    fontWeight: '600',
  },
  body: {
    flexDirection: 'row',
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 4,
  },
  symbol: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
});
