import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';

const MASCOT_URL = 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/fdjbtnwfjkonpwmwero75';

type MascotMood = 'happy' | 'thinking' | 'celebrating' | 'concerned' | 'neutral';

interface MascotProps {
  size?: 'tiny' | 'small' | 'medium' | 'large' | 'xlarge';
  mood?: MascotMood;
  message?: string;
  showBubble?: boolean;
  style?: object;
}

export function Mascot({ 
  size = 'medium', 
  mood = 'happy',
  message,
  showBubble = true,
  style 
}: MascotProps) {
  const dimensions = {
    tiny: 32,
    small: 48,
    medium: 72,
    large: 120,
    xlarge: 180,
  };

  const imageSize = dimensions[size];

  return (
    <View style={[styles.container, style]}>
      {showBubble && message && (
        <View style={styles.bubbleContainer}>
          <View style={styles.bubble}>
            <Text style={styles.bubbleText}>{message}</Text>
          </View>
          <View style={styles.bubbleTail} />
        </View>
      )}
      <Image 
        source={{ uri: MASCOT_URL }}
        style={[
          styles.mascot,
          { width: imageSize, height: imageSize }
        ]}
        resizeMode="contain"
      />
    </View>
  );
}

export function MascotGreeting({ 
  title, 
  subtitle,
  mood = 'happy' 
}: { 
  title: string; 
  subtitle?: string;
  mood?: MascotMood;
}) {
  return (
    <View style={styles.greetingContainer}>
      <Image 
        source={{ uri: MASCOT_URL }}
        style={styles.greetingMascot}
        resizeMode="contain"
      />
      <View style={styles.greetingContent}>
        <Text style={styles.greetingTitle}>{title}</Text>
        {subtitle && (
          <Text style={styles.greetingSubtitle}>{subtitle}</Text>
        )}
      </View>
    </View>
  );
}

export function MascotTip({ message }: { message: string }) {
  return (
    <View style={styles.tipContainer}>
      <Image 
        source={{ uri: MASCOT_URL }}
        style={styles.tipMascot}
        resizeMode="contain"
      />
      <View style={styles.tipBubble}>
        <Text style={styles.tipText}>{message}</Text>
      </View>
    </View>
  );
}

export function MascotCelebration({ message }: { message: string }) {
  return (
    <View style={styles.celebrationContainer}>
      <Image 
        source={{ uri: MASCOT_URL }}
        style={styles.celebrationMascot}
        resizeMode="contain"
      />
      <Text style={styles.celebrationText}>{message}</Text>
    </View>
  );
}

export function MascotAvatar({ size = 'small' }: { size?: 'tiny' | 'small' | 'medium' }) {
  const dimensions = {
    tiny: 28,
    small: 36,
    medium: 48,
  };
  
  return (
    <Image 
      source={{ uri: MASCOT_URL }}
      style={{
        width: dimensions[size],
        height: dimensions[size],
        borderRadius: dimensions[size] / 2,
      }}
      resizeMode="cover"
    />
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  mascot: {
    borderRadius: 8,
  },
  bubbleContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  bubble: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    maxWidth: 240,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  bubbleText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    textAlign: 'center',
  },
  bubbleTail: {
    width: 12,
    height: 12,
    backgroundColor: Colors.surface,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
    transform: [{ rotate: '45deg' }],
    marginTop: -7,
  },
  greetingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  greetingMascot: {
    width: 56,
    height: 56,
    marginRight: 14,
  },
  greetingContent: {
    flex: 1,
  },
  greetingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  greetingSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.mintMuted,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.mint + '40',
  },
  tipMascot: {
    width: 44,
    height: 44,
    marginRight: 12,
  },
  tipBubble: {
    flex: 1,
  },
  tipText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  celebrationContainer: {
    alignItems: 'center',
    backgroundColor: Colors.successMuted,
    padding: 24,
    borderRadius: 20,
  },
  celebrationMascot: {
    width: 80,
    height: 80,
    marginBottom: 12,
  },
  celebrationText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.success,
    textAlign: 'center',
  },
});
