import React from 'react';
import { View, ScrollView, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Text, Surface, Button, useTheme, Divider, RadioButton, Checkbox } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function SelectionModal({ visible, onClose, title, options, value, onSelect, icon = "format-list-bulleted", multi = false, maxSelect = null }) {
  const theme = useTheme();

  const handleSelect = (optionValue) => {
    if (multi) {
      const currentValues = Array.isArray(value) ? value : [];
      if (currentValues.includes(optionValue)) {
        onSelect(currentValues.filter(v => v !== optionValue));
      } else {
        if (maxSelect && currentValues.length >= maxSelect) {
            alert(`Maximum ${maxSelect} options allowed`);
            return;
        }
        onSelect([...currentValues, optionValue]);
      }
    } else {
      onSelect(optionValue);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Surface style={styles.modalContent} elevation={5}>
            <LinearGradient
              colors={['#252D40', '#1F2636']}
              style={styles.gradient}
            >
              {/* Header */}
              <View style={styles.header}>
                <View style={[styles.iconBox, { backgroundColor: theme.colors.primaryContainer }]}>
                  <MaterialCommunityIcons name={icon} size={24} color={theme.colors.primary} />
                </View>
                <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: 'bold', flex: 1, marginLeft: 12 }}>
                  {title}
                </Text>
                <TouchableOpacity onPress={onClose}>
                  <MaterialCommunityIcons name="close" size={24} color={theme.colors.onSurfaceVariant} />
                </TouchableOpacity>
              </View>

              <Divider style={{ backgroundColor: 'rgba(255,255,255,0.1)', marginBottom: 16 }} />

              {/* Options List */}
              <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                {options.map((option) => {
                  const isSelected = multi 
                    ? (Array.isArray(value) && value.includes(option.value))
                    : value === option.value;
                    
                  return (
                    <TouchableOpacity
                      key={option.value}
                      disabled={option.disabled}
                      style={[
                        styles.optionItem,
                        isSelected && { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: theme.colors.primary, borderWidth: 1 },
                        option.disabled && { opacity: 0.5, backgroundColor: 'rgba(0,0,0,0.2)' }
                      ]}
                      onPress={() => !option.disabled && handleSelect(option.value)}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        {multi ? (
                          <Checkbox
                            status={isSelected ? 'checked' : 'unchecked'}
                            onPress={() => !option.disabled && handleSelect(option.value)}
                            color={theme.colors.primary}
                            disabled={option.disabled}
                          />
                        ) : (
                          <RadioButton
                            value={option.value}
                            status={isSelected ? 'checked' : 'unchecked'}
                            onPress={() => !option.disabled && handleSelect(option.value)}
                            color={theme.colors.primary}
                            disabled={option.disabled}
                          />
                        )}
                        <View style={{ flex: 1 }}>
                            <Text variant="bodyLarge" style={{ color: isSelected ? theme.colors.primary : theme.colors.onSurface, marginLeft: 8, fontWeight: isSelected ? 'bold' : 'normal' }}>
                            {option.label}
                            </Text>
                            {option.disabled && option.disabledReason && (
                                <Text variant="bodySmall" style={{ color: theme.colors.error, marginLeft: 8 }}>
                                    {option.disabledReason}
                                </Text>
                            )}
                        </View>
                      </View>
                      {option.icon && (
                        <MaterialCommunityIcons name={option.icon} size={20} color={isSelected ? theme.colors.primary : theme.colors.onSurfaceVariant} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              
              {multi && (
                <Button 
                  mode="contained" 
                  onPress={onClose}
                  style={{ marginTop: 16 }}
                >
                  Done
                </Button>
              )}
            </LinearGradient>
          </Surface>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    maxHeight: '70%',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  gradient: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    maxHeight: 400,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  }
});
