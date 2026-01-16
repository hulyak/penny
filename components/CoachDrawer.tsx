import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  Pressable, 
  ScrollView,
  Image,
  TextInput,
} from 'react-native';
import { 
  X, 
  ShoppingBag, 
  TrendingUp, 
  MessageCircle,
  Volume2,
  Clock,
  CheckCircle,
} from 'lucide-react-native';
import { useCoach } from '@/context/CoachContext';
import Colors from '@/constants/colors';
import * as Speech from 'expo-speech';

const MASCOT_URL = 'https://r2-pub.rork.dev/generated-images/27789a4a-5f4b-41c7-8590-21b6ef0e91a2.png';

export function CoachDrawer() {
  const { recentMessages, markAsRead, markAllAsRead, isDrawerOpen, setIsDrawerOpen } = useCoach();
  const [activeTab, setActiveTab] = useState<'messages' | 'actions'>('messages');

  const speakMessage = (text: string) => {
    Speech.speak(text, {
      language: 'en',
      pitch: 1.0,
      rate: 0.9,
    });
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <Modal
      visible={isDrawerOpen}
      animationType="slide"
      transparent
      onRequestClose={() => setIsDrawerOpen(false)}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={() => setIsDrawerOpen(false)} />
        <View style={styles.drawer}>
          <View style={styles.handle} />
          
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Image source={{ uri: MASCOT_URL }} style={styles.headerMascot} />
              <View>
                <Text style={styles.headerTitle}>Your Coach</Text>
                <Text style={styles.headerSubtitle}>Here to help!</Text>
              </View>
            </View>
            <Pressable onPress={() => setIsDrawerOpen(false)} style={styles.closeButton}>
              <X size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.tabs}>
            <Pressable 
              style={[styles.tab, activeTab === 'messages' && styles.tabActive]}
              onPress={() => setActiveTab('messages')}
            >
              <Text style={[styles.tabText, activeTab === 'messages' && styles.tabTextActive]}>
                Messages
              </Text>
            </Pressable>
            <Pressable 
              style={[styles.tab, activeTab === 'actions' && styles.tabActive]}
              onPress={() => setActiveTab('actions')}
            >
              <Text style={[styles.tabText, activeTab === 'actions' && styles.tabTextActive]}>
                Quick Actions
              </Text>
            </Pressable>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {activeTab === 'messages' ? (
              <MessagesTab 
                messages={recentMessages}
                onSpeak={speakMessage}
                onMarkRead={markAsRead}
                formatTime={formatTime}
              />
            ) : (
              <ActionsTab />
            )}
          </ScrollView>

          {activeTab === 'messages' && recentMessages.length > 0 && (
            <Pressable style={styles.markAllButton} onPress={markAllAsRead}>
              <Text style={styles.markAllText}>Mark all as read</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

function MessagesTab({ 
  messages, 
  onSpeak, 
  onMarkRead,
  formatTime,
}: { 
  messages: any[];
  onSpeak: (text: string) => void;
  onMarkRead: (id: string) => void;
  formatTime: (date: Date) => string;
}) {
  if (messages.length === 0) {
    return (
      <View style={styles.emptyState}>
        <MessageCircle size={32} color={Colors.textMuted} />
        <Text style={styles.emptyText}>No messages yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.messagesList}>
      {messages.map((msg) => (
        <Pressable 
          key={msg.id} 
          style={[styles.messageCard, !msg.read && styles.messageUnread]}
          onPress={() => onMarkRead(msg.id)}
        >
          <View style={styles.messageHeader}>
            <View style={styles.messageType}>
              {getMessageIcon(msg.type)}
              <Text style={styles.messageTitle}>{msg.title}</Text>
            </View>
            <Text style={styles.messageTime}>{formatTime(msg.timestamp)}</Text>
          </View>
          <Text style={styles.messageText}>{msg.message}</Text>
          <Pressable 
            style={styles.speakButton}
            onPress={() => onSpeak(msg.message)}
          >
            <Volume2 size={14} color={Colors.accent} />
            <Text style={styles.speakButtonText}>Listen</Text>
          </Pressable>
        </Pressable>
      ))}
    </View>
  );
}

function ActionsTab() {
  const { openPurchaseAnalysis, openReadinessCheck, setIsDrawerOpen } = useCoach();
  const [showPurchaseInput, setShowPurchaseInput] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemCost, setItemCost] = useState('');

  const handlePurchaseCheck = () => {
    const cost = parseFloat(itemCost);
    if (itemName && !isNaN(cost) && cost > 0) {
      openPurchaseAnalysis(itemName, cost);
      setShowPurchaseInput(false);
      setItemName('');
      setItemCost('');
      setIsDrawerOpen(false);
    }
  };

  const handleReadinessCheck = () => {
    openReadinessCheck();
    setIsDrawerOpen(false);
  };

  return (
    <View style={styles.actionsContainer}>
      {!showPurchaseInput ? (
        <>
          <Pressable 
            style={styles.actionCard}
            onPress={() => setShowPurchaseInput(true)}
          >
            <View style={[styles.actionIcon, { backgroundColor: Colors.warningMuted }]}>
              <ShoppingBag size={22} color={Colors.warning} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Ask Before I Buy</Text>
              <Text style={styles.actionDesc}>
                Check if a purchase fits your budget
              </Text>
            </View>
          </Pressable>

          <Pressable 
            style={styles.actionCard}
            onPress={handleReadinessCheck}
          >
            <View style={[styles.actionIcon, { backgroundColor: Colors.successMuted }]}>
              <TrendingUp size={22} color={Colors.success} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Am I Ready to Invest?</Text>
              <Text style={styles.actionDesc}>
                Check your investment readiness
              </Text>
            </View>
          </Pressable>
        </>
      ) : (
        <View style={styles.purchaseForm}>
          <Text style={styles.formTitle}>What are you thinking of buying?</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Item</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., New headphones"
              placeholderTextColor={Colors.textMuted}
              value={itemName}
              onChangeText={setItemName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Cost ($)</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
              value={itemCost}
              onChangeText={setItemCost}
            />
          </View>

          <View style={styles.formButtons}>
            <Pressable 
              style={styles.cancelButton}
              onPress={() => setShowPurchaseInput(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable 
              style={[
                styles.submitButton,
                (!itemName || !itemCost) && styles.submitButtonDisabled
              ]}
              onPress={handlePurchaseCheck}
              disabled={!itemName || !itemCost}
            >
              <Text style={styles.submitButtonText}>Check Impact</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

function getMessageIcon(type: string) {
  const iconProps = { size: 14, color: Colors.accent };
  switch (type) {
    case 'check-in':
      return <Clock {...iconProps} />;
    case 'weekly-review':
      return <CheckCircle {...iconProps} />;
    case 'tip':
      return <MessageCircle {...iconProps} />;
    default:
      return <MessageCircle {...iconProps} />;
  }
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  drawer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    minHeight: 400,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerMascot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.background,
  },
  tabActive: {
    backgroundColor: Colors.accent,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 15,
    color: Colors.textMuted,
  },
  messagesList: {
    gap: 12,
  },
  messageCard: {
    backgroundColor: Colors.background,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  messageUnread: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  messageType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  messageTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  messageTime: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  messageText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  speakButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: Colors.accentMuted,
    borderRadius: 12,
    gap: 4,
  },
  speakButtonText: {
    fontSize: 12,
    color: Colors.accent,
    fontWeight: '500',
  },
  actionsContainer: {
    gap: 12,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  actionDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  purchaseForm: {
    backgroundColor: Colors.background,
    padding: 16,
    borderRadius: 14,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
  },
  formButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.accent,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  markAllButton: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    alignItems: 'center',
  },
  markAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.accent,
  },
});
