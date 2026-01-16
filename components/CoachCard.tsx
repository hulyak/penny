import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { MessageCircle, ChevronRight } from 'lucide-react-native';
import Colors from '@/constants/colors';

const MASCOT_URL = 'https://r2-pub.rork.dev/generated-images/27789a4a-5f4b-41c7-8590-21b6ef0e91a2.png';

interface CoachCardProps {
  message: string;
  title?: string;
  onPress?: () => void;
  variant?: 'default' | 'compact' | 'highlight';
  showArrow?: boolean;
}

export function CoachCard({ 
  message, 
  title,
  onPress, 
  variant = 'default',
  showArrow = true,
}: CoachCardProps) {
  const isCompact = variant === 'compact';
  const isHighlight = variant === 'highlight';

  return (
    <Pressable 
      style={[
        styles.container,
        isCompact && styles.containerCompact,
        isHighlight && styles.containerHighlight,
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <Image 
        source={{ uri: MASCOT_URL }} 
        style={[styles.mascot, isCompact && styles.mascotCompact]} 
      />
      <View style={styles.content}>
        {title && <Text style={styles.title}>{title}</Text>}
        <Text 
          style={[styles.message, isCompact && styles.messageCompact]}
          numberOfLines={isCompact ? 2 : 3}
        >
          {message}
        </Text>
      </View>
      {showArrow && onPress && (
        <ChevronRight size={18} color={Colors.textMuted} />
      )}
    </Pressable>
  );
}

export function CoachTip({ message, onPress }: { message: string; onPress?: () => void }) {
  return (
    <Pressable style={styles.tipContainer} onPress={onPress} disabled={!onPress}>
      <View style={styles.tipIcon}>
        <MessageCircle size={16} color={Colors.accent} />
      </View>
      <Text style={styles.tipText} numberOfLines={2}>{message}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  containerCompact: {
    padding: 12,
    borderRadius: 12,
  },
  containerHighlight: {
    backgroundColor: Colors.accentMuted,
    borderColor: Colors.accent + '30',
  },
  mascot: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  mascotCompact: {
    width: 40,
    height: 40,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  message: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  messageCompact: {
    fontSize: 13,
    lineHeight: 18,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accentMuted,
    padding: 12,
    borderRadius: 10,
  },
  tipIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
  },
});
