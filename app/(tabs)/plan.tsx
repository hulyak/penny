import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  Pressable,
  Image,
} from 'react-native';
import { 
  CheckCircle2, 
  Circle,
  Sparkles,
} from 'lucide-react-native';
import { useApp } from '@/context/AppContext';
import { Card } from '@/components/Card';
import { ScreenCoachCard } from '@/components/CoachCard';
import Colors from '@/constants/colors';

const MASCOT_URL = 'https://r2-pub.rork.com/generated-images/27789a4a-5f4b-41c7-8590-21b6ef0e91a2.png';

export default function PlanScreen() {
  const { weeklyFocuses, updateFocusProgress } = useApp();

  const completedCount = weeklyFocuses.filter(f => f.progress === 100).length;
  const totalCount = weeklyFocuses.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Coach Card */}
      <ScreenCoachCard screenName="plan" />

      {/* Progress Summary */}
      <Card style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Weekly Progress</Text>
          <Text style={styles.progressCount}>
            {completedCount}/{totalCount}
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
        </View>
        {completedCount === totalCount && totalCount > 0 && (
          <View style={styles.celebrationBadge}>
            <Sparkles size={14} color={Colors.success} />
            <Text style={styles.celebrationText}>All done!</Text>
          </View>
        )}
      </Card>

      {/* Tasks */}
      <Text style={styles.sectionTitle}>This Week&apos;s Focus</Text>
      
      {weeklyFocuses.map((focus, index) => {
        const isComplete = focus.progress === 100;
        
        return (
          <Pressable 
            key={focus.id}
            style={[styles.taskCard, isComplete && styles.taskCardComplete]}
            onPress={() => updateFocusProgress(focus.id, isComplete ? 0 : 100)}
          >
            <View style={styles.taskLeft}>
              {isComplete ? (
                <CheckCircle2 size={24} color={Colors.success} />
              ) : (
                <Circle size={24} color={Colors.border} />
              )}
            </View>
            
            <View style={styles.taskContent}>
              <Text style={[styles.taskTitle, isComplete && styles.taskTitleComplete]}>
                {focus.title}
              </Text>
              <Text style={styles.taskDescription}>{focus.description}</Text>
              
              {focus.agentReasoning && (
                <View style={styles.reasoningBubble}>
                  <Image source={{ uri: MASCOT_URL }} style={styles.miniMascot} />
                  <Text style={styles.reasoningText}>{focus.agentReasoning}</Text>
                </View>
              )}
            </View>
            
            <View style={[
              styles.priorityDot,
              { backgroundColor: getPriorityColor(focus.priority) }
            ]} />
          </Pressable>
        );
      })}

      {/* Tip Card */}
      <View style={styles.tipCard}>
        <Image source={{ uri: MASCOT_URL }} style={styles.tipMascot} />
        <View style={styles.tipContent}>
          <Text style={styles.tipTitle}>Quick Tip</Text>
          <Text style={styles.tipText}>
            Focus on one task at a time. Small wins build momentum!
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    'high': Colors.danger,
    'medium': Colors.warning,
    'low': Colors.success,
  };
  return colors[priority] || Colors.accent;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },

  progressCard: {
    padding: 16,
    marginTop: 16,
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  progressCount: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.success,
    borderRadius: 4,
  },
  celebrationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Colors.successMuted,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 12,
    gap: 6,
  },
  celebrationText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.success,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  taskCardComplete: {
    backgroundColor: Colors.successMuted,
    borderColor: Colors.success + '30',
  },
  taskLeft: {
    marginRight: 12,
    marginTop: 2,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  taskTitleComplete: {
    textDecorationLine: 'line-through',
    color: Colors.textMuted,
  },
  taskDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
    marginTop: 6,
  },
  reasoningBubble: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.accentMuted,
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  miniMascot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  reasoningText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accentMuted,
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  tipMascot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.accent,
    marginBottom: 2,
  },
  tipText: {
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
  },
});
