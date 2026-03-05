import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  Platform,
  ActivityIndicator
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  getRoleTypes,
  createRoleType,
  updateRoleType,
  deleteRoleType,
  type RoleType,
  type CreateRoleTypePayload
} from '../services/roleTypesApi';

const SIDEBAR_WIDTH = 256;

export interface RolesScreenProps {
  token: string;
  user?: { email: string; fullName: string };
  onBack: () => void;
  onSignOut?: () => void;
}

export const RolesScreen: React.FC<RolesScreenProps> = ({
  token,
  user,
  onBack,
  onSignOut
}) => {
  const [roleTypes, setRoleTypes] = useState<RoleType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', hourlyRateDollars: '', perDiemDollars: '', hotelSoloRoom: false });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const list = await getRoleTypes(token);
      setRoleTypes(list);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to load roles');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setEditingId(null);
    setForm({ name: '', hourlyRateDollars: '', perDiemDollars: '', hotelSoloRoom: false });
    setEditModalOpen(true);
  };

  const openEdit = (r: RoleType) => {
    setEditingId(r.id);
    setForm({
      name: r.name,
      hourlyRateDollars: (r.hourlyRateCents / 100).toFixed(2),
      perDiemDollars: (r.perDiemCents / 100).toFixed(2),
      hotelSoloRoom: r.hotelSoloRoom
    });
    setEditModalOpen(true);
  };

  const closeModal = () => {
    setEditModalOpen(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    const name = form.name.trim();
    if (!name) {
      Alert.alert('Validation', 'Role name is required.');
      return;
    }
    const hourlyRateCents = Math.round(parseFloat(form.hourlyRateDollars || '0') * 100);
    const perDiemCents = Math.round(parseFloat(form.perDiemDollars || '0') * 100);
    if (hourlyRateCents < 0 || perDiemCents < 0) {
      Alert.alert('Validation', 'Rates must be 0 or greater.');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await updateRoleType(token, editingId, {
          name,
          hourlyRateCents,
          perDiemCents,
          hotelSoloRoom: form.hotelSoloRoom
        });
      } else {
        await createRoleType(token, {
          name,
          hourlyRateCents,
          perDiemCents,
          hotelSoloRoom: form.hotelSoloRoom
        });
      }
      await load();
      closeModal();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (r: RoleType) => {
    Alert.alert(
      'Delete role',
      `Delete "${r.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteRoleType(token, r.id);
              await load();
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Failed to delete');
            }
          }
        }
      ]
    );
  };

  const initials = user?.fullName
    ? user.fullName.split(/\s+/).map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'JD';
  const displayName = user?.fullName?.split(/\s+/)[0] + ' ' + (user?.fullName?.split(/\s+/)[1]?.[0] ?? '') || 'User';
  const displayEmail = user?.email ?? '';

  const sidebar = (
    <>
      <View style={styles.logoSection}>
        <View style={styles.logoRow}>
          <View style={styles.logoSquare} />
          <Text style={styles.brandGoQuote}>GoQuote</Text>
          <Text style={styles.brandEstimator}> Estimator</Text>
        </View>
      </View>
      <View style={styles.mainNav}>
        <TouchableOpacity style={styles.navItem} onPress={onBack}>
          <Feather name="layout" size={18} color="#6B7280" />
          <Text style={styles.navLabel}>Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navItem, styles.navItemActive]}>
          <Feather name="users" size={18} color="#1D2131" />
          <Text style={[styles.navLabel, styles.navLabelActive]}>Roles</Text>
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
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{displayName}</Text>
            <Text style={styles.userEmail} numberOfLines={1}>{displayEmail}</Text>
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

  return (
    <View style={styles.page}>
      <View style={styles.sidebar}>{sidebar}</View>
      <View style={styles.main}>
        <View style={styles.headerBar}>
          <Text style={styles.headerTitle}>Role types</Text>
          <Text style={styles.headerSubtitle}>Define roles with hourly rate, per diem, and hotel solo room</Text>
          <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
            <Feather name="plus" size={20} color="#F67A34" />
            <Text style={styles.addBtnText}>Add role type</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color="#F67A34" />
            </View>
          ) : roleTypes.length === 0 ? (
            <Text style={styles.emptyText}>No role types yet. Add one to use in projects.</Text>
          ) : (
            roleTypes.map((r) => (
              <View key={r.id} style={styles.roleCard}>
                <View style={styles.roleMain}>
                  <Text style={styles.roleName}>{r.name}</Text>
                  <Text style={styles.roleMeta}>
                    ${(r.hourlyRateCents / 100).toFixed(0)}/hr · ${(r.perDiemCents / 100).toFixed(0)} per diem
                    {r.hotelSoloRoom ? ' · Solo room' : ''}
                  </Text>
                </View>
                <View style={styles.roleActions}>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => openEdit(r)}>
                    <Feather name="edit-2" size={18} color="#6B7280" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => handleDelete(r)}>
                    <Feather name="trash-2" size={18} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      <Modal visible={editModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editingId ? 'Edit role type' : 'Add role type'}</Text>
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
              placeholder="e.g. Electrician"
              placeholderTextColor="#94A3B8"
            />
            <Text style={styles.fieldLabel}>Hourly rate ($)</Text>
            <TextInput
              style={styles.input}
              value={form.hourlyRateDollars}
              onChangeText={(v) => setForm((f) => ({ ...f, hourlyRateDollars: v }))}
              placeholder="0"
              placeholderTextColor="#94A3B8"
              keyboardType="decimal-pad"
            />
            <Text style={styles.fieldLabel}>Per diem ($)</Text>
            <TextInput
              style={styles.input}
              value={form.perDiemDollars}
              onChangeText={(v) => setForm((f) => ({ ...f, perDiemDollars: v }))}
              placeholder="0"
              placeholderTextColor="#94A3B8"
              keyboardType="decimal-pad"
            />
            <TouchableOpacity
              style={[styles.checkRow, form.hotelSoloRoom && styles.checkRowActive]}
              onPress={() => setForm((f) => ({ ...f, hotelSoloRoom: !f.hotelSoloRoom }))}
            >
              <Feather name={form.hotelSoloRoom ? 'check-square' : 'square'} size={20} color={form.hotelSoloRoom ? '#F67A34' : '#6B7280'} />
              <Text style={styles.checkLabel}>Hotel solo room</Text>
            </TouchableOpacity>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeModal}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>{editingId ? 'Save' : 'Add'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  page: { flex: 1, flexDirection: 'row', backgroundColor: '#F3F4F6', minHeight: '100%' },
  sidebar: {
    width: SIDEBAR_WIDTH,
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    alignItems: 'center'
  },
  logoSection: { padding: 16, width: '100%' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoSquare: { width: 12, height: 12, backgroundColor: '#1D2131', borderRadius: 4 },
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
  mainNav: { width: 224, gap: 8 },
  navItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, gap: 12, borderRadius: 8 },
  navItemActive: { backgroundColor: '#EBEBEB', borderRadius: 12 },
  navItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 },
  navItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  navLabel: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '500',
    fontSize: 14,
    lineHeight: 20,
    color: '#6B7280'
  },
  navLabelActive: { color: '#1D2131' },
  divider: { width: 226, height: 1, backgroundColor: '#E5E7EB', marginVertical: 24 },
  userSection: { padding: 16, width: '100%', marginTop: 'auto' },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center' },
  avatarText: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '800',
    fontSize: 11.25,
    color: '#FFFFFF'
  },
  userInfo: { flex: 1, minWidth: 0 },
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
  main: { flex: 1, minWidth: 0, padding: 16, paddingLeft: 24 },
  headerBar: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24
  },
  headerTitle: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '600',
    fontSize: 20,
    lineHeight: 28,
    color: '#1D2131'
  },
  headerSubtitle: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '400',
    fontSize: 14,
    lineHeight: 20,
    color: '#6B7280',
    marginTop: 4
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16
  },
  addBtnText: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '600',
    fontSize: 16,
    color: '#F67A34'
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 48 },
  loadingWrap: { padding: 48, alignItems: 'center' },
  emptyText: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontSize: 14,
    color: '#6B7280',
    padding: 24
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12
  },
  roleMain: { flex: 1, minWidth: 0 },
  roleName: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '600',
    fontSize: 16,
    color: '#1D2131'
  },
  roleMeta: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4
  },
  roleActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { padding: 8 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400
  },
  modalTitle: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '600',
    fontSize: 18,
    color: '#1D2131',
    marginBottom: 16
  },
  fieldLabel: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '500',
    fontSize: 14,
    color: '#374151',
    marginTop: 12,
    marginBottom: 4
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1D2131'
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16
  },
  checkRowActive: {},
  checkLabel: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontSize: 14,
    color: '#374151'
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24
  },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  cancelBtnText: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontSize: 14,
    color: '#6B7280'
  },
  saveBtn: {
    backgroundColor: '#F67A34',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '600',
    fontSize: 14,
    color: '#FFFFFF'
  }
});
