import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Modal,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getProjects, createProject, updateProject, deleteProject, type Project, type ProjectStatus, type CreateProjectPayload } from '../services/projectsApi';
import { CreateProjectWizard } from '../components/CreateProjectWizard';

export interface DashboardScreenProps {
  token: string;
  user?: { email: string; fullName: string };
  onSignOut?: () => void;
}

const SIDEBAR_WIDTH = 256;
const CARD_WIDTH = 385;
const CARD_GAP = 20;

const STATUS_COLORS: Record<ProjectStatus, string> = {
  DRAFT: '#6B7280',
  FINALIZED: '#1BC685'
};

function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return '—';
  if (!start) return end ? new Date(end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  if (!end) return new Date(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const s = new Date(start);
  const e = new Date(end);
  return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

function formatBudget(cents: number | null): string {
  if (cents == null) return '—';
  return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  token,
  user,
  onSignOut
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [menuProject, setMenuProject] = useState<Project | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const list = await getProjects(token);
      setProjects(list);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load projects';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const openCreateModal = () => {
    setEditingProject(null);
    setCreateModalVisible(true);
  };
  const closeCreateModal = () => {
    setCreateModalVisible(false);
    setEditingProject(null);
  };

  const openEditMenu = (project: Project) => setMenuProject(project);
  const closeEditMenu = () => setMenuProject(null);
  const openEditProject = (project: Project) => {
    setEditingProject(project);
    setMenuProject(null);
    setCreateModalVisible(true);
  };

  const handleDeleteProject = () => {
    if (!menuProject) return;
    const { id, name } = menuProject;
    Alert.alert(
      'Delete project',
      `Delete "${name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel', onPress: closeEditMenu },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            closeEditMenu();
            try {
              await deleteProject(token, id);
              await fetchProjects();
            } catch (e) {
              const message = e instanceof Error ? e.message : 'Failed to delete project';
              Alert.alert('Error', message);
            }
          }
        }
      ]
    );
  };

  const handleWizardSubmit = async (payload: CreateProjectPayload) => {
    setSubmitting(true);
    try {
      if (editingProject) {
        await updateProject(token, editingProject.id, payload);
        setEditingProject(null);
        closeCreateModal();
      } else {
        await createProject(token, payload);
      }
      await fetchProjects();
    } catch (e) {
      const message = e instanceof Error ? e.message : (editingProject ? 'Failed to update project' : 'Failed to create project');
      Alert.alert('Error', message);
      throw e;
    } finally {
      setSubmitting(false);
    }
  };

  const sidebarProjects = projects.slice(0, 3).map((p) => ({
    name: p.name.length > 20 ? p.name.slice(0, 17) + '…' : p.name,
    dotColor: STATUS_COLORS[p.status]
  }));

  const initials = user?.fullName
    ? user.fullName.split(/\s+/).map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'JD';
  const displayName = user?.fullName?.split(/\s+/)[0] + ' ' + (user?.fullName?.split(/\s+/)[1]?.[0] ?? '') || 'Jason D';
  const displayEmail = user?.email ?? 'jason.duong@gmail.com';

  return (
    <View style={styles.page}>
      {/* Left Sidebar */}
      <View style={styles.sidebar}>
        <View style={styles.logoSection}>
          <View style={styles.logoRow}>
            <View style={styles.logoSquare} />
            <Text style={styles.brandGoQuote}>GoQuote</Text>
            <Text style={styles.brandEstimator}> Estimator</Text>
          </View>
        </View>

        <View style={styles.mainNav}>
          <TouchableOpacity style={[styles.navItem, styles.navItemActive]}>
            <Feather name="layout" size={18} color="#1D2131" />
            <Text style={[styles.navLabel, styles.navLabelActive]}>Dashboard</Text>
          </TouchableOpacity>
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

        <View style={styles.activeSection}>
          <Text style={styles.sectionLabel}>ACTIVE PROJECTS</Text>
          {sidebarProjects.map((p, i) => (
            <TouchableOpacity key={i} style={styles.projectRow}>
              <View style={[styles.projectDot, { backgroundColor: p.dotColor }]} />
              <Text style={styles.projectRowName} numberOfLines={1}>{p.name}</Text>
              <Feather name="more-horizontal" size={16} color="#1D2131" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.divider} />

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
              <Text style={styles.avatarText}>{initials}</Text>
              <View style={styles.statusOnline} />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{displayName}</Text>
              <Text style={styles.userEmail} numberOfLines={1}>{displayEmail}</Text>
            </View>
            <TouchableOpacity onPress={onSignOut} hitSlop={8}>
              <Feather name="log-out" size={18} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Main content */}
      <View style={styles.main}>
        <View style={styles.headerBar}>
          <View style={styles.headerRow}>
            <Feather name="layout" size={18} color="#1D2131" />
            <View style={styles.headerDivider} />
            <View>
              <Text style={styles.headerTitle}>Dashboard</Text>
              <Text style={styles.headerSubtitle}>Create and manage your projects</Text>
            </View>
          </View>
        </View>

        <View style={styles.filterBar}>
          <View style={styles.filterLeft}>
            <TouchableOpacity style={styles.filterBtn}>
              <Feather name="filter" size={16} color="#F67A34" />
              <Text style={styles.filterBtnText}>Filter</Text>
            </TouchableOpacity>
            <View style={styles.chip}>
              <Text style={styles.chipText}>Status: Draft</Text>
              <Feather name="x" size={16} color="#484566" />
            </View>
            <View style={styles.chip}>
              <Text style={styles.chipText}>Status: Draft</Text>
              <Feather name="x" size={16} color="#484566" />
            </View>
          </View>
          <TouchableOpacity style={styles.addProjectBtn} onPress={openCreateModal}>
            <Feather name="plus" size={24} color="#F67A34" />
            <Text style={styles.addProjectText}>Add Project</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.cardsScroll}
          contentContainerStyle={styles.cardsContainer}
          showsVerticalScrollIndicator={true}
        >
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color="#F67A34" />
              <Text style={styles.loadingText}>Loading projects…</Text>
            </View>
          ) : (
            <>
              {projects.map((project) => {
                const statusColor = STATUS_COLORS[project.status];
                const dateRange = formatDateRange(project.startDate, project.endDate);
                const crewStr = project.crew != null ? `${project.crew} crew` : '—';
                const workdaysStr = project.workdays != null ? `${project.workdays} workdays` : '—';
                const budgetStr = formatBudget(project.budgetCents);
                return (
                  <View key={project.id} style={styles.card}>
                    <View style={styles.cardTop}>
                      <View style={styles.cardTitleRow}>
                        <Feather name="folder" size={24} color="#1D2131" />
                        <View style={[styles.statusBadge, { backgroundColor: project.status === 'FINALIZED' ? '#DCFCE7' : '#F3F4F6' }]}>
                          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                          <Text style={[styles.statusText, { color: statusColor }]}>{project.status}</Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={styles.cardMenuBtn}
                        onPress={() => openEditMenu(project)}
                        hitSlop={8}
                        activeOpacity={0.7}
                      >
                        <Feather name="more-horizontal" size={20} color="#6B7280" />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.cardName}>{project.name}</Text>
                    <View style={styles.cardMeta}>
                      <View style={styles.metaItem}>
                        <Feather name="navigation" size={14} color="#3B82F6" />
                        <Text style={styles.metaText}>{project.route || '—'}</Text>
                      </View>
                      <Text style={styles.metaDot}>•</Text>
                      <View style={styles.metaItem}>
                        <Feather name="map-pin" size={14} color="#484566" />
                        <Text style={styles.metaText}>{project.location || '—'}</Text>
                      </View>
                    </View>
                    <View style={styles.cardMeta}>
                      <View style={styles.metaItem}>
                        <Feather name="calendar" size={14} color="#484566" />
                        <Text style={styles.metaText}>{dateRange}</Text>
                      </View>
                      <Text style={styles.metaDot}>•</Text>
                      <View style={styles.metaItem}>
                        <Feather name="users" size={14} color="#484566" />
                        <Text style={styles.metaText}>{crewStr}</Text>
                      </View>
                    </View>
                    <View style={styles.cardFooter}>
                      <View style={styles.footerLeft}>
                        <View style={[styles.progressDot, { borderColor: statusColor, backgroundColor: statusColor }]} />
                        <Text style={styles.footerWorkdays}>{workdaysStr}</Text>
                      </View>
                      <View style={styles.footerRight}>
                        <Text style={styles.footerLabel}>EST. Budget</Text>
                        <Text style={[styles.footerBudget, { color: '#1BC685' }]}>{budgetStr}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
              <TouchableOpacity style={styles.cardCreate} onPress={openCreateModal}>
                <View style={styles.cardCreateIconWrap}>
                  <Feather name="plus" size={24} color="#F67A34" />
                </View>
                <Text style={styles.cardCreateText}>Create New Project</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </View>

      <Modal
        visible={createModalVisible}
        animationType="fade"
        transparent
        onRequestClose={closeCreateModal}
      >
        <CreateProjectWizard
          visible={createModalVisible}
          onClose={closeCreateModal}
          onSubmit={handleWizardSubmit}
          submitting={submitting}
          initialProject={editingProject}
        />
      </Modal>

      {/* Three-dots menu: Edit */}
      <Modal
        visible={menuProject !== null}
        transparent
        animationType="fade"
        onRequestClose={closeEditMenu}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={closeEditMenu}
        >
          <View style={styles.menuCard}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => menuProject && openEditProject(menuProject)}
              activeOpacity={0.7}
            >
              <Feather name="edit-2" size={18} color="#1D2131" />
              <Text style={styles.menuItemText}>Edit project</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleDeleteProject}
              activeOpacity={0.7}
            >
              <Feather name="trash-2" size={18} color="#DC2626" />
              <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>Delete project</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  page: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    minHeight: '100%'
  },
  sidebar: {
    width: SIDEBAR_WIDTH,
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    alignItems: 'center'
  },
  logoSection: {
    padding: 16,
    width: '100%'
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
  },
  main: {
    flex: 1,
    minWidth: 0,
    padding: 16,
    paddingLeft: 24
  },
  headerBar: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: '#E5E7EB',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    paddingHorizontal: 24
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  headerDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#E5E7EB'
  },
  headerTitle: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '600',
    fontSize: 18,
    lineHeight: 28,
    color: '#1D2131'
  },
  headerSubtitle: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '400',
    fontSize: 14,
    lineHeight: 16,
    color: '#484566'
  },
  filterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    paddingHorizontal: 24
  },
  filterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#F67A34',
    borderRadius: 12
  },
  filterBtnText: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '400',
    fontSize: 16,
    lineHeight: 20,
    color: '#F67A34'
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 12
  },
  chipText: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '400',
    fontSize: 16,
    lineHeight: 20,
    color: '#484566'
  },
  addProjectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8
  },
  addProjectText: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 20,
    color: '#F67A34'
  },
  cardsScroll: {
    flex: 1
  },
  cardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: '#E5E7EB',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingBottom: 48
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 24,
    padding: 24,
    gap: 12
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  cardMenuBtn: {
    padding: 4,
    margin: -4
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 4,
    borderRadius: 10
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  statusText: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '500',
    fontSize: 12,
    lineHeight: 16
  },
  cardName: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 24,
    color: '#1D2131'
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  metaText: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '400',
    fontSize: 12,
    lineHeight: 16,
    color: '#484566'
  },
  metaDot: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontSize: 12,
    color: '#484566'
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6'
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  progressDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    backgroundColor: 'transparent'
  },
  footerWorkdays: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '400',
    fontSize: 12,
    lineHeight: 16,
    color: '#484566'
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  footerLabel: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '400',
    fontSize: 12,
    lineHeight: 16,
    color: '#6B7280'
  },
  footerBudget: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '600',
    fontSize: 20,
    lineHeight: 16
  },
  cardCreate: {
    width: CARD_WIDTH,
    minHeight: 204,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(246, 122, 52, 0.5)',
    borderRadius: 24,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12
  },
  cardCreateIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(246, 122, 52, 0.08)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  cardCreateText: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 20,
    color: '#F67A34'
  },
  loadingWrap: {
    flex: 1,
    minWidth: CARD_WIDTH,
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12
  },
  loadingText: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontSize: 14,
    color: '#6B7280'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  modalContent: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  modalTitle: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '600',
    fontSize: 18,
    color: '#1D2131'
  },
  modalBody: {
    maxHeight: 400,
    padding: 24
  },
  modalLabel: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '500',
    fontSize: 14,
    color: '#1D2131',
    marginBottom: 6,
    marginTop: 12
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#1D2131'
  },
  statusToggle: {
    flexDirection: 'row',
    gap: 8
  },
  statusOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  statusOptionActive: {
    borderColor: '#F67A34',
    backgroundColor: 'rgba(246, 122, 52, 0.08)'
  },
  statusOptionText: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontSize: 14,
    color: '#6B7280'
  },
  statusOptionTextActive: {
    color: '#F67A34',
    fontWeight: '600'
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB'
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12
  },
  modalCancelText: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontSize: 16,
    color: '#6B7280'
  },
  modalSubmitBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#F67A34',
    minWidth: 140,
    alignItems: 'center'
  },
  modalSubmitBtnDisabled: {
    opacity: 0.7
  },
  modalSubmitText: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '600',
    fontSize: 16,
    color: '#FFFFFF'
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 8,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8
  },
  menuItemText: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '500',
    fontSize: 16,
    lineHeight: 20,
    color: '#1D2131'
  },
  menuItemTextDanger: {
    color: '#DC2626'
  }
});
