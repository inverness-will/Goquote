import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

export type AuthPanelVariant = 'email' | 'otp' | 'reset';

interface AuthDecorativePanelProps {
  title: string;
  subtitle: string;
  variant: AuthPanelVariant;
}

const variantIcon: Record<AuthPanelVariant, keyof typeof Feather.glyphMap> = {
  email: 'mail',
  otp: 'shield',
  reset: 'key'
};

const variantColor: Record<AuthPanelVariant, string> = {
  email: '#1BC685',
  otp: '#21B3FF',
  reset: '#16B66F'
};

export const AuthDecorativePanel: React.FC<AuthDecorativePanelProps> = ({ title, subtitle, variant }) => {
  return (
    <View style={styles.rightPanel} pointerEvents="none">
      <View style={styles.blur1} />
      <View style={styles.blur2} />
      <View style={styles.illustration}>
        <View style={styles.card}>
          <View style={styles.windowControls}>
            <View style={[styles.windowDot, styles.windowDotRed]} />
            <View style={[styles.windowDot, styles.windowDotYellow]} />
            <View style={[styles.windowDot, styles.windowDotGreen]} />
          </View>
          <View style={styles.cardBody}>
            <View style={styles.graphicWrap}>
              <View style={styles.graphicGrid} />
              <View style={styles.graphicOuterCircle}>
                <View style={[styles.graphicInnerCircle, { backgroundColor: variantColor[variant] }]}>
                  <Feather name={variantIcon[variant]} size={28} color="#FFFFFF" />
                </View>
              </View>
            </View>
            <View style={styles.copyRow}>
              <Feather name={variantIcon[variant]} size={18} color="#1D2131" />
              <Text style={styles.cardTitle}>{title}</Text>
            </View>
            <Text style={styles.cardSubtitle}>{subtitle}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  rightPanel: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    left: '50%',
    backgroundColor: '#FFFBF8',
    borderTopLeftRadius: 50,
    borderBottomLeftRadius: 50,
    overflow: 'hidden'
  },
  blur1: {
    position: 'absolute',
    left: '47.5%',
    right: '-10%',
    top: '-20%',
    bottom: '70%',
    backgroundColor: 'rgba(246, 122, 52, 0.05)',
    borderRadius: 9999
  },
  blur2: {
    position: 'absolute',
    left: '-10%',
    right: '57.92%',
    top: '68.33%',
    bottom: '-10%',
    backgroundColor: 'rgba(246, 122, 52, 0.05)',
    borderRadius: 9999
  },
  illustration: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center'
  },
  card: {
    width: 600,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.6)',
    shadowColor: '#F67A34',
    shadowOffset: { width: 0, height: 25 },
    shadowOpacity: 0.15,
    shadowRadius: 50,
    elevation: 8,
    overflow: 'hidden'
  },
  windowControls: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 40,
    gap: 8,
    backgroundColor: 'rgba(248, 250, 252, 0.5)',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  windowDot: {
    width: 12,
    height: 12,
    borderRadius: 9999
  },
  windowDotRed: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)'
  },
  windowDotYellow: {
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.5)'
  },
  windowDotGreen: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.5)'
  },
  cardBody: {
    padding: 24,
    gap: 12
  },
  graphicWrap: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center'
  },
  graphicGrid: {
    position: 'absolute',
    width: 430,
    height: 200,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(29, 33, 49, 0.06)'
  },
  graphicOuterCircle: {
    width: 135,
    height: 135,
    borderRadius: 1000,
    backgroundColor: '#101524',
    alignItems: 'center',
    justifyContent: 'center'
  },
  graphicInnerCircle: {
    width: 72,
    height: 72,
    borderRadius: 1000,
    alignItems: 'center',
    justifyContent: 'center'
  },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  cardTitle: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '600',
    fontSize: 20,
    lineHeight: 30,
    color: '#1D2131'
  },
  cardSubtitle: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '400',
    fontSize: 18,
    lineHeight: 27,
    color: '#484566'
  }
});
