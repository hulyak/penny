import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Image,
  Text,
  Animated,
} from 'react-native';
import { MessageCircle, X } from 'lucide-react-native';
import { useCoach } from '@/context/CoachContext';
import { useApp } from '@/context/AppContext';
import Colors from '@/constants/colors';
import { PennyChatModal } from './PennyChatModal';

import { MASCOT_IMAGE_URL } from '@/constants/images';

const MASCOT_URL = MASCOT_IMAGE_URL;

export function FloatingCoachButton() {
  const { setIsDrawerOpen, unreadCount } = useCoach();
  const { snapshot, financials } = useApp();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const expandAnim = React.useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
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

  const toggleExpand = () => {
    const toValue = isExpanded ? 0 : 1;
    Animated.spring(expandAnim, {
      toValue,
      friction: 6,
      useNativeDriver: true,
    }).start();
    setIsExpanded(!isExpanded);
  };

  const openChat = () => {
    setIsExpanded(false);
    expandAnim.setValue(0);
    setIsChatOpen(true);
  };

  const openDrawer = () => {
    setIsExpanded(false);
    expandAnim.setValue(0);
    setIsDrawerOpen(true);
  };

  const financialContext = snapshot ? {
    healthScore: snapshot.healthScore,
    healthLabel: snapshot.healthLabel,
    savingsRate: snapshot.savingsRate,
    monthsOfRunway: snapshot.monthsOfRunway,
    monthlyIncome: financials?.monthlyIncome || 0,
    monthlyExpenses: financials ? (financials.housingCost + financials.carCost + financials.essentialsCost) : 0,
  } : undefined;

  return (
    <>
      {/* Expanded Options */}
      {isExpanded && (
        <Animated.View
          style={[
            styles.optionsContainer,
            {
              opacity: expandAnim,
              transform: [
                {
                  translateY: expandAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Pressable style={styles.optionButton} onPress={openChat}>
            <MessageCircle size={20} color={Colors.accent} />
            <Text style={styles.optionText}>Chat</Text>
          </Pressable>
          <Pressable style={styles.optionButton} onPress={openDrawer}>
            <Image source={{ uri: MASCOT_URL }} style={styles.optionMascot} />
            <Text style={styles.optionText}>Tips</Text>
            {unreadCount > 0 && (
              <View style={styles.optionBadge}>
                <Text style={styles.optionBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </Pressable>
        </Animated.View>
      )}

      {/* Main Button */}
      <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
        <Pressable
          style={[styles.button, isExpanded && styles.buttonExpanded]}
          onPress={toggleExpand}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onLongPress={openChat}
        >
          {isExpanded ? (
            <X size={24} color={Colors.textMuted} />
          ) : (
            <>
              <Image source={{ uri: MASCOT_URL }} style={styles.mascot} />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </>
          )}
        </Pressable>
      </Animated.View>

      {/* Chat Modal */}
      <PennyChatModal
        visible={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        financialContext={financialContext}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 90,
    right: 16,
    zIndex: 1000,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 2,
    borderColor: Colors.accent + '30',
  },
  mascot: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  badge: {
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
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  buttonExpanded: {
    backgroundColor: Colors.surfaceSecondary,
    borderColor: Colors.border,
  },
  optionsContainer: {
    position: 'absolute',
    bottom: 160,
    right: 16,
    zIndex: 999,
    gap: 10,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  optionMascot: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  optionBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    marginLeft: 4,
  },
  optionBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
});
