import { StyleSheet } from 'react-native';
import { theme } from '../../../utils/theme';

export const bookRideStyles = StyleSheet.create({
  phoneInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    fontSize: 16,
  },
  phoneError: {
    color: theme.colors.error,
    marginBottom: 8,
  },
  phoneLabel: {
    fontSize: 16,
    marginBottom: 8,
    color: theme.colors.text,
  }
});