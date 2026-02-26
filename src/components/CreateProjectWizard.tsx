import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal as RNModal,
  useWindowDimensions
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import type { CreateProjectPayload, Currency, Transport, Project } from '../services/projectsApi';

/** Web-only: renders a native <input type="date"> so the browser date picker works. RNW TextInput overwrites type. */
function WebDateInput({
  value,
  onChange,
  placeholder,
  style
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  style?: object;
}) {
  const containerRef = useRef<View>(null);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = containerRef.current as unknown as HTMLElement | null;
    if (!el) return;
    const input = document.createElement('input');
    input.type = 'date';
    input.value = value || '';
    input.placeholder = placeholder || '';
    input.style.cssText = [
      'width:100%;height:100%;min-height:48px;border:none;outline:none;background:transparent;',
      'font-size:14px;color:#1D2131;font-family:Inter,system-ui,sans-serif;',
      'padding:0;margin:0;box-sizing:border-box;'
    ].join(' ');
    const onInput = () => onChange(input.value || '');
    input.addEventListener('change', onInput);
    el.appendChild(input);
    return () => {
      input.removeEventListener('change', onInput);
      el.removeChild(input);
    };
  }, [placeholder]);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = containerRef.current as unknown as HTMLElement | null;
    if (!el) return;
    const input = el.querySelector('input');
    if (input && input.value !== (value || '')) input.value = value || '';
  }, [value]);
  return <View ref={containerRef} style={[{ minHeight: 48 }, style]} collapsable={false} />;
}

function formatDateForDisplay(isoDate: string): string {
  if (!isoDate.trim()) return '';
  const d = new Date(isoDate.trim() + 'T12:00:00.000Z');
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function toISODateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const WIZARD_STEPS = [
  { title: 'Project Information', subtitle: 'Enter the basic information for your estimate' },
  { title: 'Manpower & Scheduling', subtitle: 'Configure crew and work schedule' },
  { title: 'Travel & Transport', subtitle: 'Configure flight routes and ground transport' },
  { title: 'Lodging', subtitle: 'Hotel and lodging preferences' },
  { title: 'Per Diem & Risk', subtitle: 'Configure daily allowances and Contingency buffer' }
] as const;

const STEP_LABELS = [
  'Project Information',
  'Manpower & Scheduling',
  'Travel & Transport',
  'Lodging',
  'Per Diem & Risk'
];

export type PreviousRole = {
  title: string;
  hourlyRateCents: number;
  perDiemCents: number;
  hotelRoomSharing: boolean;
};

export type WizardFormRole = {
  id: string;
  title: string;
  count: number;
  hourlyRateDollars: string;
  perDiemDollars: string;
  hotelRoomSharing: boolean;
};

export type WizardFormState = {
  name: string;
  startDate: string;
  endDate: string;
  currency: Currency;
  costPerWeek: string;
  crew: string;
  workdays: string;
  workSaturday: boolean;
  workSunday: boolean;
  staff: WizardFormRole[];
  transport: Transport | null;
  jobSiteAddress: string;
  originAddress: string;
  originAirport: string;
  destinationAirport: string;
  groundTransportNote: string;
  hotelQuality: string;
  singleRoomRoleIds: string[];
  perDiemDefaultDollars: string;
  travelTimeLaborRateDollars: string;
  contingencyBudgetPct: number;
};

const defaultFormState: WizardFormState = {
  name: '',
  startDate: '',
  endDate: '',
  currency: 'USD',
  costPerWeek: '',
  crew: '',
  workdays: '',
  workSaturday: false,
  workSunday: false,
  staff: [],
  transport: null,
  jobSiteAddress: '',
  originAddress: '',
  originAirport: '',
  destinationAirport: '',
  groundTransportNote: '',
  hotelQuality: '',
  singleRoomRoleIds: [],
  perDiemDefaultDollars: '',
  travelTimeLaborRateDollars: '',
  contingencyBudgetPct: 10
};

export interface CreateProjectWizardProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateProjectPayload) => Promise<void>;
  submitting: boolean;
  /** When set, wizard is in edit mode: form is prefilled and submit button says "Save changes". */
  initialProject?: Project | null;
  /** Roles from other projects the user can pick to fill title + rates. */
  previousRoles?: PreviousRole[];
}

function useId() {
  const ref = React.useRef(0);
  return () => String(++ref.current);
}

function projectToFormState(p: Project): WizardFormState {
  const staff: WizardFormRole[] = (p.staff || []).map((s) => ({
    id: s.id,
    title: s.title,
    count: 1,
    hourlyRateDollars: (s.hourlyRateCents / 100).toString(),
    perDiemDollars: (s.perDiemCents / 100).toString(),
    hotelRoomSharing: s.hotelRoomSharing
  }));
  const singleRoomRoleIds = (p.staff || []).filter((s) => !s.hotelRoomSharing).map((s) => s.id);
  return {
    name: p.name,
    startDate: p.startDate ? p.startDate.slice(0, 10) : '',
    endDate: p.endDate ? p.endDate.slice(0, 10) : '',
    currency: (p.currency ?? 'USD') as Currency,
    costPerWeek: '',
    crew: p.crew != null ? String(p.crew) : '',
    workdays: p.workdays != null ? String(p.workdays) : '',
    workSaturday: p.workSaturday ?? false,
    workSunday: p.workSunday ?? false,
    staff,
    transport: p.transport ?? null,
    jobSiteAddress: p.jobSiteAddress ?? '',
    originAddress: p.originAddress ?? '',
    originAirport: p.originAirport ?? '',
    destinationAirport: p.destinationAirport ?? '',
    groundTransportNote: '',
    hotelQuality: p.hotelQuality != null ? String(p.hotelQuality) : '',
    singleRoomRoleIds,
    perDiemDefaultDollars: '',
    travelTimeLaborRateDollars: '',
    contingencyBudgetPct: p.contingencyBudgetPct ?? 10
  };
}

export function CreateProjectWizard({
  visible,
  onClose,
  onSubmit,
  submitting,
  initialProject,
  previousRoles = []
}: CreateProjectWizardProps) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<WizardFormState>(defaultFormState);
  const [datePickerOpen, setDatePickerOpen] = useState<'start' | 'end' | null>(null);
  const [rolePickerOpen, setRolePickerOpen] = useState(false);
  const nextId = useId();

  React.useEffect(() => {
    if (!visible) return;
    if (initialProject) {
      setForm(projectToFormState(initialProject));
      setStep(0);
    } else {
      setForm(defaultFormState);
      setStep(0);
    }
  }, [visible, initialProject]);

  const { width: windowWidth } = useWindowDimensions();
  const narrowWizard = windowWidth < 600;

  const isWeb = Platform.OS === 'web';
  const startDateValue = form.startDate.trim() ? new Date(form.startDate.trim() + 'T12:00:00.000Z') : new Date();
  const endDateValue = form.endDate.trim() ? new Date(form.endDate.trim() + 'T12:00:00.000Z') : new Date();

  const handleDateChange = (_event: unknown, selectedDate: Date | undefined) => {
    if (Platform.OS === 'android') setDatePickerOpen(null);
    if (selectedDate && datePickerOpen) {
      const iso = toISODateString(selectedDate);
      setForm((f) => (datePickerOpen === 'start' ? { ...f, startDate: iso } : { ...f, endDate: iso }));
    }
  };

  const reset = () => {
    setStep(0);
    setForm(defaultFormState);
  };

  const goNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const goBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const buildPayload = (): CreateProjectPayload => {
    const staffPayload: Array<{ title: string; hourlyRateCents: number; perDiemCents: number; hotelRoomSharing: boolean }> = [];
    form.staff
      .filter((r) => r.title.trim())
      .forEach((r) => {
        const count = Math.max(1, Math.min(999, r.count || 1));
        const entry = {
          title: r.title.trim(),
          hourlyRateCents: Math.round(parseFloat(r.hourlyRateDollars || '0') * 100),
          perDiemCents: Math.round(parseFloat(r.perDiemDollars || '0') * 100),
          hotelRoomSharing: !form.singleRoomRoleIds.includes(r.id)
        };
        for (let i = 0; i < count; i++) staffPayload.push(entry);
      });
    return {
      name: form.name.trim(),
      status: 'DRAFT',
      startDate: form.startDate.trim() ? form.startDate.trim() + 'T00:00:00.000Z' : undefined,
      endDate: form.endDate.trim() ? form.endDate.trim() + 'T00:00:00.000Z' : undefined,
      currency: form.currency,
      crew: form.crew.trim() ? parseInt(form.crew, 10) : undefined,
      workdays: form.workdays.trim() ? parseInt(form.workdays, 10) : undefined,
      workSaturday: form.workSaturday,
      workSunday: form.workSunday,
      transport: form.transport ?? undefined,
      jobSiteAddress: form.jobSiteAddress.trim() || undefined,
      originAddress: form.originAddress.trim() || undefined,
      originAirport: form.originAirport.trim() || undefined,
      destinationAirport: form.destinationAirport.trim() || undefined,
      hotelQuality: form.hotelQuality ? parseInt(form.hotelQuality, 10) : undefined,
      contingencyBudgetPct: form.contingencyBudgetPct,
      staff: staffPayload.length ? staffPayload : undefined
    };
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      Alert.alert('Validation', 'Project name is required.');
      return;
    }
    try {
      await onSubmit(buildPayload());
      // Parent closes the modal and returns to dashboard; do not call reset/onClose here
      // to avoid state updates after unmount.
    } catch (_e) {
      // caller shows error
    }
  };

  const addRole = () => {
    setForm((f) => ({
      ...f,
      staff: [
        ...f.staff,
        {
          id: nextId(),
          title: '',
          count: 1,
          hourlyRateDollars: '',
          perDiemDollars: '',
          hotelRoomSharing: true
        }
      ]
    }));
  };

  const addRoleFromPrevious = (prev: PreviousRole) => {
    setForm((f) => ({
      ...f,
      staff: [
        ...f.staff,
        {
          id: nextId(),
          title: prev.title,
          count: 1,
          hourlyRateDollars: (prev.hourlyRateCents / 100).toFixed(2),
          perDiemDollars: (prev.perDiemCents / 100).toFixed(2),
          hotelRoomSharing: prev.hotelRoomSharing
        }
      ]
    }));
  };

  const updateRole = (id: string, patch: Partial<WizardFormRole>) => {
    setForm((f) => ({
      ...f,
      staff: f.staff.map((r) => (r.id === id ? { ...r, ...patch } : r))
    }));
  };

  const removeRole = (id: string) => {
    setForm((f) => ({
      ...f,
      staff: f.staff.filter((r) => r.id !== id),
      singleRoomRoleIds: f.singleRoomRoleIds.filter((x) => x !== id)
    }));
  };

  const toggleSingleRoom = (roleId: string) => {
    setForm((f) => ({
      ...f,
      singleRoomRoleIds: f.singleRoomRoleIds.includes(roleId)
        ? f.singleRoomRoleIds.filter((x) => x !== roleId)
        : [...f.singleRoomRoleIds, roleId]
    }));
  };

  if (!visible) return null;

  const completedCount = step;
  const progressPct = (step / 5) * 100;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <View style={[styles.modalBox, narrowWizard && styles.modalBoxNarrow]}>
        {/* Left Panel - Steps (collapsed on narrow to just progress + X/5) */}
        <View style={[styles.leftPanel, narrowWizard && styles.leftPanelNarrow]}>
          {!narrowWizard && <Text style={styles.wizardTitle}>Project Setup Wizard</Text>}
          <View style={[styles.stepperWrap, narrowWizard && styles.stepperWrapNarrow]}>
            <View style={styles.stepperBg} />
            <View style={[styles.stepperFill, { width: `${progressPct}%` }]} />
          </View>
          <Text style={[styles.stepperText, narrowWizard && styles.stepperTextNarrow]}>{completedCount}/5 completed</Text>
          {!narrowWizard && (
            <View style={styles.stepList}>
              {STEP_LABELS.map((label, i) => (
                <View key={i} style={styles.stepRow}>
                  <View
                    style={[
                      styles.stepCircle,
                      { backgroundColor: i <= step ? '#1BC685' : '#E5E7EB' }
                    ]}
                  >
                    {i <= step ? (
                      <Feather name="check" size={14} color="#FFFFFF" />
                    ) : (
                      <View style={styles.stepCircleInner} />
                    )}
                  </View>
                  <Text style={[styles.stepLabel, i === step && styles.stepLabelActive]}>{label}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Right Panel - Form */}
        <View style={styles.rightPanel}>
          <View style={styles.formHeader}>
            <View style={styles.formHeaderTextWrap}>
              <Text style={styles.formTitle}>{WIZARD_STEPS[step].title}</Text>
              <Text style={styles.formSubtitle}>{WIZARD_STEPS[step].subtitle}</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                reset();
                onClose();
              }}
              style={styles.closeBtn}
              hitSlop={8}
            >
              <Feather name="x" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formScroll} contentContainerStyle={styles.formScrollContent} keyboardShouldPersistTaps="handled">
            {/* Step 0: Project Information */}
            {step === 0 && (
              <View style={styles.formBlock}>
                <Text style={styles.fieldLabel}>Project Name *</Text>
                <TextInput
                  style={styles.input}
                  value={form.name}
                  onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                  placeholder="e.g. Austin Data Center Expansion"
                  placeholderTextColor="#94A3B8"
                />
                <View style={styles.dateRow}>
                  <View style={styles.dateHalf}>
                    <Text style={styles.fieldLabel}>Start Date *</Text>
                    {isWeb ? (
                      <WebDateInput
                        value={form.startDate}
                        onChange={(v) => setForm((f) => ({ ...f, startDate: v }))}
                        placeholder="Select start date"
                        style={[styles.input, styles.webDateInput]}
                      />
                    ) : (
                      <TouchableOpacity
                        style={[styles.input, styles.dateTouchable]}
                        onPress={() => setDatePickerOpen('start')}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.dateTouchText, !form.startDate && styles.dateTouchPlaceholder]}>
                          {form.startDate ? formatDateForDisplay(form.startDate) : 'Select start date'}
                        </Text>
                        <Feather name="calendar" size={18} color="#6B7280" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={styles.dateHalf}>
                    <Text style={styles.fieldLabel}>End Date *</Text>
                    {isWeb ? (
                      <WebDateInput
                        value={form.endDate}
                        onChange={(v) => setForm((f) => ({ ...f, endDate: v }))}
                        placeholder="Select end date"
                        style={[styles.input, styles.webDateInput]}
                      />
                    ) : (
                      <TouchableOpacity
                        style={[styles.input, styles.dateTouchable]}
                        onPress={() => setDatePickerOpen('end')}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.dateTouchText, !form.endDate && styles.dateTouchPlaceholder]}>
                          {form.endDate ? formatDateForDisplay(form.endDate) : 'Select end date'}
                        </Text>
                        <Feather name="calendar" size={18} color="#6B7280" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                {!isWeb && datePickerOpen !== null && (
                  Platform.OS === 'ios' ? (
                    <RNModal transparent animationType="slide" visible>
                      <TouchableOpacity
                        style={styles.datePickerOverlay}
                        activeOpacity={1}
                        onPress={() => setDatePickerOpen(null)}
                      />
                      <View style={styles.datePickerModal}>
                        <View style={styles.datePickerHeader}>
                          <TouchableOpacity onPress={() => setDatePickerOpen(null)}>
                            <Text style={styles.datePickerDone}>Done</Text>
                          </TouchableOpacity>
                        </View>
                        <DateTimePicker
                          value={datePickerOpen === 'start' ? startDateValue : endDateValue}
                          mode="date"
                          display="spinner"
                          onChange={handleDateChange}
                        />
                      </View>
                    </RNModal>
                  ) : (
                    <DateTimePicker
                      value={datePickerOpen === 'start' ? startDateValue : endDateValue}
                      mode="date"
                      display="default"
                      onChange={handleDateChange}
                    />
                  )
                )}
                <Text style={styles.fieldLabel}>Currency</Text>
                <View style={styles.tabs}>
                  {(['USD', 'EURO', 'GBP'] as const).map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.tab, form.currency === c && styles.tabActive]}
                      onPress={() => setForm((f) => ({ ...f, currency: c }))}
                    >
                      <Text style={[styles.tabText, form.currency === c && styles.tabTextActive]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.fieldLabel}>Cost / Week</Text>
                <TextInput
                  style={[styles.input, styles.inputDisabled]}
                  editable={false}
                  placeholder="—"
                  placeholderTextColor="#C2C2C2"
                />
                <Text style={styles.helperText}>Disabled for premium users — precise costs now available.</Text>
              </View>
            )}

            {/* Step 1: Manpower & Scheduling */}
            {step === 1 && (
              <View style={styles.formBlock}>
                <Text style={styles.fieldLabel}>Crew size</Text>
                <TextInput
                  style={styles.input}
                  value={form.crew}
                  onChangeText={(v) => setForm((f) => ({ ...f, crew: v }))}
                  placeholder="12"
                  placeholderTextColor="#94A3B8"
                  keyboardType="number-pad"
                />
                <Text style={styles.fieldLabel}>Workdays</Text>
                <TextInput
                  style={styles.input}
                  value={form.workdays}
                  onChangeText={(v) => setForm((f) => ({ ...f, workdays: v }))}
                  placeholder="54"
                  placeholderTextColor="#94A3B8"
                  keyboardType="number-pad"
                />
                <View style={styles.toggleRow}>
                  <TouchableOpacity
                    style={[styles.tab, form.workSaturday && styles.tabActive]}
                    onPress={() => setForm((f) => ({ ...f, workSaturday: !f.workSaturday }))}
                  >
                    <Text style={[styles.tabText, form.workSaturday && styles.tabTextActive]}>Work Saturday</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.tab, form.workSunday && styles.tabActive]}
                    onPress={() => setForm((f) => ({ ...f, workSunday: !f.workSunday }))}
                  >
                    <Text style={[styles.tabText, form.workSunday && styles.tabTextActive]}>Work Sunday</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.fieldLabel}>Staff roles</Text>
                {form.staff.map((r) => (
                  <View key={r.id} style={styles.roleRow}>
                    <TextInput
                      style={[styles.input, styles.roleTitle]}
                      value={r.title}
                      onChangeText={(v) => updateRole(r.id, { title: v })}
                      placeholder="Role title"
                      placeholderTextColor="#94A3B8"
                    />
                    <View style={styles.roleCountWrap}>
                      <Text style={styles.roleCountLabel}>#</Text>
                      <TextInput
                        style={[styles.input, styles.roleCount]}
                        value={String(r.count ?? 1)}
                        onChangeText={(v) => {
                          const n = parseInt(v, 10);
                          updateRole(r.id, { count: v === '' ? 1 : isNaN(n) || n < 1 ? 1 : Math.min(999, n) });
                        }}
                        placeholder="1"
                        placeholderTextColor="#94A3B8"
                        keyboardType="number-pad"
                      />
                    </View>
                    <TextInput
                      style={[styles.input, styles.roleNum]}
                      value={r.hourlyRateDollars}
                      onChangeText={(v) => updateRole(r.id, { hourlyRateDollars: v })}
                      placeholder="$/hr"
                      placeholderTextColor="#94A3B8"
                      keyboardType="decimal-pad"
                    />
                    <TextInput
                      style={[styles.input, styles.roleNum]}
                      value={r.perDiemDollars}
                      onChangeText={(v) => updateRole(r.id, { perDiemDollars: v })}
                      placeholder="Per diem $"
                      placeholderTextColor="#94A3B8"
                      keyboardType="decimal-pad"
                    />
                    <TouchableOpacity onPress={() => removeRole(r.id)} style={styles.roleRemove}>
                      <Feather name="x" size={18} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                ))}
                {rolePickerOpen && (
                  <RNModal visible transparent animationType="fade">
                    <TouchableOpacity
                      style={styles.rolePickerOverlay}
                      activeOpacity={1}
                      onPress={() => setRolePickerOpen(false)}
                    />
                    <View style={styles.rolePickerModal}>
                      <Text style={styles.rolePickerTitle}>Choose from previous roles</Text>
                      <ScrollView style={styles.rolePickerList}>
                        {previousRoles.length === 0 ? (
                          <Text style={styles.rolePickerEmpty}>No previous roles yet. Create roles and they’ll appear here.</Text>
                        ) : (
                          previousRoles.map((prev, idx) => (
                            <TouchableOpacity
                              key={`${prev.title}-${idx}`}
                              style={styles.rolePickerOption}
                              onPress={() => {
                                addRoleFromPrevious(prev);
                                setRolePickerOpen(false);
                              }}
                            >
                              <Text style={styles.rolePickerOptionText}>{prev.title}</Text>
                              <Text style={styles.rolePickerOptionSub}>
                                ${(prev.hourlyRateCents / 100).toFixed(0)}/hr · ${(prev.perDiemCents / 100).toFixed(0)} per diem
                              </Text>
                            </TouchableOpacity>
                          ))
                        )}
                      </ScrollView>
                      <TouchableOpacity style={styles.rolePickerCancel} onPress={() => setRolePickerOpen(false)}>
                        <Text style={styles.rolePickerCancelText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </RNModal>
                )}
                <View style={styles.addRoleRow}>
                  <TouchableOpacity style={styles.addRoleBtn} onPress={addRole}>
                    <Feather name="plus" size={16} color="#F67A34" />
                    <Text style={styles.addRoleText}>Add new role</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.addRoleBtn} onPress={() => setRolePickerOpen(true)}>
                    <Feather name="plus" size={16} color="#F67A34" />
                    <Text style={styles.addRoleText}>Add existing role</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Step 2: Travel & Transport */}
            {step === 2 && (
              <View style={styles.formBlock}>
                <Text style={styles.fieldLabel}>Transport</Text>
                <View style={styles.tabs}>
                  <TouchableOpacity
                    style={[styles.tab, form.transport === 'FLY' && styles.tabActive]}
                    onPress={() => setForm((f) => ({ ...f, transport: 'FLY' }))}
                  >
                    <Feather name="send" size={14} color={form.transport === 'FLY' ? '#F67A34' : '#6B7280'} />
                    <Text style={[styles.tabText, form.transport === 'FLY' && styles.tabTextActive]}>Fly</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.tab, form.transport === 'DRIVE' && styles.tabActive]}
                    onPress={() => setForm((f) => ({ ...f, transport: 'DRIVE' }))}
                  >
                    <Feather name="truck" size={14} color={form.transport === 'DRIVE' ? '#F67A34' : '#6B7280'} />
                    <Text style={[styles.tabText, form.transport === 'DRIVE' && styles.tabTextActive]}>Drive</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.tab, form.transport === 'TRAIN' && styles.tabActive]}
                    onPress={() => setForm((f) => ({ ...f, transport: 'TRAIN' }))}
                  >
                    <Text style={[styles.tabText, form.transport === 'TRAIN' && styles.tabTextActive]}>Train</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.fieldLabel}>Job site Address *</Text>
                <TextInput
                  style={styles.input}
                  value={form.jobSiteAddress}
                  onChangeText={(v) => setForm((f) => ({ ...f, jobSiteAddress: v }))}
                  placeholder="Address"
                  placeholderTextColor="#94A3B8"
                />
                <Text style={styles.helperText}>Used for calculating travel and lodging costs</Text>
                <Text style={styles.fieldLabel}>Origin Address *</Text>
                <TextInput
                  style={styles.input}
                  value={form.originAddress}
                  onChangeText={(v) => setForm((f) => ({ ...f, originAddress: v }))}
                  placeholder="Address"
                  placeholderTextColor="#94A3B8"
                />
                {form.transport === 'FLY' && (
                  <>
                    <Text style={styles.fieldLabel}>Origin airport</Text>
                    <TextInput
                      style={styles.input}
                      value={form.originAirport}
                      onChangeText={(v) => setForm((f) => ({ ...f, originAirport: v }))}
                      placeholder="e.g. AUS"
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="characters"
                    />
                    <Text style={styles.fieldLabel}>Destination airport</Text>
                    <TextInput
                      style={styles.input}
                      value={form.destinationAirport}
                      onChangeText={(v) => setForm((f) => ({ ...f, destinationAirport: v }))}
                      placeholder="e.g. DFW"
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="characters"
                    />
                  </>
                )}
                {form.transport === 'DRIVE' && (
                  <>
                    <Text style={styles.fieldLabel}>Ground Transport</Text>
                    <TextInput
                      style={styles.input}
                      value={form.groundTransportNote}
                      onChangeText={(v) => setForm((f) => ({ ...f, groundTransportNote: v }))}
                      placeholder="Notes"
                      placeholderTextColor="#94A3B8"
                    />
                  </>
                )}
              </View>
            )}

            {/* Step 3: Lodging */}
            {step === 3 && (
              <View style={styles.formBlock}>
                <Text style={styles.fieldLabel}>Hotel Quality</Text>
                <View style={styles.tabs}>
                  {[2, 3, 4, 5].map((n) => (
                    <TouchableOpacity
                      key={n}
                      style={[styles.tab, form.hotelQuality === String(n) && styles.tabActive]}
                      onPress={() => setForm((f) => ({ ...f, hotelQuality: String(n) }))}
                    >
                      <Text style={[styles.tabText, form.hotelQuality === String(n) && styles.tabTextActive]}>{n}*</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.fieldLabel}>Single Rooms by Role</Text>
                <Text style={styles.helperText}>Roles that get their own room (not sharing)</Text>
                <View style={styles.chipWrap}>
                  {form.staff.filter((r) => r.title.trim()).map((r) => (
                    <TouchableOpacity
                      key={r.id}
                      style={[styles.chip, form.singleRoomRoleIds.includes(r.id) && styles.chipActive]}
                      onPress={() => toggleSingleRoom(r.id)}
                    >
                      <Text style={styles.chipText}>{r.title}</Text>
                      <Feather name="x" size={14} color="#484566" />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Step 4: Per Diem & Risk */}
            {step === 4 && (
              <View style={styles.formBlock}>
                <Text style={styles.fieldLabel}>Per Diem Amount (default $)</Text>
                <Text style={styles.helperText}>(Your company daily rate for food and incidentals)</Text>
                <TextInput
                  style={styles.input}
                  value={form.perDiemDefaultDollars}
                  onChangeText={(v) => setForm((f) => ({ ...f, perDiemDefaultDollars: v }))}
                  placeholder="0"
                  placeholderTextColor="#94A3B8"
                  keyboardType="decimal-pad"
                />
                <Text style={styles.fieldLabel}>Travel Time Labor Rate ($/hr)</Text>
                <TextInput
                  style={styles.input}
                  value={form.travelTimeLaborRateDollars}
                  onChangeText={(v) => setForm((f) => ({ ...f, travelTimeLaborRateDollars: v }))}
                  placeholder="0"
                  placeholderTextColor="#94A3B8"
                  keyboardType="decimal-pad"
                />
                <Text style={styles.fieldLabel}>Travel Contingency Buffer</Text>
                <View style={styles.sliderRow}>
                  <Text style={styles.contingencyValue}>{form.contingencyBudgetPct}%</Text>
                </View>
                <View style={styles.sliderWrap}>
                  <View style={styles.sliderBg} />
                  <View style={[styles.sliderFill, { width: `${form.contingencyBudgetPct}%` }]} />
                  <TouchableOpacity
                    style={[styles.sliderThumb, { left: `${form.contingencyBudgetPct}%` }]}
                    onPress={() => {}}
                  />
                </View>
                <Text style={styles.helperText}>Adds a buffer to protect against cost uncertainty</Text>
                <View style={styles.contingencyButtons}>
                  {[5, 10, 15, 20].map((pct) => (
                    <TouchableOpacity
                      key={pct}
                      style={[styles.tab, form.contingencyBudgetPct === pct && styles.tabActive]}
                      onPress={() => setForm((f) => ({ ...f, contingencyBudgetPct: pct }))}
                    >
                      <Text style={[styles.tabText, form.contingencyBudgetPct === pct && styles.tabTextActive]}>{pct}%</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.formFooter}>
            {step > 0 ? (
              <TouchableOpacity style={styles.backBtn} onPress={goBack}>
                <Feather name="chevron-left" size={18} color="#6B7280" />
                <Text style={styles.backBtnText}>Back</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.backBtn} />
            )}
            {step < 4 ? (
              <TouchableOpacity style={styles.continueBtn} onPress={goNext}>
                <Text style={styles.continueBtnText}>Continue</Text>
                <Feather name="chevron-right" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.continueBtn, submitting && styles.continueBtnDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.continueBtnText}>{initialProject ? 'Save changes' : 'Create Project'}</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  modalBox: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 896,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 25 },
    shadowOpacity: 0.25,
    shadowRadius: 50,
    elevation: 12
  },
  modalBoxNarrow: {
    flexDirection: 'column',
    maxHeight: '95%'
  },
  leftPanel: {
    width: 256,
    backgroundColor: '#F3F4F6',
    padding: 24,
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24
  },
  leftPanelNarrow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0
  },
  wizardTitle: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '600',
    fontSize: 18,
    lineHeight: 28,
    color: '#1D2131',
    marginBottom: 16
  },
  stepperWrap: {
    height: 5,
    borderRadius: 100,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    marginBottom: 6
  },
  stepperWrapNarrow: {
    flex: 1,
    marginBottom: 0
  },
  stepperBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF'
  },
  stepperFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#1BC685',
    borderRadius: 100
  },
  stepperText: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontSize: 14,
    lineHeight: 20,
    color: '#484566',
    marginBottom: 16
  },
  stepperTextNarrow: {
    marginBottom: 0
  },
  stepList: {
    gap: 16
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center'
  },
  stepCircleInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF'
  },
  stepLabel: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '500',
    fontSize: 14,
    lineHeight: 20,
    color: '#484566',
    flex: 1
  },
  stepLabelActive: {
    color: '#1D2131'
  },
  rightPanel: {
    flex: 1,
    minWidth: 0,
    maxWidth: 640
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16
  },
  formHeaderTextWrap: {
    flex: 1
  },
  formTitle: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '600',
    fontSize: 20,
    lineHeight: 28,
    color: '#1D2131',
    marginBottom: 4
  },
  formSubtitle: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontSize: 14,
    lineHeight: 20,
    color: '#484566'
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  formScroll: {
    flex: 1,
    maxHeight: 434
  },
  formScrollContent: {
    padding: 24,
    paddingBottom: 16
  },
  formBlock: {
    gap: 20
  },
  fieldLabel: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '500',
    fontSize: 14,
    lineHeight: 20,
    color: '#1D2131',
    marginBottom: 6
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 15,
    paddingVertical: 15,
    paddingHorizontal: 15,
    fontSize: 14,
    color: '#1D2131',
    backgroundColor: '#FFFFFF'
  },
  inputDisabled: {
    backgroundColor: '#F3F4F6',
    color: '#C2C2C2'
  },
  helperText: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontSize: 12,
    lineHeight: 16,
    color: '#6B7280',
    marginTop: -4
  },
  webDateInput: {
    cursor: Platform.OS === 'web' ? 'pointer' : undefined
  },
  dateRow: {
    flexDirection: 'row',
    gap: 16
  },
  dateHalf: {
    flex: 1,
    minWidth: 0
  },
  dateTouchable: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  dateTouchText: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontSize: 14,
    lineHeight: 20,
    color: '#1D2131'
  },
  dateTouchPlaceholder: {
    color: '#94A3B8'
  },
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)'
  },
  datePickerModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  datePickerDone: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '600',
    fontSize: 16,
    color: '#F67A34'
  },
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 6,
    borderRadius: 15,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent'
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2
  },
  tabText: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '500',
    fontSize: 14,
    color: '#6B7280'
  },
  tabTextActive: {
    color: '#1D2131'
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  roleTitle: {
    flex: 2
  },
  roleCountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 56
  },
  roleCountLabel: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontSize: 12,
    color: '#6B7280',
    marginRight: 4
  },
  roleCount: {
    flex: 1,
    minWidth: 40
  },
  roleNum: {
    width: 80
  },
  roleRemove: {
    padding: 8
  },
  rolePickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)'
  },
  rolePickerModal: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 0,
    maxHeight: '70%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24
  },
  rolePickerTitle: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '600',
    fontSize: 16,
    color: '#1D2131',
    marginBottom: 12
  },
  rolePickerList: {
    maxHeight: 280
  },
  rolePickerOption: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  rolePickerOptionText: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontSize: 16,
    color: '#1D2131'
  },
  rolePickerOptionSub: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2
  },
  rolePickerEmpty: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontSize: 14,
    color: '#6B7280',
    padding: 16
  },
  rolePickerCancel: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center'
  },
  rolePickerCancelText: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontSize: 16,
    color: '#6B7280'
  },
  addRoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap'
  },
  addRoleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16
  },
  addRoleText: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '500',
    fontSize: 14,
    color: '#F67A34'
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 10
  },
  chipActive: {
    backgroundColor: 'rgba(246, 122, 52, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(246, 122, 52, 0.3)'
  },
  chipText: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '500',
    fontSize: 12,
    lineHeight: 20,
    color: '#484566'
  },
  sliderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  contingencyValue: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '600',
    fontSize: 14,
    color: '#F67A34'
  },
  sliderWrap: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F3F4F6',
    marginBottom: 4,
    position: 'relative',
    overflow: 'visible'
  },
  sliderBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F3F4F6',
    borderRadius: 3
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#F67A34',
    borderRadius: 3,
    opacity: 0.5
  },
  sliderThumb: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#F67A34',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    marginLeft: -9,
    top: -6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3
  },
  contingencyButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8
  },
  formFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB'
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8
  },
  backBtnText: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '600',
    fontSize: 16,
    color: '#6B7280'
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 24,
    gap: 8,
    minHeight: 50,
    backgroundColor: '#F67A34',
    borderRadius: 15
  },
  continueBtnDisabled: {
    opacity: 0.7
  },
  continueBtnText: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 20,
    color: '#FFFFFF'
  }
});
