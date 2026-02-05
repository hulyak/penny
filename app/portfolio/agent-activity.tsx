import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Bot, Sparkles } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { AgentActivityLog } from '@/components/AgentActivityLog';
import { GeminiBadge } from '@/components/GeminiBadge';

export default function AgentActivityScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Agent Activity</Text>
          <GeminiBadge variant="inline" />
        </View>
        <View style={styles.headerRight}>
          <Bot size={24} color={Colors.primary} />
        </View>
      </View>

      {/* Description */}
      <View style={styles.descriptionCard}>
        <View style={styles.descriptionIcon}>
          <Sparkles size={20} color={Colors.lavender} />
        </View>
        <View style={styles.descriptionContent}>
          <Text style={styles.descriptionTitle}>Marathon Agent</Text>
          <Text style={styles.descriptionText}>
            Your autonomous AI agent monitors your portfolio 24/7, learns from your responses,
            and proactively sends helpful reminders and alerts.
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <AgentActivityLog compact={false} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
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
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  headerRight: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  descriptionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.lavenderMuted,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 14,
    gap: 12,
  },
  descriptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  descriptionContent: {
    flex: 1,
  },
  descriptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.lavender,
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },

  scrollView: {
    flex: 1,
    marginTop: 16,
  },
  scrollContent: {
    paddingBottom: 32,
  },
});
