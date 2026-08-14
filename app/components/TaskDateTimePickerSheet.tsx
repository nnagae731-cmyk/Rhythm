import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { DesignMode, getThemeTokens } from '../theme';

type TaskDateTimePickerSheetProps = {
  visible: boolean;
  mode: 'date' | 'time';
  title: string;
  value: Date;
  minimumDate?: Date;
  designMode: DesignMode;
  onClose: () => void;
  onConfirm: (value: Date) => void;
};

export function TaskDateTimePickerSheet({ visible, mode, title, value, minimumDate, designMode, onClose, onConfirm }: TaskDateTimePickerSheetProps) {
  const isDark = designMode === 'dark';
  const theme = getThemeTokens(designMode);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (visible) setDraft(value);
  }, [value, visible]);

  const handleChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (selected) setDraft(selected);
  };

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
    <Pressable style={sheetStyles.backdrop} onPress={onClose}>
      <Pressable
        style={[sheetStyles.sheet, { backgroundColor: isDark ? '#181F2E' : theme.colors.surface, borderColor: isDark ? '#40506A' : theme.colors.border }]}
        onPress={(event) => event.stopPropagation()}
      >
        <View style={[sheetStyles.handle, { backgroundColor: isDark ? '#40506A' : theme.colors.border }]} />
        <Text style={[sheetStyles.title, { color: isDark ? '#F4F7FC' : theme.colors.primaryText }]}>{title}</Text>
        <View style={[sheetStyles.pickerSurface, { backgroundColor: isDark ? '#20293A' : theme.colors.secondarySurface, borderColor: isDark ? '#40506A' : theme.colors.border }]}> 
          <DateTimePicker
            value={draft}
            mode={mode}
            minimumDate={minimumDate}
            display={Platform.OS === 'ios' ? (mode === 'date' ? 'inline' : 'spinner') : 'default'}
            themeVariant={isDark ? 'dark' : 'light'}
            textColor={isDark ? '#F4F7FC' : undefined}
            accentColor={isDark ? '#8EA6FF' : undefined}
            onChange={handleChange}
          />
        </View>
        <View style={sheetStyles.actions}>
          <Pressable accessibilityRole="button" style={[sheetStyles.actionButton, { borderColor: isDark ? '#40506A' : theme.colors.border, backgroundColor: isDark ? '#20293A' : theme.colors.surface }]} onPress={onClose}>
            <Text style={[sheetStyles.cancelText, { color: isDark ? '#B4C0D4' : theme.colors.secondaryText }]}>キャンセル</Text>
          </Pressable>
          <Pressable accessibilityRole="button" style={[sheetStyles.actionButton, sheetStyles.confirmButton, { backgroundColor: isDark ? '#8EA6FF' : theme.colors.primaryAccent }]} onPress={() => { onConfirm(draft); onClose(); }}>
            <Text style={sheetStyles.confirmText}>決定</Text>
          </Pressable>
        </View>
      </Pressable>
    </Pressable>
  </Modal>;
}

const sheetStyles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 14, 28, 0.56)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 30 },
  handle: { alignSelf: 'center', width: 42, height: 5, borderRadius: 3, marginBottom: 18 },
  title: { fontSize: 19, fontWeight: '900', textAlign: 'center', marginBottom: 14 },
  pickerSurface: { minHeight: 220, borderWidth: 1, borderRadius: 16, overflow: 'hidden', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  actionButton: { flex: 1, minHeight: 52, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  confirmButton: { borderWidth: 0 },
  cancelText: { fontSize: 15, fontWeight: '900' },
  confirmText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
});
