import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  Pressable,
  TextInput,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  User, 
  DollarSign, 
  Home, 
  Car, 
  ShoppingBag,
  PiggyBank,
  CreditCard,
  RefreshCw,
  Save,
  Info,
} from 'lucide-react-native';
import { useApp } from '@/context/AppContext';
import { Card } from '@/components/Card';
import Colors from '@/constants/colors';
import { UserFinancials } from '@/types';

export default function ProfileScreen() {
  const { financials, updateFinancials, resetDemo } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [editedFinancials, setEditedFinancials] = useState<UserFinancials>(financials);

  const handleSave = () => {
    updateFinancials(editedFinancials);
    setIsEditing(false);
  };

  const handleReset = () => {
    Alert.alert(
      'Reset to Demo Mode',
      'This will reset all your data to demo values. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: () => {
            resetDemo();
            setEditedFinancials(financials);
          },
        },
      ]
    );
  };

  const formatCurrency = (value: number) => `$${value.toLocaleString()}`;

  const updateField = (field: keyof UserFinancials, value: string) => {
    const numValue = parseInt(value.replace(/[^0-9]/g, ''), 10) || 0;
    setEditedFinancials({ ...editedFinancials, [field]: numValue });
  };

  const renderField = (
    label: string,
    field: keyof UserFinancials,
    icon: React.ReactNode
  ) => (
    <View style={styles.fieldRow}>
      <View style={styles.fieldLabel}>
        {icon}
        <Text style={styles.labelText}>{label}</Text>
      </View>
      {isEditing ? (
        <TextInput
          style={styles.input}
          value={editedFinancials[field].toString()}
          onChangeText={(text) => updateField(field, text)}
          keyboardType="numeric"
          placeholder="0"
        />
      ) : (
        <Text style={styles.fieldValue}>{formatCurrency(financials[field])}</Text>
      )}
    </View>
  );

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={[Colors.primary, Colors.primaryLight]}
        style={styles.headerGradient}
      >
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <User size={32} color={Colors.textLight} />
          </View>
        </View>
        <Text style={styles.title}>Your Financial Profile</Text>
        <Text style={styles.subtitle}>
          Update your numbers anytime. Agents will recalculate automatically.
        </Text>
      </LinearGradient>

      <Card style={styles.card} variant="elevated">
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Monthly Finances</Text>
          {!isEditing ? (
            <Pressable style={styles.editButton} onPress={() => setIsEditing(true)}>
              <Text style={styles.editButtonText}>Edit</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.saveButton} onPress={handleSave}>
              <Save size={16} color="#fff" />
              <Text style={styles.saveButtonText}>Save</Text>
            </Pressable>
          )}
        </View>

        {renderField('Monthly Income', 'monthlyIncome', 
          <DollarSign size={18} color={Colors.accent} />
        )}
        {renderField('Housing Cost', 'housingCost', 
          <Home size={18} color={Colors.secondary} />
        )}
        {renderField('Car Cost', 'carCost', 
          <Car size={18} color={Colors.warning} />
        )}
        {renderField('Essentials', 'essentialsCost', 
          <ShoppingBag size={18} color={Colors.agents.scenarioLearning} />
        )}
      </Card>

      <Card style={styles.card} variant="elevated">
        <Text style={styles.cardTitle}>Savings & Debts</Text>
        
        {renderField('Current Savings', 'savings', 
          <PiggyBank size={18} color={Colors.accent} />
        )}
        {renderField('Total Debts', 'debts', 
          <CreditCard size={18} color={Colors.danger} />
        )}
        {renderField('Emergency Goal', 'emergencyFundGoal', 
          <DollarSign size={18} color={Colors.secondary} />
        )}
      </Card>

      <Card style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <Info size={18} color={Colors.secondary} />
          <Text style={styles.infoTitle}>How Agents Use Your Data</Text>
        </View>
        <Text style={styles.infoText}>
          Your financial data stays on your device. Our AI agents analyze it locally 
          to generate personalized insights, scenarios, and weekly focus items. 
          No data is shared or sold.
        </Text>
      </Card>

      <Pressable style={styles.resetButton} onPress={handleReset}>
        <RefreshCw size={18} color={Colors.danger} />
        <Text style={styles.resetText}>Reset to Demo Mode</Text>
      </Pressable>

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          ClearPath is an educational tool. It does not provide financial advice, 
          investment recommendations, or predictions.
        </Text>
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
  headerGradient: {
    paddingTop: 24,
    paddingBottom: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textLight,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textLight,
    opacity: 0.8,
    textAlign: 'center',
  },
  card: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.secondary + '15',
    borderRadius: 8,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.accent,
    borderRadius: 8,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 4,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  fieldLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  labelText: {
    fontSize: 15,
    color: Colors.text,
    marginLeft: 10,
  },
  fieldValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  input: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    backgroundColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 100,
    textAlign: 'right',
  },
  infoCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: Colors.secondary + '10',
    borderWidth: 1,
    borderColor: Colors.secondary + '30',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.secondary,
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 14,
    backgroundColor: Colors.danger + '10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.danger + '30',
  },
  resetText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.danger,
    marginLeft: 8,
  },
  disclaimer: {
    marginHorizontal: 16,
    marginTop: 24,
    padding: 16,
    backgroundColor: Colors.border,
    borderRadius: 12,
  },
  disclaimerText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
