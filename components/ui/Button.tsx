import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ViewStyle, 
  TextStyle,
  ActivityIndicator 
} from 'react-native';
import Colors from '@/constants/colors';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
}: ButtonProps) {
  const getBackgroundColor = () => {
    if (disabled) return Colors.surfaceHighlight;
    switch (variant) {
      case 'primary': return Colors.button.primary;
      case 'secondary': return Colors.button.secondary;
      case 'danger': return Colors.button.danger;
      case 'success': return Colors.button.success;
      case 'ghost': return Colors.button.ghost;
      default: return Colors.button.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return Colors.textMuted;
    switch (variant) {
      case 'primary': return Colors.button.primaryText;
      case 'secondary': return Colors.button.secondaryText;
      case 'danger': return Colors.button.dangerText;
      case 'success': return Colors.button.successText;
      case 'ghost': return Colors.button.ghostText;
      default: return Colors.button.primaryText;
    }
  };

  const getHeight = () => {
    switch (size) {
      case 'small': return 36;
      case 'medium': return 48;
      case 'large': return 56;
      default: return 48;
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'small': return 14;
      case 'medium': return 16;
      case 'large': return 18;
      default: return 16;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          height: getHeight(),
          opacity: disabled ? Colors.disabled.opacity : 1,
        },
        variant === 'ghost' && styles.ghostButton,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={Colors.pressed.opacity}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.text,
              {
                color: getTextColor(),
                fontSize: getFontSize(),
                marginLeft: icon ? 8 : 0,
              },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingHorizontal: 20,
  },
  ghostButton: {
    borderWidth: 1,
    borderColor: Colors.button.ghostText,
  },
  text: {
    fontWeight: '600',
  },
});
