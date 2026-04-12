import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Modal,
  useWindowDimensions,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { Project, ProjectStatus, CostBreakdown, CreateProjectPayload, ProjectFlight } from '../services/projectsApi';
import { createProject, updateProject, exportProjectPdf } from '../services/projectsApi';
import { AppSidebar, SIDEBAR_WIDTH, SIDEBAR_COLLAPSE_BREAKPOINT } from '../components/AppSidebar';
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

function cityStateFromJobSite(jobSiteAddress: string | null): string {
  const addr = jobSiteAddress?.trim();
  if (!addr) return '—';
  const parts = addr.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) return `${parts[parts.length - 2]}, ${parts[parts.length - 1]}`;
  return parts[0] || '—';
}

function formatCurrency(cents: number): string {
  return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export type EstimateSection = {
  id: string;
  title: string;
  amountCents: number;
  expandedContent?: Array<{ label: string; detail: string; amountCents: number }>;
  /** Show info popup for placeholder rates (hotel/flights from APIs later) */
  showInfoPopup?: boolean;
};

function formatDuration(iso: string): string {
  const match = iso?.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return iso || '—';
  const h = match[1] ? `${match[1]}h` : '';
  const m = match[2] ? `${match[2]}m` : '';
  return `${h} ${m}`.trim() || '—';
}

function formatDepartureTime(iso: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

function formatDistanceKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function costBreakdownToSections(cb: CostBreakdown, project: Project): EstimateSection[] {
  return cb.sections.map((s) => {
    let expandedContent = s.lineItems?.map((li) => ({
      label: li.label,
      detail: li.detail,
      amountCents: li.amountCents
    }));

    if (s.id === 'flights' && project.flights?.length) {
      expandedContent = project.flights
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((f) => ({
          label: `${f.airline} ${f.flightNumber}`,
          detail: `Departs ${formatDepartureTime(f.departureTime)} · ${formatDuration(f.duration)}${f.numberOfChanges === 0 ? ' · Nonstop' : ` · ${f.numberOfChanges} stop(s)`}`,
          amountCents: f.priceCents
        }));
    }
    if (s.id === 'hotel' && project.hotels?.length) {
      expandedContent = project.hotels
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((h) => ({
          label: h.name,
          detail: `${h.address} · ${'★'.repeat(h.stars)}${h.distanceKm != null ? ` · ${formatDistanceKm(h.distanceKm)} from job site` : ''}`,
          amountCents: h.priceCents
        }));
    }

    return {
      id: s.id,
      title: s.title,
      amountCents: s.amountCents,
      expandedContent,
      showInfoPopup: (s.id === 'hotel' || s.id === 'flights') && !s.lineItems?.[0]?.label?.includes('2nd of 3')
    };
  });
}

function buildSectionsFromProject(project: Project): EstimateSection[] {
  const budget = project.budgetCents ?? 12633800;
  const subtotal = budget > 0 ? Math.round(budget / 1.1) : 11529800;
  const hotelCents = Math.round(subtotal * 0.44);
  const flightsCents = Math.round(subtotal * 0.35);
  const perDiemCents = Math.round(subtotal * 0.21);
  const laborCents = Math.round(subtotal * 0.15);

  return [
    {
      id: 'hotel',
      title: 'Hotel Total',
      amountCents: hotelCents,
      showInfoPopup: true,
      expandedContent: [
        { label: 'Hotel Nights', detail: '6 rooms × 38 nights × $134/night', amountCents: 4785900 },
        { label: 'Single Rooms (Foreman)', detail: '1 room × 38 nights × $149/night', amountCents: 789700 }
      ]
    },
    {
      id: 'flights',
      title: 'Flights Total',
      amountCents: flightsCents,
      showInfoPopup: true,
      expandedContent: [
        { label: 'Round-trip', detail: '7 crew × 2 legs × $420', amountCents: 588000 }
      ]
    },
    {
      id: 'perdiem',
      title: 'Per Diem Total',
      amountCents: perDiemCents,
      expandedContent: [
        { label: 'Daily allowance', detail: '7 crew × 38 days × $65/day', amountCents: 1729000 }
      ]
    },
    {
      id: 'labor',
      title: 'Labor Total',
      amountCents: laborCents,
      expandedContent: [
        { label: 'Hourly', detail: '7 crew × 304 hrs × $42/hr', amountCents: 8937600 }
      ]
    }
  ];
}

function getSectionsAndTotals(project: Project): {
  sections: EstimateSection[];
  subtotalCents: number;
  contingencyCents: number;
  totalCents: number;
  contingencyPct: number;
} {
  if (project.costBreakdown?.sections?.length) {
    const cb = project.costBreakdown;
    return {
      sections: costBreakdownToSections(cb, project),
      subtotalCents: cb.subtotalCents,
      contingencyCents: cb.contingencyCents,
      totalCents: cb.totalCents,
      contingencyPct: project.contingencyBudgetPct ?? 10
    };
  }
  const sections = buildSectionsFromProject(project);
  const subtotalCents = sections.reduce((sum, s) => sum + s.amountCents, 0);
  const contingencyPct = project.contingencyBudgetPct ?? 10;
  const contingencyCents = Math.round((subtotalCents * contingencyPct) / 100);
  const totalCents = subtotalCents + contingencyCents;
  return { sections, subtotalCents, contingencyCents, totalCents, contingencyPct };
}

export interface EstimateScreenProps {
  project: Project;
  token: string;
  user?: { email: string; fullName: string };
  onBack: () => void;
  onSignOut?: () => void;
  onOpenRoles?: () => void;
  /** When duplicate succeeds, call with the new project (e.g. to open its summary). */
  onDuplicateSuccess?: (newProject: Project) => void;
  /** When project is updated (e.g. flight/hotel selection), call with updated project so parent can refresh. */
  onProjectUpdate?: (updated: Project) => void;
}

const INFO_POPUP_MESSAGES: Record<string, string> = {
  hotel: 'Hotel rates are estimated when live pricing is not yet available. Enter job site address and save to fetch live options.',
  flights: 'Flight prices are estimated when live pricing is not yet available. Enter origin/destination airports and save to fetch live options.'
};

type StopsFilter = 'any' | '0' | '1' | '2+';
type DepartureFilter = 'any' | 'morning' | 'midday' | 'afternoon' | 'evening';

function getDepartureBucket(iso: string): DepartureFilter {
  try {
    const h = new Date(iso).getHours();
    if (h < 11) return 'morning';
    if (h < 14) return 'midday';
    if (h < 17) return 'afternoon';
    return 'evening';
  } catch {
    return 'any';
  }
}

function filterFlights(
  flights: ProjectFlight[],
  stopsFilter: StopsFilter,
  airlineFilter: string,
  departureFilter: DepartureFilter
): ProjectFlight[] {
  return flights.filter((f) => {
    if (stopsFilter !== 'any') {
      if (stopsFilter === '0' && f.numberOfChanges !== 0) return false;
      if (stopsFilter === '1' && f.numberOfChanges !== 1) return false;
      if (stopsFilter === '2+' && f.numberOfChanges < 2) return false;
    }
    if (airlineFilter !== 'any' && f.airline !== airlineFilter) return false;
    if (departureFilter !== 'any' && getDepartureBucket(f.departureTime) !== departureFilter) return false;
    return true;
  });
}

export const EstimateScreen: React.FC<EstimateScreenProps> = ({
  project,
  token,
  onBack,
  user,
  onSignOut,
  onOpenRoles,
  onDuplicateSuccess,
  onProjectUpdate
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [infoPopupSectionId, setInfoPopupSectionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [flightsStopsFilter, setFlightsStopsFilter] = useState<StopsFilter>('any');
  const [flightsAirlineFilter, setFlightsAirlineFilter] = useState<string>('any');
  const [flightsDepartureFilter, setFlightsDepartureFilter] = useState<DepartureFilter>('any');
  const [selectingFlightId, setSelectingFlightId] = useState<string | null>(null);
  const [selectingHotelId, setSelectingHotelId] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);

  const { width: windowWidth } = useWindowDimensions();
  const sidebarCollapsed = windowWidth < SIDEBAR_COLLAPSE_BREAKPOINT;

  const statusColor = STATUS_COLORS[project.status];
  const locationStr = project.location?.trim() || `${cityStateFromJobSite(project.jobSiteAddress)} • ${formatDateRange(project.startDate, project.endDate)}`;
  const { sections, subtotalCents, contingencyCents, totalCents, contingencyPct } = getSectionsAndTotals(project);

  const effectiveSelectedFlightId =
    project.selectedFlightId ??
    project.flights?.find((f) => f.sortOrder === 1)?.id ??
    project.flights?.[0]?.id ??
    null;
  const sortedFlights = (project.flights ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder);
  const uniqueAirlines = Array.from(new Set(sortedFlights.map((f) => f.airline))).sort();
  const filteredFlights = filterFlights(
    sortedFlights,
    flightsStopsFilter,
    flightsAirlineFilter,
    flightsDepartureFilter
  );

  const effectiveSelectedHotelId =
    project.selectedHotelId ??
    project.hotels?.find((h) => h.sortOrder === 1)?.id ??
    project.hotels?.[0]?.id ??
    null;
  const sortedHotels = (project.hotels ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder);

  const handleSelectFlight = async (flightId: string) => {
    if (effectiveSelectedFlightId === flightId) return;
    setSelectingFlightId(flightId);
    try {
      const updated = await updateProject(token, project.id, { selectedFlightId: flightId });
      onProjectUpdate?.(updated);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to update flight selection');
    } finally {
      setSelectingFlightId(null);
    }
  };

  const handleSelectHotel = async (hotelId: string) => {
    if (effectiveSelectedHotelId === hotelId) return;
    setSelectingHotelId(hotelId);
    try {
      const updated = await updateProject(token, project.id, { selectedHotelId: hotelId });
      onProjectUpdate?.(updated);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to update hotel selection');
    } finally {
      setSelectingHotelId(null);
    }
  };

  const initials = user?.fullName
    ? user.fullName.split(/\s+/).map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'JD';
  const displayName = user?.fullName?.split(/\s+/)[0] + ' ' + (user?.fullName?.split(/\s+/)[1]?.[0] ?? '') || 'User';
  const displayEmail = user?.email ?? '';

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      await exportProjectPdf(token, project.id);
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : 'Could not generate PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  const handleDuplicate = async () => {
    const payload: CreateProjectPayload = {
      name: `Copy of ${project.name}`,
      status: 'DRAFT',
      startDate: project.startDate ?? undefined,
      endDate: project.endDate ?? undefined,
      crew: project.crew ?? undefined,
      workdays: project.workdays ?? undefined,
      currency: project.currency ?? undefined,
      workSaturday: project.workSaturday,
      workSunday: project.workSunday,
      transport: project.transport ?? undefined,
      jobSiteAddress: project.jobSiteAddress ?? undefined,
      originAddress: project.originAddress ?? undefined,
      originAirport: project.originAirport ?? undefined,
      destinationAirport: project.destinationAirport ?? undefined,
      hotelQuality: project.hotelQuality ?? undefined,
      contingencyBudgetPct: project.contingencyBudgetPct ?? undefined,
      costBreakdown: project.costBreakdown ?? undefined,
      roles: project.roles ?? undefined
    };
    setDuplicating(true);
    try {
      const newProject = await createProject(token, payload);
      if (onDuplicateSuccess) {
        onDuplicateSuccess(newProject);
      } else {
        Alert.alert('Done', `Created "${newProject.name}". Open it from the dashboard.`);
      }
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to duplicate project');
    } finally {
      setDuplicating(false);
    }
  };

  const sidebarContent = (
    <AppSidebar
      activePage="estimate"
      user={{ displayName, displayEmail, initials }}
      onDashboardPress={onBack}
      onRolesPress={onOpenRoles}
      onSignOut={onSignOut}
    />
  );

  return (
    <View style={styles.page}>
      {!sidebarCollapsed && <View style={styles.sidebar}>{sidebarContent}</View>}

      <View style={styles.main}>
        {/* Header bar: Back | Project name, status, location; Export, Duplicate, More */}
        <View style={styles.headerBar}>
          <View style={styles.headerRow}>
            {sidebarCollapsed ? (
              <TouchableOpacity onPress={() => setSidebarOpen(true)} style={styles.hamburgerBtn} hitSlop={8}>
                <Feather name="menu" size={24} color="#1D2131" />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
              <Feather name="chevron-up" size={24} color="#F67A34" style={styles.backChevron} />
              <Text style={styles.backText}>Projects</Text>
            </TouchableOpacity>
            <View style={styles.headerDivider} />
            <View style={styles.projectTitleBlock}>
              <View style={styles.projectTitleRow}>
                <Text style={styles.projectName} numberOfLines={1}>{project.name}</Text>
                <View style={[styles.statusBadge, { backgroundColor: project.status === 'FINALIZED' ? '#DCFCE7' : '#F3F4F6' }]}>
                  <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                  <Text style={[styles.statusText, { color: statusColor }]}>{project.status}</Text>
                </View>
              </View>
              <View style={styles.locationRow}>
                <Feather name="map-pin" size={14} color="#484566" />
                <Text style={styles.locationText} numberOfLines={1} ellipsizeMode="tail">
                  {locationStr}
                </Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.actionBtn}
                activeOpacity={0.7}
                onPress={handleExportPdf}
                disabled={exportingPdf}
              >
                {exportingPdf ? (
                  <ActivityIndicator size="small" color="#F67A34" />
                ) : (
                  <Feather name="download" size={24} color="#F67A34" />
                )}
                <Text style={styles.actionBtnText}>Export</Text>
              </TouchableOpacity>
              <View style={styles.actionDivider} />
              <TouchableOpacity
                style={styles.actionBtn}
                activeOpacity={0.7}
                onPress={handleDuplicate}
                disabled={duplicating}
              >
                {duplicating ? (
                  <ActivityIndicator size="small" color="#F67A34" />
                ) : (
                  <Feather name="copy" size={24} color="#F67A34" />
                )}
                <Text style={styles.actionBtnText}>Duplicate</Text>
              </TouchableOpacity>
              <View style={styles.actionDivider} />
              <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
                <Text style={styles.actionBtnText}>More</Text>
                <Feather name="chevron-right" size={24} color="#F67A34" style={styles.moreChevron} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Cost breakdown accordion + footer */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
        >
          <Text style={styles.costBreakdownTitle}>Cost Breakdown</Text>

          <View style={styles.accordion}>
            {sections.map((section, index) => {
              const isExpanded = expandedId === section.id;
              const isLast = index === sections.length - 1;
              return (
                <View
                  key={section.id}
                  style={[styles.accordionSection, isLast && styles.accordionSectionLast]}
                >
                  <TouchableOpacity
                    style={styles.accordionHeader}
                    onPress={() => setExpandedId(isExpanded ? null : section.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.accordionHeaderLeft}>
                      <Feather
                        name={isExpanded ? 'chevron-down' : 'chevron-right'}
                        size={20}
                        color="#F67A34"
                      />
                      <Text style={styles.accordionTitle}>{section.title}</Text>
                      {section.showInfoPopup && (
                        <TouchableOpacity
                          hitSlop={8}
                          onPress={(e) => {
                            e.stopPropagation();
                            setInfoPopupSectionId(section.id);
                          }}
                          style={styles.infoIconWrap}
                        >
                          <Feather name="info" size={16} color="#6B7280" />
                        </TouchableOpacity>
                      )}
                    </View>
                    <Text style={styles.accordionAmount}>{formatCurrency(section.amountCents)}</Text>
                  </TouchableOpacity>
                  {isExpanded && section.id === 'flights' && (project.flights?.length ?? 0) > 0 && (
                    <View style={styles.accordionBody}>
                      <View style={styles.flightFiltersRow}>
                        <Text style={styles.flightFilterLabel}>Stops</Text>
                        <View style={styles.flightFilterChips}>
                          {(['any', '0', '1', '2+'] as const).map((s) => (
                            <TouchableOpacity
                              key={s}
                              style={[styles.flightFilterChip, flightsStopsFilter === s && styles.flightFilterChipActive]}
                              onPress={() => setFlightsStopsFilter(s)}
                            >
                              <Text style={[styles.flightFilterChipText, flightsStopsFilter === s && styles.flightFilterChipTextActive]}>
                                {s === 'any' ? 'Any' : s === '0' ? 'Nonstop' : s === '1' ? '1 stop' : '2+'}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        <Text style={styles.flightFilterLabel}>Departure</Text>
                        <View style={styles.flightFilterChips}>
                          {(['any', 'morning', 'midday', 'afternoon', 'evening'] as const).map((d) => (
                            <TouchableOpacity
                              key={d}
                              style={[styles.flightFilterChip, flightsDepartureFilter === d && styles.flightFilterChipActive]}
                              onPress={() => setFlightsDepartureFilter(d)}
                            >
                              <Text style={[styles.flightFilterChipText, flightsDepartureFilter === d && styles.flightFilterChipTextActive]}>
                                {d === 'any' ? 'Any' : d === 'morning' ? '0-11am' : d === 'midday' ? '11am-2pm' : d === 'afternoon' ? '2-5pm' : '5pm-12am'}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        <Text style={styles.flightFilterLabel}>Airline</Text>
                        <View style={styles.flightFilterChips}>
                          <TouchableOpacity
                            style={[styles.flightFilterChip, flightsAirlineFilter === 'any' && styles.flightFilterChipActive]}
                            onPress={() => setFlightsAirlineFilter('any')}
                          >
                            <Text style={[styles.flightFilterChipText, flightsAirlineFilter === 'any' && styles.flightFilterChipTextActive]}>Any</Text>
                          </TouchableOpacity>
                          {uniqueAirlines.map((airline) => (
                            <TouchableOpacity
                              key={airline}
                              style={[styles.flightFilterChip, flightsAirlineFilter === airline && styles.flightFilterChipActive]}
                              onPress={() => setFlightsAirlineFilter(airline)}
                            >
                              <Text style={[styles.flightFilterChipText, flightsAirlineFilter === airline && styles.flightFilterChipTextActive]} numberOfLines={1}>
                                {airline}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                      {filteredFlights.map((f) => {
                        const isSelected = f.id === effectiveSelectedFlightId;
                        const isSelecting = selectingFlightId === f.id;
                        return (
                          <TouchableOpacity
                            key={f.id}
                            style={[styles.accordionDetailRow, isSelected && styles.flightRowSelected]}
                            onPress={() => handleSelectFlight(f.id)}
                            disabled={isSelecting}
                            activeOpacity={0.7}
                          >
                            <View style={styles.accordionDetailLeft}>
                              <View style={styles.flightRowHeader}>
                                <Text style={styles.accordionDetailLabel}>{f.airline} {f.flightNumber}</Text>
                                {isSelected && (
                                  <View style={styles.usedInEstimateBadge}>
                                    <Text style={styles.usedInEstimateBadgeText}>Used in estimate</Text>
                                  </View>
                                )}
                              </View>
                              <Text style={styles.accordionDetailFormula}>
                                Outbound: Departs {formatDepartureTime(f.departureTime)} · {formatDuration(f.duration)}
                                {f.numberOfChanges === 0 ? ' · Nonstop' : ` · ${f.numberOfChanges} stop(s)`}
                              </Text>
                              {(f.returnDepartureTime || f.returnDuration) && (
                                <Text style={styles.accordionDetailFormula}>
                                  Return: Departs {f.returnDepartureTime ? formatDepartureTime(f.returnDepartureTime) : '—'} · {f.returnDuration ? formatDuration(f.returnDuration) : '—'}
                                </Text>
                              )}
                            </View>
                            <View style={styles.accordionDetailRight}>
                              {isSelecting ? (
                                <ActivityIndicator size="small" color="#F67A34" />
                              ) : (
                                <Text style={styles.accordionDetailAmount}>{formatCurrency(f.priceCents)}</Text>
                              )}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                      {filteredFlights.length === 0 && (
                        <Text style={styles.flightFilterEmpty}>No flights match the filters.</Text>
                      )}
                    </View>
                  )}
                  {isExpanded && section.id === 'hotel' && (project.hotels?.length ?? 0) > 0 && (
                    <View style={styles.accordionBody}>
                      {sortedHotels.map((h) => {
                        const isSelected = h.id === effectiveSelectedHotelId;
                        const isSelecting = selectingHotelId === h.id;
                        return (
                          <TouchableOpacity
                            key={h.id}
                            style={[styles.accordionDetailRow, isSelected && styles.flightRowSelected]}
                            onPress={() => handleSelectHotel(h.id)}
                            disabled={isSelecting}
                            activeOpacity={0.7}
                          >
                            <View style={styles.accordionDetailLeft}>
                              <View style={styles.flightRowHeader}>
                                <Text style={styles.accordionDetailLabel}>{h.name}</Text>
                                {isSelected && (
                                  <View style={styles.usedInEstimateBadge}>
                                    <Text style={styles.usedInEstimateBadgeText}>Used in estimate</Text>
                                  </View>
                                )}
                              </View>
                              <Text style={styles.accordionDetailFormula}>
                                {h.address} · {'★'.repeat(h.stars)}
                                {h.distanceKm != null ? ` · ${formatDistanceKm(h.distanceKm)} from job site` : ''}
                              </Text>
                            </View>
                            <View style={styles.accordionDetailRight}>
                              {isSelecting ? (
                                <ActivityIndicator size="small" color="#F67A34" />
                              ) : (
                                <Text style={styles.accordionDetailAmount}>{formatCurrency(h.priceCents)}</Text>
                              )}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                  {isExpanded && section.id !== 'flights' && (section.id !== 'hotel' || (project.hotels?.length ?? 0) === 0) && section.expandedContent && section.expandedContent.length > 0 && (
                    <View style={styles.accordionBody}>
                      {section.expandedContent.map((row, i) => (
                        <View key={i} style={styles.accordionDetailRow}>
                          <View style={styles.accordionDetailLeft}>
                            <Text style={styles.accordionDetailLabel}>{row.label}</Text>
                            <Text style={styles.accordionDetailFormula}>{row.detail}</Text>
                          </View>
                          <Text style={styles.accordionDetailAmount}>{formatCurrency(row.amountCents)}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          <View style={styles.footer}>
            <View style={styles.footerLabels}>
              <Text style={styles.footerLabel}>Subtotal</Text>
              <Text style={[styles.footerLabel, styles.footerLabelOrange]}>Contingency ({contingencyPct}%)</Text>
              <Text style={styles.footerLabelTotal}>Est. Total Travel Budget</Text>
            </View>
            <View style={styles.footerValues}>
              <Text style={styles.footerValue}>{formatCurrency(subtotalCents)}</Text>
              <Text style={[styles.footerValue, styles.footerValueOrange]}>{formatCurrency(contingencyCents)}</Text>
              <Text style={styles.footerValueTotal}>{formatCurrency(totalCents)}</Text>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Collapsed sidebar overlay */}
      <Modal
        visible={sidebarCollapsed && sidebarOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSidebarOpen(false)}
      >
        <View style={styles.sidebarOverlay}>
          <View style={styles.sidebarPanel} pointerEvents="box-none">
            <TouchableOpacity style={styles.sidebarCloseBtn} onPress={() => setSidebarOpen(false)} hitSlop={8}>
              <Feather name="x" size={24} color="#6B7280" />
            </TouchableOpacity>
            {sidebarContent}
          </View>
          <TouchableOpacity
            style={styles.sidebarBackdrop}
            activeOpacity={1}
            onPress={() => setSidebarOpen(false)}
          />
        </View>
      </Modal>

      {/* Small popup for hotel/flights placeholder info */}
      <Modal
        visible={infoPopupSectionId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setInfoPopupSectionId(null)}
      >
        <TouchableOpacity
          style={styles.infoPopupOverlay}
          activeOpacity={1}
          onPress={() => setInfoPopupSectionId(null)}
        >
          <View style={styles.infoPopupCard} pointerEvents="box-none">
            <Feather name="info" size={20} color="#F67A34" />
            <Text style={styles.infoPopupText}>
              {infoPopupSectionId ? INFO_POPUP_MESSAGES[infoPopupSectionId] ?? '' : ''}
            </Text>
            <TouchableOpacity
              style={styles.infoPopupCloseBtn}
              onPress={() => setInfoPopupSectionId(null)}
            >
              <Text style={styles.infoPopupCloseText}>OK</Text>
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
  hamburgerBtn: {
    padding: 4,
    marginRight: 4
  },
  sidebarOverlay: {
    flex: 1,
    flexDirection: 'row'
  },
  sidebarPanel: {
    width: SIDEBAR_WIDTH,
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    alignItems: 'center'
  },
  sidebarCloseBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1
  },
  sidebarBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)'
  },
  main: { flex: 1, minWidth: 0, padding: 16, paddingLeft: 24 },
  headerBar: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
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
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  backChevron: { transform: [{ rotate: '-90deg' }] },
  backText: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 20,
    color: '#F67A34'
  },
  headerDivider: { width: 1, height: 18, backgroundColor: '#E5E7EB' },
  projectTitleBlock: { flex: 1, minWidth: 0, justifyContent: 'center', gap: 6 },
  projectTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  projectName: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '600',
    fontSize: 18,
    lineHeight: 28,
    color: '#1D2131'
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 4,
    borderRadius: 10
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '500',
    fontSize: 12,
    lineHeight: 16
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    minWidth: 0
  },
  locationText: {
    flex: 1,
    minWidth: 0,
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '400',
    fontSize: 14,
    lineHeight: 16,
    color: '#484566'
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 8, gap: 8 },
  actionBtnText: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 20,
    color: '#F67A34'
  },
  actionDivider: { width: 1, height: 18, backgroundColor: '#E5E7EB' },
  moreChevron: { transform: [{ rotate: '90deg' }] },
  scroll: { flex: 1 },
  scrollContent: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: '#E5E7EB',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingBottom: 48
  },
  costBreakdownTitle: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '600',
    fontSize: 20,
    lineHeight: 28,
    color: '#1D2131',
    marginBottom: 24
  },
  accordion: {},
  accordionSection: {
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  accordionSectionLast: {
    borderBottomWidth: 1,
    borderBottomStyle: 'dashed',
    borderBottomColor: '#E5E7EB'
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  accordionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  infoIconWrap: { padding: 4 },
  accordionTitle: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '500',
    fontSize: 16,
    lineHeight: 24,
    color: '#484566'
  },
  accordionAmount: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '700',
    fontSize: 16,
    lineHeight: 16,
    color: '#484566'
  },
  accordionBody: {
    marginTop: 16,
    padding: 24,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 15,
    gap: 24
  },
  accordionDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  accordionDetailLeft: { gap: 4 },
  accordionDetailLabel: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '500',
    fontSize: 14,
    lineHeight: 16,
    color: '#6B7280'
  },
  accordionDetailFormula: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '500',
    fontSize: 14,
    lineHeight: 16,
    color: '#6B7280'
  },
  accordionDetailAmount: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '500',
    fontSize: 14,
    lineHeight: 16,
    color: '#6B7280'
  },
  accordionDetailRight: {
    marginLeft: 8,
    alignItems: 'flex-end',
    justifyContent: 'center'
  },
  flightFiltersRow: {
    gap: 8,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  flightFilterLabel: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 4
  },
  flightFilterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10
  },
  flightFilterChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6'
  },
  flightFilterChipActive: {
    backgroundColor: '#F67A34'
  },
  flightFilterChipText: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontSize: 12,
    color: '#374151'
  },
  flightFilterChipTextActive: {
    color: '#FFF',
    fontWeight: '600'
  },
  flightRowSelected: {
    backgroundColor: '#FFF7ED',
    borderLeftWidth: 3,
    borderLeftColor: '#F67A34',
    marginLeft: -1,
    paddingLeft: 11
  },
  flightRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap'
  },
  usedInEstimateBadge: {
    backgroundColor: '#F67A34',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6
  },
  usedInEstimateBadgeText: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontSize: 10,
    fontWeight: '600',
    color: '#FFF'
  },
  flightFilterEmpty: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
    paddingVertical: 12
  },
  liveOptionsBlock: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    gap: 12
  },
  liveOptionsTitle: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '600',
    fontSize: 14,
    lineHeight: 20,
    color: '#6B7280',
    marginBottom: 4
  },
  liveOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  liveOptionLeft: { flex: 1, minWidth: 0, gap: 2 },
  liveOptionPrimary: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '600',
    fontSize: 14,
    color: '#1D2131'
  },
  liveOptionDetail: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontSize: 12,
    color: '#6B7280'
  },
  liveOptionPrice: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '600',
    fontSize: 14,
    color: '#F67A34'
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 24,
    gap: 24
  },
  footerLabels: { gap: 16 },
  footerLabel: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 24,
    color: '#6B7280'
  },
  footerLabelOrange: { color: '#F67A34' },
  footerLabelTotal: {
    fontWeight: '600',
    fontSize: 18,
    lineHeight: 24,
    color: '#1D2131'
  },
  footerValues: { alignItems: 'flex-end', gap: 16 },
  footerValue: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '700',
    fontSize: 16,
    lineHeight: 16,
    color: '#6B7280'
  },
  footerValueOrange: { color: '#F67A34' },
  footerValueTotal: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '700',
    fontSize: 18,
    lineHeight: 16,
    color: '#1BC685'
  },
  infoPopupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  infoPopupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    maxWidth: 320,
    alignItems: 'center',
    gap: 12
  },
  infoPopupText: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '500',
    fontSize: 14,
    lineHeight: 20,
    color: '#484566',
    textAlign: 'center'
  },
  infoPopupCloseBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F67A34',
    borderRadius: 8
  },
  infoPopupCloseText: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '600',
    fontSize: 14,
    color: '#FFFFFF'
  }
});
