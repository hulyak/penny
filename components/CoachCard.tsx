import React from 'react';
import { View, Text, StyleSheet, Pressable, Image, Animated } from 'react-native';
import { ChevronRight, Volume2 } from 'lucide-react-native';
import { useCoach } from '@/context/CoachContext';
import Colors from '@/constants/colors';
import { playTextToSpeech } from '@/lib/elevenLabs';
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
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const [isSpeaking, setIsSpeaking] = React.useState(false);

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

  const speakMessage = async () => {
    if (isSpeaking) return;
    try {
      setIsSpeaking(true);
      await playTextToSpeech(message);
    } catch (error) {
      console.error('Speech error:', error);
    } finally {
      setIsSpeaking(false);
    }
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable 
        style={[
          styles.container,
          isCompact && styles.containerCompact,
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
          <View style={styles.textContainer}>
            {title && <Text style={styles.title}>{title}</Text>}
            <Text 
              style={[styles.message, isCompact && styles.messageCompact]}
              numberOfLines={isCompact ? 2 : 3}
            >
              {message}
            </Text>
          </View>
          
          {showSpeaker && (
            <Pressable 
              style={[styles.speakerButton, isSpeaking && styles.speakerButtonDisabled]} 
              onPress={speakMessage}
              disabled={isSpeaking}
              hitSlop={8}
            >
              <Volume2 size={16} color={isSpeaking ? Colors.textMuted : Colors.primary} />
            </Pressable>
          )}
        </View>
        
        {showArrow && onPress && (
          <ChevronRight size={16} color={Colors.neutralLight} style={styles.arrow} />
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
      overview: { title: 'Hi there!', message: "Tap here if you need any help with your finances." },
      plan: { title: 'Weekly Focus', message: "Stay on track with these priorities." },
      scenarios: { title: 'Future View', message: "See how today's choices shape tomorrow." },
      learn: { title: 'Smart Moves', message: "Expand your financial knowledge." },
      profile: { title: 'Your Profile', message: 'Keep your details up to date.' },
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
      />
      {unreadCount > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>{unreadCount}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 20,
    shadowColor: Colors.neutral,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  containerCompact: {
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  mascot: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 14,
    backgroundColor: Colors.surfaceSecondary,
  },
  mascotCompact: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
    letterSpacing: -0.2,
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
    padding: 8,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 20,
    marginLeft: 8,
  },
  speakerButtonDisabled: {
    opacity: 0.5,
  },
  arrow: {
    marginLeft: 8,
    opacity: 0.5,
  },
  screenCardContainer: {
    position: 'relative',
  },
  unreadBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.danger,
    borderWidth: 2,
    borderColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
});
