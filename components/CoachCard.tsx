import React from 'react';
import { View, Text, StyleSheet, Pressable, Image, Animated } from 'react-native';
import { MessageCircle, ChevronRight, Volume2 } from 'lucide-react-native';
import { useCoach } from '@/context/CoachContext';
import Colors from '@/constants/colors';
import * as Speech from 'expo-speech';

import { MASCOT_IMAGE_URL } from '@/constants/images';

const MASCOT_URL = MASCOT_IMAGE_URL;

interface CoachCardProps {
  message: string;
  title?: string;
  onPress?: () => void;
  variant?: 'default' | 'compact' | 'highlight';
  showArrow?: boolean;
  showSpeaker?: boolean;
}

export function CoachCard({ 
  message, 
  title,
  onPress, 
  variant = 'default',
  showArrow = true,
  showSpeaker = false,
}: CoachCardProps) {
  const isCompact = variant === 'compact';
  const isHighlight = variant === 'highlight';
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  const speakMessage = () => {
    Speech.speak(message, { language: 'en', rate: 0.9 });
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable 
        style={[
          styles.container,
          isCompact && styles.containerCompact,
          isHighlight && styles.containerHighlight,
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
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
          {showSpeaker && (
            <Pressable style={styles.speakerButton} onPress={speakMessage}>
              <Volume2 size={12} color={Colors.accent} />
              <Text style={styles.speakerText}>Listen</Text>
            </Pressable>
          )}
        </View>
        {showArrow && onPress && (
          <ChevronRight size={18} color={Colors.textMuted} />
        )}
      </Pressable>
    </Animated.View>
  );
}

export function ScreenCoachCard({ screenName }: { screenName: 'overview' | 'plan' | 'scenarios' | 'learn' | 'profile' }) {
  const { setIsDrawerOpen, unreadCount, recentMessages } = useCoach();
  
  const getScreenMessage = () => {
    const latestMessage = recentMessages[0];
    if (latestMessage && !latestMessage.read) {
      return { title: latestMessage.title, message: latestMessage.message };
    }
    
    const messages: Record<string, { title: string; message: string }> = {
      overview: { title: 'Good to see you!', message: "Tap me anytime for tips or to check a purchase." },
      plan: { title: 'Your Weekly Plan', message: "Let's tackle these tasks together!" },
      scenarios: { title: 'Explore Paths', message: 'See how different choices affect your future.' },
      learn: { title: 'Learn & Grow', message: 'Knowledge is your best financial tool!' },
      profile: { title: 'Your Profile', message: 'Update anytime, I\'ll adjust your plan!' },
    };
    return messages[screenName];
  };

  const { title, message } = getScreenMessage();

  return (
    <View style={styles.screenCardContainer}>
      <CoachCard
        title={title}
        message={message}
        onPress={() => setIsDrawerOpen(true)}
        variant={unreadCount > 0 ? 'highlight' : 'default'}
      />
      {unreadCount > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>{unreadCount}</Text>
        </View>
      )}
    </View>
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
    borderColor: Colors.accent + '40',
  },
  mascot: {
    width: 52,
    height: 52,
    borderRadius: 26,
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
    fontSize: 16,
    fontWeight: '700',
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
  speakerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
    backgroundColor: Colors.accentMuted,
    borderRadius: 10,
    gap: 4,
  },
  speakerText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.accent,
  },
  screenCardContainer: {
    position: 'relative',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
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
