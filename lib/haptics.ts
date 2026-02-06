import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Unified haptic feedback utilities for the app
 * Provides tactile feedback on user interactions
 */

/**
 * Light tap - for selection, toggles, minor actions
 */
export function lightTap() {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

/**
 * Medium tap - for button presses, card taps
 */
export function mediumTap() {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
}

/**
 * Heavy tap - for important actions, destructive actions
 */
export function heavyTap() {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }
}

/**
 * Success feedback - for completed actions, achievements
 */
export function success() {
  if (Platform.OS !== 'web') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
}

/**
 * Warning feedback - for alerts, confirmations
 */
export function warning() {
  if (Platform.OS !== 'web') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }
}

/**
 * Error feedback - for errors, failures
 */
export function error() {
  if (Platform.OS !== 'web') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }
}

/**
 * Selection changed - for picker changes, segment controls
 */
export function selectionChanged() {
  if (Platform.OS !== 'web') {
    Haptics.selectionAsync();
  }
}

/**
 * Celebration - a sequence for achievements/milestones
 */
export async function celebration() {
  if (Platform.OS === 'web') return;

  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  await new Promise(resolve => setTimeout(resolve, 100));
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  await new Promise(resolve => setTimeout(resolve, 50));
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

const haptics = {
  lightTap,
  mediumTap,
  heavyTap,
  success,
  warning,
  error,
  selectionChanged,
  celebration,
};

export default haptics;
