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
import type { CreateProjectPayload, Currency, Transport, Project, ProjectRoleRef } from '../services/projectsApi';
import { buildCostBreakdown } from '../utils/costBreakdown';
import { getRoleTypes, createRoleType, type RoleType } from '../services/roleTypesApi';

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

/** Today's date as YYYY-MM-DD in local date (start of day). */
function getTodayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseDateOnly(dateStr: string): Date | null {
  const s = dateStr.trim();
  if (!s) return null;
  const d = new Date(s + 'T12:00:00.000Z');
  return isNaN(d.getTime()) ? null : d;
}

/** Count working days in [start, end] inclusive (UTC date). Weekdays (Mon–Fri) always count; Sat/Sun count if flags set. */
function getWorkingDaysInRange(
  startStr: string,
  endStr: string,
  workSaturday: boolean,
  workSunday: boolean
): number {
  const start = new Date(startStr.trim() + 'T12:00:00.000Z');
  const end = new Date(endStr.trim() + 'T12:00:00.000Z');
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0;
  let count = 0;
  const cur = new Date(start.getTime());
  const endTime = end.getTime();
  while (cur.getTime() <= endTime) {
    const d = cur.getUTCDay(); // 0 Sun .. 6 Sat
    const isWeekday = d >= 1 && d <= 5;
    const isSat = d === 6;
    const isSun = d === 0;
    if (isWeekday || (workSaturday && isSat) || (workSunday && isSun)) count += 1;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return count;
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

export type WizardFormRoleEntry = {
  id: string;
  roleTypeId: string;
  count: number;
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
  roleEntries: WizardFormRoleEntry[];
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
  roleEntries: [],
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
  token: string;
  visible: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateProjectPayload) => Promise<void>;
  submitting: boolean;
  /** When set, wizard is in edit mode: form is prefilled and submit button says "Save changes". */
  initialProject?: Project | null;
  /** Roles from other projects the user can pick to fill title + rates. (Legacy; role types are used when available.) */
  previousRoles?: PreviousRole[];
}

function useId() {
  const ref = React.useRef(0);
  return () => String(++ref.current);
}

function projectToFormState(p: Project, nextId: () => string): WizardFormState {
  const staff: WizardFormRole[] = (p.staff || []).map((s) => ({
    id: s.id,
    title: s.title,
    count: 1,
    hourlyRateDollars: (s.hourlyRateCents / 100).toString(),
    perDiemDollars: (s.perDiemCents / 100).toString(),
    hotelRoomSharing: s.hotelRoomSharing
  }));
  const singleRoomRoleIds = (p.staff || []).filter((s) => !s.hotelRoomSharing).map((s) => s.id);
  const roleEntries: WizardFormRoleEntry[] = (p.roles || []).map((r) => ({
    id: nextId(),
    roleTypeId: r.roleTypeId,
    count: r.count
  }));
  const startDate = p.startDate ? p.startDate.slice(0, 10) : '';
  const endDate = p.endDate ? p.endDate.slice(0, 10) : '';
  const workSaturday = p.workSaturday ?? false;
  const workSunday = p.workSunday ?? false;
  const crewFromRoles = roleEntries.reduce((s, e) => s + e.count, 0);
  const crew = crewFromRoles > 0 ? crewFromRoles : (p.crew ?? 0);
  const workingDaysInRange =
    startDate && endDate ? getWorkingDaysInRange(startDate, endDate, workSaturday, workSunday) : 0;
  const workdays =
    workingDaysInRange > 0 && crew > 0 ? String(crew * workingDaysInRange) : '';
  return {
    name: p.name,
    startDate,
    endDate,
    currency: (p.currency ?? 'USD') as Currency,
    costPerWeek: '',
    crew: crew > 0 ? String(crew) : '',
    workdays,
    workSaturday,
    workSunday,
    staff,
    roleEntries,
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
  token,
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
  const [rolePickerOpen, setRolePickerOpen] = useState<string | false>(false);
  const [roleTypes, setRoleTypes] = useState<RoleType[]>([]);
  const [createRoleModalOpen, setCreateRoleModalOpen] = useState(false);
  const [createRoleForm, setCreateRoleForm] = useState({
    name: '',
    hourlyRateDollars: '',
    perDiemDollars: '',
    hotelSoloRoom: false
  });
  const [createRoleSaving, setCreateRoleSaving] = useState(false);
  const nextId = useId();

  React.useEffect(() => {
    if (!visible || !token) return;
    getRoleTypes(token)
      .then(setRoleTypes)
      .catch(() => setRoleTypes([]));
  }, [visible, token]);

  React.useEffect(() => {
    if (!visible) return;
    if (initialProject) {
      setForm(projectToFormState(initialProject, nextId));
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

  const totalStaffCount = form.roleEntries.reduce((s, r) => s + (r.count ?? 1), 0);
  const crewNum = form.crew.trim() ? parseInt(form.crew, 10) : 0;
  const workingDaysInRange =
    form.startDate.trim() && form.endDate.trim()
      ? getWorkingDaysInRange(form.startDate, form.endDate, form.workSaturday, form.workSunday)
      : null;
  /** Workdays = person-days (crew × working calendar days in range). */
  const expectedWorkdays = workingDaysInRange != null && crewNum > 0 ? crewNum * workingDaysInRange : null;
  const workdaysNumForValidation = form.workdays.trim() ? parseInt(form.workdays, 10) : null;

  const validateStep1 = (): string | null => {
    const invalidEntry = form.roleEntries.find((e) => !e.roleTypeId || e.count < 1);
    if (invalidEntry) {
      return 'Each row must have a role type selected and count at least 1.';
    }
    if (form.roleEntries.length === 0) {
      return 'Add at least one role (with a role type and count).';
    }
    if (totalStaffCount !== crewNum) {
      return `Total people in roles (${totalStaffCount}) must equal crew size (${crewNum}). Adjust the # for each role or the crew size.`;
    }
    if (expectedWorkdays != null && workdaysNumForValidation !== expectedWorkdays) {
      return `With the dates selected and the crew size of ${crewNum}, the number of workdays is ${expectedWorkdays}.`;
    }
    return null;
  };

  // Keep workdays in sync with person-days (crew × working days in range)
  useEffect(() => {
    if (expectedWorkdays == null) return;
    setForm((f) => {
      const current = f.workdays.trim() ? parseInt(f.workdays, 10) : null;
      if (current === expectedWorkdays) return f;
      return { ...f, workdays: String(expectedWorkdays) };
    });
  }, [expectedWorkdays]);

  // Enforce Fly or Drive on Travel step: default to Fly when entering step 2 with no/invalid transport
  useEffect(() => {
    if (step !== 2) return;
    setForm((f) => {
      if (f.transport === 'FLY' || f.transport === 'DRIVE') return f;
      return { ...f, transport: 'FLY' as const };
    });
  }, [step]);

  const validateStep2 = (): string | null => {
    if (form.transport !== 'FLY' && form.transport !== 'DRIVE') {
      return 'Please choose Fly or Drive for travel.';
    }
    return null;
  };

  const validateStep0 = (): string | null => {
    const startStr = form.startDate.trim().slice(0, 10);
    const endStr = form.endDate.trim().slice(0, 10);
    if (!startStr || !endStr) {
      return 'Please select both start and end date.';
    }
    const startDate = parseDateOnly(startStr);
    const endDate = parseDateOnly(endStr);
    if (!startDate || !endDate) {
      return 'Please enter valid start and end dates.';
    }
    const today = getTodayDateString();
    if (startStr < today) {
      return 'Start date cannot be in the past.';
    }
    if (endStr < today) {
      return 'End date cannot be in the past.';
    }
    if (startDate.getTime() > endDate.getTime()) {
      return 'End date must be on or after start date.';
    }
    return null;
  };

  const goNext = () => {
    if (step === 0) {
      const err = validateStep0();
      if (err) {
        Alert.alert('Project Information', err);
        return;
      }
    }
    if (step === 1) {
      const err = validateStep1();
      if (err) {
        Alert.alert('Manpower & Scheduling', err);
        return;
      }
    }
    if (step === 2) {
      const err = validateStep2();
      if (err) {
        Alert.alert('Travel & Transport', err);
        return;
      }
    }
    if (step < 4) setStep(step + 1);
  };

  const goBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const buildPayload = (): CreateProjectPayload => {
    const roleTypeMap = new Map(roleTypes.map((rt) => [rt.id, rt]));
    const staffPayload: Array<{ title: string; hourlyRateCents: number; perDiemCents: number; hotelRoomSharing: boolean }> = [];
    form.roleEntries
      .filter((e) => e.roleTypeId && e.count >= 1)
      .forEach((e) => {
        const rt = roleTypeMap.get(e.roleTypeId);
        if (!rt) return;
        const count = Math.max(1, Math.min(999, e.count));
        const entry = {
          title: rt.name,
          hourlyRateCents: rt.hourlyRateCents,
          perDiemCents: rt.perDiemCents,
          hotelRoomSharing: !rt.hotelSoloRoom
        };
        for (let i = 0; i < count; i++) staffPayload.push(entry);
      });
    const rolesPayload: ProjectRoleRef[] = form.roleEntries
      .filter((e) => e.roleTypeId && e.count >= 1)
      .map((e) => ({ roleTypeId: e.roleTypeId, count: e.count }));
    const workdaysPersonDays = form.workdays.trim() ? parseInt(form.workdays, 10) : 1;
    const calendarWorkingDays =
      form.startDate.trim() && form.endDate.trim()
        ? getWorkingDaysInRange(form.startDate, form.endDate, form.workSaturday, form.workSunday)
        : 1;
    const hotelQualityNum = form.hotelQuality ? parseInt(form.hotelQuality, 10) : undefined;
    const costBreakdown = buildCostBreakdown({
      staff: staffPayload.length ? staffPayload : [],
      workdays: calendarWorkingDays,
      hotelQuality: hotelQualityNum,
      contingencyBudgetPct: form.contingencyBudgetPct,
      transport: form.transport ?? undefined
    });
    return {
      name: form.name.trim(),
      status: 'DRAFT',
      startDate: form.startDate.trim() ? form.startDate.trim() + 'T00:00:00.000Z' : undefined,
      endDate: form.endDate.trim() ? form.endDate.trim() + 'T00:00:00.000Z' : undefined,
      currency: form.currency,
      crew: form.crew.trim() ? parseInt(form.crew, 10) : undefined,
      workdays: workdaysPersonDays,
      workSaturday: form.workSaturday,
      workSunday: form.workSunday,
      transport: form.transport ?? undefined,
      jobSiteAddress: form.jobSiteAddress.trim() || undefined,
      ...(form.transport === 'DRIVE' && { originAddress: form.originAddress.trim() || undefined }),
      ...(form.transport === 'FLY' && {
        originAirport: form.originAirport.trim() || undefined,
        destinationAirport: form.destinationAirport.trim() || undefined
      }),
      hotelQuality: hotelQualityNum,
      contingencyBudgetPct: form.contingencyBudgetPct,
      roles: rolesPayload.length ? rolesPayload : undefined,
      costBreakdown
    };
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      Alert.alert('Validation', 'Project name is required.');
      return;
    }
    const step0Err = validateStep0();
    if (step0Err) {
      Alert.alert('Project Information', step0Err);
      return;
    }
    const step1Err = validateStep1();
    if (step1Err) {
      Alert.alert('Manpower & Scheduling', step1Err);
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

  const addRoleEntry = () => {
    setForm((f) => {
      const newEntries = [...f.roleEntries, { id: nextId(), roleTypeId: '', count: 1 }];
      const total = newEntries.reduce((s, e) => s + (e.count ?? 1), 0);
      return { ...f, roleEntries: newEntries, crew: String(total) };
    });
  };

  const updateRoleEntry = (id: string, patch: Partial<WizardFormRoleEntry>) => {
    setForm((f) => {
      const newEntries = f.roleEntries.map((e) => (e.id === id ? { ...e, ...patch } : e));
      const total = newEntries.reduce((s, e) => s + (e.count ?? 1), 0);
      return { ...f, roleEntries: newEntries, crew: String(total) };
    });
  };

  const removeRoleEntry = (id: string) => {
    setForm((f) => {
      const newEntries = f.roleEntries.filter((e) => e.id !== id);
      const total = newEntries.reduce((s, e) => s + (e.count ?? 1), 0);
      return { ...f, roleEntries: newEntries, crew: String(total) };
    });
  };

  const openCreateRole = () => {
    setCreateRoleForm({ name: '', hourlyRateDollars: '', perDiemDollars: '', hotelSoloRoom: false });
    setCreateRoleModalOpen(true);
  };

  const closeCreateRole = () => {
    setCreateRoleModalOpen(false);
  };

  const handleCreateRoleSave = async () => {
    const name = createRoleForm.name.trim();
    if (!name) {
      Alert.alert('Validation', 'Role name is required.');
      return;
    }
    const hourlyRateCents = Math.round(parseFloat(createRoleForm.hourlyRateDollars || '0') * 100);
    const perDiemCents = Math.round(parseFloat(createRoleForm.perDiemDollars || '0') * 100);
    if (hourlyRateCents < 0 || perDiemCents < 0) {
      Alert.alert('Validation', 'Rates must be 0 or greater.');
      return;
    }
    setCreateRoleSaving(true);
    try {
      const newRole = await createRoleType(token, {
        name,
        hourlyRateCents,
        perDiemCents,
        hotelSoloRoom: createRoleForm.hotelSoloRoom
      });
      const list = await getRoleTypes(token);
      setRoleTypes(list);
      if (typeof rolePickerOpen === 'string') {
        updateRoleEntry(rolePickerOpen, { roleTypeId: newRole.id });
      }
      closeCreateRole();
      setRolePickerOpen(false);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to create role');
    } finally {
      setCreateRoleSaving(false);
    }
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
                  style={[styles.input, styles.inputDisabled]}
                  value={form.crew}
                  editable={false}
                  placeholder="Add roles below"
                  placeholderTextColor="#94A3B8"
                  keyboardType="number-pad"
                />
                <Text style={styles.helperText}>
                  Total people in roles: {totalStaffCount}. {totalStaffCount !== crewNum && crewNum > 0 && (
                    <Text style={styles.helperTextError}> Must equal crew size ({crewNum}).</Text>
                  )}
                </Text>
                <Text style={styles.fieldLabel}>Workdays (person-days)</Text>
                <TextInput
                  style={styles.input}
                  value={form.workdays}
                  onChangeText={(v) => setForm((f) => ({ ...f, workdays: v }))}
                  placeholder="70"
                  placeholderTextColor="#94A3B8"
                  keyboardType="number-pad"
                />
                {expectedWorkdays != null && (
                  <Text style={styles.helperText}>
                    Crew × working days in range = {crewNum} × {workingDaysInRange} = {expectedWorkdays} person-days.
                    {workdaysNumForValidation != null && workdaysNumForValidation !== expectedWorkdays && (
                      <Text style={styles.helperTextError}> With the dates selected and the crew size of {crewNum}, the number of workdays is {expectedWorkdays}.</Text>
                    )}
                  </Text>
                )}
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
                <Text style={styles.helperText}>Select a role type and how many. Define role types (name, rate, per diem, solo room) in the Roles screen.</Text>
                {form.roleEntries.map((e) => {
                  const rt = roleTypes.find((r) => r.id === e.roleTypeId);
                  return (
                    <View key={e.id} style={styles.roleRow}>
                      <TouchableOpacity
                        style={[styles.input, styles.roleTitle, { justifyContent: 'center' }]}
                        onPress={() => setRolePickerOpen(e.id)}
                      >
                        <Text style={rt ? undefined : styles.placeholderText}>
                          {rt ? rt.name : 'Select role type'}
                        </Text>
                      </TouchableOpacity>
                      <View style={styles.roleCountWrap}>
                        <Text style={styles.roleCountLabel}>#</Text>
                        <TextInput
                          style={[styles.input, styles.roleCount]}
                          value={String(e.count ?? 1)}
                          onChangeText={(v) => {
                            const n = parseInt(v, 10);
                            updateRoleEntry(e.id, { count: v === '' ? 1 : isNaN(n) || n < 1 ? 1 : Math.min(999, n) });
                          }}
                          placeholder="1"
                          placeholderTextColor="#94A3B8"
                          keyboardType="number-pad"
                        />
                      </View>
                      <TouchableOpacity onPress={() => removeRoleEntry(e.id)} style={styles.roleRemove}>
                        <Feather name="x" size={18} color="#6B7280" />
                      </TouchableOpacity>
                    </View>
                  );
                })}
                {rolePickerOpen && (
                  <RNModal visible transparent animationType="fade">
                    <TouchableOpacity
                      style={styles.rolePickerOverlay}
                      activeOpacity={1}
                      onPress={() => setRolePickerOpen(false)}
                    />
                    <View style={styles.rolePickerModalWrap}>
                      <View style={styles.rolePickerModal}>
                      <Text style={styles.rolePickerTitle}>Choose role type</Text>
                      <ScrollView style={styles.rolePickerList}>
                        {roleTypes.length === 0 ? (
                          <Text style={styles.rolePickerEmpty}>No role types yet. Add them in the Roles screen (sidebar).</Text>
                        ) : (
                          roleTypes.map((rt) => (
                              <TouchableOpacity
                                key={rt.id}
                                style={styles.rolePickerOption}
                                onPress={() => {
                                  if (typeof rolePickerOpen === 'string') {
                                    updateRoleEntry(rolePickerOpen, { roleTypeId: rt.id });
                                  }
                                  setRolePickerOpen(false);
                                }}
                              >
                                <Text style={styles.rolePickerOptionText}>{rt.name}</Text>
                                <Text style={styles.rolePickerOptionSub}>
                                  ${(rt.hourlyRateCents / 100).toFixed(0)}/hr · ${(rt.perDiemCents / 100).toFixed(0)} per diem
                                  {rt.hotelSoloRoom ? ' · Solo room' : ''}
                                </Text>
                              </TouchableOpacity>
                            ))
                        )}
                      </ScrollView>
                      <TouchableOpacity style={styles.rolePickerCreateBtn} onPress={openCreateRole}>
                        <Feather name="plus" size={18} color="#F67A34" />
                        <Text style={styles.rolePickerCreateBtnText}>Create Role</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.rolePickerCancel} onPress={() => setRolePickerOpen(false)}>
                        <Text style={styles.rolePickerCancelText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                    </View>
                  </RNModal>
                )}
                {createRoleModalOpen && (
                  <RNModal visible transparent animationType="fade">
                    <TouchableOpacity
                      style={styles.rolePickerOverlay}
                      activeOpacity={1}
                      onPress={closeCreateRole}
                    />
                    <View style={styles.rolePickerModalWrap}>
                      <View style={styles.rolePickerModal}>
                        <Text style={styles.rolePickerTitle}>Create role type</Text>
                        <Text style={styles.fieldLabel}>Name</Text>
                        <TextInput
                          style={styles.input}
                          value={createRoleForm.name}
                          onChangeText={(v) => setCreateRoleForm((f) => ({ ...f, name: v }))}
                          placeholder="e.g. Electrician"
                          placeholderTextColor="#94A3B8"
                        />
                        <Text style={styles.fieldLabel}>Hourly rate ($)</Text>
                        <TextInput
                          style={styles.input}
                          value={createRoleForm.hourlyRateDollars}
                          onChangeText={(v) => setCreateRoleForm((f) => ({ ...f, hourlyRateDollars: v }))}
                          placeholder="0"
                          placeholderTextColor="#94A3B8"
                          keyboardType="decimal-pad"
                        />
                        <Text style={styles.fieldLabel}>Per diem ($)</Text>
                        <TextInput
                          style={styles.input}
                          value={createRoleForm.perDiemDollars}
                          onChangeText={(v) => setCreateRoleForm((f) => ({ ...f, perDiemDollars: v }))}
                          placeholder="0"
                          placeholderTextColor="#94A3B8"
                          keyboardType="decimal-pad"
                        />
                        <TouchableOpacity
                          style={[styles.createRoleCheckRow, createRoleForm.hotelSoloRoom && styles.createRoleCheckRowActive]}
                          onPress={() => setCreateRoleForm((f) => ({ ...f, hotelSoloRoom: !f.hotelSoloRoom }))}
                        >
                          <Feather name={createRoleForm.hotelSoloRoom ? 'check-square' : 'square'} size={20} color={createRoleForm.hotelSoloRoom ? '#F67A34' : '#6B7280'} />
                          <Text style={styles.createRoleCheckLabel}>Hotel solo room</Text>
                        </TouchableOpacity>
                        <View style={styles.createRoleModalActions}>
                          <TouchableOpacity style={styles.createRoleCancelBtn} onPress={closeCreateRole}>
                            <Text style={styles.createRoleCancelBtnText}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.createRoleSaveBtn, createRoleSaving && styles.createRoleSaveBtnDisabled]}
                            onPress={handleCreateRoleSave}
                            disabled={createRoleSaving}
                          >
                            {createRoleSaving ? (
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                              <Text style={styles.createRoleSaveBtnText}>Add</Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </RNModal>
                )}
                <View style={styles.addRoleRow}>
                  <TouchableOpacity style={styles.addRoleBtn} onPress={addRoleEntry}>
                    <Feather name="plus" size={16} color="#F67A34" />
                    <Text style={styles.addRoleText}>Add role</Text>
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
                </View>
                <Text style={styles.helperText}>Choose Fly or Drive for travel to the job site.</Text>
                <Text style={styles.fieldLabel}>Job site Address *</Text>
                <TextInput
                  style={styles.input}
                  value={form.jobSiteAddress}
                  onChangeText={(v) => setForm((f) => ({ ...f, jobSiteAddress: v }))}
                  placeholder="Address"
                  placeholderTextColor="#94A3B8"
                />
                <Text style={styles.helperText}>Used for calculating travel and lodging costs</Text>
                {form.transport === 'DRIVE' && (
                  <>
                    <Text style={styles.fieldLabel}>Origin Address *</Text>
                    <TextInput
                      style={styles.input}
                      value={form.originAddress}
                      onChangeText={(v) => setForm((f) => ({ ...f, originAddress: v }))}
                      placeholder="Address"
                      placeholderTextColor="#94A3B8"
                    />
                  </>
                )}
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
                <Text style={styles.fieldLabel}>Single Rooms</Text>
                <Text style={styles.helperText}>Solo room is set per role type in the Roles screen (sidebar).</Text>
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
  helperTextError: {
    color: '#DC2626',
    fontWeight: '500'
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
  placeholderText: {
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
  rolePickerModalWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  rolePickerModal: {
    width: 360,
    maxWidth: '100%',
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    shadowOpacity: 0.2,
    elevation: 8
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
  rolePickerCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFF7ED',
    borderRadius: 12
  },
  rolePickerCreateBtnText: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '600',
    fontSize: 14,
    color: '#F67A34'
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
  createRoleCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F9FAFB'
  },
  createRoleCheckRowActive: {
    backgroundColor: '#FFF7ED'
  },
  createRoleCheckLabel: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontSize: 14,
    color: '#1D2131'
  },
  createRoleModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20
  },
  createRoleCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20
  },
  createRoleCancelBtnText: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontSize: 16,
    color: '#6B7280'
  },
  createRoleSaveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: '#F67A34',
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center'
  },
  createRoleSaveBtnDisabled: {
    opacity: 0.7
  },
  createRoleSaveBtnText: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '600',
    fontSize: 16,
    color: '#FFFFFF'
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
