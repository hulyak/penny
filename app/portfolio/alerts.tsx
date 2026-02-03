import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Bell,
  BellOff,
  Trash2,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { PriceAlert } from '@/types';
import {
  loadAlerts,
  toggleAlert,
  deleteAlert,
  requestNotificationPermissions,
} from '@/lib/alertService';

export default function AlertsScreen() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    checkPermissions();
    fetchAlerts();
  }, []);

  const checkPermissions = async () => {
    const granted = await requestNotificationPermissions();
    setHasPermission(granted);
  };

  const fetchAlerts = async () => {
    const loadedAlerts = await loadAlerts();
    setAlerts(loadedAlerts.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ));
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAlerts();
    setRefreshing(false);
  }, []);

  const handleToggle = async (alertId: string) => {
    await toggleAlert(alertId);
    await fetchAlerts();
  };

  const handleDelete = (alert: PriceAlert) => {
    Alert.alert(
      'Delete Alert',
      `Are you sure you want to delete this alert?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteAlert(alert.id);
            await fetchAlerts();
          },
        },
      ]
    );
  };

  const getAlertIcon = (type: PriceAlert['type']) => {
    switch (type) {
      case 'price_above':
        return <TrendingUp size={20} color={Colors.success} />;
      case 'price_below':
        return <TrendingDown size={20} color={Colors.danger} />;
      case 'maturity':
        return <Calendar size={20} color={Colors.warning} />;
      case 'reminder':
        return <Clock size={20} color={Colors.accent} />;
    }
  };

  const getAlertTypeLabel = (type: PriceAlert['type']) => {
    switch (type) {
      case 'price_above':
        return 'Price Above';
      case 'price_below':
        return 'Price Below';
      case 'maturity':
        return 'Maturity';
      case 'reminder':
        return 'Reminder';
    }
  };

  const activeCount = alerts.filter((a) => a.isActive).length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Alerts</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Permission Warning */}
      {!hasPermission && (
        <Pressable style={styles.warningCard} onPress={checkPermissions}>
          <BellOff size={20} color={Colors.warning} />
          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>Notifications Disabled</Text>
            <Text style={styles.warningText}>Tap to enable notifications for alerts</Text>
          </View>
        </Pressable>
      )}

      {/* Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Bell size={24} color={Colors.primary} />
          <Text style={styles.summaryValue}>{alerts.length}</Text>
          <Text style={styles.summaryLabel}>Total Alerts</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Bell size={24} color={Colors.success} />
          <Text style={styles.summaryValue}>{activeCount}</Text>
          <Text style={styles.summaryLabel}>Active</Text>
        </View>
      </View>

      {/* Alerts List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Alerts</Text>

        {alerts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Bell size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No alerts yet</Text>
            <Text style={styles.emptyText}>
              Add price alerts from your holdings to get notified when prices change
            </Text>
          </View>
        ) : (
          alerts.map((alert) => (
            <View key={alert.id} style={styles.alertCard}>
              <View style={styles.alertIcon}>{getAlertIcon(alert.type)}</View>
              <View style={styles.alertContent}>
                <View style={styles.alertHeader}>
                  <Text style={styles.alertType}>{getAlertTypeLabel(alert.type)}</Text>
                  {alert.targetValue && (
                    <Text style={styles.alertTarget}>${alert.targetValue.toFixed(2)}</Text>
                  )}
                </View>
                <Text style={styles.alertMessage} numberOfLines={2}>
                  {alert.message}
                </Text>
                {alert.targetDate && (
                  <Text style={styles.alertDate}>
                    {new Date(alert.targetDate).toLocaleDateString()}
                  </Text>
                )}
                {alert.lastTriggered && (
                  <Text style={styles.alertTriggered}>
                    Last triggered: {new Date(alert.lastTriggered).toLocaleDateString()}
                  </Text>
                )}
              </View>
              <View style={styles.alertActions}>
                <Switch
                  value={alert.isActive}
                  onValueChange={() => handleToggle(alert.id)}
                  trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                  thumbColor={alert.isActive ? Colors.primary : Colors.textMuted}
                />
                <Pressable
                  style={styles.deleteButton}
                  onPress={() => handleDelete(alert)}
                >
                  <Trash2 size={18} color={Colors.danger} />
                </Pressable>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },

  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warningMuted,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  warningContent: {
    marginLeft: 12,
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.warning,
  },
  warningText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  summaryCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 16,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },

  section: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },

  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },

  alertCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  alertType: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  alertTarget: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    marginLeft: 8,
  },
  alertMessage: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  alertDate: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
  },
  alertTriggered: {
    fontSize: 11,
    color: Colors.success,
    marginTop: 4,
  },
  alertActions: {
    alignItems: 'center',
    gap: 12,
  },
  deleteButton: {
    padding: 8,
  },
});
