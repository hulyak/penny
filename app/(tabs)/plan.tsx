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
  Zap,
} from 'lucide-react-native';
import { useApp } from '@/context/AppContext';
import { ScreenCoachCard } from '@/components/CoachCard';
import Colors from '@/constants/colors';

const MASCOT_URL = 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/vgkftarej1um5e3yfmz34';

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
      <ScreenCoachCard screenName="plan" />

      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <View>
            <Text style={styles.progressTitle}>Weekly Progress</Text>
            <Text style={styles.progressSubtitle}>
              {completedCount === totalCount && totalCount > 0 
                ? "Amazing work this week!" 
                : `${totalCount - completedCount} tasks remaining`}
            </Text>
          </View>
          <View style={styles.progressBadge}>
            <Text style={styles.progressBadgeText}>{completedCount}/{totalCount}</Text>
          </View>
        </View>
        
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
        </View>

        {completedCount === totalCount && totalCount > 0 && (
          <View style={styles.celebrationRow}>
            <Sparkles size={16} color={Colors.success} />
            <Text style={styles.celebrationText}>All tasks completed!</Text>
          </View>
        )}
      </View>

      <Text style={styles.sectionTitle}>This Week&apos;s Focus</Text>
      
      {weeklyFocuses.map((focus) => {
        const isComplete = focus.progress === 100;
        
        return (
          <Pressable 
            key={focus.id}
            style={[styles.taskCard, isComplete && styles.taskCardComplete]}
            onPress={() => updateFocusProgress(focus.id, isComplete ? 0 : 100)}
          >
            <View style={styles.taskCheckbox}>
              {isComplete ? (
                <View style={styles.checkboxComplete}>
                  <CheckCircle2 size={24} color={Colors.success} />
                </View>
              ) : (
                <View style={styles.checkboxEmpty}>
                  <Circle size={24} color={Colors.border} />
                </View>
              )}
            </View>
            
            <View style={styles.taskContent}>
              <View style={styles.taskHeader}>
                <Text style={[styles.taskTitle, isComplete && styles.taskTitleComplete]}>
                  {focus.title}
                </Text>
                <View style={[styles.priorityIndicator, { backgroundColor: getPriorityColor(focus.priority) }]} />
              </View>
              <Text style={styles.taskDescription}>{focus.description}</Text>
              
              {focus.agentReasoning && (
                <View style={styles.reasoningBubble}>
                  <Image source={{ uri: MASCOT_URL }} style={styles.miniMascot} />
                  <Text style={styles.reasoningText}>{focus.agentReasoning}</Text>
                </View>
              )}
            </View>
          </Pressable>
        );
      })}

      <View style={styles.tipCard}>
        <View style={styles.tipIconWrapper}>
          <Zap size={20} color={Colors.warning} />
        </View>
        <View style={styles.tipContent}>
          <Text style={styles.tipTitle}>Quick Tip</Text>
          <Text style={styles.tipText}>
            Focus on one task at a time. Small wins build momentum toward bigger goals!
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    'high': Colors.coral,
    'medium': Colors.warning,
    'low': Colors.accent,
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
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    marginTop: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  progressSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  progressBadge: {
    backgroundColor: Colors.accentMuted,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  progressBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.accent,
  },
  progressBarContainer: {
    marginBottom: 8,
  },
  progressBar: {
    height: 10,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 5,
  },
  celebrationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successMuted,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 12,
    gap: 8,
  },
  celebrationText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.success,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 14,
  },

  taskCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  taskCardComplete: {
    backgroundColor: Colors.successMuted,
  },
  taskCheckbox: {
    marginRight: 14,
    marginTop: 2,
  },
  checkboxComplete: {
    opacity: 1,
  },
  checkboxEmpty: {
    opacity: 0.6,
  },
  taskContent: {
    flex: 1,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  taskTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  taskTitleComplete: {
    textDecorationLine: 'line-through',
    color: Colors.textMuted,
  },
  priorityIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 10,
  },
  taskDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  reasoningBubble: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.mintMuted,
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  miniMascot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 10,
  },
  reasoningText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
  },

  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.warningMuted,
    padding: 16,
    borderRadius: 16,
    marginTop: 8,
  },
  tipIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.warning + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.warning,
    marginBottom: 4,
  },
  tipText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
});
