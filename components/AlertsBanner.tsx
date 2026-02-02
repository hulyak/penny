import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
} from 'react-native';
import {
  AlertTriangle,
  Bell,
  X,
  ChevronRight,
  TrendingDown,
  Clock,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import {
  getUnreadAlerts,
  markAlertRead,
  dismissAlert,
  type SpendingAlert,
} from '@/lib/spendingAlerts';
import {
  checkReminders,
  logReminderInteraction,
  type ReminderTrigger,
} from '@/lib/smartReminders';

interface AlertsBannerProps {
  financialContext: {
    healthScore: number;
    savingsRate: number;
    streak: number;
  };
  onAlertPress?: (alert: SpendingAlert) => void;
  onReminderPress?: (reminder: ReminderTrigger) => void;
}

export function AlertsBanner({
  financialContext,
  onAlertPress,
  onReminderPress,
}: AlertsBannerProps) {
  const [alerts, setAlerts] = useState<SpendingAlert[]>([]);
  const [reminders, setReminders] = useState<ReminderTrigger[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const slideAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    loadAlertsAndReminders();
  }, [financialContext]);

  const loadAlertsAndReminders = async () => {
    try {
      // Load spending alerts
      const unreadAlerts = await getUnreadAlerts();
      setAlerts(unreadAlerts.slice(0, 3)); // Show max 3

      // Check reminders
      const triggeredReminders = await checkReminders({
        currentTime: new Date(),
        ...financialContext,
      });
      setReminders(triggeredReminders.slice(0, 2)); // Show max 2

      // Animate in if there are items
      if (unreadAlerts.length > 0 || triggeredReminders.length > 0) {
        Animated.spring(slideAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }).start();
      }
    } catch (error) {
      console.error('[AlertsBanner] Error loading:', error);
    }
  };

  const handleAlertPress = async (alert: SpendingAlert) => {
    await markAlertRead(alert.id);
    onAlertPress?.(alert);
    loadAlertsAndReminders();
  };

  const handleDismissAlert = async (alert: SpendingAlert) => {
    await dismissAlert(alert.id);
    loadAlertsAndReminders();
  };

  const handleReminderPress = async (trigger: ReminderTrigger) => {
    await logReminderInteraction(trigger.reminder.id, 'clicked');
    onReminderPress?.(trigger);
  };

  const handleDismissReminder = async (trigger: ReminderTrigger) => {
    await logReminderInteraction(trigger.reminder.id, 'dismissed');
    setReminders(reminders.filter(r => r.reminder.id !== trigger.reminder.id));
  };

  const totalItems = alerts.length + reminders.length;

  if (totalItems === 0) return null;

  const getSeverityColor = (severity: SpendingAlert['severity']) => {
    switch (severity) {
      case 'high':
        return Colors.danger;
      case 'medium':
        return Colors.warning;
      default:
        return Colors.accent;
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: slideAnim,
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-20, 0],
              }),
            },
          ],
        },
      ]}
    >
      {/* Header */}
      <Pressable
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <View style={styles.headerLeft}>
          <View style={styles.bellContainer}>
            <Bell size={18} color={Colors.warning} />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{totalItems}</Text>
            </View>
          </View>
          <Text style={styles.headerTitle}>
            {totalItems} notification{totalItems > 1 ? 's' : ''}
          </Text>
        </View>
        <ChevronRight
          size={18}
          color={Colors.textMuted}
          style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }}
        />
      </Pressable>

      {/* Content */}
      {isExpanded && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Spending Alerts */}
          {alerts.map((alert) => (
            <Pressable
              key={alert.id}
              style={[styles.alertCard, { borderLeftColor: getSeverityColor(alert.severity) }]}
              onPress={() => handleAlertPress(alert)}
            >
              <Pressable
                style={styles.dismissButton}
                onPress={() => handleDismissAlert(alert)}
              >
                <X size={14} color={Colors.textMuted} />
              </Pressable>

              <View style={styles.alertIcon}>
                {alert.type === 'exceeded' ? (
                  <AlertTriangle size={18} color={getSeverityColor(alert.severity)} />
                ) : (
                  <TrendingDown size={18} color={getSeverityColor(alert.severity)} />
                )}
              </View>

              <Text style={styles.alertTitle} numberOfLines={1}>
                {alert.title}
              </Text>
              <Text style={styles.alertMessage} numberOfLines={2}>
                {alert.message}
              </Text>

              {alert.percentUsed && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(100, alert.percentUsed)}%`,
                          backgroundColor: getSeverityColor(alert.severity),
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.progressText, { color: getSeverityColor(alert.severity) }]}>
                    {alert.percentUsed.toFixed(0)}%
                  </Text>
                </View>
              )}
            </Pressable>
          ))}

          {/* Reminders */}
          {reminders.map((trigger) => (
            <Pressable
              key={trigger.reminder.id}
              style={[styles.reminderCard]}
              onPress={() => handleReminderPress(trigger)}
            >
              <Pressable
                style={styles.dismissButton}
                onPress={() => handleDismissReminder(trigger)}
              >
                <X size={14} color={Colors.textMuted} />
              </Pressable>

              <View style={[styles.reminderIcon, { backgroundColor: Colors.lavenderMuted }]}>
                <Clock size={18} color={Colors.lavender} />
              </View>

              <Text style={styles.reminderTitle} numberOfLines={1}>
                {trigger.reminder.title}
              </Text>
              <Text style={styles.reminderMessage} numberOfLines={2}>
                {trigger.personalizedMessage || trigger.reminder.message}
              </Text>

              {trigger.reminder.actionLabel && (
                <View style={styles.actionButton}>
                  <Text style={styles.actionButtonText}>
                    {trigger.reminder.actionLabel}
                  </Text>
                  <ChevronRight size={14} color={Colors.lavender} />
                </View>
              )}
            </Pressable>
          ))}
        </ScrollView>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bellContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: Colors.danger,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textLight,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },

  scrollContent: {
    paddingRight: 16,
    gap: 12,
  },

  alertCard: {
    width: 200,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  dismissButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
    zIndex: 10,
  },
  alertIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.warningMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
    paddingRight: 20,
  },
  alertMessage: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
    marginBottom: 10,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.neutralMuted,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
  },

  reminderCard: {
    width: 200,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  reminderIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  reminderTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
    paddingRight: 20,
  },
  reminderMessage: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
    marginBottom: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.lavender,
  },
});
