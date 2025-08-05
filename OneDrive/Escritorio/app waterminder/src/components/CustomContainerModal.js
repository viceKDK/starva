import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Animated,
  Dimensions,
  Alert,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

const CONTAINER_TYPES = [
  { id: 'wine-outline', name: 'Glass', label: 'Glass' },
  { id: 'bottle-outline', name: 'Bottle', label: 'Bottle' },
  { id: 'cafe-outline', name: 'Mug', label: 'Mug' },
  { id: 'flask-outline', name: 'Large Bottle', label: 'Large' },
  { id: 'library-outline', name: 'Jug', label: 'Jug' },
  { id: 'ellipse-outline', name: 'Custom', label: 'Custom' },
];

const PREDEFINED_COLORS = [
  '#4A90E2',
  '#87CEEB',
  '#4CAF50',
  '#FF6B35',
  '#9C27B0',
  '#E91E63',
  '#FF9800',
  '#607D8B',
];

const UNITS = [
  { id: 'ml', label: 'ml', multiplier: 1 },
  { id: 'oz', label: 'fl oz', multiplier: 29.5735 },
];

const CustomContainerModal = ({
  visible,
  onClose,
  onSave,
  editContainer = null,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    volume: '',
    type: '',
    color: PREDEFINED_COLORS[0],
    unit: 'ml',
  });
  
  const [errors, setErrors] = useState({});
  const [isValid, setIsValid] = useState(false);
  const slideAnim = useRef(new Animated.Value(height)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  // Initialize form data when modal opens or edit container changes
  useEffect(() => {
    if (visible) {
      if (editContainer) {
        setFormData({
          name: editContainer.name,
          volume: editContainer.volume.toString(),
          type: editContainer.type,
          color: editContainer.color,
          unit: 'ml',
        });
      } else {
        setFormData({
          name: '',
          volume: '',
          type: '',
          color: PREDEFINED_COLORS[0],
          unit: 'ml',
        });
      }
      setErrors({});
      
      // Animate modal in
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, editContainer]);

  // Validate form whenever formData changes
  useEffect(() => {
    validateForm();
  }, [formData]);

  const validateForm = () => {
    const newErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Container name is required';
    } else if (formData.name.length > 20) {
      newErrors.name = 'Name must be 20 characters or less';
    } else if (!/^[a-zA-Z0-9\s]+$/.test(formData.name)) {
      newErrors.name = 'Name can only contain letters, numbers, and spaces';
    }

    // Volume validation
    const volumeInMl = parseFloat(formData.volume) * UNITS.find(u => u.id === formData.unit).multiplier;
    if (!formData.volume) {
      newErrors.volume = 'Volume is required';
    } else if (isNaN(parseFloat(formData.volume))) {
      newErrors.volume = 'Volume must be a number';
    } else if (volumeInMl < 50 || volumeInMl > 2000) {
      newErrors.volume = 'Volume must be between 50ml and 2000ml';
    }

    // Type validation
    if (!formData.type) {
      newErrors.type = 'Please select a container type';
    }

    // Color validation
    if (!formData.color) {
      newErrors.color = 'Please select a color';
    }

    setErrors(newErrors);
    setIsValid(Object.keys(newErrors).length === 0);
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const handleSave = () => {
    if (!isValid) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const volumeInMl = Math.round(
      parseFloat(formData.volume) * UNITS.find(u => u.id === formData.unit).multiplier
    );

    const containerData = {
      id: editContainer?.id || Date.now().toString(),
      name: formData.name.trim(),
      volume: volumeInMl,
      type: formData.type,
      color: formData.color,
      isCustom: true,
    };

    handleClose();
    setTimeout(() => onSave(containerData), 300);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTypeSelect = (type) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleInputChange('type', type);
  };

  const handleColorSelect = (color) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleInputChange('color', color);
  };

  const handleUnitToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newUnit = formData.unit === 'ml' ? 'oz' : 'ml';
    const currentUnit = UNITS.find(u => u.id === formData.unit);
    const newUnitData = UNITS.find(u => u.id === newUnit);
    
    if (formData.volume) {
      const volumeInMl = parseFloat(formData.volume) * currentUnit.multiplier;
      const newVolume = (volumeInMl / newUnitData.multiplier).toFixed(1);
      handleInputChange('volume', newVolume);
    }
    
    handleInputChange('unit', newUnit);
  };

  const PreviewContainer = () => {
    const selectedType = CONTAINER_TYPES.find(t => t.id === formData.type);
    const volumeInMl = formData.volume ? 
      Math.round(parseFloat(formData.volume) * UNITS.find(u => u.id === formData.unit).multiplier) : 0;

    return (
      <View style={styles.previewSection}>
        <Text style={styles.sectionTitle}>Preview</Text>
        <View style={styles.previewContainer}>
          <View style={[styles.containerButton, { opacity: formData.name && formData.type ? 1 : 0.5 }]}>
            <View style={[styles.containerIconContainer, { backgroundColor: formData.color }]}>
              {formData.type && (
                <Ionicons name={formData.type} size={24} color="#FFFFFF" />
              )}
            </View>
            <Text style={styles.containerLabel} numberOfLines={1}>
              {formData.name || 'Container Name'}
            </Text>
            <Text style={styles.containerAmount}>
              {volumeInMl > 0 ? `${volumeInMl}ml` : '0ml'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim },
              ],
            },
          ]}
        >
          <SafeAreaView style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <Text style={styles.headerTitle}>
                {editContainer ? 'Edit Container' : 'Add Container'}
              </Text>
              
              <TouchableOpacity
                onPress={handleSave}
                style={[styles.headerButton, !isValid && styles.disabledButton]}
                disabled={!isValid}
              >
                <Text style={[styles.saveText, !isValid && styles.disabledText]}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
              {/* Container Name */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Container Name</Text>
                <TextInput
                  style={[styles.textInput, errors.name && styles.errorInput]}
                  value={formData.name}
                  onChangeText={(value) => handleInputChange('name', value)}
                  placeholder="Enter container name"
                  placeholderTextColor="#999"
                  maxLength={20}
                />
                {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                <Text style={styles.characterCount}>{formData.name.length}/20</Text>
              </View>

              {/* Volume */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Volume</Text>
                <View style={styles.volumeContainer}>
                  <TextInput
                    style={[styles.volumeInput, errors.volume && styles.errorInput]}
                    value={formData.volume}
                    onChangeText={(value) => handleInputChange('volume', value)}
                    placeholder="0"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                  />
                  <TouchableOpacity style={styles.unitToggle} onPress={handleUnitToggle}>
                    <Text style={styles.unitText}>
                      {UNITS.find(u => u.id === formData.unit).label}
                    </Text>
                    <Ionicons name="swap-horizontal" size={16} color="#4A90E2" />
                  </TouchableOpacity>
                </View>
                {errors.volume && <Text style={styles.errorText}>{errors.volume}</Text>}
              </View>

              {/* Container Type */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Container Type</Text>
                <View style={styles.typeGrid}>
                  {CONTAINER_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.id}
                      style={[
                        styles.typeOption,
                        formData.type === type.id && styles.selectedType,
                      ]}
                      onPress={() => handleTypeSelect(type.id)}
                    >
                      <Ionicons
                        name={type.id}
                        size={28}
                        color={formData.type === type.id ? '#4A90E2' : '#666'}
                      />
                      <Text
                        style={[
                          styles.typeLabel,
                          formData.type === type.id && styles.selectedTypeLabel,
                        ]}
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {errors.type && <Text style={styles.errorText}>{errors.type}</Text>}
              </View>

              {/* Color Picker */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Color</Text>
                <View style={styles.colorGrid}>
                  {PREDEFINED_COLORS.map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color },
                        formData.color === color && styles.selectedColor,
                      ]}
                      onPress={() => handleColorSelect(color)}
                    >
                      {formData.color === color && (
                        <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
                {errors.color && <Text style={styles.errorText}>{errors.color}</Text>}
              </View>

              {/* Preview */}
              <PreviewContainer />
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#F8FFFE',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: height * 0.9,
  },
  modalContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E8F4F8',
    backgroundColor: '#FFFFFF',
  },
  headerButton: {
    minWidth: 60,
    minHeight: 44,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90E2',
    textAlign: 'right',
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledText: {
    color: '#999',
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  formSection: {
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8F4F8',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  errorInput: {
    borderColor: '#FF6B35',
  },
  errorText: {
    fontSize: 12,
    color: '#FF6B35',
    marginTop: 4,
  },
  characterCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  volumeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  volumeInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8F4F8',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    marginRight: 12,
  },
  unitToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8F4F8',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 80,
  },
  unitText: {
    fontSize: 16,
    color: '#4A90E2',
    fontWeight: '600',
    marginRight: 4,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  typeOption: {
    width: (width - 60) / 3,
    aspectRatio: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8F4F8',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  selectedType: {
    borderColor: '#4A90E2',
    backgroundColor: '#F0F9FF',
  },
  typeLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  selectedTypeLabel: {
    color: '#4A90E2',
    fontWeight: '600',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  colorOption: {
    width: (width - 80) / 4,
    aspectRatio: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColor: {
    borderColor: '#333',
  },
  previewSection: {
    marginVertical: 20,
    paddingBottom: 40,
  },
  previewContainer: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E8F4F8',
  },
  containerButton: {
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderRadius: 15,
    paddingVertical: 15,
    paddingHorizontal: 20,
    minWidth: 100,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  containerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  containerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
    textAlign: 'center',
  },
  containerAmount: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '500',
  },
});

export default CustomContainerModal;