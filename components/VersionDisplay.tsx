import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { getFullVersion } from '../utils/version';
import { theme } from '../utils/theme';

export const VersionDisplay = () => (
  <Text style={styles.version}>Version {getFullVersion()}</Text>
);

const styles = StyleSheet.create({
  version: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingVertical: theme.spacing.sm,
  },
});

export default VersionDisplay;