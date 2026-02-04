"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition, type ReactNode } from 'react';
import { AlertTriangle, Calendar, CheckCircle2, Circle, MoreHorizontal, Pill, SunMedium, Users } from 'lucide-react';
import '@/styles/home-slate-variant-b.css';
import '@/styles/home-premium-theme.css';
import '@/styles/home-premium.css';
import SemanticSearch from '@/components/SemanticSearch';
import HomeHeader from '@/components/home/HomeHeader';
import NextUpCard from '@/components/home/NextUpCard';
import QuickAddBar from '@/components/home/QuickAddBar';
import AtAGlanceRow from '@/components/home/AtAGlanceRow';
import ModeSwitcher from '@/components/home/ModeSwitcher';
import FocusHome from '@/components/home/FocusHome';
import FilteredTaskList from '@/components/home/FilteredTaskList';
import OverdueDenseRow from '@/components/home/OverdueDenseRow';
import MedsTeaserCard from '@/components/home/MedsTeaserCard';
import ReminderRowMobile from '@/components/mobile/ReminderRowMobile';
import ReminderFiltersPanel from '@/components/dashboard/ReminderFiltersPanel';
import ReminderCard from '@/components/dashboard/ReminderCard';
import ActionSubmitButton from '@/components/ActionSubmitButton';
import ListReminderButton from '@/components/lists/ListReminderButton';
import ListShareSheet from '@/components/lists/ListShareSheet';
import ReminderActionsSheet from '@/components/ReminderActionsSheet';
import GoogleCalendarDeleteDialog from '@/components/GoogleCalendarDeleteDialog';
import GoogleCalendarSyncButton from '@/components/GoogleCalendarSyncButton';
import GoogleCalendarAutoBlockButton from '@/components/GoogleCalendarAutoBlockButton';
import { messages, type Locale } from '@/lib/i18n';
import {
  diffDaysInTimeZone,
  coerceDateForTimeZone,
  formatDateTimeWithTimeZone,
  formatReminderDateTime,
  getMonthKeyInTimeZone,
  resolveReminderTimeZone
} from '@/lib/dates';
import { getCategoryChipStyle, getReminderCategory, inferReminderCategoryId, type ReminderCategoryId } from '@/lib/categories';
import { markDone } from '@/app/app/actions';
import { toggleTaskDoneAction } from '@/app/app/tasks/actions';
import { cloneReminder } from '@/app/app/reminders/[id]/actions';
import { useModePreference } from '@/lib/hooks/useModePreference';
import type { TaskItem, TaskListPreview } from '@/lib/tasks';

type CreatedByOption = 'all' | 'me' | 'others';
type AssignmentOption = 'all' | 'assigned_to_me';
type CategoryOption = 'all' | ReminderCategoryId;
type TabOption = 'today' | 'inbox';

type OccurrencePayload = {
  id: string;
  occur_at: string;
  snoozed_until?: string | null;
  status: string;
  reminder?: {
    id?: string;
    title?: string;
    due_at?: string | null;
    created_by?: string | null;
    assigned_member_id?: string | null;
    is_active?: boolean;
    notes?: string | null;
    google_event_id?: string | null;
    assigned_member_label?: string | null;
    kind?: string | null;
    category?: string | null;
    medication_details?: any;
    tz?: string | null;
  } | null;
  performed_by?: string | null;
  performed_by_label?: string | null;
  effective_at?: string;
};

type MedicationDose = {
  id: string;
  scheduled_at: string;
  status: string;
  skipped_reason?: string | null;
  taken_at?: string | null;
  reminder?: {
    id?: string;
    title?: string;
    medication_details?: any;
    created_by?: string | null;
  } | null;
};

type MessageBundle = typeof messages[Locale];

type Props = {
  occurrences: OccurrencePayload[];
  copy: MessageBundle;
  membershipId: string;
  userId: string;
  googleConnected: boolean;
  medicationDoses: MedicationDose[];
  inboxTasks?: TaskItem[];
  inboxLists?: TaskListPreview[];
  memberLabels: Record<string, string>;
  householdId: string;
  initialCreatedBy?: CreatedByOption;
  initialAssignment?: AssignmentOption;
  initialTab?: TabOption;
  locale: Locale;
  localeTag: string;
  userTimeZone?: string;
};

const CreatedOptions: CreatedByOption[] = ['all', 'me', 'others'];
const AssignmentOptions: AssignmentOption[] = ['all', 'assigned_to_me'];

const getDayKey = (date: Date, timeZone: string) => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(date);
};

const getCompareDate = (occurrence: OccurrencePayload, timeZone: string) => {
  const rawDate = occurrence.effective_at ?? occurrence.occur_at;
  const reminderTimeZone = resolveReminderTimeZone(occurrence.reminder?.tz ?? null, timeZone);
  if (occurrence.snoozed_until) {
    return new Date(rawDate);
  }
  return coerceDateForTimeZone(rawDate, reminderTimeZone);
};

const getUrgencyStyles = (copy: MessageBundle) => ({
  overdue: {
    key: 'overdue' as const,
    label: copy.dashboard.todayOverdue
  },
  soon: {
    key: 'soon' as const,
    label: copy.dashboard.todaySoon
  },
  today: {
    key: 'today' as const,
    label: copy.dashboard.todayRest
  },
  upcoming: {
    key: 'upcoming' as const,
    label: copy.dashboard.upcomingTitle
  },
  scheduled: {
    key: 'upcoming' as const,
    label: copy.common.statusOpen
  }
});

const SectionHeading = ({
  label,
  icon,
  countLabel
}: {
  label: string;
  icon?: ReactNode;
  countLabel?: string;
}) => (
  <div className="flex items-center gap-3">
    <span className="h-px flex-1 bg-slate-200" />
    <span className="flex items-center gap-2 text-xs font-semibold uppercase text-tertiary">
      {icon}
      <span>{label}</span>
      {countLabel ? (
        <span className="text-[11px] font-semibold text-tertiary normal-case">{countLabel}</span>
      ) : null}
    </span>
    <span className="h-px flex-1 bg-slate-200" />
  </div>
);

export default function ReminderDashboardSection({
  occurrences,
  copy,
  membershipId,
  userId,
  googleConnected,
  medicationDoses,
  inboxTasks = [],
  inboxLists = [],
  memberLabels,
  householdId,
  initialCreatedBy = 'all',
  initialAssignment = 'all',
  initialTab = 'today',
  locale,
  localeTag,
  userTimeZone
}: Props) {
  const router = useRouter();
  const [createdBy, setCreatedBy] = useState<CreatedByOption>(initialCreatedBy);
  const [assignment, setAssignment] = useState<AssignmentOption>(initialAssignment);
  const [kindFilter, setKindFilter] = useState<'all' | 'tasks' | 'medications'>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryOption>('all');
  const safeMedicationDoses = Array.isArray(medicationDoses) ? medicationDoses : [];
  const [doseState, setDoseState] = useState<MedicationDose[]>(safeMedicationDoses);
  const [visibleMonthGroups, setVisibleMonthGroups] = useState(2);
  const [showOverdue, setShowOverdue] = useState(false);
  const [showToday, setShowToday] = useState(false);
  const [showUpcoming, setShowUpcoming] = useState(false);
  const [showMeds, setShowMeds] = useState(false);
  const [showMonths, setShowMonths] = useState(false);
  const [autoExpanded, setAutoExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState<TabOption>(initialTab);
  const [mobileInboxLimit, setMobileInboxLimit] = useState(30);
  const [homeSegment, setHomeSegment] = useState<'today' | 'overdue' | 'soon'>('today');
  const [inboxView, setInboxView] = useState<'reminders' | 'tasks' | 'lists'>('reminders');
  const safeInboxTasks = Array.isArray(inboxTasks) ? inboxTasks : [];
  const safeInboxLists = Array.isArray(inboxLists) ? inboxLists : [];
  const [taskItems, setTaskItems] = useState<TaskItem[]>(safeInboxTasks);
  const [listItems] = useState<TaskListPreview[]>(safeInboxLists);
  const [taskPending, startTaskTransition] = useTransition();
  const [nextActionsOpen, setNextActionsOpen] = useState(false);
  const [showRecover, setShowRecover] = useState(false);
  const { mode: uiMode, setMode: setUiMode, remember: rememberMode, setRemember: setRememberMode } = useModePreference();
  const [homeTab, setHomeTab] = useState<'home' | 'overview'>('home');
  const [sectionFlash, setSectionFlash] = useState<'today' | 'soon' | 'overdue' | null>(null);
  const focusRedesignEnabled = process.env.NEXT_PUBLIC_FOCUS_REDESIGN === 'true';
  const isFocusRedesign = focusRedesignEnabled && uiMode === 'focus';

  if (process.env.NODE_ENV !== 'production') {
    console.log('[FocusRedesign]', { flag: process.env.NEXT_PUBLIC_FOCUS_REDESIGN, uiMode, isFocusRedesign });
  }

  const filteredOccurrences = useMemo(() => {
    const normalized = occurrences
      .filter((occurrence) => occurrence.reminder?.is_active ?? true)
      .filter((occurrence) => {
        const reminder = occurrence.reminder ?? null;
        if (kindFilter === 'tasks' && occurrence.reminder?.kind === 'medication') {
          return false;
        }
        if (kindFilter === 'medications') {
          return false;
        }
        if (createdBy === 'me' && occurrence.reminder?.created_by !== userId) {
          return false;
        }
        if (createdBy === 'others' && occurrence.reminder?.created_by === userId) {
          return false;
        }
        if (assignment === 'assigned_to_me' && occurrence.reminder?.assigned_member_id !== membershipId) {
          return false;
        }
        if (categoryFilter !== 'all') {
          const categoryId = inferReminderCategoryId({
            title: reminder?.title,
            notes: reminder?.notes,
            kind: reminder?.kind,
            category: reminder?.category,
            medicationDetails: reminder?.medication_details
          });
          if (categoryId !== categoryFilter) {
            return false;
          }
        }
        return true;
      })
      .map((occurrence) => ({
        ...occurrence,
        effective_at: occurrence.snoozed_until ?? occurrence.effective_at ?? occurrence.occur_at
      }))
      .sort((a, b) => new Date(a.effective_at ?? a.occur_at).getTime() - new Date(b.effective_at ?? b.occur_at).getTime());
    return normalized;
  }, [occurrences, createdBy, assignment, membershipId, userId, kindFilter, categoryFilter]);

  const inboxReminderItems = useMemo(() => {
    const unscheduled = filteredOccurrences.filter((occurrence) => !occurrence.reminder?.due_at);
    return unscheduled.length ? unscheduled : filteredOccurrences;
  }, [filteredOccurrences]);

  const datedOccurrences = useMemo(
    () => filteredOccurrences.filter((occurrence) => Boolean(occurrence.reminder?.due_at)),
    [filteredOccurrences]
  );

  const effectiveTimeZone = userTimeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const urgencyStyles = useMemo(() => getUrgencyStyles(copy), [copy]);

  const grouped = useMemo(() => {
    const now = new Date();
    const soonCutoff = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const todayBuckets: Record<'overdue' | 'soon' | 'today', OccurrencePayload[]> = {
      overdue: [],
      soon: [],
      today: []
    };
    const upcomingByDay = new Map<string, OccurrencePayload[]>();
    const monthBuckets = new Map<string, OccurrencePayload[]>();

    datedOccurrences.forEach((occurrence) => {
      const rawDate = occurrence.effective_at ?? occurrence.occur_at;
      const reminderTimeZone = resolveReminderTimeZone(occurrence.reminder?.tz ?? null, effectiveTimeZone);
      const compareDate = occurrence.snoozed_until
        ? new Date(rawDate)
        : coerceDateForTimeZone(rawDate, reminderTimeZone);
      if (Number.isNaN(compareDate.getTime())) {
        return;
      }
      const bucketTimeZone = reminderTimeZone || effectiveTimeZone;
      const dayDiff = diffDaysInTimeZone(compareDate, now, bucketTimeZone);
      if (dayDiff <= 0) {
        if (compareDate.getTime() < now.getTime()) {
          todayBuckets.overdue.push(occurrence);
        } else if (compareDate.getTime() <= soonCutoff.getTime()) {
          todayBuckets.soon.push(occurrence);
        } else {
          todayBuckets.today.push(occurrence);
        }
        return;
      }
      if (dayDiff <= 7) {
        const key = getDayKey(compareDate, bucketTimeZone);
        const existing = upcomingByDay.get(key) ?? [];
        existing.push(occurrence);
        upcomingByDay.set(key, existing);
        return;
      }
      const monthKey = getMonthKeyInTimeZone(compareDate, bucketTimeZone);
      const existing = monthBuckets.get(monthKey) ?? [];
      existing.push(occurrence);
      monthBuckets.set(monthKey, existing);
    });

    const monthEntries = Array.from(monthBuckets.entries()).sort(([a], [b]) => a.localeCompare(b));
    const upcomingEntries = Array.from(upcomingByDay.entries()).sort(([a], [b]) => a.localeCompare(b));
    return { todayBuckets, upcomingEntries, monthEntries };
  }, [effectiveTimeZone, datedOccurrences]);

  const todayBuckets = grouped.todayBuckets;
  const todayItems = [...todayBuckets.soon, ...todayBuckets.today];
  const hasToday = todayBuckets.overdue.length + todayItems.length > 0;
  const upcomingEntries = grouped.upcomingEntries;
  const hasUpcoming = upcomingEntries.length > 0;
  const monthEntries = grouped.monthEntries;
  const hasMonthGroups = monthEntries.length > 0;
  const visibleMonthEntries = monthEntries.slice(0, visibleMonthGroups);
  const hasMoreMonths = monthEntries.length > visibleMonthGroups;
  const previewMonthEntry = monthEntries[0];
  const previewMonthItems = previewMonthEntry?.[1]?.slice(0, 3) ?? [];
  const monthLabelFormatter = useMemo(
    () => new Intl.DateTimeFormat(localeTag, { month: 'long', year: 'numeric' }),
    [localeTag]
  );
  const dayLabelFormatter = useMemo(
    () => new Intl.DateTimeFormat(localeTag, { weekday: 'short', day: 'numeric', month: 'short' }),
    [localeTag]
  );

  const mobileBuckets = useMemo(() => {
    const now = new Date();
    const overdue: OccurrencePayload[] = [];
    const today: OccurrencePayload[] = [];
    const soon: OccurrencePayload[] = [];
    const todayAll: OccurrencePayload[] = [];

    datedOccurrences.forEach((occurrence) => {
      const rawDate = occurrence.effective_at ?? occurrence.occur_at;
      const reminderTimeZone = resolveReminderTimeZone(occurrence.reminder?.tz ?? null, effectiveTimeZone);
      const compareDate = occurrence.snoozed_until
        ? new Date(rawDate)
        : coerceDateForTimeZone(rawDate, reminderTimeZone);
      if (Number.isNaN(compareDate.getTime())) return;
      const bucketTimeZone = reminderTimeZone || effectiveTimeZone;
      const dayDiff = diffDaysInTimeZone(compareDate, now, bucketTimeZone);
      const isDone = occurrence.status === 'done';
      if (dayDiff < 0) {
        if (!isDone) overdue.push(occurrence);
        return;
      }
      if (dayDiff === 0) {
        todayAll.push(occurrence);
        if (isDone) return;
        if (compareDate.getTime() < now.getTime()) {
          overdue.push(occurrence);
        } else {
          today.push(occurrence);
        }
        return;
      }
      if (dayDiff <= 7 && !isDone) {
        soon.push(occurrence);
      }
    });

    const doneCount = todayAll.filter((item) => item.status === 'done').length;
    return { overdue, today, soon, todayAll, doneCount, totalCount: todayAll.length };
  }, [effectiveTimeZone, datedOccurrences]);

  const openOccurrences = useMemo(
    () => datedOccurrences.filter((occurrence) => occurrence.status !== 'done'),
    [datedOccurrences]
  );

  const nextUpContext = useMemo(() => {
    const now = new Date();
    const nextDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const items = openOccurrences
      .map((occurrence) => {
        const compareDate = getCompareDate(occurrence, effectiveTimeZone);
        if (Number.isNaN(compareDate.getTime())) return null;
        return { occurrence, compareDate };
      })
      .filter(Boolean) as Array<{ occurrence: OccurrencePayload; compareDate: Date }>;
    const overdue = items
      .filter((item) => item.compareDate.getTime() < now.getTime())
      .sort((a, b) => a.compareDate.getTime() - b.compareDate.getTime());
    const today = items
      .filter((item) => {
        const dayDiff = diffDaysInTimeZone(item.compareDate, now, effectiveTimeZone);
        return dayDiff === 0 && item.compareDate.getTime() >= now.getTime();
      })
      .sort((a, b) => a.compareDate.getTime() - b.compareDate.getTime());
    const upcoming = items
      .filter((item) => item.compareDate.getTime() >= now.getTime() && item.compareDate.getTime() <= nextDay.getTime())
      .sort((a, b) => a.compareDate.getTime() - b.compareDate.getTime());
    const next = overdue[0] ?? today[0] ?? upcoming[0] ?? null;
    return { next, overdue, today, upcoming };
  }, [effectiveTimeZone, openOccurrences]);

  const householdMembers = useMemo(
    () => Object.entries(memberLabels).map(([id, label]) => ({ id, label })),
    [memberLabels]
  );

  const overdueItems = useMemo(
    () => nextUpContext.overdue.map((item) => item.occurrence),
    [nextUpContext.overdue]
  );
  const todayOpenItems = mobileBuckets.today;
  const soonItems = mobileBuckets.soon;

  const householdItems = useMemo(
    () =>
      datedOccurrences.filter((occurrence) => {
        const reminder = occurrence.reminder;
        if (!reminder) return false;
        const assignedId = reminder.assigned_member_id;
        const createdByUser = reminder.created_by;
        return (createdByUser && createdByUser !== userId) || (assignedId && assignedId !== membershipId);
      }),
    [datedOccurrences, membershipId, userId]
  );

  const visibleDoses = useMemo(() => {
    const now = new Date();
    return doseState
      .filter((dose) => {
        if (dose.status !== 'pending') return false;
        const scheduled = new Date(dose.scheduled_at);
        if (Number.isNaN(scheduled.getTime())) return false;
        const dayDiff = diffDaysInTimeZone(scheduled, now, effectiveTimeZone);
        return dayDiff === 0;
      })
      .slice(0, 5);
  }, [doseState, effectiveTimeZone]);

  const medsTodayStats = useMemo(() => {
    const now = new Date();
    const inToday = (dose: MedicationDose) => {
      const scheduled = new Date(dose.scheduled_at);
      if (Number.isNaN(scheduled.getTime())) return false;
      const dayDiff = diffDaysInTimeZone(scheduled, now, effectiveTimeZone);
      return dayDiff === 0;
    };
    const todayItems = doseState.filter(inToday);
    const takenCount = todayItems.filter((dose) => dose.status === 'taken').length;
    return { total: todayItems.length, taken: takenCount };
  }, [doseState, effectiveTimeZone]);

  const inboxReminderBuckets = useMemo(() => {
    const now = new Date();
    const overdue: OccurrencePayload[] = [];
    const today: OccurrencePayload[] = [];
    const soon: OccurrencePayload[] = [];
    const later: OccurrencePayload[] = [];
    const undated: OccurrencePayload[] = [];

    inboxReminderItems.forEach((occurrence) => {
      if (!occurrence.reminder?.due_at) {
        undated.push(occurrence);
        return;
      }
      const rawDate = occurrence.effective_at ?? occurrence.occur_at;
      const reminderTimeZone = resolveReminderTimeZone(occurrence.reminder?.tz ?? null, effectiveTimeZone);
      const compareDate = occurrence.snoozed_until
        ? new Date(rawDate)
        : coerceDateForTimeZone(rawDate, reminderTimeZone);
      if (Number.isNaN(compareDate.getTime())) {
        undated.push(occurrence);
        return;
      }
      const bucketTimeZone = reminderTimeZone || effectiveTimeZone;
      const dayDiff = diffDaysInTimeZone(compareDate, now, bucketTimeZone);
      if (dayDiff < 0) {
        overdue.push(occurrence);
      } else if (dayDiff === 0) {
        today.push(occurrence);
      } else if (dayDiff <= 7) {
        soon.push(occurrence);
      } else {
        later.push(occurrence);
      }
    });

    return { overdue, today, soon, later, undated };
  }, [effectiveTimeZone, inboxReminderItems]);

  const reminderUndated = useMemo(() => inboxReminderBuckets.undated, [inboxReminderBuckets]);
  const reminderUndatedLimited = useMemo(
    () => reminderUndated.slice(0, mobileInboxLimit),
    [reminderUndated, mobileInboxLimit]
  );
  const reminderLater = useMemo(() => inboxReminderBuckets.later, [inboxReminderBuckets]);
  const taskBuckets = useMemo(() => {
    const now = new Date();
    const overdue: TaskItem[] = [];
    const today: TaskItem[] = [];
    const soon: TaskItem[] = [];
    const later: TaskItem[] = [];
    const undated: TaskItem[] = [];
    taskItems.forEach((item) => {
      if (!item.due_date) {
        undated.push(item);
        return;
      }
      const dueDate = new Date(`${item.due_date}T00:00:00`);
      if (Number.isNaN(dueDate.getTime())) {
        undated.push(item);
        return;
      }
      const dayDiff = diffDaysInTimeZone(dueDate, now, effectiveTimeZone);
      if (dayDiff < 0) {
        overdue.push(item);
      } else if (dayDiff === 0) {
        today.push(item);
      } else if (dayDiff <= 7) {
        soon.push(item);
      } else {
        later.push(item);
      }
    });
    return { overdue, today, soon, later, undated };
  }, [taskItems, effectiveTimeZone]);
  const inboxOverdue = inboxReminderBuckets.overdue;
  const inboxToday = inboxReminderBuckets.today;
  const inboxSoon = inboxReminderBuckets.soon;
  const inboxLater = inboxReminderBuckets.later;
  const inboxUndated = inboxReminderBuckets.undated;
  const hasInboxReminders = inboxOverdue.length + inboxToday.length + inboxSoon.length + inboxLater.length + inboxUndated.length > 0;
  const hasInboxTasks = taskBuckets.overdue.length + taskBuckets.today.length + taskBuckets.soon.length + taskBuckets.later.length + taskBuckets.undated.length > 0;

  useEffect(() => {
    if (autoExpanded) return;
    if (isMobile) {
      setShowOverdue(mobileBuckets.overdue.length > 0);
      setShowToday(mobileBuckets.today.length > 0);
      setShowUpcoming(mobileBuckets.soon.length > 0);
      setShowMeds(visibleDoses.length > 0);
      setAutoExpanded(true);
      return;
    }
    if (hasToday) {
      if (overdueItems.length) {
        setShowOverdue(true);
      } else if (todayItems.length) {
        setShowToday(true);
      }
      setAutoExpanded(true);
      return;
    }
    if (hasUpcoming) {
      setShowUpcoming(true);
      setAutoExpanded(true);
    }
  }, [
    autoExpanded,
    hasToday,
    hasUpcoming,
    isMobile,
    mobileBuckets.overdue.length,
    mobileBuckets.today.length,
    mobileBuckets.soon.length,
    overdueItems.length,
    todayItems.length,
    visibleDoses.length
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(max-width: 768px)');
    const handleChange = () => setIsMobile(media.matches);
    handleChange();
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', handleChange);
      return () => media.removeEventListener('change', handleChange);
    }
    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedTab = window.localStorage.getItem('home_tab');
    if (savedTab === 'home' || savedTab === 'overview') {
      setHomeTab(savedTab);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('home_tab', homeTab);
  }, [homeTab]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      const segmentParam = params.get('segment');
      setActiveTab(tabParam === 'inbox' ? 'inbox' : 'today');
      if (segmentParam === 'overdue' || segmentParam === 'today' || segmentParam === 'soon') {
        setHomeSegment(segmentParam);
      }
    };
    window.addEventListener('popstate', handlePopState);
    handlePopState();
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleTabEvent = (event: Event) => {
      const detail = (event as CustomEvent<{ tab?: TabOption }>).detail;
      if (!detail?.tab) return;
      setActiveTab(detail.tab);
    };
    window.addEventListener('dashboard:tab', handleTabEvent as EventListener);
    return () => window.removeEventListener('dashboard:tab', handleTabEvent as EventListener);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (householdId) {
      window.localStorage.setItem('smart-reminder-household', householdId);
    }
  }, [householdId]);

  const handleTabChange = (tab: TabOption) => {
    setActiveTab(tab);
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    params.set('tab', tab);
    const nextUrl = `/app?${params.toString()}`;
    window.history.replaceState(null, '', nextUrl);
  };

  const handleDoseStatus = async (doseId: string, status: 'taken' | 'skipped', skippedReason?: string) => {
    try {
      const resolvedReason = status === 'skipped'
        ? (skippedReason ?? copy.dashboard.medicationsReasonForgot)
        : undefined;
      const response = await fetch(`/api/medications/dose/${doseId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, skippedReason: resolvedReason })
      });
      if (!response.ok) {
        return;
      }
      const payload = await response.json().catch(() => null);
      if (!payload?.dose) {
        return;
      }
      setDoseState((prev) =>
        prev.map((dose) =>
          dose.id === doseId
            ? { ...dose, status: payload.dose.status, skipped_reason: payload.dose.skipped_reason, taken_at: payload.dose.taken_at }
            : dose
        )
      );
    } catch (error) {
      console.error('[medication] update dose failed', error);
    }
  };

  const nextOccurrence = nextUpContext.next?.occurrence ?? null;
  const nextOccurrenceDate = nextUpContext.next?.compareDate ?? null;

  const nextOccurrenceLabel = useMemo(() => {
    if (!nextOccurrenceDate) return null;
    const diffMinutes = Math.round((nextOccurrenceDate.getTime() - Date.now()) / 60000);
    const absMinutes = Math.abs(diffMinutes);
    const rtf = new Intl.RelativeTimeFormat(locale === 'ro' ? 'ro-RO' : locale, { numeric: 'auto' });
    if (absMinutes < 60) {
      return rtf.format(diffMinutes, 'minute');
    }
    const diffHours = Math.round(diffMinutes / 60);
    if (Math.abs(diffHours) < 24) {
      return rtf.format(diffHours, 'hour');
    }
    const diffDays = Math.round(diffHours / 24);
    return rtf.format(diffDays, 'day');
  }, [locale, nextOccurrenceDate]);

  const nextCategory = useMemo(() => {
    if (!nextOccurrence) return null;
    const categoryId = inferReminderCategoryId({
      title: nextOccurrence.reminder?.title,
      notes: nextOccurrence.reminder?.notes,
      kind: nextOccurrence.reminder?.kind,
      category: nextOccurrence.reminder?.category,
      medicationDetails: nextOccurrence.reminder?.medication_details
    });
    return getReminderCategory(categoryId);
  }, [nextOccurrence]);
  const segmentItems =
    homeSegment === 'overdue'
      ? overdueItems
      : homeSegment === 'soon'
        ? soonItems
        : todayOpenItems;

  const nextIsOverdue = Boolean(nextOccurrence && overdueItems.some((item) => item.id === nextOccurrence.id));
  const nextIsUrgent = Boolean(
    nextOccurrenceDate &&
      !nextIsOverdue &&
      nextOccurrenceDate.getTime() - Date.now() <= 30 * 60 * 1000 &&
      nextOccurrenceDate.getTime() >= Date.now()
  );
  const nextTone = nextIsOverdue ? 'overdue' : nextIsUrgent ? 'urgent' : 'normal';
  const overdueTopItems = useMemo(() => overdueItems.slice(0, 5), [overdueItems]);
  const priorityItems = useMemo(() => (showRecover ? overdueTopItems : overdueTopItems.slice(0, 3)), [overdueTopItems, showRecover]);
  const homeSubtitle = `${todayOpenItems.length} ${copy.dashboard.homeSubtitleToday} • ${overdueItems.length} ${copy.dashboard.homeSubtitleOverdue}`;
  const nextDoseTileLabel = useMemo(() => {
    if (!visibleDoses.length) return copy.dashboard.medicationsTileEmpty;
    const nextTime = new Date(visibleDoses[0].scheduled_at).toLocaleTimeString(localeTag, {
      hour: '2-digit',
      minute: '2-digit'
    });
    return `${copy.dashboard.medicationsTileNext} ${nextTime}`;
  }, [copy.dashboard.medicationsTileEmpty, copy.dashboard.medicationsTileNext, localeTag, visibleDoses]);
  const overdueOldestDays = useMemo(() => {
    if (!overdueItems.length) return 0;
    const oldest = overdueItems.reduce((prev, current) => {
      const prevDate = new Date(prev.occur_at ?? prev.effective_at ?? prev.snoozed_until ?? 0);
      const currentDate = new Date(current.occur_at ?? current.effective_at ?? current.snoozed_until ?? 0);
      return prevDate.getTime() <= currentDate.getTime() ? prev : current;
    });
    const now = new Date();
    const compareDate = new Date(oldest.occur_at ?? oldest.effective_at ?? oldest.snoozed_until ?? now);
    return Math.abs(diffDaysInTimeZone(compareDate, now, effectiveTimeZone || 'UTC'));
  }, [effectiveTimeZone, overdueItems]);
  const overdueOldestLabel = useMemo(() => {
    if (!overdueItems.length) return copy.dashboard.overdueTileEmpty;
    return copy.dashboard.overdueTileOldest.replace('{days}', String(overdueOldestDays));
  }, [copy.dashboard.overdueTileEmpty, copy.dashboard.overdueTileOldest, overdueItems.length, overdueOldestDays]);
  const focusItems = useMemo(() => [...overdueItems, ...todayOpenItems], [overdueItems, todayOpenItems]);
  const isOverdueCritical = overdueItems.length > 20 || overdueOldestDays > 7;
  const overdueTileClass = isOverdueCritical ? 'stat-tile-overdue stat-tile-overdue-critical' : 'stat-tile-overdue';
  const nextUpActionsSheet = nextOccurrence ? (
    <ReminderActionsSheet
      open={nextActionsOpen}
      onClose={() => setNextActionsOpen(false)}
      title={nextOccurrence.reminder?.title ?? copy.reminderDetail.title}
      categoryLabel={nextCategory?.label}
      categoryClassName="badge badge-blue"
    >
      <div className="space-y-2">
        <Link
          className="block w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-semibold text-slate-100 shadow-sm transition hover:bg-white/10 whitespace-normal break-words"
          href={`/app/reminders/${nextOccurrence.reminder?.id}`}
          onClick={() => setNextActionsOpen(false)}
        >
          {copy.common.details}
        </Link>
        <Link
          className="block w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-semibold text-slate-100 shadow-sm transition hover:bg-white/10 whitespace-normal break-words"
          href={`/app/reminders/${nextOccurrence.reminder?.id}/edit`}
          onClick={() => setNextActionsOpen(false)}
        >
          {copy.common.edit}
        </Link>
        <form action={cloneReminder}>
          <input type="hidden" name="reminderId" value={nextOccurrence.reminder?.id ?? ''} />
          <ActionSubmitButton
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-semibold text-slate-100 shadow-sm transition hover:bg-white/10 whitespace-normal break-words"
            type="submit"
            onClick={() => setNextActionsOpen(false)}
            data-action-feedback={copy.common.actionCloned}
          >
            {copy.reminderDetail.clone}
          </ActionSubmitButton>
        </form>
        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-semibold text-slate-400">
          {copy.actions.calendar}
          <div className="mt-2 space-y-2 text-sm font-semibold text-slate-100">
            <div onClickCapture={() => setNextActionsOpen(false)}>
              <GoogleCalendarSyncButton
                reminderId={nextOccurrence.reminder?.id ?? ''}
                connected={googleConnected}
                variant="menu"
                copy={{
                  syncLabel: copy.actions.sendDirect,
                  syncLoading: copy.reminderDetail.googleCalendarSyncing,
                  syncSuccess: copy.reminderDetail.googleCalendarSyncSuccess,
                  syncError: copy.reminderDetail.googleCalendarSyncError,
                  connectFirst: copy.reminderDetail.googleCalendarConnectFirst,
                  connectLink: copy.reminderDetail.googleCalendarConnectLink
                }}
              />
            </div>
            <div onClickCapture={() => setNextActionsOpen(false)}>
              <GoogleCalendarAutoBlockButton
                reminderId={nextOccurrence.reminder?.id ?? ''}
                connected={googleConnected}
                hasDueDate={Boolean(nextOccurrence.reminder?.due_at)}
                variant="menu"
                copy={{
                  label: copy.actions.schedule,
                  loading: copy.reminderDetail.googleCalendarAutoBlocking,
                  success: copy.reminderDetail.googleCalendarAutoBlockSuccess,
                  error: copy.reminderDetail.googleCalendarAutoBlockError,
                  connectHint: copy.reminderDetail.googleCalendarConnectFirst,
                  connectLink: copy.reminderDetail.googleCalendarConnectLink,
                  missingDueDate: copy.reminderDetail.googleCalendarAutoBlockMissingDueDate,
                  confirmIfBusy: copy.reminderDetail.googleCalendarAutoBlockConfirmBusy
                }}
              />
            </div>
          </div>
        </div>
        <GoogleCalendarDeleteDialog
          reminderId={nextOccurrence.reminder?.id ?? ''}
          hasGoogleEvent={Boolean(nextOccurrence.reminder?.google_event_id)}
          copy={{
            label: copy.common.delete,
            dialogTitle: copy.reminderDetail.googleCalendarDeleteTitle,
            dialogHint: copy.reminderDetail.googleCalendarDeleteHint,
            justReminder: copy.reminderDetail.googleCalendarDeleteOnly,
            reminderAndCalendar: copy.reminderDetail.googleCalendarDeleteBoth,
            cancel: copy.reminderDetail.googleCalendarDeleteCancel
          }}
        />
        <button
          type="button"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 shadow-sm transition hover:bg-white/10"
          onClick={() => setNextActionsOpen(false)}
        >
          {copy.common.back}
        </button>
      </div>
    </ReminderActionsSheet>
  ) : null;

  const handleSegmentSelect = (id: 'today' | 'soon' | 'overdue') => {
    setHomeSegment(id);
    if (homeTab !== 'home') {
      setHomeTab('home');
    }
    if (typeof window === 'undefined') return;
    requestAnimationFrame(() => {
      const target = document.getElementById(`section-${id}`);
      if (!target) return;
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setSectionFlash(id);
      window.setTimeout(() => setSectionFlash(null), 320);
    });
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const subtitle =
      activeTab === 'inbox'
        ? inboxView === 'tasks'
          ? `${taskItems.length} taskuri`
          : inboxView === 'lists'
            ? `${listItems.length} liste`
            : `${inboxReminderItems.length} ${copy.dashboard.reminderCountLabel}`
        : `${todayOpenItems.length} ${copy.dashboard.todayTitle} • ${overdueItems.length} ${copy.dashboard.todayOverdue}`;
    window.dispatchEvent(new CustomEvent('topbar:subtitle', { detail: { subtitle } }));
    return () => {
      window.dispatchEvent(new CustomEvent('topbar:clear'));
    };
  }, [
    activeTab,
    inboxReminderItems.length,
    inboxView,
    taskItems.length,
    listItems.length,
    todayOpenItems.length,
    overdueItems.length,
    copy.dashboard.reminderCountLabel,
    copy.dashboard.todayTitle,
    copy.dashboard.todayOverdue
  ]);

  useEffect(() => {
    setTaskItems(inboxTasks);
  }, [inboxTasks]);

  useEffect(() => {
    if (!inboxReminderItems.length && taskItems.length) {
      setInboxView('tasks');
    }
  }, [inboxReminderItems.length, taskItems.length]);

  const handleToggleTask = (item: TaskItem) => {
    startTaskTransition(async () => {
      const nextDone = !item.done;
      setTaskItems((prev) => prev.map((row) => (row.id === item.id ? { ...row, done: nextDone } : row)));
      await toggleTaskDoneAction(item.id, nextDone);
    });
  };

  const desktopTab = activeTab === 'inbox' ? 'inbox' : 'today';

  if (!isMobile && isFocusRedesign) {
    return (
      <section className={`homeRoot premium ${uiMode === 'focus' ? 'modeFocus' : 'modeFamily'} space-y-6`}>
        <div className="home-slate space-y-3 today-shell home-compact">
          <div className="home-slate-bg" aria-hidden="true" />
          <HomeHeader
            title={copy.dashboard.title}
            subtitle={homeSubtitle}
            modeSwitcher={
              <ModeSwitcher
                value={uiMode}
                onChange={setUiMode}
                remember={rememberMode}
                onRememberChange={setRememberMode}
              />
            }
          />
          <FocusHome
            copy={copy}
            nextOccurrence={nextOccurrence}
            nextOccurrenceLabel={nextOccurrenceLabel ?? undefined}
            nextCategory={nextCategory ?? null}
            nextTone={nextTone}
            statusLabel={copy.dashboard.todayOverdue}
            emptyLabel={copy.dashboard.nextUpEmpty}
            action={
              nextOccurrence?.id && nextOccurrence?.reminder?.id && nextOccurrence?.occur_at
                ? {
                    occurrenceId: nextOccurrence.id,
                    reminderId: nextOccurrence.reminder.id,
                    occurAt: nextOccurrence.occur_at,
                    label: copy.dashboard.nextUpAction,
                    feedbackLabel: copy.common.actionDone
                  }
                : null
            }
            secondaryLabels={{
              snooze30: copy.dashboard.nextUpSnooze30,
              snoozeTomorrow: copy.dashboard.nextUpSnoozeTomorrow
            }}
            focusCopy={copy.dashboard.nextUpFocusLine}
            todayItems={focusItems}
            locale={locale}
            userTimeZone={effectiveTimeZone}
          />
        </div>
      </section>
    );
  }

  return isMobile ? (
      <section className={`homeRoot premium ${uiMode === 'focus' ? 'modeFocus' : 'modeFamily'} space-y-[var(--space-3)]`}>
        {activeTab === 'inbox' ? (
          <div className="space-y-[var(--space-3)]">
            <div className="card-soft flex items-center justify-between px-[var(--space-3)] py-[var(--space-2)]">
              <div className="text-sm font-semibold text-text">Inbox</div>
              <div className="text-xs text-muted2">
              {inboxView === 'tasks'
                ? `${taskItems.length} taskuri`
                : inboxView === 'lists'
                  ? `${listItems.length} liste`
                  : `${inboxReminderItems.length} ${copy.dashboard.reminderCountLabel}`}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={`premium-chip ${inboxView === 'reminders' ? 'border-[color:rgba(59,130,246,0.4)] text-[color:rgb(var(--accent-2))]' : ''}`}
                onClick={() => setInboxView('reminders')}
              >
                Remindere
              </button>
              <button
                type="button"
                className={`premium-chip ${inboxView === 'tasks' ? 'border-[color:rgba(59,130,246,0.4)] text-[color:rgb(var(--accent-2))]' : ''}`}
                onClick={() => setInboxView('tasks')}
              >
                Taskuri
              </button>
              <button
                type="button"
                className={`premium-chip ${inboxView === 'lists' ? 'border-[color:rgba(59,130,246,0.4)] text-[color:rgb(var(--accent-2))]' : ''}`}
                onClick={() => setInboxView('lists')}
              >
                Liste
              </button>
            </div>
            {inboxView === 'reminders' ? (
              <details className="card-soft group p-[var(--space-3)]">
                <summary className="flex cursor-pointer items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-muted2">
                  Filtre
                  <span className="text-[11px] font-semibold text-muted2 group-open:rotate-180 transition">▾</span>
                </summary>
                <div className="mt-[var(--space-2)]">
                  <ReminderFiltersPanel
                    locale={locale}
                    kindFilter={kindFilter}
                    createdBy={createdBy}
                    assignment={assignment}
                    category={categoryFilter}
                    onChangeKind={(value) => setKindFilter(value)}
                    onChangeCreatedBy={(value) => {
                      if (CreatedOptions.includes(value)) {
                        setCreatedBy(value);
                      }
                    }}
                    onChangeAssignment={(value) => {
                      if (AssignmentOptions.includes(value)) {
                        setAssignment(value);
                      }
                    }}
                    onChangeCategory={(value) => setCategoryFilter(value)}
                  />
                </div>
              </details>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'rent', label: 'Plată chirie', text: 'Plata chiriei pe 1 ale lunii la 9:00' },
                { id: 'itp', label: 'RCA/ITP', text: 'ITP mașină pe 1 iunie la 10:00' },
                { id: 'meds', label: 'Medicament zilnic', href: '/app/medications/new' },
                { id: 'appointment', label: 'Programare', text: 'Programare la dentist mâine la 12:00' }
              ].map((chip) =>
                chip.href ? (
                  <Link key={chip.id} href={chip.href} className="chip chip-selected">
                    {chip.label}
                  </Link>
                ) : (
                  <Link
                    key={chip.id}
                    href={`/app/reminders/new?quick=${encodeURIComponent(chip.text ?? '')}`}
                    className="chip"
                  >
                    {chip.label}
                  </Link>
                )
              )}
            </div>
            {inboxView === 'tasks' ? (
              taskItems.length ? (
                <div className="space-y-[var(--space-3)]">
                  {taskBuckets.overdue.length ? (
                    <div className="space-y-2">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-tertiary">Restante</div>
                      {taskBuckets.overdue.map((item) => (
                        <div key={item.id} className="premium-card flex items-start gap-3 px-4 py-3">
                          <button
                            type="button"
                            className="mt-0.5 text-[color:rgb(var(--accent))]"
                            aria-pressed={item.done}
                            aria-label={item.done ? 'Marchează ca nefinalizat' : 'Marchează ca finalizat'}
                            onClick={() => handleToggleTask(item)}
                            disabled={taskPending}
                          >
                            {item.done ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className={`text-sm font-semibold ${item.done ? 'text-muted line-through' : 'text-ink'}`}>
                              {item.title}
                            </div>
                            {item.due_date ? (
                              <div className="mt-1 text-xs text-muted">Scadență: {item.due_date}</div>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {taskBuckets.today.length ? (
                    <div className="space-y-2">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-tertiary">Azi</div>
                      {taskBuckets.today.map((item) => (
                        <div key={item.id} className="premium-card flex items-start gap-3 px-4 py-3">
                          <button
                            type="button"
                            className="mt-0.5 text-[color:rgb(var(--accent))]"
                            aria-pressed={item.done}
                            aria-label={item.done ? 'Marchează ca nefinalizat' : 'Marchează ca finalizat'}
                            onClick={() => handleToggleTask(item)}
                            disabled={taskPending}
                          >
                            {item.done ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className={`text-sm font-semibold ${item.done ? 'text-muted line-through' : 'text-ink'}`}>
                              {item.title}
                            </div>
                            {item.due_date ? (
                              <div className="mt-1 text-xs text-muted">Scadență: {item.due_date}</div>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {taskBuckets.soon.length ? (
                    <div className="space-y-2">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-tertiary">Următoarele 7 zile</div>
                      {taskBuckets.soon.map((item) => (
                        <div key={item.id} className="premium-card flex items-start gap-3 px-4 py-3">
                          <button
                            type="button"
                            className="mt-0.5 text-[color:rgb(var(--accent))]"
                            aria-pressed={item.done}
                            aria-label={item.done ? 'Marchează ca nefinalizat' : 'Marchează ca finalizat'}
                            onClick={() => handleToggleTask(item)}
                            disabled={taskPending}
                          >
                            {item.done ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className={`text-sm font-semibold ${item.done ? 'text-muted line-through' : 'text-ink'}`}>
                              {item.title}
                            </div>
                            {item.due_date ? (
                              <div className="mt-1 text-xs text-muted">Scadență: {item.due_date}</div>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {taskBuckets.later.length ? (
                    <div className="space-y-2">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-tertiary">Mai târziu</div>
                      {taskBuckets.later.map((item) => (
                        <div key={item.id} className="premium-card flex items-start gap-3 px-4 py-3">
                          <button
                            type="button"
                            className="mt-0.5 text-[color:rgb(var(--accent))]"
                            aria-pressed={item.done}
                            aria-label={item.done ? 'Marchează ca nefinalizat' : 'Marchează ca finalizat'}
                            onClick={() => handleToggleTask(item)}
                            disabled={taskPending}
                          >
                            {item.done ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className={`text-sm font-semibold ${item.done ? 'text-muted line-through' : 'text-ink'}`}>
                              {item.title}
                            </div>
                            {item.due_date ? (
                              <div className="mt-1 text-xs text-muted">Scadență: {item.due_date}</div>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {taskBuckets.undated.length ? (
                    <div className="space-y-2">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-tertiary">Fără dată</div>
                      {taskBuckets.undated.map((item) => (
                        <div key={item.id} className="premium-card flex items-start gap-3 px-4 py-3">
                          <button
                            type="button"
                            className="mt-0.5 text-[color:rgb(var(--accent))]"
                            aria-pressed={item.done}
                            aria-label={item.done ? 'Marchează ca nefinalizat' : 'Marchează ca finalizat'}
                            onClick={() => handleToggleTask(item)}
                            disabled={taskPending}
                          >
                            {item.done ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className={`text-sm font-semibold ${item.done ? 'text-muted line-through' : 'text-ink'}`}>
                              {item.title}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="premium-card p-[var(--space-3)] text-sm text-tertiary">
                  Nu ai taskuri în Inbox.
                </div>
              )
            ) : inboxView === 'lists' ? (
              listItems.length ? (
                <div className="space-y-[var(--space-2)]">
                  {listItems.map((list) => (
                    <div key={list.id} className="premium-card space-y-2 px-4 py-3 transition hover:bg-surfaceMuted">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link href={`/app/lists/${list.id}`} className="text-sm font-semibold text-ink truncate">
                            {list.name}
                          </Link>
                          <div className="text-xs text-tertiary">
                            {list.doneCount}/{list.totalCount} finalizate
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="chip">
                            {list.type === 'shopping' ? 'Shopping' : 'Listă'}
                          </span>
                          <div className="flex items-center gap-2">
                            <ListReminderButton listId={list.id} listTitle={list.name} />
                            <ListShareSheet listId={list.id} members={householdMembers} shared={Boolean(list.household_id)} />
                          </div>
                        </div>
                      </div>
                      {list.household_id ? (
                        <div className="text-[11px] font-semibold text-[color:rgb(var(--accent-2))]">
                          Shared · {householdMembers.length}
                        </div>
                      ) : null}
                      {list.previewItems.length ? (
                        <div className="space-y-1 text-xs text-muted">
                          {list.previewItems.map((item) => (
                            <div key={item.id} className={item.done ? 'line-through text-tertiary' : ''}>
                              • {item.title}{item.qty ? ` · ${item.qty}` : ''}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-tertiary">Nicio intrare încă.</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="premium-card p-[var(--space-3)] text-sm text-tertiary">
                  Nu ai liste create.
                </div>
              )
            ) : (
              <>
                {inboxOverdue.length ? (
                  <div className="space-y-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-tertiary">Restante</div>
                    {inboxOverdue.map((occurrence) => (
                      <ReminderRowMobile
                        key={occurrence.id}
                        occurrence={occurrence}
                        locale={locale}
                        googleConnected={googleConnected}
                        userTimeZone={effectiveTimeZone}
                      />
                    ))}
                  </div>
                ) : null}
                {inboxToday.length ? (
                  <div className="space-y-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-tertiary">Azi</div>
                    {inboxToday.map((occurrence) => (
                      <ReminderRowMobile
                        key={occurrence.id}
                        occurrence={occurrence}
                        locale={locale}
                        googleConnected={googleConnected}
                        userTimeZone={effectiveTimeZone}
                      />
                    ))}
                  </div>
                ) : null}
                {inboxSoon.length ? (
                  <div className="space-y-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-tertiary">Următoarele 7 zile</div>
                    {inboxSoon.map((occurrence) => (
                      <ReminderRowMobile
                        key={occurrence.id}
                        occurrence={occurrence}
                        locale={locale}
                        googleConnected={googleConnected}
                        userTimeZone={effectiveTimeZone}
                      />
                    ))}
                  </div>
                ) : null}
                {inboxLater.length ? (
                  <div className="space-y-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-tertiary">Mai târziu</div>
                    {inboxLater.map((occurrence) => (
                      <ReminderRowMobile
                        key={occurrence.id}
                        occurrence={occurrence}
                        locale={locale}
                        googleConnected={googleConnected}
                        userTimeZone={effectiveTimeZone}
                      />
                    ))}
                  </div>
                ) : null}
                {reminderUndatedLimited.length ? (
                  <div className="space-y-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-tertiary">Fără dată</div>
                    {reminderUndatedLimited.map((occurrence) => (
                      <ReminderRowMobile
                        key={occurrence.id}
                        occurrence={occurrence}
                        locale={locale}
                        googleConnected={googleConnected}
                        userTimeZone={effectiveTimeZone}
                      />
                    ))}
                  </div>
                ) : null}
                {!inboxOverdue.length && !inboxToday.length && !inboxSoon.length && !inboxLater.length && !reminderUndatedLimited.length ? (
                  <div className="premium-card p-[var(--space-3)] text-sm text-tertiary">
                    {copy.dashboard.empty}
                  </div>
                ) : null}
              </>
            )}
            {inboxView === 'reminders' && reminderUndated.length > mobileInboxLimit ? (
              <button
                type="button"
                className="text-xs font-semibold text-secondary"
                onClick={() => setMobileInboxLimit((prev) => prev + 20)}
              >
                {copy.dashboard.viewMoreMonths}
              </button>
            ) : null}
          </div>
        ) : (
          <div className="home-slate space-y-3 today-shell home-compact">
            <div className="home-slate-bg" aria-hidden="true" />
            <HomeHeader
              title={copy.dashboard.title}
              subtitle={homeSubtitle}
              modeSwitcher={
                <ModeSwitcher
                  value={uiMode}
                  onChange={setUiMode}
                  remember={rememberMode}
                  onRememberChange={setRememberMode}
                />
              }
            />
            {isFocusRedesign ? null : (
              <div className="homeTopControls mx-4 mt-1 flex flex-wrap items-center justify-between gap-2 text-[11px] text-white/40">
                <div className="homeTabToggle flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 text-[11px]">
                  <button
                    type="button"
                    className={`rounded-full px-3 py-1 transition ${
                      homeTab === 'home' ? 'bg-white/10 text-white' : 'text-white/60'
                    }`}
                    onClick={() => setHomeTab('home')}
                  >
                    Acasă
                  </button>
                  <button
                    type="button"
                    className={`rounded-full px-3 py-1 transition ${
                      homeTab === 'overview' ? 'bg-white/10 text-white' : 'text-white/60'
                    }`}
                    onClick={() => setHomeTab('overview')}
                  >
                    Overview
                  </button>
                </div>
              </div>
            )}

            {isFocusRedesign ? (
              <FocusHome
                copy={copy}
                nextOccurrence={nextOccurrence}
                nextOccurrenceLabel={nextOccurrenceLabel ?? undefined}
                nextCategory={nextCategory ?? null}
                nextTone={nextTone}
                statusLabel={copy.dashboard.todayOverdue}
                emptyLabel={copy.dashboard.nextUpEmpty}
                action={
                  nextOccurrence?.id && nextOccurrence?.reminder?.id && nextOccurrence?.occur_at
                    ? {
                        occurrenceId: nextOccurrence.id,
                        reminderId: nextOccurrence.reminder.id,
                        occurAt: nextOccurrence.occur_at,
                        label: copy.dashboard.nextUpAction,
                        feedbackLabel: copy.common.actionDone
                      }
                    : null
                }
                secondaryLabels={{
                  snooze30: copy.dashboard.nextUpSnooze30,
                  snoozeTomorrow: copy.dashboard.nextUpSnoozeTomorrow
                }}
                focusCopy={copy.dashboard.nextUpFocusLine}
                todayItems={focusItems}
                locale={locale}
                userTimeZone={effectiveTimeZone}
              />
            ) : homeTab === 'overview' ? (
              <section className="space-y-3">
                <div className="home-glass-panel rounded-[var(--radius-lg)] px-[var(--space-2)] py-[var(--space-2)]">
                  <div className="text-sm font-semibold text-[color:var(--text-0)]">Situația ta</div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-xs text-white/70">
                      <div className="text-base font-semibold text-white">{todayOpenItems.length}</div>
                      {copy.dashboard.todayTitle}
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-xs text-white/70">
                      <div className="text-base font-semibold text-white">{soonItems.length}</div>
                      {copy.dashboard.todaySoon}
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-xs text-white/70">
                      <div className="text-base font-semibold text-white">{overdueItems.length}</div>
                      {copy.dashboard.todayOverdue}
                    </div>
                  </div>
                </div>
                <div className="home-glass-panel rounded-[var(--radius-lg)] px-[var(--space-2)] py-[var(--space-2)]">
                  <div className="text-sm font-semibold text-[color:var(--text-0)]">Medicamente</div>
                  <div className="mt-2 flex items-center justify-between text-xs text-white/70">
                    <span>{copy.dashboard.medicationsTileTitle}</span>
                    <span>
                      {medsTodayStats.taken}/{medsTodayStats.total}
                    </span>
                  </div>
                </div>
                {isFocusRedesign ? null : (
                  <div className="home-glass-panel rounded-[var(--radius-lg)] px-[var(--space-2)] py-[var(--space-2)]">
                    <div className="text-sm font-semibold text-[color:var(--text-0)]">Grupuri</div>
                    <div className="mt-2 flex items-center justify-between text-xs text-white/70">
                      <span>{copy.dashboard.householdTitle}</span>
                      <span>{householdItems.length}</span>
                    </div>
                  </div>
                )}
              </section>
            ) : (
              <>
                <NextUpCard
                  title={copy.dashboard.nextTitle}
                  subtext={copy.dashboard.nextUpHelper}
                  taskTitle={nextOccurrence?.reminder?.title ?? undefined}
                  timeLabel={nextOccurrenceLabel ?? undefined}
                  badge={nextCategory?.label}
                  badgeStyle={nextCategory ? getCategoryChipStyle(nextCategory.color, true) : undefined}
                  tone={nextTone}
                  statusLabel={copy.dashboard.todayOverdue}
                  emptyLabel={copy.dashboard.nextUpEmpty}
                  action={
                    nextOccurrence?.id && nextOccurrence?.reminder?.id && nextOccurrence?.occur_at
                      ? {
                          occurrenceId: nextOccurrence.id,
                          reminderId: nextOccurrence.reminder.id,
                          occurAt: nextOccurrence.occur_at,
                          label: copy.dashboard.nextUpAction,
                          feedbackLabel: copy.common.actionDone
                        }
                      : null
                  }
                  secondaryLabels={{
                    snooze30: copy.dashboard.nextUpSnooze30,
                    snoozeTomorrow: copy.dashboard.nextUpSnoozeTomorrow
                  }}
                  focusCopy={copy.dashboard.nextUpFocusLine}
                  moreLabel={copy.common.moreActions}
                  onMoreActions={nextOccurrence ? () => setNextActionsOpen(true) : undefined}
                />

                {nextUpActionsSheet}

                <QuickAddBar />

                {isFocusRedesign ? null : (
                  <AtAGlanceRow
                    metrics={[
                      {
                        id: 'today',
                        label: copy.dashboard.todayTileTitle,
                        count: todayOpenItems.length,
                        subLabel: todayOpenItems.length ? copy.dashboard.todayTileHint : copy.dashboard.todayTileEmpty,
                        tileClass: 'stat-tile-today',
                        icon: SunMedium
                      },
                      {
                        id: 'soon',
                        label: copy.dashboard.soonTileTitle,
                        count: soonItems.length,
                        subLabel: copy.dashboard.soonTileHint,
                        tileClass: 'stat-tile-soon',
                        icon: Calendar
                      },
                      {
                        id: 'meds',
                        label: copy.dashboard.medicationsTileTitle,
                        count: visibleDoses.length,
                        subLabel: nextDoseTileLabel,
                        tileClass: 'stat-tile-meds',
                        icon: Pill
                      },
                      {
                        id: 'overdue',
                        label: copy.dashboard.todayOverdue,
                        count: overdueItems.length,
                        subLabel: overdueOldestLabel,
                        tileClass: overdueTileClass,
                        icon: AlertTriangle
                      }
                    ]}
                    activeId={homeSegment}
                    variant="secondary"
                    onSelect={(id) => {
                      if (id === 'overdue') handleSegmentSelect('overdue');
                      if (id === 'today') handleSegmentSelect('today');
                      if (id === 'soon') handleSegmentSelect('soon');
                    }}
                  />
                )}

                {isFocusRedesign ? null : (
                  visibleDoses.length ? (
                    <MedsTeaserCard
                      title={copy.dashboard.medicationsTitle}
                      subtitle={`Următoarea doză: ${new Date(visibleDoses[0].scheduled_at).toLocaleTimeString(localeTag, {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}`}
                      actionLabel={copy.medicationsHub.viewDetails}
                      onAction={() => {
                        router.push('/app/medications');
                      }}
                    />
                  ) : (
                    <MedsTeaserCard title={copy.dashboard.medicationsTitle} subtitle={copy.dashboard.medicationsEmpty} />
                  )
                )}

                {isFocusRedesign || !overdueTopItems.length ? null : (
                  <section className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-[color:var(--text-0)]">{copy.dashboard.overdueTopTitle}</div>
                      <button
                        type="button"
                        className="text-xs font-semibold text-[color:var(--brand-blue)]"
                        onClick={() => setShowRecover((prev) => !prev)}
                      >
                        {copy.dashboard.overdueTopCta}
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {copy.dashboard.priorityFilters.map((label) => (
                        <span key={label} className="home-chip">
                          {label}
                        </span>
                      ))}
                    </div>
                    <div className="space-y-2">
                      {priorityItems.map((occurrence) => (
                        <OverdueDenseRow
                          key={occurrence.id}
                          occurrence={occurrence}
                          locale={locale}
                          googleConnected={googleConnected}
                          userTimeZone={effectiveTimeZone}
                          variant="priority"
                          primaryLabel={copy.dashboard.nextUpAction}
                          secondaryLabel={copy.dashboard.prioritySnooze}
                        />
                      ))}
                    </div>
                  </section>
                )}

                <div id="section-today" aria-hidden="true" />
                <div id="section-soon" aria-hidden="true" />
                <div id="section-overdue" aria-hidden="true" />

                <section id="overdue-list" className="space-y-2">
                  <div className={`flex items-center justify-between text-sm font-semibold text-[color:var(--text-0)] ${
                      sectionFlash === homeSegment ? 'section-focus' : ''
                    }`}>
                    <span>
                      {homeSegment === 'overdue'
                        ? copy.dashboard.todayOverdue
                        : homeSegment === 'soon'
                          ? copy.dashboard.todaySoon
                          : copy.dashboard.todayTitle}
                    </span>
                    <span className="text-xs text-[color:var(--text-2)]">
                      {segmentItems.length} {copy.dashboard.reminderCountLabel}
                    </span>
                  </div>
                  {homeSegment === 'overdue' ? (
                    overdueItems.length ? (
                      <div className="space-y-2">
                        {overdueItems.map((occurrence) => (
                          <OverdueDenseRow
                            key={occurrence.id}
                            occurrence={occurrence}
                            locale={locale}
                            googleConnected={googleConnected}
                            userTimeZone={effectiveTimeZone}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="home-glass-panel rounded-[var(--radius-lg)] p-[var(--space-3)] text-sm text-[color:var(--text-2)]">
                        {copy.dashboard.todayEmpty}
                      </div>
                    )
                  ) : (
                    <FilteredTaskList
                      items={segmentItems}
                      locale={locale}
                      googleConnected={googleConnected}
                      userTimeZone={effectiveTimeZone}
                      emptyLabel={copy.dashboard.todayEmpty}
                    />
                  )}
                </section>
              </>
            )}
          </div>
        )}
      </section>
    ) : (
    <section className={`homeRoot premium ${uiMode === 'focus' ? 'modeFocus' : 'modeFamily'} space-y-6`}>
      <div className="flex flex-wrap items-center gap-2 md:hidden">
        <button
          type="button"
          className={`rounded-full px-4 py-2 text-xs font-semibold ${
            activeTab === 'today' ? 'bg-[color:var(--accent-soft-bg)] text-ink shadow-sm' : 'bg-surface text-muted'
          }`}
          onClick={() => handleTabChange('today')}
        >
          {copy.nav.today}
        </button>
        <button
          type="button"
          className={`rounded-full px-4 py-2 text-xs font-semibold ${
            activeTab === 'inbox' ? 'bg-[color:var(--accent-soft-bg)] text-ink shadow-sm' : 'bg-surface text-muted'
          }`}
          onClick={() => handleTabChange('inbox')}
        >
          {copy.nav.inbox}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)] md:gap-8">
        <aside className="order-1 space-y-4 lg:order-2">
          <div className="rounded-3xl border border-white/10 bg-surface p-4 shadow-soft md:p-5">
            <SemanticSearch householdId={householdId} localeTag={localeTag} copy={copy.search} />
            {activeTab === 'inbox' ? (
              <div className="mt-4">
                <details className="group">
                  <summary className="flex cursor-pointer items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-muted2">
                    Filtre
                    <span className="text-[11px] font-semibold text-muted2 transition group-open:rotate-180">▾</span>
                  </summary>
                  <div className="mt-3">
                    <ReminderFiltersPanel
                      locale={locale}
                      kindFilter={kindFilter}
                      createdBy={createdBy}
                      assignment={assignment}
                      category={categoryFilter}
                      onChangeKind={(value) => setKindFilter(value)}
                      onChangeCreatedBy={(value) => {
                        if (CreatedOptions.includes(value)) {
                          setCreatedBy(value);
                        }
                      }}
                      onChangeAssignment={(value) => {
                        if (AssignmentOptions.includes(value)) {
                          setAssignment(value);
                        }
                      }}
                      onChangeCategory={(value) => setCategoryFilter(value)}
                    />
                  </div>
                </details>
              </div>
            ) : null}
          </div>
        </aside>

        <div className="order-2 space-y-6 lg:order-1">
          <div className="h-px bg-white/10" />
          {desktopTab === 'today' ? (
            <section className="space-y-4">
            <NextUpCard
              title={copy.dashboard.nextTitle}
              subtext={copy.dashboard.nextUpHelper}
              taskTitle={nextOccurrence?.reminder?.title ?? undefined}
              timeLabel={nextOccurrenceLabel ?? undefined}
                badge={nextCategory?.label}
                badgeStyle={nextCategory ? getCategoryChipStyle(nextCategory.color, true) : undefined}
                tone={nextTone}
                statusLabel={copy.dashboard.todayOverdue}
                emptyLabel={copy.dashboard.nextUpEmpty}
                action={
                  nextOccurrence?.id && nextOccurrence?.reminder?.id && nextOccurrence?.occur_at
                    ? {
                        occurrenceId: nextOccurrence.id,
                        reminderId: nextOccurrence.reminder.id,
                        occurAt: nextOccurrence.occur_at,
                        label: copy.dashboard.nextUpAction,
                        feedbackLabel: copy.common.actionDone
                      }
                    : null
                }
                secondaryLabels={{
                  snooze30: copy.dashboard.nextUpSnooze30,
                  snoozeTomorrow: copy.dashboard.nextUpSnoozeTomorrow
                }}
                focusCopy={copy.dashboard.nextUpFocusLine}
                moreLabel={copy.common.moreActions}
                onMoreActions={nextOccurrence ? () => setNextActionsOpen(true) : undefined}
              />
              {nextUpActionsSheet}
              {overdueTopItems.length ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-ink">{copy.dashboard.overdueTopTitle}</div>
                    <button
                      type="button"
                      className="text-xs font-semibold text-[color:rgb(var(--accent))]"
                      onClick={() => setShowRecover((prev) => !prev)}
                    >
                      {copy.dashboard.overdueTopCta}
                    </button>
                  </div>
                  {showRecover ? (
                    <div className="space-y-2">
                      {overdueTopItems.map((occurrence) => (
                        <OverdueDenseRow
                          key={occurrence.id}
                          occurrence={occurrence}
                          locale={locale}
                          googleConnected={googleConnected}
                          userTimeZone={effectiveTimeZone}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </section>
          ) : null}
          {desktopTab === 'inbox' ? (
            <section className="mt-8 space-y-4">
              <SectionHeading
                label="Inbox"
                icon={<Calendar className="h-4 w-4 text-sky-500" aria-hidden="true" />}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={`premium-chip ${inboxView === 'reminders' ? 'border-[color:rgba(59,130,246,0.4)] text-[color:rgb(var(--accent-2))]' : ''}`}
                  onClick={() => setInboxView('reminders')}
                >
                  Remindere
                </button>
                <button
                  type="button"
                  className={`premium-chip ${inboxView === 'tasks' ? 'border-[color:rgba(59,130,246,0.4)] text-[color:rgb(var(--accent-2))]' : ''}`}
                  onClick={() => setInboxView('tasks')}
                >
                  Taskuri
                </button>
                <button
                  type="button"
                  className={`premium-chip ${inboxView === 'lists' ? 'border-[color:rgba(59,130,246,0.4)] text-[color:rgb(var(--accent-2))]' : ''}`}
                  onClick={() => setInboxView('lists')}
                >
                  Liste
                </button>
              </div>
              {inboxView === 'tasks' ? (
                hasInboxTasks ? (
                  <div className="space-y-4">
                    {[
                      { id: 'overdue', label: 'Restante', items: taskBuckets.overdue },
                      { id: 'today', label: 'Azi', items: taskBuckets.today },
                      { id: 'soon', label: 'Următoarele 7 zile', items: taskBuckets.soon },
                      { id: 'later', label: 'Mai târziu', items: taskBuckets.later },
                      { id: 'undated', label: 'Fără dată', items: taskBuckets.undated }
                    ].map((section) =>
                      section.items.length ? (
                        <div key={section.id} className="space-y-2">
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-tertiary">
                            {section.label}
                          </div>
                          <div className="grid gap-3 list-optimized">
                            {section.items.map((item) => (
                              <div key={item.id} className="premium-card flex items-start gap-3 px-4 py-3">
                                <button
                                  type="button"
                                  className="mt-0.5 text-[color:rgb(var(--accent))]"
                                  aria-pressed={item.done}
                                  aria-label={item.done ? 'Marchează ca nefinalizat' : 'Marchează ca finalizat'}
                                  onClick={() => handleToggleTask(item)}
                                  disabled={taskPending}
                                >
                                  {item.done ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                                </button>
                                <div className="min-w-0 flex-1">
                                  <div className={`text-sm font-semibold ${item.done ? 'text-muted line-through' : 'text-ink'}`}>
                                    {item.title}
                                  </div>
                                  {item.due_date ? (
                                    <div className="mt-1 text-xs text-muted">Scadență: {item.due_date}</div>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null
                    )}
                  </div>
                ) : (
                  <div className="card text-sm text-muted">
                    Nu ai taskuri în Inbox.
                  </div>
                )
              ) : inboxView === 'lists' ? (
                listItems.length ? (
                  <div className="grid gap-3 md:grid-cols-2 list-optimized">
                    {listItems.map((list) => (
                      <div key={list.id} className="premium-card space-y-2 px-4 py-3 transition hover:bg-surfaceMuted">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <Link href={`/app/lists/${list.id}`} className="text-sm font-semibold text-ink truncate">
                              {list.name}
                            </Link>
                            <div className="text-xs text-tertiary">
                              {list.doneCount}/{list.totalCount} finalizate
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className="chip">
                              {list.type === 'shopping' ? 'Shopping' : 'Listă'}
                            </span>
                            <div className="flex items-center gap-2">
                              <ListReminderButton listId={list.id} listTitle={list.name} />
                              <ListShareSheet listId={list.id} members={householdMembers} shared={Boolean(list.household_id)} />
                            </div>
                          </div>
                        </div>
                        {list.household_id ? (
                          <div className="text-[11px] font-semibold text-[color:rgb(var(--accent-2))]">
                            Shared · {householdMembers.length}
                          </div>
                        ) : null}
                        {list.previewItems.length ? (
                          <div className="space-y-1 text-xs text-muted">
                            {list.previewItems.map((item) => (
                              <div key={item.id} className={item.done ? 'line-through text-tertiary' : ''}>
                                • {item.title}{item.qty ? ` · ${item.qty}` : ''}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-tertiary">Nicio intrare încă.</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="card text-sm text-muted">
                    Nu ai liste create.
                  </div>
                )
              ) : hasInboxReminders ? (
                <div className="space-y-4">
                  {[
                    { id: 'overdue', label: 'Restante', items: inboxOverdue },
                    { id: 'today', label: 'Azi', items: inboxToday },
                    { id: 'soon', label: 'Următoarele 7 zile', items: inboxSoon },
                    { id: 'later', label: 'Mai târziu', items: inboxLater },
                    { id: 'undated', label: 'Fără dată', items: inboxUndated }
                  ].map((section) =>
                    section.items.length ? (
                      <div key={section.id} className="space-y-2">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-tertiary">
                          {section.label}
                        </div>
                        <div className="grid gap-3 list-optimized">
                          {section.items.map((occurrence) => (
                            <ReminderCard
                              key={occurrence.id}
                              occurrence={occurrence}
                              locale={locale}
                              googleConnected={googleConnected}
                              userTimeZone={effectiveTimeZone}
                              urgency={urgencyStyles.scheduled}
                              variant="row"
                            />
                          ))}
                        </div>
                      </div>
                    ) : null
                  )}
                </div>
              ) : (
                <div className="card text-sm text-muted">
                  {copy.dashboard.empty}
                </div>
              )}
            </section>
          ) : null}
          {kindFilter !== 'medications' && desktopTab === 'today' ? (
            <section className="mt-8 space-y-5">
              <SectionHeading
                label={copy.dashboard.todayTitle}
                icon={<SunMedium className="h-4 w-4 text-amber-500" aria-hidden="true" />}
              />

              {overdueItems.length ? (
                <div id="overdue-list" className="space-y-3">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between"
                    onClick={() => setShowOverdue((prev) => !prev)}
                    aria-expanded={showOverdue}
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase text-secondary">
                      <AlertTriangle className="h-4 w-4 text-red-500" aria-hidden="true" />
                      {copy.dashboard.todayOverdue}
                    </div>
                    <span className="flex items-center gap-2 text-xs text-tertiary">
                      {overdueItems.length} {copy.dashboard.reminderCountLabel}
                      <svg
                        aria-hidden="true"
                        className={`h-3.5 w-3.5 transition ${showOverdue ? 'rotate-180' : ''}`}
                        viewBox="0 0 20 20"
                        fill="none"
                      >
                        <path
                          d="M5 7l5 5 5-5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </button>
                  {showOverdue ? (
                    <div className="space-y-2">
                      {overdueItems.map((occurrence) => (
                        <OverdueDenseRow
                          key={occurrence.id}
                          occurrence={occurrence}
                          locale={locale}
                          googleConnected={googleConnected}
                          userTimeZone={effectiveTimeZone}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {todayItems.length ? (
                <div className="space-y-3">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between"
                    onClick={() => setShowToday((prev) => !prev)}
                    aria-expanded={showToday}
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase text-secondary">
                      <SunMedium className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                      {copy.dashboard.todayRest}
                    </div>
                    <span className="flex items-center gap-2 text-xs text-tertiary">
                      {todayItems.length} {copy.dashboard.reminderCountLabel}
                      <svg
                        aria-hidden="true"
                        className={`h-3.5 w-3.5 transition ${showToday ? 'rotate-180' : ''}`}
                        viewBox="0 0 20 20"
                        fill="none"
                      >
                        <path
                          d="M5 7l5 5 5-5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </button>
                  {showToday ? (
                    <div className="grid gap-3 list-optimized">
                      {todayItems.map((occurrence) => {
                        const compareDate = getCompareDate(occurrence, effectiveTimeZone);
                        const urgency = compareDate.getTime() <= new Date().getTime() + 2 * 60 * 60 * 1000
                          ? urgencyStyles.soon
                          : urgencyStyles.today;
                        return (
                          <ReminderCard
                            key={occurrence.id}
                            occurrence={occurrence}
                            locale={locale}
                            googleConnected={googleConnected}
                            userTimeZone={effectiveTimeZone}
                            urgency={urgency}
                            variant="row"
                          />
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ) : (
                !overdueItems.length ? (
                  <div className="card text-sm text-muted">
                    {copy.dashboard.todayEmpty}
                  </div>
                ) : null
              )}
            </section>
          ) : null}

          {kindFilter !== 'tasks' && desktopTab === 'today' ? (
            <section className="mt-8 space-y-4">
              <SectionHeading
                label={copy.dashboard.medicationsTitle}
                icon={<Pill className="h-4 w-4 text-emerald-500" aria-hidden="true" />}
                countLabel={
                  visibleDoses.length
                    ? `${visibleDoses.length} ${copy.dashboard.doseCountLabel}`
                    : undefined
                }
              />
              {visibleDoses.length ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 list-optimized">
                  {visibleDoses.map((dose) => {
                    const details = dose.reminder?.medication_details || {};
                    const personLabel = details.personId ? memberLabels[details.personId] : null;
                    const statusLabel = dose.status === 'taken'
                      ? copy.dashboard.medicationsTaken
                      : dose.status === 'skipped'
                        ? copy.dashboard.medicationsSkipped
                        : copy.common.statusOpen;
                    const statusClass = dose.status === 'taken'
                      ? 'border-emerald-400/40 bg-emerald-500/20 text-emerald-200'
                      : dose.status === 'skipped'
                        ? 'border-amber-400/40 bg-amber-500/20 text-amber-200'
                        : 'border-white/10 bg-white/5 text-tertiary';
                    return (
                      <div key={dose.id} className="premium-card p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                              <svg aria-hidden="true" className="h-4 w-4 text-emerald-300" viewBox="0 0 24 24" fill="none">
                                <path
                                  d="M6.5 17.5l11-11a4 4 0 00-5.66-5.66l-11 11a4 4 0 105.66 5.66z"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                />
                                <path d="M8 16l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                              </svg>
                              <span>{details.name || dose.reminder?.title}</span>
                            </div>
                            {details.dose ? <div className="text-xs text-tertiary">{details.dose}</div> : null}
                            {personLabel ? <div className="text-xs text-tertiary">{personLabel}</div> : null}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <div className="text-xs font-semibold text-tertiary">
                              {new Date(dose.scheduled_at).toLocaleTimeString(localeTag, { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusClass}`}>
                              {statusLabel}
                            </span>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            className="btn btn-primary h-8 px-3 text-xs"
                            onClick={() => handleDoseStatus(dose.id, 'taken')}
                          >
                            {copy.dashboard.medicationsTaken}
                          </button>
                          <details className="relative">
                            <summary className="btn btn-secondary h-8 px-3 text-xs">...</summary>
                            <div className="absolute right-0 z-[1000] mt-2 w-48 max-h-[60vh] overflow-y-auto rounded-xl border border-borderSubtle bg-surface p-2 shadow-soft">
                              <button
                                type="button"
                                className="w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-surfaceMuted"
                                onClick={() => handleDoseStatus(dose.id, 'skipped')}
                              >
                                {copy.dashboard.medicationsSkip}
                              </button>
                              {[copy.dashboard.medicationsReasonForgot, copy.dashboard.medicationsReasonNoStock].map((reason) => (
                                <button
                                  key={reason}
                                  type="button"
                                  className="w-full rounded-lg px-3 py-2 text-left text-xs text-tertiary hover:bg-surfaceMuted"
                                  onClick={() => handleDoseStatus(dose.id, 'skipped', reason)}
                                >
                                  {reason}
                                </button>
                              ))}
                            </div>
                          </details>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="card text-sm text-muted">
                  {copy.dashboard.medicationsEmpty}
                </div>
              )}
            </section>
          ) : null}

          {kindFilter !== 'medications' && desktopTab === 'today' ? (
            <section className="mt-8 space-y-4">
              <button
                type="button"
                className="flex w-full items-center gap-3"
                onClick={() => setShowUpcoming((prev) => !prev)}
                aria-expanded={showUpcoming}
              >
                <span className="h-px flex-1 bg-slate-200" />
                <span className="flex items-center gap-2 text-xs font-semibold uppercase text-tertiary">
                  <Calendar className="h-4 w-4 text-sky-500" aria-hidden="true" />
                  <span>{copy.dashboard.upcomingTitle}</span>
                  <span className="text-[11px] font-semibold text-tertiary normal-case">
                    {hasUpcoming ? upcomingEntries.length : 0} {copy.dashboard.reminderCountLabel}
                  </span>
                  <svg
                    aria-hidden="true"
                    className={`h-3.5 w-3.5 transition ${showUpcoming ? 'rotate-180' : ''}`}
                    viewBox="0 0 20 20"
                    fill="none"
                  >
                    <path
                      d="M5 7l5 5 5-5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span className="h-px flex-1 bg-slate-200" />
              </button>
              {showUpcoming ? (
                hasUpcoming ? (
                  <div className="space-y-5">
                    {upcomingEntries.map(([dayKey, items]) => {
                      const [year, month, day] = dayKey.split('-').map(Number);
                      const dayDate = new Date(year, Math.max(0, month - 1), day);
                      return (
                        <div key={dayKey} className="space-y-3">
                          <div className="text-xs font-semibold uppercase tracking-wide text-tertiary">
                            {dayLabelFormatter.format(dayDate)}
                          </div>
                          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 list-optimized">
                            {items.map((occurrence) => (
                              <ReminderCard
                                key={occurrence.id}
                                occurrence={occurrence}
                                locale={locale}
                                googleConnected={googleConnected}
                                userTimeZone={effectiveTimeZone}
                                urgency={urgencyStyles.upcoming}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                <div className="card text-sm text-muted">
                  {copy.dashboard.upcomingEmpty}
                </div>
                )
              ) : null}
            </section>
          ) : null}

          {kindFilter !== 'medications' && desktopTab === 'today' && !isFocusRedesign ? (
            <section className="mt-8 space-y-4">
              <SectionHeading
                label={copy.dashboard.householdTitle}
                icon={<Users className="h-4 w-4 text-purple-500" aria-hidden="true" />}
              />
              {householdItems.length ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 list-optimized">
                  {householdItems.map((occurrence) => (
                    <ReminderCard
                      key={occurrence.id}
                      occurrence={occurrence}
                      locale={locale}
                      googleConnected={googleConnected}
                      userTimeZone={effectiveTimeZone}
                      urgency={urgencyStyles.scheduled}
                    />
                  ))}
                </div>
              ) : (
                <div className="card text-sm text-muted">
                  {copy.dashboard.householdEmpty}
                </div>
              )}
            </section>
          ) : null}

          {kindFilter !== 'medications' && hasMonthGroups && desktopTab === 'today' ? (
            <section className="mt-8 space-y-4">
              <button
                type="button"
                className="flex w-full items-center gap-3"
                onClick={() => setShowMonths((prev) => !prev)}
                aria-expanded={showMonths}
              >
                <span className="h-px flex-1 bg-slate-200" />
                <span className="flex items-center gap-2 text-xs font-semibold uppercase text-tertiary">
                  <Calendar className="h-4 w-4 text-tertiary" aria-hidden="true" />
                  <span>{copy.dashboard.groupNextMonth}</span>
                  <span className="text-[11px] font-semibold text-tertiary normal-case">
                    {visibleMonthEntries.length} {copy.dashboard.reminderCountLabel}
                  </span>
                  <svg
                    aria-hidden="true"
                    className={`h-3.5 w-3.5 transition ${showMonths ? 'rotate-180' : ''}`}
                    viewBox="0 0 20 20"
                    fill="none"
                  >
                    <path
                      d="M5 7l5 5 5-5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span className="h-px flex-1 bg-slate-200" />
              </button>
              {showMonths ? (
                <>
                  {hasMoreMonths ? (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        className="text-xs font-semibold text-tertiary hover:text-ink"
                        onClick={() => setVisibleMonthGroups((prev) => prev + 2)}
                      >
                        {copy.dashboard.viewMoreMonths}
                      </button>
                    </div>
                  ) : null}
                  <div className="space-y-5">
                    {visibleMonthEntries.map(([monthKey, items]) => {
                      const [year, month] = monthKey.split('-').map(Number);
                      const labelDate = new Date(year, Math.max(0, month - 1), 1);
                      return (
                        <div key={monthKey} className="space-y-3">
                          <div className="text-xs font-semibold uppercase tracking-wide text-tertiary">
                            {monthLabelFormatter.format(labelDate)}
                          </div>
                          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 list-optimized">
                            {items.map((occurrence) => (
                              <ReminderCard
                                key={occurrence.id}
                                occurrence={occurrence}
                                locale={locale}
                                googleConnected={googleConnected}
                                userTimeZone={effectiveTimeZone}
                                urgency={urgencyStyles.scheduled}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="card text-sm text-muted">
                  {previewMonthEntry ? (
                    <div className="space-y-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-tertiary">
                        {monthLabelFormatter.format(new Date(Number(previewMonthEntry[0].split('-')[0]), Math.max(0, Number(previewMonthEntry[0].split('-')[1]) - 1), 1))}
                      </div>
                      <div className="space-y-2">
                        {previewMonthItems.map((occurrence) => {
                          const reminderTimeZone = resolveReminderTimeZone(occurrence.reminder?.tz ?? null, effectiveTimeZone);
                          const displayAt = occurrence.snoozed_until ?? occurrence.effective_at ?? occurrence.occur_at;
                          return (
                            <div key={occurrence.id} className="flex items-center justify-between text-xs text-tertiary">
                              <span className="truncate">{occurrence.reminder?.title ?? copy.dashboard.nextTitle}</span>
                              <span className="whitespace-nowrap text-tertiary">
                                {formatReminderDateTime(displayAt, reminderTimeZone, effectiveTimeZone)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <button
                        type="button"
                        className="text-xs font-semibold text-tertiary hover:text-ink"
                        onClick={() => setShowMonths(true)}
                      >
                        {copy.dashboard.viewMoreMonths}
                      </button>
                    </div>
                  ) : (
                    <div>{copy.dashboard.upcomingEmpty}</div>
                  )}
                </div>
              )}
            </section>
          ) : null}
        </div>
      </div>
    </section>
  );
}
