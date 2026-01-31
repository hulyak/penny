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
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { 
  X, 
  ShoppingBag, 
  TrendingUp, 
  MessageCircle,
  Volume2,
  Clock,
  CheckCircle,
  Camera,
  Image as ImageIcon,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useCoach } from '@/context/CoachContext';
import Colors from '@/constants/colors';
import { playTextToSpeech } from '@/lib/elevenLabs';

import { MASCOT_IMAGE_URL } from '@/constants/images';

const MASCOT_URL = MASCOT_IMAGE_URL;

export function CoachDrawer() {
  const { recentMessages, markAsRead, markAllAsRead, isDrawerOpen, setIsDrawerOpen, isAnalyzingImage } = useCoach();
  const [activeTab, setActiveTab] = useState<'messages' | 'actions' | 'vision'>('messages');

  const [isSpeaking, setIsSpeaking] = useState(false);

  const speakMessage = async (text: string) => {
    if (isSpeaking) return;
    
    try {
      setIsSpeaking(true);
      await playTextToSpeech(text);
    } catch (error) {
      console.error('Speech error:', error);
      // Fallback to default TTS if ElevenLabs fails
      alert('Could not play audio. Please try again.');
    } finally {
      setIsSpeaking(false);
    }
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
                Actions
              </Text>
            </Pressable>
            <Pressable 
              style={[styles.tab, activeTab === 'vision' && styles.tabActive]}
              onPress={() => setActiveTab('vision')}
            >
              <Text style={[styles.tabText, activeTab === 'vision' && styles.tabTextActive]}>
                Visual
              </Text>
            </Pressable>
          </View>

          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <ScrollView 
              style={styles.content} 
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {activeTab === 'messages' ? (
                <MessagesTab 
                  messages={recentMessages}
                  onSpeak={speakMessage}
                  isSpeaking={isSpeaking}
                  onMarkRead={markAsRead}
                  formatTime={formatTime}
                />
              ) : activeTab === 'actions' ? (
                <ActionsTab />
              ) : (
                <VisionTab isLoading={isAnalyzingImage} />
              )}
            </ScrollView>
          </KeyboardAvoidingView>

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
  isSpeaking,
  onMarkRead,
  formatTime,
}: { 
  messages: any[];
  onSpeak: (text: string) => void;
  isSpeaking: boolean;
  onMarkRead: (id: string) => void;
  formatTime: (date: Date) => string;
}) {
  if (messages.length === 0) {
    return (
      <View style={styles.emptyState}>
        <MessageCircle size={32} color={Colors.textMuted} />
        <Text style={styles.emptyText}>No messages yet</Text>
        <Text style={styles.emptySubtext}>Check back later for insights!</Text>
      </View>
    );
  }

  return (
    <View style={styles.messagesList}>
      {messages.map((msg, index) => (
        <Pressable 
          key={msg.id} 
          style={[
            styles.messageCard, 
            !msg.read && styles.messageUnread,
            index === 0 && !msg.read && styles.messageLatest
          ]}
          onPress={() => onMarkRead(msg.id)}
        >
          <View style={styles.messageHeader}>
            <View style={styles.messageType}>
              <View style={[
                styles.messageIconWrapper,
                !msg.read && styles.messageIconWrapperUnread
              ]}>
                {getMessageIcon(msg.type)}
              </View>
              <Text style={[styles.messageTitle, !msg.read && styles.messageTitleUnread]}>
                {msg.title}
              </Text>
            </View>
            <Text style={styles.messageTime}>{formatTime(msg.timestamp)}</Text>
          </View>
          <Text style={styles.messageText}>{msg.message}</Text>
          <View style={styles.messageActions}>
            <Pressable 
              style={[styles.speakButton, isSpeaking && styles.speakButtonDisabled]}
              onPress={() => onSpeak(msg.message)}
              disabled={isSpeaking}
            >
              <Volume2 size={14} color={isSpeaking ? Colors.textMuted : Colors.accent} />
              <Text style={[styles.speakButtonText, isSpeaking && styles.speakButtonTextDisabled]}>
                {isSpeaking ? 'Playing...' : 'Listen'}
              </Text>
            </Pressable>
            {!msg.read && (
              <View style={styles.unreadDot} />
            )}
          </View>
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

function VisionTab({ isLoading }: { isLoading: boolean }) {
  const { analyzeImage } = useCoach();
  const [imageUrl, setImageUrl] = useState('');

  const DEMO_IMAGE = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80';

  const handleAnalyze = () => {
    if (imageUrl) {
      analyzeImage(imageUrl);
      setImageUrl('');
    }
  };

  const handleDemo = () => {
    setImageUrl(DEMO_IMAGE);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('Sorry, we need camera permissions to make this work!');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setImageUrl(`data:${result.assets[0].mimeType ?? 'image/jpeg'};base64,${result.assets[0].base64}`);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setImageUrl(`data:${result.assets[0].mimeType ?? 'image/jpeg'};base64,${result.assets[0].base64}`);
    }
  };

  return (
    <View style={styles.actionsContainer}>
      <View style={styles.purchaseForm}>
        <Text style={styles.formTitle}>Snap & Analyze</Text>
        <Text style={styles.actionDesc}>
          Take a photo or upload an image of a product to get an instant AI budget analysis.
        </Text>
        
        <View style={styles.mediaButtons}>
          <Pressable style={styles.mediaButton} onPress={takePhoto}>
            <View style={[styles.mediaIcon, { backgroundColor: Colors.accentMuted }]}>
              <Camera size={24} color={Colors.accent} />
            </View>
            <Text style={styles.mediaLabel}>Camera</Text>
          </Pressable>

          <Pressable style={styles.mediaButton} onPress={pickImage}>
            <View style={[styles.mediaIcon, { backgroundColor: Colors.lavenderMuted }]}>
              <ImageIcon size={24} color={Colors.lavender} />
            </View>
            <Text style={styles.mediaLabel}>Gallery</Text>
          </Pressable>
        </View>

        <View style={styles.divider}>
          <View style={styles.line} />
          <Text style={styles.orText}>OR</Text>
          <View style={styles.line} />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Image URL</Text>
          <TextInput
            style={styles.input}
            placeholder="https://..."
            placeholderTextColor={Colors.textMuted}
            value={imageUrl.startsWith('data:') ? 'Image selected from camera/gallery' : imageUrl}
            onChangeText={setImageUrl}
            autoCapitalize="none"
            editable={!imageUrl.startsWith('data:')}
          />
          {imageUrl.startsWith('data:') && (
            <Pressable onPress={() => setImageUrl('')} style={styles.clearImageBtn}>
              <X size={16} color={Colors.textMuted} />
            </Pressable>
          )}
        </View>

        {imageUrl.length > 10 && (
          <View style={styles.previewContainer}>
            <Text style={styles.previewLabel}>Preview:</Text>
            <Image 
              source={{ uri: imageUrl }} 
              style={styles.previewImage} 
              resizeMode="cover"
            />
          </View>
        )}

        <View style={styles.visionButtons}>
          {!imageUrl && (
            <Pressable 
              style={[styles.demoButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleDemo}
              disabled={isLoading}
            >
              <Text style={styles.demoButtonText}>Use Demo Image</Text>
            </Pressable>
          )}

          <Pressable 
            style={[
              styles.submitButton,
              (!imageUrl || isLoading) && styles.submitButtonDisabled
            ]}
            onPress={handleAnalyze}
            disabled={!imageUrl || isLoading}
          >
            <Text style={styles.submitButtonText}>
              {isLoading ? 'Analyzing...' : 'Analyze Product'}
            </Text>
          </Pressable>
        </View>
        
        {isLoading && (
          <View style={{ marginTop: 20, alignItems: 'center' }}>
            <Text style={{ color: Colors.textSecondary, marginBottom: 8 }}>Thinking...</Text>
            <Image source={{ uri: MASCOT_URL }} style={{ width: 60, height: 60 }} />
          </View>
        )}
      </View>
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
    height: '90%',
    maxHeight: '94%',
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handle: {
    width: 48,
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
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
    paddingTop: 16,
    paddingBottom: 8,
    gap: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  scrollContent: {
    paddingBottom: 40,
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
  emptySubtext: {
    marginTop: 4,
    fontSize: 13,
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
  messageLatest: {
    backgroundColor: Colors.accentMuted,
    borderColor: Colors.accent + '30',
  },
  messageIconWrapper: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageIconWrapperUnread: {
    backgroundColor: Colors.accentMuted,
  },
  messageTitleUnread: {
    fontWeight: '700',
  },
  messageActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
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
  speakButtonDisabled: {
    opacity: 0.7,
    backgroundColor: Colors.border,
  },
  speakButtonTextDisabled: {
    color: Colors.textMuted,
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
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  purchaseForm: {
    backgroundColor: Colors.background,
    padding: 16,
    borderRadius: 14,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
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
  previewContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  previewLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  visionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  demoButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  mediaButtons: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 16,
  },
  mediaButton: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    gap: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
  },
  mediaIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  orText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  clearImageBtn: {
    position: 'absolute',
    right: 12,
    top: 38,
    padding: 4,
  },
});
