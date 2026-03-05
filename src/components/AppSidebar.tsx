import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform
} from 'react-native';
import { Feather } from '@expo/vector-icons';

export const SIDEBAR_WIDTH = 256;
export const CARD_WIDTH = 385;
export const CARD_GAP = 20;
/** Collapse sidebar when window is narrower than sidebar + main content. */
export const SIDEBAR_COLLAPSE_BREAKPOINT = SIDEBAR_WIDTH + CARD_WIDTH + CARD_GAP;

export type AppSidebarActivePage = 'dashboard' | 'estimate';

export type AppSidebarRecentProject = {
  name: string;
  dotColor: string;
};

export interface AppSidebarProps {
  /** Which page is active; Dashboard nav item is highlighted and clickable when 'estimate' (to go back). */
  activePage: AppSidebarActivePage;
  user: {
    displayName: string;
    displayEmail: string;
    initials: string;
  };
  onDashboardPress?: () => void;
  onRolesPress?: () => void;
  onSignOut?: () => void;
  /** When set, logo row is clickable (e.g. for debug). */
  onLogoPress?: () => void;
  /** When set, shows "ACTIVE PROJECTS" section with these items (dashboard only). */
  recentProjects?: AppSidebarRecentProject[];
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activePage,
  user,
  onDashboardPress,
  onRolesPress,
  onSignOut,
  onLogoPress,
  recentProjects
}) => {
  const logoRow = (
    <View style={styles.logoRow}>
      <View style={styles.logoSquare} />
      <Text style={styles.brandGoQuote}>GoQuote</Text>
      <Text style={styles.brandEstimator}> Estimator</Text>
    </View>
  );

  return (
    <>
      <View style={styles.logoSection}>
        {onLogoPress ? (
          <TouchableOpacity onPress={onLogoPress} activeOpacity={0.7} style={styles.logoTouch}>
            {logoRow}
          </TouchableOpacity>
        ) : (
          logoRow
        )}
      </View>

      <View style={styles.mainNav}>
        {activePage === 'estimate' && onDashboardPress ? (
          <TouchableOpacity style={[styles.navItem, styles.navItemActive]} onPress={onDashboardPress}>
            <Feather name="layout" size={18} color="#1D2131" />
            <Text style={[styles.navLabel, styles.navLabelActive]}>Dashboard</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.navItem, styles.navItemActive]}>
            <Feather name="layout" size={18} color="#1D2131" />
            <Text style={[styles.navLabel, styles.navLabelActive]}>Dashboard</Text>
          </View>
        )}
        {onRolesPress && (
          <TouchableOpacity style={styles.navItem} onPress={onRolesPress}>
            <Feather name="users" size={18} color="#6B7280" />
            <Text style={styles.navLabel}>Roles</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.navItem}>
          <Feather name="credit-card" size={18} color="#6B7280" />
          <Text style={styles.navLabel}>Subscription</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItemRow}>
          <View style={styles.navItemLeft}>
            <Feather name="user" size={18} color="#6B7280" />
            <Text style={styles.navLabel}>Account & Billing</Text>
          </View>
          <Feather name="chevron-down" size={18} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      {recentProjects != null && recentProjects.length > 0 && (
        <>
          <View style={styles.activeSection}>
            <Text style={styles.sectionLabel}>ACTIVE PROJECTS</Text>
            {recentProjects.map((p, i) => (
              <TouchableOpacity key={i} style={styles.projectRow}>
                <View style={[styles.projectDot, { backgroundColor: p.dotColor }]} />
                <Text style={styles.projectRowName} numberOfLines={1}>{p.name}</Text>
                <Feather name="more-horizontal" size={16} color="#1D2131" />
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.divider} />
        </>
      )}

      <View style={styles.mainNav}>
        <TouchableOpacity style={styles.navItem}>
          <Feather name="settings" size={18} color="#6B7280" />
          <Text style={styles.navLabel}>Settings & Defaults</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Feather name="help-circle" size={18} color="#6B7280" />
          <Text style={styles.navLabel}>Support & Help</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      <View style={styles.userSection}>
        <View style={styles.userRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user.initials}</Text>
            <View style={styles.statusOnline} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user.displayName}</Text>
            <Text style={styles.userEmail} numberOfLines={1}>{user.displayEmail}</Text>
          </View>
          {onSignOut && (
            <TouchableOpacity onPress={onSignOut} hitSlop={8}>
              <Feather name="log-out" size={18} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  logoSection: {
    padding: 16,
    width: '100%'
  },
  logoTouch: {
    alignSelf: 'stretch'
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  logoSquare: {
    width: 12,
    height: 12,
    backgroundColor: '#1D2131',
    borderRadius: 4
  },
  brandGoQuote: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '700',
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: -0.5,
    color: '#1D2131'
  },
  brandEstimator: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '700',
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: -0.5,
    color: '#F67A34'
  },
  mainNav: {
    width: 224,
    gap: 8
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 12,
    borderRadius: 8
  },
  navItemActive: {
    backgroundColor: '#EBEBEB',
    borderRadius: 12
  },
  navItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8
  },
  navItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  navLabel: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '500',
    fontSize: 14,
    lineHeight: 20,
    color: '#6B7280'
  },
  navLabelActive: {
    color: '#1D2131'
  },
  divider: {
    width: 226,
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 24
  },
  sectionLabel: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '500',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#6B7280',
    marginBottom: 8,
    paddingHorizontal: 12
  },
  activeSection: {
    width: 224
  },
  projectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 12,
    borderRadius: 8
  },
  projectDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#1D2131'
  },
  projectRowName: {
    flex: 1,
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '400',
    fontSize: 14,
    lineHeight: 20,
    color: '#1D2131'
  },
  userSection: {
    padding: 16,
    width: '100%',
    marginTop: 'auto'
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarText: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '800',
    fontSize: 11.25,
    lineHeight: 18,
    color: '#FFFFFF'
  },
  statusOnline: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 11.25,
    height: 11.25,
    borderRadius: 12,
    backgroundColor: '#22C55E',
    borderWidth: 2.25,
    borderColor: '#FFFFFF'
  },
  userInfo: {
    flex: 1,
    minWidth: 0
  },
  userName: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '500',
    fontSize: 14,
    lineHeight: 20,
    color: '#1D2131'
  },
  userEmail: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '400',
    fontSize: 12,
    lineHeight: 16,
    color: '#6B7280'
  }
});
