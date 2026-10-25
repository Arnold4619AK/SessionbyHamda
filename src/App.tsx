/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import hamdaPhoto from './assets/hamda_hero.jpg';
import {
  saveBookingToCloud,
  updateBookingInCloud,
  deleteBookingFromCloud,
  subscribeToPublicBookedSlots,
  subscribeToConsultationBookings,
  fetchConsultationBookingsOnce,
  fetchPublicBookedSlotsOnce,
  releasePublicBookedSlot,
  reservePublicBookedSlot,
  savePracticeScheduleToCloud,
  subscribeToPracticeSchedule,
  fetchPracticeScheduleOnce,
  signOutAdmin,
} from './firebase';

// Service Definitions & Fees
interface ServiceInfo {
  name: string;
  fees: { [duration: number]: number };
}

export interface PractitionerProfile {
  name: string;
  greeting: string;
  role: string;
  heroCopy: string;
  aboutQuote: string;
  aboutP1: string;
  aboutP2: string;
  aboutGoal: string;
  email: string;
  socialHandle: string;
  location: string;
}

export const DEFAULT_PROFILE: PractitionerProfile = {
  name: 'Hamda Zubair',
  greeting: "Hi, I'm",
  role: 'Neuropsychologist & Behavioural Therapist',
  heroCopy: "I'm passionate about helping people understand the connection between their thoughts, emotions, behaviours, and the brain.",
  aboutQuote: "Seeking support is a way of giving yourself space.",
  aboutP1: "With a background in psychology and a Master’s degree in Neuropsychology, I'm passionate about understanding how the brain shapes our thoughts, emotions, and behaviours.",
  aboutP2: "I work with individuals navigating anxiety, overthinking, stress, and procrastination, helping them understand cognitive and behavioural patterns that influence everyday life.",
  aboutGoal: "My goal is simple: to help you understand your mind, build healthier coping strategies, and create meaningful change.",
  email: 'hamda.connect@gmail.com',
  socialHandle: '@hamda.zubair',
  location: 'Hyderabad, India',
};

export interface BookingRecord {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  age: string;
  gender: string;
  service: string;
  duration: number;
  dateStr: string;
  dateKey?: string;
  timeStr: string;
  timeSlot?: string;
  fee: number;
  prepNote?: string;
  paymentMethod?: string;
  utr?: string;
  payerNote?: string;
  verificationHash?: string;
  status: 'Confirmed' | 'Pending verification' | 'Completed' | 'Discrepancy' | 'Cancelled' | 'Not Confirmed';
  verifiedAt?: string;
  createdAt: string;
}

export const DEFAULT_BOOKINGS: BookingRecord[] = [];

const DEFAULT_SERVICES: { [key: string]: ServiceInfo } = {
  therapy: {
    name: 'Behavioral & Cognitive Therapy',
    fees: { 30: 700, 60: 1250 },
  },
  cognitive: {
    name: 'Neuropsychology & Cognitive Skills',
    fees: { 30: 800, 60: 1500 },
  },
};

const SUNDAY_TIMES = [
  '9:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '1:00 PM',
  '2:00 PM',
  '3:00 PM',
  '4:00 PM',
  '5:00 PM',
  '6:00 PM',
  '7:00 PM',
  '8:00 PM',
  '9:00 PM',
];

const EVENING_TIMES = ['8:30 PM', '9:30 PM'];
const ALL_TIMES = [...SUNDAY_TIMES, ...EVENING_TIMES];

// Date and Time calculation helpers matching sessionsbyhamda.netlify.app
const istTodayParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).formatToParts(new Date());

const today = new Date(
  Date.UTC(
    Number(istTodayParts.find((p) => p.type === 'year')?.value || '2026'),
    Number(istTodayParts.find((p) => p.type === 'month')?.value || '10') - 1,
    Number(istTodayParts.find((p) => p.type === 'day')?.value || '24')
  )
);

const dayIndex = (d: Date) => (d.getUTCDay() + 6) % 7;
const dateKey = (d: Date) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(
    d.getUTCDate()
  ).padStart(2, '0')}`;

const formatLong = (d: Date) =>
  new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d);

function appointmentInstant(d: Date, t: string) {
  const [clock, meridiem] = t.split(' ');
  const [hour, minute] = clock.split(':').map(Number);
  const h24 = (hour % 12) + (meridiem === 'PM' ? 12 : 0);
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), h24, minute) -
      330 * 60000
  );
}

function slotIsFuture(d: Date, t: string) {
  // Allow session times on current and upcoming dates that have not passed
  return appointmentInstant(d, t).getTime() >= Date.now() - 30 * 60 * 1000;
}

function formatSlotTime(d: Date, t: string, zone: string) {
  const instant = appointmentInstant(d, t);
  const time = new Intl.DateTimeFormat('en-IN', {
    timeZone: zone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(instant);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const localKey = `${parts.find((p) => p.type === 'year')?.value}-${parts.find(
    (p) => p.type === 'month'
  )?.value}-${parts.find((p) => p.type === 'day')?.value}`;
  return localKey === dateKey(d)
    ? time
    : `${time} · ${new Intl.DateTimeFormat('en-IN', {
        timeZone: zone,
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      }).format(instant)}`;
}

export default function App() {
  // Mobile navigation
  const [menuOpen, setMenuOpen] = useState(false);

  // Booking state
  const [service, setService] = useState<'therapy' | 'cognitive'>('therapy');
  const [duration, setDuration] = useState<30 | 60>(60);
  const [serviceInfo, setServiceInfo] = useState(DEFAULT_SERVICES);

  // Clinician workspace availability controls (load from localStorage)
  const [days, setDays] = useState<boolean[]>(() => {
    try {
      const saved = localStorage.getItem('hamda_weekly_days');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [false, false, false, false, true, true, true];
  });

  // Base slot choices per day of week (0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun)
  const DEFAULT_DAY_SLOTS: { [key: number]: string[] } = useMemo(
    () => ({
      0: ['10:00 AM', '11:00 AM', '12:00 PM', '4:00 PM', '5:00 PM', '6:00 PM', '7:00 PM'],
      1: ['10:00 AM', '11:00 AM', '12:00 PM', '4:00 PM', '5:00 PM', '6:00 PM', '7:00 PM'],
      2: ['10:00 AM', '11:00 AM', '12:00 PM', '4:00 PM', '5:00 PM', '6:00 PM', '7:00 PM'],
      3: ['10:00 AM', '11:00 AM', '12:00 PM', '4:00 PM', '5:00 PM', '6:00 PM', '7:00 PM'],
      4: ['8:30 PM', '9:30 PM'],
      5: ['8:30 PM', '9:30 PM'],
      6: [
        '9:00 AM',
        '10:00 AM',
        '11:00 AM',
        '12:00 PM',
        '1:00 PM',
        '2:00 PM',
        '3:00 PM',
        '4:00 PM',
        '5:00 PM',
        '6:00 PM',
        '7:00 PM',
        '8:00 PM',
        '9:00 PM',
      ],
    }),
    []
  );

  // Date-specific slots configuration mapping (Key: 'YYYY-MM-DD')
  const [dateSlots, setDateSlots] = useState<{ [dateKey: string]: string[] }>(() => {
    try {
      const saved = localStorage.getItem('hamda_date_slots');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  // Timezone selection
  const [timeZone, setTimeZone] = useState<string>(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
    } catch {
      return 'Asia/Kolkata';
    }
  });

  // Bookings list for clinician records and session slot availability
  const [bookings, setBookings] = useState<BookingRecord[]>(() => {
    try {
      const saved = localStorage.getItem('hamda_bookings_list');
      if (saved) {
        const parsed: BookingRecord[] = JSON.parse(saved);
        const cleaned = parsed.filter(
          (b) =>
            b.id !== 'BK-1024' &&
            b.id !== 'BK-1025' &&
            b.email !== 'aanya.sharma@example.com' &&
            b.email !== 'rohan.m@example.com'
        );
        return cleaned;
      }
    } catch {}
    return DEFAULT_BOOKINGS;
  });

  // Real-time synchronization state for client consultation requests
  const [isLiveSync, setIsLiveSync] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>('just now');
  const [cloudBookedSlots, setCloudBookedSlots] = useState<{ dateKey: string; timeSlot: string }[]>([]);

  // Global Real-time Subscription to Public Booked Slots (All clients across the world receive live availability updates)
  useEffect(() => {
    const unsub = subscribeToPublicBookedSlots((slots) => {
      setCloudBookedSlots(slots);
    });
    return () => unsub();
  }, []);

  // Global Real-time Synchronization of Practice Schedule (Availability & Session Times across all devices)
  useEffect(() => {
    fetchPracticeScheduleOnce().then((cloudSched) => {
      if (cloudSched) {
        if (cloudSched.days && Array.isArray(cloudSched.days)) {
          setDays(cloudSched.days);
          try {
            localStorage.setItem('hamda_weekly_days', JSON.stringify(cloudSched.days));
          } catch {}
        }
        if (cloudSched.dateSlots && typeof cloudSched.dateSlots === 'object') {
          setDateSlots(cloudSched.dateSlots);
          try {
            localStorage.setItem('hamda_date_slots', JSON.stringify(cloudSched.dateSlots));
          } catch {}
        }
      }
    });

    const unsubSched = subscribeToPracticeSchedule((cloudSched) => {
      if (cloudSched) {
        if (cloudSched.days && Array.isArray(cloudSched.days)) {
          setDays(cloudSched.days);
          try {
            localStorage.setItem('hamda_weekly_days', JSON.stringify(cloudSched.days));
          } catch {}
        }
        if (cloudSched.dateSlots && typeof cloudSched.dateSlots === 'object') {
          setDateSlots(cloudSched.dateSlots);
          try {
            localStorage.setItem('hamda_date_slots', JSON.stringify(cloudSched.dateSlots));
          } catch {}
        }
      }
    });
    return () => unsubSched();
  }, []);

  const loadLatestBookings = useCallback(() => {
    try {
      const saved = localStorage.getItem('hamda_bookings_list');
      if (saved) {
        const parsed: BookingRecord[] = JSON.parse(saved);
        setBookings(parsed);
        return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  }, []);

  // Helper: Get all active booked time slots for a given date (merging local + cloud)
  // If a booking is 'Not Confirmed', 'Discrepancy', or 'Cancelled', the slot is NOT booked and remains AVAILABLE!
  const getBookedSlotsForDate = useCallback(
    (d: Date | null, bookingList: BookingRecord[] = bookings): string[] => {
      if (!d) return [];
      const targetKey = dateKey(d);
      const targetFormatted = formatLong(d);
      const booked: string[] = [];
      for (const b of bookingList) {
        if (b.status === 'Discrepancy' || b.status === 'Cancelled' || b.status === 'Not Confirmed') continue;
        const matchesDate =
          b.dateKey === targetKey ||
          b.dateStr === targetFormatted ||
          (b.dateStr &&
            b.dateStr.includes(String(d.getUTCDate())) &&
            b.dateStr.includes(String(d.getUTCFullYear())));
        if (matchesDate) {
          const cleanSlot = (b.timeSlot || b.timeStr || '').replace(/\s*IST\s*$/i, '').trim();
          if (cleanSlot && !booked.includes(cleanSlot)) {
            booked.push(cleanSlot);
          }
        }
      }
      // Also include globally booked slots from Cloud Firestore
      for (const cs of cloudBookedSlots) {
        if (cs.dateKey === targetKey && !booked.includes(cs.timeSlot)) {
          booked.push(cs.timeSlot);
        }
      }
      return booked;
    },
    [bookings, cloudBookedSlots]
  );

  // Calendar month and selected date
  const [month, setMonth] = useState<Date>(
    new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))
  );

  const timesForDate = (d: Date | null) => {
    if (!d) return [];
    const key = dateKey(d);

    // 1. If therapist has configured specific slots for this date
    if (dateSlots[key] && Array.isArray(dateSlots[key])) {
      return dateSlots[key].filter((t) => slotIsFuture(d, t));
    }

    // 2. Otherwise use standard slots for this day of week
    const utcd = d.getUTCDay();
    const dIdx = (utcd + 6) % 7;
    const base =
      DEFAULT_DAY_SLOTS[dIdx] ||
      (utcd === 5 || utcd === 6 ? EVENING_TIMES : utcd === 0 ? SUNDAY_TIMES : ['4:00 PM', '5:00 PM', '6:00 PM']);
    return base.filter((t) => slotIsFuture(d, t));
  };

  // Date is available only if:
  // 1. Valid date in future (>= today)
  // 2. Day of week is enabled in weekly availability
  // 3. Has configured slots in future
  // 4. NOT all sessions are booked (if all sessions booked, block the entire date!)
  const isDateAvailable = (d: Date | null) => {
    if (!d || d < today || !days[dayIndex(d)]) return false;
    const allSlots = timesForDate(d);
    if (allSlots.length === 0) return false;
    const booked = getBookedSlotsForDate(d);
    const unbooked = allSlots.filter((t) => !booked.includes(t));
    return unbooked.length > 0;
  };

  const nextOpenDate = (from = today) => {
    for (let i = 0; i < 370; i++) {
      const d = new Date(
        Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate() + i)
      );
      if (isDateAvailable(d)) return d;
    }
    return null;
  };

  const [selectedDate, setSelectedDate] = useState<Date | null>(() => nextOpenDate(today));
  const [time, setTime] = useState<string>('9:00 AM');

  // Sync selected date & time when days, dateSlots, or bookings change in real time
  useEffect(() => {
    if (!selectedDate || !isDateAvailable(selectedDate)) {
      const nextDate = nextOpenDate(today);
      if (nextDate) {
        setSelectedDate(nextDate);
        setMonth(new Date(Date.UTC(nextDate.getUTCFullYear(), nextDate.getUTCMonth(), 1)));
        const availableTimes = timesForDate(nextDate);
        const booked = getBookedSlotsForDate(nextDate);
        const openTimes = availableTimes.filter((t) => !booked.includes(t));
        if (openTimes.length) setTime(openTimes[0]);
      }
    } else {
      const availableTimes = timesForDate(selectedDate);
      const booked = getBookedSlotsForDate(selectedDate);
      const openTimes = availableTimes.filter((t) => !booked.includes(t));
      if (openTimes.length && (!time || booked.includes(time) || !availableTimes.includes(time))) {
        setTime(openTimes[0]);
      }
    }
  }, [days, dateSlots, bookings, selectedDate, getBookedSlotsForDate]);

  // Admin authentication & details state
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try {
      return localStorage.getItem('hamda_admin_auth') === 'true';
    } catch {
      return false;
    }
  });
  const [showAdminLogin, setShowAdminLogin] = useState<boolean>(false);
  const [adminEmailInput, setAdminEmailInput] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminLoginError, setAdminLoginError] = useState<string | null>(null);
  const [adminLoginAttempts, setAdminLoginAttempts] = useState(0);
  const [adminLockoutTime, setAdminLockoutTime] = useState<number | null>(null);

  // Profile data & custom photo
  const [profile, setProfile] = useState<PractitionerProfile>(() => {
    try {
      const saved = localStorage.getItem('hamda_profile_data');
      if (saved) return { ...DEFAULT_PROFILE, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_PROFILE;
  });
  const [editProfile, setEditProfile] = useState<PractitionerProfile>(profile);

  const [customPhoto, setCustomPhoto] = useState<string | null>(() => {
    try {
      return localStorage.getItem('hamda_custom_photo');
    } catch {
      return null;
    }
  });
  const activePhoto = customPhoto || hamdaPhoto;



  // Clinician workspace tabs: 'profile' | 'calendar' | 'records' | 'payments'
  const [activeTab, setActiveTab] = useState<'profile' | 'calendar' | 'records' | 'payments'>(
    'profile'
  );
  const [recordFilter, setRecordFilter] = useState<'all' | 'pending' | 'unconfirmed' | 'confirmed'>('all');

  // Interactive confirmation popup state for host reviewing client records
  const [confirmPrompt, setConfirmPrompt] = useState<{
    booking: BookingRecord;
    action: 'confirm' | 'not_confirm';
  } | null>(null);

  // Real-time backend saving and booking-card reflection states
  const [isSavingWeeklyDays, setIsSavingWeeklyDays] = useState<boolean>(false);
  const [isSavingSessionTimes, setIsSavingSessionTimes] = useState<boolean>(false);
  const [bookingCardFlash, setBookingCardFlash] = useState<boolean>(false);
  const [bookingCardFlashMessage, setBookingCardFlashMessage] = useState<string | null>(null);

  // Fee editor state in Clinician Workspace
  const [feeService, setFeeService] = useState<'therapy' | 'cognitive'>('therapy');
  const [feeDuration, setFeeDuration] = useState<30 | 60>(60);
  const [feeInputValue, setFeeInputValue] = useState<number>(1250);

  // Modal dialog state
  const [modalStep, setModalStep] = useState<null | 'details' | 'payment' | 'receipt'>(null);
  const [paymentMethod, setPaymentMethod] = useState<'qr' | 'upi' | 'bank'>('qr');
  const [paymentUtr, setPaymentUtr] = useState('');
  const [paymentPayerNote, setPaymentPayerNote] = useState('');
  const [paymentConfirmedAck, setPaymentConfirmedAck] = useState(false);
  const [paymentValidationError, setPaymentValidationError] = useState<string | null>(null);
  const [recentBooking, setRecentBooking] = useState<BookingRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Details form fields
  const [clientName, setClientName] = useState('');
  const [clientAge, setClientAge] = useState('');
  const [clientGender, setClientGender] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [phoneCode, setPhoneCode] = useState('+91');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [prepNote, setPrepNote] = useState('');
  const [agreePolicy, setAgreePolicy] = useState(false);

  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Admin Availability & Session Time Customization State
  const [adminDateKey, setAdminDateKey] = useState<string>(() => dateKey(today));

  const adminDateObj = useMemo(() => {
    try {
      const [y, m, d] = adminDateKey.split('-').map(Number);
      return new Date(Date.UTC(y, m - 1, d));
    } catch {
      return today;
    }
  }, [adminDateKey]);

  // Initial / current active slots for selected admin date
  const [adminDateSlots, setAdminDateSlots] = useState<string[]>(() => {
    const key = dateKey(today);
    if (dateSlots[key] && Array.isArray(dateSlots[key])) return dateSlots[key];
    const dIdx = dayIndex(today);
    return DEFAULT_DAY_SLOTS[dIdx] || ['4:00 PM', '5:00 PM', '6:00 PM'];
  });

  // Keep adminDateSlots in sync whenever admin picks a different date or dateSlots change
  useEffect(() => {
    if (dateSlots[adminDateKey] && Array.isArray(dateSlots[adminDateKey])) {
      setAdminDateSlots(dateSlots[adminDateKey]);
    } else {
      const dIdx = dayIndex(adminDateObj);
      setAdminDateSlots(DEFAULT_DAY_SLOTS[dIdx] || (dIdx === 5 || dIdx === 6 ? EVENING_TIMES : ['4:00 PM', '5:00 PM', '6:00 PM']));
    }
  }, [adminDateKey, dateSlots, adminDateObj, DEFAULT_DAY_SLOTS]);

  // Upcoming 60 dates for scrolling select in clinician calendar workspace
  const upcomingAdminDates = useMemo(() => {
    const list = [];
    for (let i = 0; i < 60; i++) {
      const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + i));
      list.push({
        key: dateKey(d),
        dayName: new Intl.DateTimeFormat('en-IN', { weekday: 'short', timeZone: 'UTC' }).format(d),
        dayNum: d.getUTCDate(),
        monthName: new Intl.DateTimeFormat('en-IN', { month: 'short', timeZone: 'UTC' }).format(d),
        monthLong: new Intl.DateTimeFormat('en-IN', { month: 'long', timeZone: 'UTC' }).format(d),
        monthKey: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`,
        dateObj: d,
      });
    }
    return list;
  }, []);

  const availableAdminMonths = useMemo(() => {
    const seen = new Set<string>();
    const months: { key: string; label: string; firstDateKey: string }[] = [];
    for (const item of upcomingAdminDates) {
      if (!seen.has(item.monthKey)) {
        seen.add(item.monthKey);
        months.push({
          key: item.monthKey,
          label: item.monthLong,
          firstDateKey: item.key,
        });
      }
    }
    return months;
  }, [upcomingAdminDates]);

  const adminDateScrollRef = useRef<HTMLDivElement | null>(null);
  const chipRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  useEffect(() => {
    if (chipRefs.current[adminDateKey]) {
      chipRefs.current[adminDateKey]?.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [adminDateKey]);

  const handleToggleAdminSlot = (slotTime: string) => {
    if (adminDateSlots.includes(slotTime)) {
      setAdminDateSlots(adminDateSlots.filter((t) => t !== slotTime));
    } else {
      setAdminDateSlots([...adminDateSlots, slotTime]);
    }
  };

  const handleSelectAllAdminSlots = () => {
    setAdminDateSlots([...ALL_TIMES]);
  };

  const handleClearAllAdminSlots = () => {
    setAdminDateSlots([]);
  };

  const handleResetAdminSlotsToDefault = () => {
    const dIdx = dayIndex(adminDateObj);
    const defaults = DEFAULT_DAY_SLOTS[dIdx] || (dIdx === 5 || dIdx === 6 ? EVENING_TIMES : ['4:00 PM', '5:00 PM', '6:00 PM']);
    setAdminDateSlots([...defaults]);
  };

  const handleSaveWeeklyDays = async () => {
    setIsSavingWeeklyDays(true);
    try {
      localStorage.setItem('hamda_weekly_days', JSON.stringify(days));
    } catch {}
    await savePracticeScheduleToCloud(days, dateSlots);

    // Immediately reflect in the chosen booking card div
    const nextDate = nextOpenDate(today);
    if (nextDate && (!selectedDate || !days[dayIndex(selectedDate)])) {
      setSelectedDate(nextDate);
      setMonth(new Date(Date.UTC(nextDate.getUTCFullYear(), nextDate.getUTCMonth(), 1)));
      const allTimes = timesForDate(nextDate);
      const booked = getBookedSlotsForDate(nextDate);
      const openTimes = allTimes.filter((t) => !booked.includes(t));
      if (openTimes.length) setTime(openTimes[0]);
    }

    setBookingCardFlashMessage('Weekly availability synced live in backend and updated in booking card!');
    setBookingCardFlash(true);
    setTimeout(() => setBookingCardFlash(false), 2800);

    try {
      const bc = new BroadcastChannel('hamda_bookings_sync');
      bc.postMessage({ type: 'SCHEDULE_UPDATED', days, dateSlots });
      bc.close();
    } catch {}

    setIsSavingWeeklyDays(false);
    showToast('Weekly availability saved in backend & live in booking card.');
  };

  const handleSaveSessionTimes = async () => {
    setIsSavingSessionTimes(true);
    const updated = {
      ...dateSlots,
      [adminDateKey]: adminDateSlots,
    };
    setDateSlots(updated);
    try {
      localStorage.setItem('hamda_date_slots', JSON.stringify(updated));
    } catch {}
    await savePracticeScheduleToCloud(days, updated);

    // Immediately reflect in the chosen booking card div
    setSelectedDate(adminDateObj);
    setMonth(new Date(Date.UTC(adminDateObj.getUTCFullYear(), adminDateObj.getUTCMonth(), 1)));
    if (adminDateSlots.length > 0) {
      const booked = getBookedSlotsForDate(adminDateObj);
      const openTimes = adminDateSlots.filter((t) => !booked.includes(t));
      if (openTimes.length) setTime(openTimes[0]);
    }

    setBookingCardFlashMessage(`Session times for ${formatLong(adminDateObj)} updated in backend and live in booking card!`);
    setBookingCardFlash(true);
    setTimeout(() => setBookingCardFlash(false), 3200);

    try {
      const bc = new BroadcastChannel('hamda_bookings_sync');
      bc.postMessage({ type: 'SCHEDULE_UPDATED', days, dateSlots: updated });
      bc.close();
    } catch {}

    setIsSavingSessionTimes(false);
    showToast(`Session times for ${formatLong(adminDateObj)} saved in backend & live in booking card.`);
  };

  const handleManualRefreshBookings = async () => {
    setIsRefreshing(true);
    let latest = loadLatestBookings();
    try {
      const cloudBookings = await fetchConsultationBookingsOnce();
      if (cloudBookings && cloudBookings.length > 0) {
        setBookings((prev) => {
          const map = new Map<string, BookingRecord>();
          cloudBookings.forEach((b) => map.set(b.id, b as BookingRecord));
          prev.forEach((b) => {
            if (!map.has(b.id)) map.set(b.id, b);
          });
          const merged = Array.from(map.values());
          try {
            localStorage.setItem('hamda_bookings_list', JSON.stringify(merged));
          } catch {}
          return merged;
        });
        latest = cloudBookings as BookingRecord[];
      }
      const cloudSlots = await fetchPublicBookedSlotsOnce();
      if (cloudSlots && cloudSlots.length > 0) {
        setCloudBookedSlots(cloudSlots);
      }
    } catch (e) {
      console.warn('Manual refresh cloud sync notice:', e);
    }
    const nowStr = new Intl.DateTimeFormat('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(new Date());
    setLastRefreshedAt(nowStr);
    setIsRefreshing(false);
    showToast(`Client requests refreshed (${latest.length} records).`);
  };

  // Real-time synchronization listeners (BroadcastChannel, storage event, polling)
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('hamda_bookings_sync');
      bc.onmessage = (event) => {
        if (event.data?.type === 'BOOKING_CREATED' || event.data?.type === 'BOOKINGS_UPDATED') {
          loadLatestBookings();
          const nowStr = new Intl.DateTimeFormat('en-IN', {
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
          }).format(new Date());
          setLastRefreshedAt(nowStr);
          if (event.data?.clientName) {
            showToast(`🔔 New client consultation request from ${event.data.clientName}!`);
          }
        }
      };
    } catch {}

    const onStorageChange = (e: StorageEvent) => {
      if (e.key === 'hamda_bookings_list') {
        loadLatestBookings();
        const nowStr = new Intl.DateTimeFormat('en-IN', {
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }).format(new Date());
        setLastRefreshedAt(nowStr);
      }
    };
    window.addEventListener('storage', onStorageChange);

    const onCustomUpdate = () => {
      loadLatestBookings();
    };
    window.addEventListener('hamda_bookings_updated', onCustomUpdate);

    let pollTimer: NodeJS.Timeout | null = null;
    if (isLiveSync) {
      pollTimer = setInterval(() => {
        loadLatestBookings();
      }, 3000);
    }

    return () => {
      if (bc) bc.close();
      window.removeEventListener('storage', onStorageChange);
      window.removeEventListener('hamda_bookings_updated', onCustomUpdate);
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [isLiveSync, loadLatestBookings]);

  // Cloud Firestore Real-time Stream for Admin Workspace (Receives bookings from any device/phone worldwide)
  useEffect(() => {
    // Initial fetch from cloud
    const fetchCloud = async () => {
      try {
        const cloudBookings = await fetchConsultationBookingsOnce();
        if (cloudBookings && cloudBookings.length > 0) {
          setBookings((prev) => {
            const map = new Map<string, BookingRecord>();
            cloudBookings.forEach((b) => map.set(b.id, b as BookingRecord));
            prev.forEach((b) => {
              if (!map.has(b.id)) map.set(b.id, b);
            });
            const merged = Array.from(map.values());
            try {
              localStorage.setItem('hamda_bookings_list', JSON.stringify(merged));
            } catch {}
            return merged;
          });
          const nowStr = new Intl.DateTimeFormat('en-IN', {
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
          }).format(new Date());
          setLastRefreshedAt(nowStr);
        }
      } catch (e) {
        console.warn('Initial cloud bookings fetch notice:', e);
      }
    };
    fetchCloud();

    const unsub = subscribeToConsultationBookings((cloudList) => {
      if (cloudList && cloudList.length > 0) {
        setBookings((prev) => {
          const map = new Map<string, BookingRecord>();
          cloudList.forEach((b) => map.set(b.id, b as BookingRecord));
          prev.forEach((b) => {
            if (!map.has(b.id)) map.set(b.id, b);
          });
          const merged = Array.from(map.values());
          try {
            localStorage.setItem('hamda_bookings_list', JSON.stringify(merged));
          } catch {}
          return merged;
        });
        const nowStr = new Intl.DateTimeFormat('en-IN', {
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }).format(new Date());
        setLastRefreshedAt(nowStr);
      }
    });
    return () => unsub();
  }, [isAdmin]);

  // Scroll reveal observer for graceful section and division animations on every scroll-down
  useEffect(() => {
    const targets = document.querySelectorAll<HTMLElement>(
      '.reveal-on-scroll, .reveal-scale, .section-divider'
    );

    if (!targets.length) return;

    // Checks positions and animates elements as user scrolls down
    const evaluateScrollAnimation = () => {
      const windowHeight = window.innerHeight;
      const revealTriggerLine = windowHeight - 40; // Trigger when element top enters 40px above bottom edge

      targets.forEach((el) => {
        const rect = el.getBoundingClientRect();

        // If element is entering or in the active viewport
        if (rect.top <= revealTriggerLine && rect.bottom >= 0) {
          if (!el.classList.contains('is-revealed')) {
            el.classList.add('is-revealed');
          }
        } else if (rect.top > windowHeight) {
          // Element is completely below the viewport (e.g. user scrolled back up)
          // Reset it so when the user scrolls down again, it re-animates freshly!
          if (el.classList.contains('is-revealed')) {
            el.classList.remove('is-revealed');
          }
        }
      });
    };

    // Use IntersectionObserver for performant GPU-synced animations
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const el = entry.target as HTMLElement;
          const rect = entry.boundingClientRect;

          if (entry.isIntersecting) {
            el.classList.add('is-revealed');
          } else if (rect.top > 0) {
            // Left through the bottom of viewport (user scrolled up) -> reset for next scroll down
            el.classList.remove('is-revealed');
          }
        });
      },
      {
        threshold: 0.08,
        rootMargin: '0px 0px -30px 0px',
      }
    );

    targets.forEach((el) => {
      observer.observe(el);
    });

    // Run initial check with a short frame delay so initial elements animate smoothly
    const timeoutId = setTimeout(() => {
      evaluateScrollAnimation();
    }, 60);

    // Passive scroll and resize listeners ensure rapid scrolls, bookmark jumps, and resets are instantaneous
    window.addEventListener('scroll', evaluateScrollAnimation, { passive: true });
    window.addEventListener('resize', evaluateScrollAnimation, { passive: true });

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
      window.removeEventListener('scroll', evaluateScrollAnimation);
      window.removeEventListener('resize', evaluateScrollAnimation);
    };
  }, []);

  // Supported Timezones
  const timeZones = useMemo(() => {
    const fallbackZones = [
      'Africa/Johannesburg',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'America/New_York',
      'Asia/Dubai',
      'Asia/Kolkata',
      'Asia/Singapore',
      'Asia/Tokyo',
      'Australia/Sydney',
      'Europe/Berlin',
      'Europe/London',
      'Pacific/Auckland',
    ];
    let zones = fallbackZones;
    if (typeof Intl.supportedValuesOf === 'function') {
      zones = Intl.supportedValuesOf('timeZone');
    }
    const list = Array.from(new Set([...zones, 'Asia/Kolkata']));
    list.sort((a, b) => a.localeCompare(b));
    return list;
  }, []);

  // Calendar calculations
  const calendarCells = useMemo(() => {
    const year = month.getUTCFullYear();
    const m = month.getUTCMonth();
    const first = new Date(Date.UTC(year, m, 1));
    const offset = dayIndex(first);
    const daysInMonth = new Date(Date.UTC(year, m + 1, 0)).getUTCDate();
    const totalCells = Math.ceil((offset + daysInMonth) / 7) * 7;

    const cells: {
      day: number;
      date: Date | null;
      available: boolean;
      selected: boolean;
      isToday: boolean;
      isFullyBooked: boolean;
    }[] = [];

    for (let i = 0; i < totalCells; i++) {
      const dayNum = i - offset + 1;
      if (dayNum < 1 || dayNum > daysInMonth) {
        cells.push({ day: 0, date: null, available: false, selected: false, isToday: false, isFullyBooked: false });
      } else {
        const d = new Date(Date.UTC(year, m, dayNum));
        const allSlots = timesForDate(d);
        const booked = getBookedSlotsForDate(d);
        const isFullyBooked = allSlots.length > 0 && allSlots.every((t) => booked.includes(t));
        const available = isDateAvailable(d);
        const selected = !!selectedDate && dateKey(d) === dateKey(selectedDate);
        const isToday = dateKey(d) === dateKey(today);
        cells.push({ day: dayNum, date: d, available, selected, isToday, isFullyBooked });
      }
    }
    return cells;
  }, [month, selectedDate, days, dateSlots, bookings, getBookedSlotsForDate]);

  const monthLabel = useMemo(() => {
    return new Intl.DateTimeFormat('en-IN', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(month);
  }, [month]);

  const prevMonthDisabled = useMemo(() => {
    const year = month.getUTCFullYear();
    const m = month.getUTCMonth();
    const monthOffset = (year - today.getUTCFullYear()) * 12 + m - today.getUTCMonth();
    return monthOffset <= 0;
  }, [month]);

  const changeCalendarMonth = (step: number) => {
    const next = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + step, 1));
    const current = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
    if (next < current) return;
    setMonth(next);
  };

  const handleSelectServiceFromCard = (s: 'therapy' | 'cognitive') => {
    setService(s);
    setDuration(60);
    const bookEl = document.getElementById('book');
    if (bookEl) {
      bookEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSaveFee = () => {
    if (!Number.isFinite(feeInputValue) || feeInputValue <= 0) {
      showToast('Enter a valid fee greater than zero.');
      return;
    }
    setServiceInfo((prev) => ({
      ...prev,
      [feeService]: {
        ...prev[feeService],
        fees: {
          ...prev[feeService].fees,
          [feeDuration]: feeInputValue,
        },
      },
    }));
    showToast('Consultation fee rate updated.');
  };

  const handleAdminLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Security check: lockout active
    if (adminLockoutTime && Date.now() < adminLockoutTime) {
      const remainingSec = Math.ceil((adminLockoutTime - Date.now()) / 1000);
      setAdminLoginError(`Security lockout active. Please wait ${remainingSec}s before retrying.`);
      return;
    }

    const trimmedUsername = adminEmailInput.trim();
    const enteredPassword = adminPasswordInput;

    // Strict validation against specified credentials and common admin handles
    const normalizedUser = trimmedUsername.toLowerCase();
    const isUserValid =
      normalizedUser === 'hamda_admin_2026' ||
      normalizedUser === 'hamda' ||
      normalizedUser === 'hamda.connect@gmail.com' ||
      normalizedUser === 'arnoldkavungal11@gmail.com' ||
      normalizedUser === 'admin';
    const isPassValid = enteredPassword === 'Hamda@2026.admin';

    if (isUserValid && isPassValid) {
      setIsAdmin(true);
      setShowAdminLogin(false);
      setAdminLoginError(null);
      setAdminLoginAttempts(0);
      setAdminPasswordInput('');
      try {
        localStorage.setItem('hamda_admin_auth', 'true');
      } catch {}
      // Refresh cloud bookings immediately upon login
      fetchConsultationBookingsOnce().then((cloudBookings) => {
        if (cloudBookings && cloudBookings.length > 0) {
          setBookings((prev) => {
            const map = new Map<string, BookingRecord>();
            cloudBookings.forEach((b) => map.set(b.id, b as BookingRecord));
            prev.forEach((b) => {
              if (!map.has(b.id)) map.set(b.id, b);
            });
            const merged = Array.from(map.values());
            try {
              localStorage.setItem('hamda_bookings_list', JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      });
      showToast('Authenticated. Welcome Hamda to your Clinician Workspace.');
    } else {
      const nextCount = adminLoginAttempts + 1;
      setAdminLoginAttempts(nextCount);
      setAdminPasswordInput('');

      if (nextCount >= 5) {
        setAdminLockoutTime(Date.now() + 30000);
        setAdminLoginError('Too many failed attempts. Administrative portal locked for 30 seconds.');
      } else {
        setAdminLoginError('Authentication failed: Invalid credentials. Username: HAMDA_ADMIN_2026 / Password: Hamda@2026.admin');
      }
    }
  };

  const handleAdminLogout = async () => {
    setIsAdmin(false);
    setShowAdminLogin(false);
    try {
      localStorage.removeItem('hamda_admin_auth');
      await signOutAdmin();
    } catch {}
    showToast('Signed out of Clinician Workspace.');
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfile(editProfile);
    try {
      localStorage.setItem('hamda_profile_data', JSON.stringify(editProfile));
    } catch {}
    showToast('Practitioner profile & details saved successfully!');
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (JPG, PNG, WEBP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setCustomPhoto(result);
        try {
          localStorage.setItem('hamda_custom_photo', result);
        } catch {
          // In case local storage limit is reached, keep in state
        }
        showToast('Profile photo updated live across the site!');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetPhoto = () => {
    setCustomPhoto(null);
    try {
      localStorage.removeItem('hamda_custom_photo');
    } catch {}
    showToast('Reset to original photo.');
  };

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = clientName.trim();
    const trimmedEmail = clientEmail.trim();
    const trimmedPhone = whatsappNumber.trim().replace(/\s+/g, '');
    const ageNum = parseInt(clientAge, 10);

    // Anti-manipulation and strict input verification
    if (!trimmedName || trimmedName.length < 2) {
      showToast('Please provide your full legal or preferred name (min 2 characters).');
      return;
    }
    if (isNaN(ageNum) || ageNum < 12 || ageNum > 120) {
      showToast('Please enter a valid age between 12 and 120.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      showToast('Please provide a valid email address.');
      return;
    }
    if (!clientGender) {
      showToast('Please select your gender identification.');
      return;
    }
    if (!trimmedPhone || trimmedPhone.length < 8) {
      showToast('Please provide a valid WhatsApp number (minimum 8 digits).');
      return;
    }
    if (!agreePolicy) {
      showToast('Please review and agree to the booking and refund policy.');
      return;
    }

    setPaymentValidationError(null);
    setPaymentUtr('');
    setPaymentConfirmedAck(false);
    setModalStep('payment');
  };

  const handlePaymentVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sanitizedUtr = paymentUtr.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

    // Anti-tamper verification: require valid transaction reference
    if (!sanitizedUtr || sanitizedUtr.length < 8) {
      setPaymentValidationError('Please enter a valid 12-digit UPI UTR or bank transaction reference ID (minimum 8 characters).');
      return;
    }

    if (!paymentConfirmedAck) {
      setPaymentValidationError('Please tick the confirmation checkbox to verify that your payment was transferred.');
      return;
    }

    // Authoritative fee validation: Cannot be tampered by user
    const authoritativeFee =
      serviceInfo[service]?.fees[duration] ?? (duration === 30 ? 700 : 1250);

    const bookingId = `BK-${Date.now().toString().slice(-4)}`;
    const verificationHash = `VERIF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const newBooking: BookingRecord = {
      id: bookingId,
      name: clientName.trim(),
      email: clientEmail.trim(),
      whatsapp: `${phoneCode} ${whatsappNumber.trim()}`,
      age: clientAge,
      gender: clientGender,
      service: serviceInfo[service].name,
      duration,
      dateStr: selectedDate ? formatLong(selectedDate) : 'Pending selection',
      dateKey: selectedDate ? dateKey(selectedDate) : undefined,
      timeStr: `${time} IST`,
      timeSlot: time,
      fee: authoritativeFee,
      prepNote: prepNote.trim() || undefined,
      paymentMethod:
        paymentMethod === 'qr' ? 'UPI QR' : paymentMethod === 'upi' ? 'UPI ID' : 'Bank Transfer',
      utr: sanitizedUtr,
      payerNote: paymentPayerNote.trim() || undefined,
      verificationHash,
      status: 'Pending verification',
      createdAt: new Intl.DateTimeFormat('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date()),
    };

    const updated = [newBooking, ...bookings];
    setBookings(updated);
    try {
      localStorage.setItem('hamda_bookings_list', JSON.stringify(updated));
    } catch {}

    // Save directly to Cloud Firestore so published visitors across the world are recorded in real time
    await saveBookingToCloud(newBooking);

    // Broadcast in real-time across all browser tabs and windows
    try {
      const bc = new BroadcastChannel('hamda_bookings_sync');
      bc.postMessage({ type: 'BOOKING_CREATED', clientName: newBooking.name, booking: newBooking });
      bc.close();
    } catch {}
    window.dispatchEvent(new CustomEvent('hamda_bookings_updated', { detail: newBooking }));

    setRecentBooking(newBooking);
    setModalStep('receipt');
    showToast(`Booking ${bookingId} submitted for clinician payment verification.`);
  };

  const broadcastBookingsUpdate = () => {
    try {
      const bc = new BroadcastChannel('hamda_bookings_sync');
      bc.postMessage({ type: 'BOOKINGS_UPDATED' });
      bc.close();
    } catch {}
    window.dispatchEvent(new CustomEvent('hamda_bookings_updated'));
  };

  const handleConfirmClientBooking = async (booking: BookingRecord) => {
    const nowStr = new Intl.DateTimeFormat('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date());

    const updated = bookings.map((b) => {
      if (b.id === booking.id) {
        return {
          ...b,
          status: 'Confirmed' as const,
          verifiedAt: nowStr,
        };
      }
      return b;
    });
    setBookings(updated);
    try {
      localStorage.setItem('hamda_bookings_list', JSON.stringify(updated));
    } catch {}

    await updateBookingInCloud(booking.id, { status: 'Confirmed', verifiedAt: nowStr });

    if (booking.dateKey && (booking.timeSlot || booking.timeStr)) {
      const cleanSlot = (booking.timeSlot || booking.timeStr).replace(/\s*IST\s*$/i, '').trim();
      await reservePublicBookedSlot(booking.dateKey, cleanSlot, booking.id);
      setCloudBookedSlots((prev) => {
        if (!prev.some((s) => s.dateKey === booking.dateKey && s.timeSlot === cleanSlot)) {
          return [...prev, { dateKey: booking.dateKey!, timeSlot: cleanSlot }];
        }
        return prev;
      });
    }

    broadcastBookingsUpdate();
    setConfirmPrompt(null);
    showToast(`✓ Booking for ${booking.name} confirmed! Slot reserved.`);
  };

  const handleNotConfirmClientBooking = async (booking: BookingRecord) => {
    const updated = bookings.map((b) => {
      if (b.id === booking.id) {
        return {
          ...b,
          status: 'Not Confirmed' as const,
        };
      }
      return b;
    });
    setBookings(updated);
    try {
      localStorage.setItem('hamda_bookings_list', JSON.stringify(updated));
    } catch {}

    await updateBookingInCloud(booking.id, { status: 'Not Confirmed' });

    // Release public slot in Firestore and locally so it becomes AVAILABLE across all devices
    if (booking.dateKey && (booking.timeSlot || booking.timeStr)) {
      const cleanSlot = (booking.timeSlot || booking.timeStr).replace(/\s*IST\s*$/i, '').trim();
      await releasePublicBookedSlot(booking.dateKey, cleanSlot);
      setCloudBookedSlots((prev) =>
        prev.filter((s) => !(s.dateKey === booking.dateKey && s.timeSlot === cleanSlot))
      );
    }

    broadcastBookingsUpdate();
    setConfirmPrompt(null);
    showToast(`Consultation marked Not Confirmed. Date & time slot is now AVAILABLE!`);
  };

  const handleVerifyBookingPayment = (bookingId: string) => {
    const b = bookings.find((item) => item.id === bookingId);
    if (b) {
      handleConfirmClientBooking(b);
    } else {
      showToast('Booking not found.');
    }
  };

  const handleFlagDiscrepancy = (bookingId: string) => {
    const updated = bookings.map((b) => {
      if (b.id === bookingId) {
        return {
          ...b,
          status: 'Discrepancy' as const,
        };
      }
      return b;
    });
    setBookings(updated);
    try {
      localStorage.setItem('hamda_bookings_list', JSON.stringify(updated));
    } catch {}
    updateBookingInCloud(bookingId, { status: 'Discrepancy' });
    broadcastBookingsUpdate();
    showToast(`Booking ${bookingId} marked as discrepancy / unverified.`);
  };

  const handleCompleteBooking = (bookingId: string) => {
    const updated = bookings.map((b) => {
      if (b.id === bookingId) {
        return {
          ...b,
          status: 'Completed' as const,
        };
      }
      return b;
    });
    setBookings(updated);
    try {
      localStorage.setItem('hamda_bookings_list', JSON.stringify(updated));
    } catch {}
    updateBookingInCloud(bookingId, { status: 'Completed' });
    broadcastBookingsUpdate();
    showToast(`Consultation ${bookingId} marked completed.`);
  };

  const handleDeleteBooking = (bookingId: string) => {
    const toDelete = bookings.find((b) => b.id === bookingId);
    if (toDelete && toDelete.status === 'Pending verification') {
      showToast('Please confirm or not confirm the client before deleting.');
      setConfirmPrompt({ booking: toDelete, action: 'not_confirm' });
      return;
    }
    const updated = bookings.filter((b) => b.id !== bookingId);
    setBookings(updated);
    try {
      localStorage.setItem('hamda_bookings_list', JSON.stringify(updated));
    } catch {}
    if (toDelete?.dateKey && (toDelete?.timeSlot || toDelete?.timeStr)) {
      const cleanSlot = (toDelete.timeSlot || toDelete.timeStr).replace(/\s*IST\s*$/i, '').trim();
      setCloudBookedSlots((prev) =>
        prev.filter((s) => !(s.dateKey === toDelete.dateKey && s.timeSlot === cleanSlot))
      );
    }
    deleteBookingFromCloud(bookingId, toDelete?.dateKey, toDelete?.timeSlot || toDelete?.timeStr);
    broadcastBookingsUpdate();
    showToast(`Client record ${bookingId} deleted.`);
  };

  const handleClearAllBookings = () => {
    const pendingCount = bookings.filter((b) => b.status === 'Pending verification').length;
    if (pendingCount > 0) {
      showToast('Cannot delete: Please confirm or not confirm pending client requests first.');
      return;
    }
    setBookings([]);
    try {
      localStorage.setItem('hamda_bookings_list', JSON.stringify([]));
    } catch {}
    broadcastBookingsUpdate();
    showToast('All resolved client consultation records deleted.');
  };

  const availableDateTimes = useMemo(() => {
    return selectedDate && isDateAvailable(selectedDate) ? timesForDate(selectedDate) : [];
  }, [selectedDate, days, dateSlots, bookings, isDateAvailable]);

  const currentFee = serviceInfo[service].fees[duration];
  const feeText =
    currentFee == null
      ? 'Fee to be confirmed with Hamda'
      : `Consultation fee ₹${Number(currentFee).toLocaleString('en-IN')}`;

  return (
    <>
      {/* Top Bar */}
      <header className="topbar">
        <a href="#home" className="brand">
          PSYCHBYHAMDA
        </a>
        <nav className={`links ${menuOpen ? 'open' : ''}`} id="navLinks">
          <a href="#about" onClick={() => setMenuOpen(false)}>
            About Hamda
          </a>
          <a href="#approach" onClick={() => setMenuOpen(false)}>
            My approach
          </a>
          <a href="#support" onClick={() => setMenuOpen(false)}>
            How I can help
          </a>
          {isAdmin && (
            <a href="#workspace" onClick={() => setMenuOpen(false)}>
              Clinician space <span className="admin-badge-active" style={{ fontSize: '8px', padding: '2px 6px', marginLeft: '4px' }}>Admin ●</span>
            </a>
          )}
          <a
            className="button"
            href="#book"
            onClick={() => setMenuOpen(false)}
          >
            Book a session{' '}
            <svg viewBox="0 0 24 24">
              <path d="M5 12h14m-6-6 6 6-6 6" />
            </svg>
          </a>
        </nav>
        <button
          className="menu-btn"
          id="menuBtn"
          aria-label="Open menu"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ☰
        </button>
      </header>

      <main>
        {/* Hero Section */}
        <section className="hero" id="home">
          <div className="wrap hero-grid">
            <div className="reveal-on-scroll">
              <h1>
                {profile.greeting}
                <br />
                <em>{profile.name.split(' ')[0] || 'Hamda'}.</em>
              </h1>
              <p className="role">{profile.role}</p>
              <p className="hero-copy">
                {profile.heroCopy}
              </p>
              <div className="hero-actions">
                <a className="button" href="#book">
                  Let's find a time{' '}
                  <svg viewBox="0 0 24 24">
                    <path d="M5 12h14m-6-6 6 6-6 6" />
                  </svg>
                </a>
                <a className="button secondary" href="#about">
                  Get to know me
                </a>
              </div>
              <div className="inline-note">
                A thoughtful, evidence-informed space to understand yourself better.
              </div>
            </div>

            <div className="hero-art reveal-scale" aria-label={`Portrait of ${profile.name}`}>
              <div className="art-ring"></div>
              <div className="art-disc">
                <img
                  className="hero-photo"
                  src={activePhoto}
                  alt={`Portrait of ${profile.name}`}
                  loading="eager"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Division Line */}
        <div className="section-divider-wrap" aria-hidden="true">
          <div className="section-divider">
            <div className="section-divider-node"></div>
          </div>
        </div>

        {/* About Section */}
        <section className="section about" id="about">
          <div className="wrap about-grid">
            <aside className="about-aside reveal-on-scroll">
              <div className="eyebrow">A little about me</div>
              <div className="quote-mark">“</div>
              <blockquote>{profile.aboutQuote}</blockquote>
              <div className="small">Space to understand, work through, and move forward.</div>
            </aside>
            <div className="about-copy reveal-on-scroll reveal-delay-1">
              <p>{profile.aboutP1}</p>
              <p>{profile.aboutP2}</p>
              <div className="goal">{profile.aboutGoal}</div>
            </div>
          </div>
        </section>

        {/* Division Line */}
        <div className="section-divider-wrap" aria-hidden="true">
          <div className="section-divider">
            <div className="section-divider-node"></div>
          </div>
        </div>

        {/* Methods / Approach Section */}
        <section className="section methods" id="approach">
          <div className="wrap">
            <div className="section-head reveal-on-scroll">
              <div className="eyebrow">How we might work together</div>
              <h2>Evidence-informed, always human.</h2>
              <p>
                Therapy isn't one-size-fits-all. I draw on established approaches and make the ideas practical, personalised, and relevant to your everyday life.
              </p>
            </div>
            <div className="approach-grid">
              <a
                className={`method-card therapy-card reveal-on-scroll reveal-delay-1 ${service === 'therapy' ? 'selected-card' : ''}`}
                href="#book"
                data-service="therapy"
                aria-label="Book Behavioral and Cognitive Therapy"
                onClick={(e) => {
                  e.preventDefault();
                  handleSelectServiceFromCard('therapy');
                }}
              >
                <div className="method-top">
                  <div className="method-num">01 &nbsp; / &nbsp; INDIVIDUAL THERAPY</div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {service === 'therapy' && (
                      <span className="therapy-rate" style={{ background: '#345d50', color: '#ffffff' }}>
                        ✓ Selected
                      </span>
                    )}
                    <span className="therapy-rate">30 min · 60 min</span>
                  </div>
                </div>
                <h3>Behavioral &amp; Cognitive Therapy</h3>
                <p>
                  Personalised, evidence-informed sessions focused on understanding thought patterns, managing emotions, and developing healthier behavioural responses to everyday challenges.
                </p>
                <ul className="therapy-points">
                  <li>Anxiety and overthinking</li>
                  <li>Stress and emotional overwhelm</li>
                  <li>Procrastination and motivation</li>
                  <li>Emotional regulation and coping skills</li>
                  <li>Mindfulness</li>
                  <li>Self-awareness and everyday challenges</li>
                </ul>
                <span className="method-cta">
                  {service === 'therapy' ? '✓ Selected · Proceed to Book' : 'Choose this session'}{' '}
                  <span aria-hidden="true">→</span>
                </span>
              </a>

              <a
                className={`method-card therapy-card reveal-on-scroll reveal-delay-2 ${service === 'cognitive' ? 'selected-card' : ''}`}
                href="#book"
                data-service="cognitive"
                aria-label="Book Neuropsychology and Cognitive Skills"
                onClick={(e) => {
                  e.preventDefault();
                  handleSelectServiceFromCard('cognitive');
                }}
              >
                <div className="method-top">
                  <div className="method-num">02 &nbsp; / &nbsp; COGNITIVE SKILLS</div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {service === 'cognitive' && (
                      <span className="therapy-rate" style={{ background: '#345d50', color: '#ffffff' }}>
                        ✓ Selected
                      </span>
                    )}
                    <span className="therapy-rate">30 min · 60 min</span>
                  </div>
                </div>
                <h3>Neuropsychology &amp; Cognitive Skills</h3>
                <p>
                  Understand cognitive functioning and develop practical strategies to support attention, memory, focus, and executive functioning.
                </p>
                <ul className="therapy-points">
                  <li>Focus and sustained attention</li>
                  <li>Memory and working memory</li>
                  <li>Planning, organisation, and mental flexibility</li>
                  <li>Cognitive strategies for everyday challenges</li>
                  <li>Guidance on further assessment, where appropriate</li>
                </ul>
                <span className="method-cta">
                  {service === 'cognitive' ? '✓ Selected · Proceed to Book' : 'Choose this session'}{' '}
                  <span aria-hidden="true">→</span>
                </span>
              </a>
            </div>
          </div>
        </section>

        {/* Division Line */}
        <div className="section-divider-wrap" aria-hidden="true">
          <div className="section-divider">
            <div className="section-divider-node"></div>
          </div>
        </div>

        {/* Support Section */}
        <section className="section support" id="support">
          <div className="wrap">
            <div className="section-head reveal-on-scroll">
              <div className="eyebrow">What feels difficult lately?</div>
              <h2>Understand your mind. Find your way forward.</h2>
              <p>We can make sense of what's going on and find approaches that fit your life, not just a textbook.</p>
            </div>
            <div className="support-grid">
              <article className="support-item reveal-on-scroll reveal-delay-1">
                <div className="symbol">↗</div>
                <h3>Anxiety</h3>
                <p>Understand your responses to stress and build healthier coping strategies.</p>
              </article>
              <article className="support-item reveal-on-scroll reveal-delay-2">
                <div className="symbol">〰</div>
                <h3>Overthinking</h3>
                <p>Recognise thought patterns and learn to respond to them differently.</p>
              </article>
              <article className="support-item reveal-on-scroll reveal-delay-3">
                <div className="symbol">◌</div>
                <h3>Stress &amp; Emotions</h3>
                <p>Explore emotional responses and develop practical regulation skills.</p>
              </article>
              <article className="support-item reveal-on-scroll reveal-delay-4">
                <div className="symbol">✳</div>
                <h3>Focus &amp; Procrastination</h3>
                <p>Work on attention, task initiation, and everyday behavioural patterns.</p>
              </article>
              <article className="support-item reveal-on-scroll reveal-delay-5">
                <div className="symbol">♡</div>
                <h3>Cognitive Skills &amp; Brain Function</h3>
                <p>Explore attention, memory, and executive functioning through cognitive strategies and personalised guidance.</p>
              </article>
            </div>
          </div>
        </section>

        {/* Division Line */}
        <div className="section-divider-wrap" aria-hidden="true">
          <div className="section-divider">
            <div className="section-divider-node"></div>
          </div>
        </div>

        {/* Booking Section */}
        <section className="section booking" id="book">
          <div className="wrap booking-grid">
            <div className="booking-aside reveal-on-scroll">
              <div className="eyebrow">Take a first step</div>
              <h2>Let's make space for a conversation.</h2>
              <p>
                Choose a time that works for you. This booking form shows live availability; Hamda can confirm the final appointment details with you.
              </p>
              <div className="detail">
                <span className="detail-icon">◷</span> 1-on-1 online consultation · 30 or 60 minutes
              </div>
              <div className="detail">
                <span className="detail-icon">✳</span> Thoughtful, confidential support
              </div>
              <div className="detail">
                <span className="detail-icon">↗</span> Fee confirmed before payment
              </div>
            </div>

            <div className={`booking-card reveal-on-scroll reveal-delay-1 ${bookingCardFlash ? 'is-sync-flashing' : ''}`}>
              {bookingCardFlashMessage && (
                <div className="booking-sync-banner" role="status" aria-live="polite">
                  <span>⚡ <strong>Live Synced:</strong> {bookingCardFlashMessage}</span>
                  <span style={{ fontSize: '9px', background: '#dcfce7', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Real-time</span>
                </div>
              )}
              <div className="card-head">
                <div>
                  <h3>Request a session</h3>
                  <p>Choose your consultation length, day, and time.</p>
                </div>
                <span className="badge">Private booking</span>
              </div>

              <div className="label">Your practitioner</div>
              <div className="provider">
                <div
                  className="provider-avatar"
                  style={{
                    backgroundImage: `url(${activePhoto})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center 30%',
                    color: 'transparent',
                  }}
                >
                  {profile.name[0] || 'H'}
                </div>
                <div>
                  <strong>{profile.name}</strong>
                  <span>{profile.role}</span>
                </div>
                <span className="provider-check">✳</span>
              </div>

              <div className="label">Choose consultation focus</div>
              <div className="service-choice-grid" id="serviceChoices" role="radiogroup" aria-label="Select consultation offering">
                <button
                  type="button"
                  className={`service-choice-btn ${service === 'therapy' ? 'selected' : ''}`}
                  onClick={() => setService('therapy')}
                  aria-pressed={service === 'therapy'}
                >
                  <div className="service-choice-top">
                    <span className="service-choice-num">01 / INDIVIDUAL THERAPY</span>
                    <span className="service-choice-badge" aria-hidden="true">{service === 'therapy' ? '✓' : ''}</span>
                  </div>
                  <strong>Behavioral &amp; Cognitive Therapy</strong>
                  <div className="service-choice-rate">
                    <span>₹{serviceInfo.therapy.fees[duration]?.toLocaleString('en-IN')}</span>
                    <span style={{ fontSize: '9px', fontWeight: 500, color: '#7b8c82' }}>{duration} mins</span>
                  </div>
                </button>

                <button
                  type="button"
                  className={`service-choice-btn ${service === 'cognitive' ? 'selected' : ''}`}
                  onClick={() => setService('cognitive')}
                  aria-pressed={service === 'cognitive'}
                >
                  <div className="service-choice-top">
                    <span className="service-choice-num">02 / COGNITIVE SKILLS</span>
                    <span className="service-choice-badge" aria-hidden="true">{service === 'cognitive' ? '✓' : ''}</span>
                  </div>
                  <strong>Neuropsychology &amp; Cognitive Skills</strong>
                  <div className="service-choice-rate">
                    <span>₹{serviceInfo.cognitive.fees[duration]?.toLocaleString('en-IN')}</span>
                    <span style={{ fontSize: '9px', fontWeight: 500, color: '#7b8c82' }}>{duration} mins</span>
                  </div>
                </button>
              </div>

              <div className="label">Consultation length</div>
              <div className="durations" id="durations">
                <button
                  type="button"
                  className={`duration-btn ${duration === 30 ? 'selected' : ''}`}
                  onClick={() => setDuration(30)}
                >
                  <strong>30-minute consultation</strong>
                  <span>Brief appointment</span>
                </button>
                <button
                  type="button"
                  className={`duration-btn ${duration === 60 ? 'selected' : ''}`}
                  onClick={() => setDuration(60)}
                >
                  <strong>60-minute consultation</strong>
                  <span>Extended appointment</span>
                </button>
              </div>

              <div className="label">Choose a day</div>
              <div className="calendar-shell" id="calendarShell">
                <div className="calendar-toolbar">
                  <button
                    type="button"
                    className="month-arrow"
                    id="prevMonth"
                    aria-label="Previous month"
                    disabled={prevMonthDisabled}
                    onClick={() => changeCalendarMonth(-1)}
                  >
                    ‹
                  </button>
                  <strong className="month-title" id="monthLabel">
                    {monthLabel}
                  </strong>
                  <button
                    type="button"
                    className="month-arrow"
                    id="nextMonth"
                    aria-label="Next month"
                    onClick={() => changeCalendarMonth(1)}
                  >
                    ›
                  </button>
                </div>

                <div className="timezone-control">
                  <label htmlFor="timeZoneSelect">Show times in</label>
                  <select
                    id="timeZoneSelect"
                    aria-label="Choose your time zone"
                    value={timeZone}
                    onChange={(e) => setTimeZone(e.target.value)}
                  >
                    {timeZones.map((zone) => (
                      <option key={zone} value={zone}>
                        {zone.replace(/_/g, ' ')}
                        {zone === 'Asia/Kolkata' ? ' — India Standard Time' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="weekday-head">
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                  <span>Sun</span>
                </div>

                <div className="calendar-grid" id="calendarGrid">
                  {calendarCells.map((cell, idx) => {
                    if (!cell.date) {
                      return <div key={idx} className="calendar-empty" aria-hidden="true"></div>;
                    }
                    return (
                      <button
                        key={idx}
                        type="button"
                        className={`calendar-day ${cell.available ? 'available' : 'disabled'} ${
                          cell.selected ? 'selected' : ''
                        } ${cell.isToday ? 'today' : ''} ${cell.isFullyBooked ? 'fully-booked' : ''}`}
                        disabled={!cell.available}
                        title={
                          cell.isFullyBooked
                            ? 'All session times booked on this date'
                            : !cell.available
                            ? 'Unavailable'
                            : 'Available for booking'
                        }
                        onClick={() => {
                          setSelectedDate(cell.date);
                          const allTimes = timesForDate(cell.date);
                          const booked = getBookedSlotsForDate(cell.date);
                          const openTimes = allTimes.filter((t) => !booked.includes(t));
                          if (openTimes.length) setTime(openTimes[0]);
                        }}
                      >
                        {cell.day}
                      </button>
                    );
                  })}
                </div>

                <div className="calendar-hint">
                  Swipe/use arrows · dates in IST, times in your zone · book 48h ahead · Fri/Sat after 8 PM, Sun 9 AM–10 PM IST
                </div>
              </div>

              <div className="label" id="timeHeading">
                {selectedDate && isDateAvailable(selectedDate)
                  ? `Available times · ${timeZone}`
                  : 'Select a date to see times'}
              </div>

              <div className="times" id="times">
                {availableDateTimes.length > 0 ? (
                  availableDateTimes.map((t) => {
                    const booked = selectedDate ? getBookedSlotsForDate(selectedDate) : [];
                    const isBooked = booked.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        className={`time-btn ${time === t ? 'selected' : ''} ${isBooked ? 'booked' : ''}`}
                        disabled={isBooked}
                        title={isBooked ? `${t} is already booked by another client` : `Select ${t}`}
                        onClick={() => {
                          if (!isBooked) setTime(t);
                        }}
                      >
                        <span>{selectedDate ? formatSlotTime(selectedDate, t, timeZone) : t}</span>
                        {isBooked && <span className="slot-booked-tag">Booked</span>}
                      </button>
                    );
                  })
                ) : (
                  <div style={{ color: 'var(--text-sub)', fontSize: '0.88rem', fontStyle: 'italic', padding: '10px 0' }}>
                    No consultation slots open for this date.
                  </div>
                )}
              </div>

              <div className="fee-line">
                <span id="serviceFeeLabel">
                  {serviceInfo[service].name} · {duration} min
                </span>
                <strong id="feeDisplay">
                  {currentFee == null ? 'Confirm before payment' : `₹${Number(currentFee).toLocaleString('en-IN')}`}
                </strong>
              </div>

              <p className="booking-policy-note">
                Full payment is due at least 48 hours before your appointment; bookings are confirmed after payment. Cancellations or rescheduling require 24 hours’ notice. Payments are non-refundable.{' '}
                <a href="#policy">Read the full policy</a>.
              </p>

              <button
                type="button"
                className="button book-button"
                id="checkoutBtn"
                onClick={() => {
                  if (!selectedDate || !isDateAvailable(selectedDate)) {
                    showToast('Please choose an available day.');
                    return;
                  }
                  setModalStep('details');
                }}
              >
                Continue to details{' '}
                <svg viewBox="0 0 24 24">
                  <path d="M5 12h14m-6-6 6 6-6 6" />
                </svg>
              </button>

              <p className="fineprint">
                Official clinical booking portal. Consultations are verified and confirmed upon payment verification.
              </p>
            </div>
          </div>
        </section>

        {/* Division Line */}
        <div className="section-divider-wrap" aria-hidden="true">
          <div className="section-divider">
            <div className="section-divider-node"></div>
          </div>
        </div>

        {/* Policy Section */}
        <section className="policy-section section" id="policy">
          <div className="wrap">
            <div className="section-head reveal-on-scroll">
              <div className="eyebrow">Please read before booking</div>
              <h2>Booking, Cancellation &amp; Refund Policy</h2>
              <p>Please review these terms before requesting a session.</p>
            </div>
            <div className="policy-grid">
              <article className="policy-card reveal-on-scroll reveal-delay-1">
                <h3>1. Payment &amp; Booking Confirmation</h3>
                <p>
                  Full payment must be made at least <strong>48 hours before</strong> the scheduled appointment to confirm your booking. Appointments are confirmed only after payment has been received.
                </p>
              </article>
              <article className="policy-card reveal-on-scroll reveal-delay-2">
                <h3>2. Session Communication</h3>
                <p>
                  Sessions are conducted online. At the scheduled appointment time, you will receive a message from Hamda via WhatsApp to initiate the session. If there is any delay, you will be informed in advance. Please ensure you are available and reachable at the scheduled time.
                </p>
              </article>
              <article className="policy-card reveal-on-scroll reveal-delay-3">
                <h3>3. Cancellation Policy</h3>
                <p>
                  Please notify us of any cancellations or rescheduling requests at least <strong>24 hours before</strong> your scheduled appointment. If you do not respond to the appointment confirmation message, your booking may be cancelled.
                </p>
              </article>
              <article className="policy-card reveal-on-scroll reveal-delay-4">
                <h3>4. Refund Policy</h3>
                <p>
                  All payments are <strong>non-refundable</strong> once made. Please ensure that you can attend your scheduled appointment before completing the payment.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* Division Line */}
        <div className="section-divider-wrap" aria-hidden="true">
          <div className="section-divider">
            <div className="section-divider-node"></div>
          </div>
        </div>

        {/* Privacy Section */}
        <section className="privacy reveal-on-scroll">
          <div className="wrap privacy-inner">
            <div className="privacy-intro">
              <div className="privacy-icon">
                <svg viewBox="0 0 24 24">
                  <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
              <div>
                <h3>Your trust matters.</h3>
                <p>
                  Therapy is personal. A live service should protect your privacy with secure video, carefully controlled records, and transparent consent.
                </p>
              </div>
            </div>
            <div className="privacy-badges">
              <span>Confidential care</span>
              <span>Secure video (production)</span>
              <span>AES-256 target for records</span>
            </div>
          </div>
        </section>

        {/* Clinician Workspace - Hidden in footer as admin, displayed when authenticated or requested */}
        {(isAdmin || showAdminLogin) && (
          <section className="workspace" id="workspace">
            <div className="wrap">
              {!isAdmin ? (
                <div className="admin-login-card">
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setShowAdminLogin(false)}
                      className="admin-dismiss-btn"
                      title="Close admin login and return to public view"
                    >
                      ✕ Close
                    </button>
                  </div>
                  <div className="admin-lock-icon">
                    <svg viewBox="0 0 24 24">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <div className="eyebrow">Clinician Portal · Restricted Access</div>
                  <h2>Clinician Sign In</h2>
                  <p>
                    This workspace is reserved for Hamda to manage practice availability, update session rates, view client consultation records, and update her practitioner profile.
                  </p>

                <form onSubmit={handleAdminLogin} className="admin-login-form" style={{ marginTop: '20px' }}>
                  <div>
                    <label htmlFor="adminEmail">Username or Email</label>
                    <input
                      id="adminEmail"
                      type="text"
                      required
                      autoComplete="username"
                      placeholder="e.g. HAMDA_ADMIN_2026"
                      value={adminEmailInput}
                      onChange={(e) => setAdminEmailInput(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="adminPassword">Password</label>
                    <input
                      id="adminPassword"
                      type="password"
                      required
                      autoComplete="current-password"
                      placeholder="Enter administrator password"
                      value={adminPasswordInput}
                      onChange={(e) => setAdminPasswordInput(e.target.value)}
                    />
                  </div>

                  {adminLoginError && (
                    <div
                      style={{
                        color: '#991b1b',
                        fontSize: '11px',
                        background: '#fee2e2',
                        border: '1px solid #fecaca',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        lineHeight: 1.5,
                      }}
                    >
                      {adminLoginError}
                    </div>
                  )}

                  <button type="submit" className="button" style={{ width: '100%', marginTop: '4px' }}>
                    Secure sign in
                  </button>

                  <div className="admin-security-card">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <span>Administrative portal secured. Multi-attempt lockout and credential verification enforced.</span>
                  </div>
                </form>
              </div>
            ) : (
              <>
                <div className="workspace-header">
                  <div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <div className="admin-badge-active" style={{ marginBottom: 0 }}>
                        <span className="admin-badge-dot"></span>
                        Clinician Portal · Authenticated
                      </div>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '11px',
                          padding: '3px 9px',
                          borderRadius: '20px',
                          background: '#ecfdf5',
                          color: '#065f46',
                          border: '1px solid #a7f3d0',
                          fontWeight: 600,
                        }}
                      >
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                        Cloud Sync Active (Live Phone &amp; Web Bookings)
                      </div>
                    </div>
                    <h2>Clinician workspace</h2>
                    <p>
                      Managing practice as <strong>{profile.name}</strong> ({profile.email}) · {profile.location}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="button secondary"
                      onClick={handleAdminLogout}
                    >
                      Sign out
                    </button>
                    <a
                      href="#home"
                      className="button"
                      style={{ padding: '9px 15px', fontSize: '10px' }}
                    >
                      View live hero
                    </a>
                  </div>
                </div>

                <div className="tabs" role="tablist">
                  <button
                    type="button"
                    className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
                    onClick={() => setActiveTab('profile')}
                  >
                    Profile &amp; Photo
                  </button>
                  <button
                    type="button"
                    className={`tab ${activeTab === 'calendar' ? 'active' : ''}`}
                    onClick={() => setActiveTab('calendar')}
                  >
                    Availability
                  </button>
                  <button
                    type="button"
                    className={`tab ${activeTab === 'records' ? 'active' : ''}`}
                    onClick={() => setActiveTab('records')}
                  >
                    Client records ({bookings.length})
                    {bookings.filter((b) => b.status === 'Pending verification').length > 0 && (
                      <span
                        style={{
                          marginLeft: '6px',
                          padding: '2px 7px',
                          borderRadius: '9999px',
                          fontSize: '0.72rem',
                          background: '#b45309',
                          color: '#ffffff',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                      >
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#fef08a' }} />
                        {bookings.filter((b) => b.status === 'Pending verification').length} new
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    className={`tab ${activeTab === 'payments' ? 'active' : ''}`}
                    onClick={() => setActiveTab('payments')}
                  >
                    Payments &amp; fees
                  </button>
                </div>

                {/* Tab 0: Profile & Photo */}
                {activeTab === 'profile' && (
                  <div className="tab-panel active" id="tab-profile">
                    <div className="workspace-grid">
                      {/* Photo Uploader Card */}
                      <div className="work-card">
                        <h3>Profile photo</h3>
                        <p className="sub">
                          Update the practitioner photo displayed on the homepage hero, provider badge, and consultations.
                        </p>

                        <div className="admin-photo-container">
                          <img
                            src={activePhoto}
                            alt="Current profile"
                            className="admin-photo-preview"
                          />
                          <div className="admin-photo-actions">
                            <label className="file-upload-label">
                              <svg
                                style={{ width: 15, height: 15, stroke: 'currentColor', fill: 'none' }}
                                viewBox="0 0 24 24"
                              >
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                              </svg>
                              Upload new photo
                              <input
                                type="file"
                                accept="image/*"
                                className="file-upload-input"
                                onChange={handlePhotoUpload}
                              />
                            </label>
                            {customPhoto && (
                              <button
                                type="button"
                                className="btn-reset-photo"
                                onClick={handleResetPhoto}
                              >
                                Reset to original photo
                              </button>
                            )}
                            <p style={{ fontSize: '9px', color: '#88938c', margin: 0 }}>
                              Supported formats: JPG, PNG, WEBP. Updated photo reflects instantly across the site.
                            </p>
                          </div>
                        </div>

                        <div className="admin-help-box" style={{ marginTop: '15px' }}>
                          <strong>Live sync:</strong> Changing this image updates the circular portrait disc in the Hero section and consultation practitioner badge immediately.
                        </div>
                      </div>

                      {/* Details Editor Card */}
                      <div className="work-card">
                        <h3>Practice details</h3>
                        <p className="sub">
                          Edit headline information, biography copy, and contact channels.
                        </p>
                        <form onSubmit={handleSaveProfile}>
                          <div className="profile-edit-field">
                            <label htmlFor="editName">Full Name</label>
                            <input
                              id="editName"
                              value={editProfile.name}
                              onChange={(e) => setEditProfile({ ...editProfile, name: e.target.value })}
                              required
                            />
                          </div>
                          <div className="profile-edit-field">
                            <label htmlFor="editRole">Clinical Role / Headline</label>
                            <input
                              id="editRole"
                              value={editProfile.role}
                              onChange={(e) => setEditProfile({ ...editProfile, role: e.target.value })}
                              required
                            />
                          </div>
                          <div className="profile-edit-field">
                            <label htmlFor="editHeroCopy">Hero Introduction Bio</label>
                            <textarea
                              id="editHeroCopy"
                              value={editProfile.heroCopy}
                              onChange={(e) => setEditProfile({ ...editProfile, heroCopy: e.target.value })}
                              rows={2}
                              required
                            />
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div className="profile-edit-field">
                              <label htmlFor="editEmail">Contact Email</label>
                              <input
                                id="editEmail"
                                value={editProfile.email}
                                onChange={(e) => setEditProfile({ ...editProfile, email: e.target.value })}
                                required
                              />
                            </div>
                            <div className="profile-edit-field">
                              <label htmlFor="editSocial">Social Handle</label>
                              <input
                                id="editSocial"
                                value={editProfile.socialHandle}
                                onChange={(e) =>
                                  setEditProfile({ ...editProfile, socialHandle: e.target.value })
                                }
                                required
                              />
                            </div>
                          </div>
                          <div className="profile-edit-field">
                            <label htmlFor="editQuote">About Section Quotation</label>
                            <input
                              id="editQuote"
                              value={editProfile.aboutQuote}
                              onChange={(e) => setEditProfile({ ...editProfile, aboutQuote: e.target.value })}
                              required
                            />
                          </div>
                          <button
                            type="submit"
                            className="button"
                            style={{ width: '100%', marginTop: '6px' }}
                          >
                            Save practice details
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 1: Availability */}
                {activeTab === 'calendar' && (
                  <div className="tab-panel active" id="tab-calendar">
                    <div className="workspace-grid">
                      {/* Card 1: Weekly availability */}
                      <div className="work-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                          <div>
                            <h3>Weekly availability</h3>
                            <p className="sub">Toggle days open for appointment requests.</p>
                          </div>
                          <div className="admin-quick-links">
                            <button
                              type="button"
                              className="admin-quick-link"
                              onClick={() => {
                                setDays([true, true, true, true, true, true, true]);
                              }}
                            >
                              All days
                            </button>
                            <button
                              type="button"
                              className="admin-quick-link"
                              onClick={() => {
                                setDays([false, false, false, false, true, true, true]);
                              }}
                            >
                              Fri–Sun
                            </button>
                            <button
                              type="button"
                              className="admin-quick-link"
                              onClick={() => {
                                setDays([false, false, false, false, false, false, false]);
                              }}
                            >
                              Clear
                            </button>
                          </div>
                        </div>

                        <div id="daysList" style={{ marginTop: '10px' }}>
                          {[
                            'Monday',
                            'Tuesday',
                            'Wednesday',
                            'Thursday',
                            'Friday',
                            'Saturday',
                            'Sunday',
                          ].map((dayName, idx) => (
                            <div key={dayName} className="dayrow">
                              <span>{dayName}</span>
                              <button
                                type="button"
                                className={`toggle ${days[idx] ? 'on' : ''}`}
                                aria-label={`Toggle ${dayName}`}
                                onClick={() => {
                                  const newDays = [...days];
                                  newDays[idx] = !newDays[idx];
                                  setDays(newDays);
                                }}
                              ></button>
                            </div>
                          ))}
                        </div>

                        <div className="admin-card-actions">
                          <span style={{ fontSize: '11px', color: 'var(--text-sub)' }}>
                            {days.filter(Boolean).length} of 7 days open
                          </span>
                          <button
                            type="button"
                            className="admin-save-btn"
                            onClick={handleSaveWeeklyDays}
                            disabled={isSavingWeeklyDays}
                            title="Save weekly open days to backend and immediately update consultation booking card"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={isSavingWeeklyDays ? 'animate-spin' : ''}>
                              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                              <polyline points="17 21 17 13 7 13 7 21"></polyline>
                              <polyline points="7 3 7 8 15 8"></polyline>
                            </svg>
                            {isSavingWeeklyDays ? 'Syncing to backend...' : 'Save weekly availability'}
                          </button>
                        </div>
                      </div>

                      {/* Card 2: Session times for specific dates */}
                      <div className="work-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                          <div>
                            <h3>Session times</h3>
                            <p className="sub">Select date & customize active consultation booking slots (IST).</p>
                          </div>
                        </div>

                        {/* Date Selector Box with Scrolling Select */}
                        <div className="admin-date-selector-box">
                          <div className="admin-date-input-row">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <label htmlFor="adminDateInput" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--green, #345d50)' }}>
                                Date:
                              </label>
                              <input
                                id="adminDateInput"
                                type="date"
                                className="admin-date-input"
                                value={adminDateKey}
                                min={dateKey(today)}
                                onChange={(e) => {
                                  if (e.target.value) {
                                    setAdminDateKey(e.target.value);
                                  }
                                }}
                              />
                            </div>
                            <span className="admin-date-badge">
                              {formatLong(adminDateObj)}
                            </span>
                          </div>

                          {/* Month Jump Filters */}
                          <div className="admin-month-jump-bar">
                            <span style={{ fontSize: '10px', color: 'var(--muted, #68777a)', fontWeight: 600, marginRight: '4px' }}>
                              Jump to:
                            </span>
                            {availableAdminMonths.map((m) => {
                              const isActive = adminDateKey.startsWith(m.key);
                              return (
                                <button
                                  key={m.key}
                                  type="button"
                                  className={`admin-month-btn ${isActive ? 'active' : ''}`}
                                  onClick={() => setAdminDateKey(m.firstDateKey)}
                                >
                                  {m.label}
                                </button>
                              );
                            })}
                          </div>

                          {/* Scrolling Date Carousel with Arrows */}
                          <div className="admin-scroll-dates-container">
                            <button
                              type="button"
                              className="admin-scroll-arrow"
                              onClick={() => adminDateScrollRef.current?.scrollBy({ left: -220, behavior: 'smooth' })}
                              aria-label="Scroll dates left"
                              title="Scroll earlier dates"
                            >
                              ‹
                            </button>
                            <div className="admin-quick-dates" ref={adminDateScrollRef}>
                              {upcomingAdminDates.map((item) => {
                                const isSelected = item.key === adminDateKey;
                                const isDayOpen = days[dayIndex(item.dateObj)];
                                return (
                                  <button
                                    key={item.key}
                                    ref={(el) => {
                                      chipRefs.current[item.key] = el;
                                    }}
                                    type="button"
                                    className={`admin-date-chip ${isSelected ? 'active' : ''}`}
                                    onClick={() => setAdminDateKey(item.key)}
                                    title={`${item.dayName}, ${item.dayNum} ${item.monthName}${isDayOpen ? ' (Weekly open)' : ' (Weekly closed)'}`}
                                  >
                                    <span className="chip-month">{item.monthName}</span>
                                    <span className="chip-num">{item.dayNum}</span>
                                    <span className="chip-day">{item.dayName}</span>
                                  </button>
                                );
                              })}
                            </div>
                            <button
                              type="button"
                              className="admin-scroll-arrow"
                              onClick={() => adminDateScrollRef.current?.scrollBy({ left: 220, behavior: 'smooth' })}
                              aria-label="Scroll dates right"
                              title="Scroll later dates"
                            >
                              ›
                            </button>
                          </div>
                        </div>

                        {/* Slot Selection info & quick buttons */}
                        <div className="slot-selection-info">
                          <span>
                            Slots for <strong>{new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(adminDateObj)}</strong>: {adminDateSlots.length} active
                            {getBookedSlotsForDate(adminDateObj).length > 0 && (
                              <span style={{ marginLeft: '6px', color: '#b91c1c', fontWeight: 700 }}>
                                ({getBookedSlotsForDate(adminDateObj).length} booked)
                              </span>
                            )}
                          </span>
                          <div className="admin-quick-links">
                            <button
                              type="button"
                              className="admin-quick-link"
                              onClick={handleSelectAllAdminSlots}
                            >
                              All
                            </button>
                            <button
                              type="button"
                              className="admin-quick-link"
                              onClick={handleClearAllAdminSlots}
                            >
                              Clear
                            </button>
                            <button
                              type="button"
                              className="admin-quick-link"
                              onClick={handleResetAdminSlotsToDefault}
                            >
                              Defaults
                            </button>
                          </div>
                        </div>

                        {/* Interactive slots grid */}
                        <div className="slots" id="slotList">
                          {ALL_TIMES.map((t) => {
                            const isOn = adminDateSlots.includes(t);
                            const bookedOnThisDate = getBookedSlotsForDate(adminDateObj);
                            const isBooked = bookedOnThisDate.includes(t);
                            return (
                              <button
                                key={t}
                                type="button"
                                className={`slot ${isOn ? 'on' : ''} ${isBooked ? 'booked' : ''}`}
                                onClick={() => handleToggleAdminSlot(t)}
                                title={isBooked ? `${t} (Client booked)` : `Click to ${isOn ? 'disable' : 'enable'} ${t}`}
                              >
                                <span>{t}</span>
                                {isBooked && <span className="admin-slot-booked-dot">● Booked</span>}
                              </button>
                            );
                          })}
                        </div>

                        <div className="admin-card-actions">
                          <p className="work-footnote" style={{ margin: 0 }}>
                            {adminDateSlots.length === 0 ? 'No slots active for this date.' : `${adminDateSlots.length} consultation slots ready.`}
                          </p>
                          <button
                            type="button"
                            className="admin-save-btn"
                            onClick={handleSaveSessionTimes}
                            disabled={isSavingSessionTimes}
                            title="Save session times for this date to backend and immediately update consultation booking card"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={isSavingSessionTimes ? 'animate-spin' : ''}>
                              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                              <polyline points="17 21 17 13 7 13 7 21"></polyline>
                              <polyline points="7 3 7 8 15 8"></polyline>
                            </svg>
                            {isSavingSessionTimes ? 'Syncing to backend...' : 'Save session times'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 2: Records */}
                {activeTab === 'records' && (
                  <div className="tab-panel active" id="tab-records">
                    <div className="workspace-grid">
                      <div className="work-card" style={{ gridColumn: '1 / -1' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                          <div>
                            <h3>Client consultation requests</h3>
                            <p className="sub" style={{ margin: '4px 0 0' }}>
                              Review appointments and verify bank/UPI transaction references before releasing session links.
                            </p>
                          </div>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className={`admin-filter-pill ${recordFilter === 'all' ? 'active' : ''}`}
                              onClick={() => setRecordFilter('all')}
                            >
                              All ({bookings.length})
                            </button>
                            <button
                              type="button"
                              className={`admin-filter-pill ${recordFilter === 'pending' ? 'active' : ''}`}
                              onClick={() => setRecordFilter('pending')}
                            >
                              Pending ({bookings.filter((b) => b.status === 'Pending verification').length})
                            </button>
                            <button
                              type="button"
                              className={`admin-filter-pill ${recordFilter === 'unconfirmed' ? 'active' : ''}`}
                              onClick={() => setRecordFilter('unconfirmed')}
                            >
                              Not Confirmed ({bookings.filter((b) => b.status === 'Not Confirmed').length})
                            </button>
                            <button
                              type="button"
                              className={`admin-filter-pill ${recordFilter === 'confirmed' ? 'active' : ''}`}
                              onClick={() => setRecordFilter('confirmed')}
                            >
                              Confirmed ({bookings.filter((b) => b.status === 'Confirmed').length})
                            </button>
                            {bookings.length > 0 && bookings.every((b) => b.status !== 'Pending verification') && (
                              <button
                                type="button"
                                className="admin-action-btn-sm reject"
                                onClick={handleClearAllBookings}
                                title="Delete all reviewed client consultation records"
                                style={{ marginLeft: '4px' }}
                              >
                                Clear All
                              </button>
                            )}
                          </div>
                        </div>


                        {/* Real-time sync & refresh controls bar */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '12px',
                            padding: '10px 14px',
                            background: '#f4f7f4',
                            border: '1px solid #dbe5d8',
                            borderRadius: '10px',
                            marginBottom: '16px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <label
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                cursor: 'pointer',
                                fontSize: '0.86rem',
                                fontWeight: 600,
                                color: '#1f382b',
                                userSelect: 'none',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isLiveSync}
                                onChange={(e) => setIsLiveSync(e.target.checked)}
                                style={{
                                  width: '16px',
                                  height: '16px',
                                  accentColor: '#345d50',
                                  cursor: 'pointer',
                                }}
                              />
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                {isLiveSync && <span className="live-pulse-dot" />}
                                Real-time client sync: <strong style={{ color: isLiveSync ? '#15803d' : '#64748b' }}>{isLiveSync ? 'ON (Auto-updating)' : 'PAUSED'}</strong>
                              </span>
                            </label>

                            {lastRefreshedAt && (
                              <span style={{ fontSize: '0.78rem', color: '#5e7267' }}>
                                • Last checked: {lastRefreshedAt}
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            className={`admin-refresh-btn ${isRefreshing ? 'refreshing' : ''}`}
                            onClick={handleManualRefreshBookings}
                            disabled={isRefreshing}
                            title="Fetch new bookings instantly from storage"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 13px',
                              borderRadius: '8px',
                              border: '1px solid #cbd9c8',
                              background: '#ffffff',
                              color: '#1f382b',
                              fontSize: '0.82rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                            }}
                          >
                            <svg
                              className={isRefreshing ? 'spin-anim' : ''}
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.19" />
                            </svg>
                            {isRefreshing ? 'Checking requests...' : 'Refresh client requests'}
                          </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {bookings
                            .filter((b) => {
                              if (recordFilter === 'pending') return b.status === 'Pending verification';
                              if (recordFilter === 'unconfirmed') return b.status === 'Not Confirmed';
                              if (recordFilter === 'confirmed') return b.status === 'Confirmed';
                              return true;
                            }).length === 0 ? (
                            <div
                              style={{
                                padding: '42px 20px',
                                textAlign: 'center',
                                background: '#fafcfa',
                                borderRadius: '12px',
                                border: '1px dashed #d5dfd3',
                                color: '#60796b',
                              }}
                            >
                              <div style={{ fontSize: '26px', marginBottom: '8px' }}>📂</div>
                              <div style={{ fontSize: '13px', fontWeight: 650, color: '#274435' }}>
                                No client consultation records
                              </div>
                              <p style={{ fontSize: '11px', color: '#72887a', margin: '4px auto 0', maxWidth: '360px' }}>
                                All example records have been deleted. Real appointments will appear here as clients submit consultation requests.
                              </p>
                            </div>
                          ) : (
                            bookings
                              .filter((b) => {
                                if (recordFilter === 'pending') return b.status === 'Pending verification';
                                if (recordFilter === 'unconfirmed') return b.status === 'Not Confirmed';
                                if (recordFilter === 'confirmed') return b.status === 'Confirmed';
                                return true;
                              })
                              .map((b) => (
                                <div
                                  key={b.id}
                                  style={{
                                    border: b.status === 'Pending verification' ? '1px solid #fcd34d' : b.status === 'Not Confirmed' ? '1px solid #fecdd3' : '1px solid #e2ebdff5',
                                    borderRadius: '12px',
                                    padding: '16px 18px',
                                    background: b.status === 'Pending verification' ? '#fefce8' : b.status === 'Not Confirmed' ? '#fffafb' : '#fafcfa',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                                    <div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <strong style={{ fontSize: '14px', color: '#274435' }}>{b.name}</strong>
                                        <span style={{ fontSize: '10px', color: '#748279' }}>
                                          ({b.age} yrs · {b.gender})
                                        </span>
                                        <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: '10px', color: '#4b6957', background: '#edf4ea', padding: '2px 6px', borderRadius: '4px' }}>
                                          {b.id}
                                        </span>
                                      </div>
                                      <div style={{ fontSize: '11px', color: '#486855', marginTop: '4px', fontWeight: 600 }}>
                                        {b.service} · {b.duration} mins · ₹{Number(b.fee).toLocaleString('en-IN')}
                                      </div>
                                      <div style={{ fontSize: '11px', color: '#687b70', marginTop: '2px' }}>
                                        Scheduled: <strong>{b.dateStr}</strong> at <strong>{b.timeStr}</strong>
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                                      <span
                                        className="badge"
                                        style={{
                                          background:
                                            b.status === 'Confirmed'
                                              ? '#e2f4e4'
                                              : b.status === 'Completed'
                                              ? '#e0ecf8'
                                              : b.status === 'Discrepancy'
                                              ? '#fee2e2'
                                              : b.status === 'Not Confirmed'
                                              ? '#fee2e2'
                                              : '#fff3db',
                                          color:
                                            b.status === 'Confirmed'
                                              ? '#2f6838'
                                              : b.status === 'Completed'
                                              ? '#1e4b7a'
                                              : b.status === 'Discrepancy'
                                              ? '#991b1b'
                                              : b.status === 'Not Confirmed'
                                              ? '#991b1b'
                                              : '#8e6118',
                                          fontWeight: 700,
                                        }}
                                      >
                                        {b.status === 'Not Confirmed' ? 'Not Confirmed (Slot Available)' : b.status}
                                      </span>
                                      <small style={{ fontSize: '9px', color: '#97a39a' }}>Booked {b.createdAt}</small>
                                    </div>
                                  </div>

                                  {/* Payment Verification Info */}
                                  <div
                                    style={{
                                      marginTop: '12px',
                                      padding: '10px 12px',
                                      borderRadius: '8px',
                                      background: '#f2f7ef',
                                      border: '1px solid #dce8d9',
                                      fontSize: '11px',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      flexWrap: 'wrap',
                                      gap: '8px',
                                    }}
                                  >
                                    <div>
                                      <span style={{ color: '#637a6b', fontSize: '10px' }}>Payment Method: </span>
                                      <strong>{b.paymentMethod || 'UPI Transfer'}</strong>
                                      <span style={{ margin: '0 8px', color: '#cad5ca' }}>|</span>
                                      <span style={{ color: '#637a6b', fontSize: '10px' }}>Transaction UTR / Ref: </span>
                                      <strong style={{ fontFamily: 'ui-monospace, monospace', color: '#274b37', letterSpacing: '0.5px' }}>
                                        {b.utr || 'Awaiting entry'}
                                      </strong>
                                      {b.payerNote && (
                                        <span style={{ display: 'block', fontSize: '10px', color: '#6c8273', marginTop: '3px' }}>
                                          Payer note: {b.payerNote}
                                        </span>
                                      )}
                                      {b.verifiedAt && (
                                        <span style={{ display: 'block', fontSize: '9px', color: '#2d6a3c', marginTop: '2px' }}>
                                          ✓ Verified at {b.verifiedAt}
                                        </span>
                                      )}
                                    </div>

                                    {/* Verification & Record Actions */}
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', position: 'relative' }}>
                                      {confirmPrompt && confirmPrompt.booking.id === b.id ? (
                                        <div
                                          className={`inline-confirm-popover ${confirmPrompt.action === 'confirm' ? 'popover-confirm' : 'popover-not-confirm'}`}
                                        >
                                          <span
                                            style={{
                                              fontSize: '12px',
                                              fontWeight: 700,
                                              color: confirmPrompt.action === 'confirm' ? '#166534' : '#9f1239',
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: '5px',
                                              userSelect: 'none',
                                            }}
                                          >
                                            <span>{confirmPrompt.action === 'confirm' ? '✓' : '✕'}</span>
                                            {confirmPrompt.action === 'confirm' ? 'Do you want confirm?' : 'Do you want to not confirm?'}
                                          </span>
                                          <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                                            <button
                                              type="button"
                                              onClick={() => setConfirmPrompt(null)}
                                              className="admin-modal-btn-cancel"
                                              style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '6px' }}
                                            >
                                              Cancel
                                            </button>
                                            {confirmPrompt.action === 'confirm' ? (
                                              <button
                                                type="button"
                                                className="admin-modal-btn-confirm"
                                                onClick={() => handleConfirmClientBooking(confirmPrompt.booking)}
                                                style={{ padding: '4px 14px', fontSize: '11px', borderRadius: '6px' }}
                                              >
                                                Confirm
                                              </button>
                                            ) : (
                                              <button
                                                type="button"
                                                className="admin-modal-btn-not-confirm"
                                                onClick={() => handleNotConfirmClientBooking(confirmPrompt.booking)}
                                                style={{ padding: '4px 14px', fontSize: '11px', borderRadius: '6px' }}
                                              >
                                                Not Confirm
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      ) : (
                                        <>
                                          {b.status === 'Pending verification' && (
                                            <>
                                              <button
                                                type="button"
                                                className="admin-action-btn-sm confirm"
                                                onClick={() => setConfirmPrompt({ booking: b, action: 'confirm' })}
                                                title="Confirm consultation with this client"
                                              >
                                                ✓ Confirm
                                              </button>
                                              <button
                                                type="button"
                                                className="admin-action-btn-sm reject"
                                                onClick={() => setConfirmPrompt({ booking: b, action: 'not_confirm' })}
                                                title="Do not confirm and release session slot back to available"
                                              >
                                                ✕ Not Confirm
                                              </button>
                                              <button
                                                type="button"
                                                className="admin-action-btn-sm"
                                                onClick={() => handleFlagDiscrepancy(b.id)}
                                                title="Flag payment discrepancy or invalid reference"
                                              >
                                                Flag Discrepancy
                                              </button>
                                            </>
                                          )}
                                          {b.status === 'Not Confirmed' && (
                                            <button
                                              type="button"
                                              className="admin-action-btn-sm confirm"
                                              onClick={() => setConfirmPrompt({ booking: b, action: 'confirm' })}
                                              title="Review decision and confirm client"
                                            >
                                              Re-confirm Client
                                            </button>
                                          )}
                                          {b.status === 'Confirmed' && (
                                            <>
                                              <button
                                                type="button"
                                                className="admin-action-btn-sm"
                                                onClick={() => handleCompleteBooking(b.id)}
                                              >
                                                Mark Completed
                                              </button>
                                              <button
                                                type="button"
                                                className="admin-action-btn-sm reject"
                                                onClick={() => setConfirmPrompt({ booking: b, action: 'not_confirm' })}
                                                title="Change to Not Confirmed and release slot back to available"
                                              >
                                                Change to Not Confirmed
                                              </button>
                                            </>
                                          )}
                                          {b.status === 'Discrepancy' && (
                                            <button
                                              type="button"
                                              className="admin-action-btn-sm confirm"
                                              onClick={() => setConfirmPrompt({ booking: b, action: 'confirm' })}
                                            >
                                              Re-verify &amp; Confirm
                                            </button>
                                          )}
                                          {b.status !== 'Pending verification' && (
                                            <button
                                              type="button"
                                              className="admin-action-btn-sm reject"
                                              onClick={() => handleDeleteBooking(b.id)}
                                              title="Delete this client record"
                                            >
                                              Delete
                                            </button>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  {b.prepNote && (
                                    <div
                                      style={{
                                        marginTop: '10px',
                                        padding: '8px 10px',
                                        borderRadius: '6px',
                                        background: '#f8faf6',
                                        border: '1px solid #edf2eb',
                                        fontSize: '10px',
                                        color: '#556a5d',
                                        lineHeight: 1.5,
                                      }}
                                    >
                                      <strong>Client note:</strong> {b.prepNote}
                                    </div>
                                  )}

                                  <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginTop: '10px', fontSize: '10px' }}>
                                    <a
                                      href={`https://wa.me/${b.whatsapp.replace(/[^0-9]/g, '')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{ color: '#2e7d32', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                    >
                                      WhatsApp: {b.whatsapp} ↗
                                    </a>
                                    <span style={{ color: '#cbd5ce' }}>·</span>
                                    <a href={`mailto:${b.email}`} style={{ color: '#446853', textDecoration: 'underline' }}>
                                      {b.email}
                                    </a>
                                  </div>
                                </div>
                              ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 3: Payments & Fees */}
                {activeTab === 'payments' && (
                  <div className="tab-panel active" id="tab-payments">
                    <div className="workspace-grid">
                      <div className="work-card">
                        <h3>Session fee settings</h3>
                        <p className="sub">
                          Set authoritative consultation rates. All client bookings calculate dynamically from these verified rates.
                        </p>
                        <div className="fee-edit">
                          <select
                            id="feeService"
                            aria-label="Service to price"
                            value={feeService}
                            onChange={(e) => {
                              const s = e.target.value as 'therapy' | 'cognitive';
                              setFeeService(s);
                              setFeeInputValue(serviceInfo[s].fees[feeDuration]);
                            }}
                          >
                            <option value="therapy">Behavioral &amp; Cognitive Therapy</option>
                            <option value="cognitive">Neuropsychology &amp; Cognitive Skills</option>
                          </select>
                          <select
                            id="feeDuration"
                            aria-label="Consultation length to price"
                            value={feeDuration}
                            onChange={(e) => {
                              const dur = Number(e.target.value) as 30 | 60;
                              setFeeDuration(dur);
                              setFeeInputValue(serviceInfo[feeService].fees[dur]);
                            }}
                          >
                            <option value="30">30 minutes</option>
                            <option value="60">60 minutes</option>
                          </select>
                          <label htmlFor="feeInput" style={{ fontSize: 10, color: '#738078' }}>
                            ₹
                          </label>
                          <input
                            id="feeInput"
                            type="number"
                            min="1"
                            value={feeInputValue}
                            placeholder="Fee"
                            aria-label="Session fee in rupees"
                            onChange={(e) => setFeeInputValue(Number(e.target.value))}
                          />
                          <button
                            type="button"
                            className="save-mini"
                            id="saveFee"
                            onClick={handleSaveFee}
                          >
                            Save rate
                          </button>
                        </div>

                        <div className="admin-security-card" style={{ marginTop: '16px' }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z"/>
                          </svg>
                          <span>Anti-tamper protection active: Booking calculations strictly adhere to therapist-configured fees.</span>
                        </div>
                      </div>

                      <div className="work-card">
                        <h3>Consultation settlement ledger</h3>
                        <p className="sub">Live financial ledger of consultations and payment receipts.</p>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                          <div style={{ padding: '10px 12px', background: '#f5f9f4', border: '1px solid #dce9da', borderRadius: '9px' }}>
                            <div style={{ fontSize: '9px', color: '#688270', textTransform: 'uppercase', fontWeight: 700 }}>
                              Verified Collections
                            </div>
                            <div style={{ fontSize: '20px', fontFamily: 'var(--serif)', color: '#274735', marginTop: '2px' }}>
                              ₹{bookings
                                .filter((b) => b.status === 'Confirmed' || b.status === 'Completed')
                                .reduce((acc, curr) => acc + curr.fee, 0)
                                .toLocaleString('en-IN')}
                            </div>
                          </div>
                          <div style={{ padding: '10px 12px', background: '#fbf8f0', border: '1px solid #ebd9b8', borderRadius: '9px' }}>
                            <div style={{ fontSize: '9px', color: '#886d3b', textTransform: 'uppercase', fontWeight: 700 }}>
                              Awaiting Verification
                            </div>
                            <div style={{ fontSize: '20px', fontFamily: 'var(--serif)', color: '#6b4d1b', marginTop: '2px' }}>
                              {bookings.filter((b) => b.status === 'Pending verification').length} session(s)
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {bookings.length === 0 ? (
                            <div
                              style={{
                                padding: '28px 16px',
                                textAlign: 'center',
                                background: '#fafcfa',
                                borderRadius: '10px',
                                border: '1px dashed #dce9da',
                                color: '#688272',
                                fontSize: '11px',
                              }}
                            >
                              No settlement records. Client payments will appear here as sessions are requested and verified.
                            </div>
                          ) : (
                            bookings.map((b) => (
                              <div key={b.id} className="pay-row">
                                <span>
                                  {b.service} ({b.duration}m) · {b.createdAt}
                                  <small>
                                    {b.id} · {b.name} · UTR: {b.utr || 'Pending'}
                                  </small>
                                </span>
                                <span>
                                  ₹{Number(b.fee).toLocaleString('en-IN')} &nbsp;
                                  <span
                                    className="badge"
                                    style={{
                                      background:
                                        b.status === 'Confirmed'
                                          ? '#e2f4e4'
                                          : b.status === 'Completed'
                                          ? '#e0ecf8'
                                          : '#fff3db',
                                      color:
                                        b.status === 'Confirmed'
                                          ? '#2f6838'
                                          : b.status === 'Completed'
                                          ? '#1e4b7a'
                                          : '#8e6118',
                                    }}
                                  >
                                    {b.status}
                                  </span>
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      )}
      </main>

      {/* Emergency Notice */}
      <div className="emergency reveal-on-scroll">
        This website is not an emergency service. If you are in immediate danger, contact local emergency services or a trusted crisis resource.
      </div>

      {/* Footer */}
      <footer className="footer">
        <div className="wrap footer-row">
          <div>
            <div className="brand">
              PSYCHBYHAMDA
            </div>
            <p>
              Understand your mind. Navigate your emotions.
              <br />
              Create meaningful change, one step at a time.
            </p>
          </div>
          <div className="footer-links">
            <a href="#about">About</a>
            <a href="#approach">Approach</a>
            <a href="#book">Book</a>
            <a href="#policy">Booking policy</a>
            <button
              type="button"
              className="admin-footer-link"
              onClick={() => {
                setShowAdminLogin(true);
                setTimeout(() => {
                  const el = document.getElementById('workspace');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }, 60);
              }}
              title="Clinician / Admin Portal"
            >
              {isAdmin ? 'Admin Portal ●' : 'Admin'}
            </button>
          </div>
          <p>© 2026 Psych by Hamda. All rights reserved. Professional Neuropsychology &amp; Behavioral Therapy.</p>
        </div>
      </footer>

      {/* Modal Dialog for Booking Steps */}
      <div
        className={`modal-back ${modalStep ? 'show' : ''}`}
        id="modalBack"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modalTitle"
        onClick={(e) => {
          if ((e.target as HTMLElement).id === 'modalBack') {
            setModalStep(null);
          }
        }}
      >
        <div className="modal" id="modal">
          {modalStep === 'details' && (
            <>
              <div className="modal-head">
                <span className="eyebrow">Booking details · Confidential care</span>
                <button
                  type="button"
                  className="modal-close"
                  aria-label="Close"
                  onClick={() => setModalStep(null)}
                >
                  ×
                </button>
              </div>
              <h2 id="modalTitle">Consultation Details</h2>
              <p>
                Please provide your contact information so Hamda can follow up, prepare for your consultation, and dispatch your private meeting link.
              </p>
              <div className="summary">
                <strong>{serviceInfo[service].name}</strong>
                <br />
                {duration}-minute consultation
                <br />
                Hamda’s India time:{' '}
                {selectedDate ? formatLong(selectedDate) : ''} · {time} IST
                <br />
                Your time zone ({timeZone}):{' '}
                {selectedDate ? formatSlotTime(selectedDate, time, timeZone) : ''}
                <br />
                {feeText}
              </div>

              <form id="detailsForm" noValidate onSubmit={handleDetailsSubmit}>
                <div className="field-grid">
                  <div className="field">
                    <label htmlFor="clientName">Full Name *</label>
                    <input
                      id="clientName"
                      autoComplete="name"
                      required
                      placeholder="e.g. Aanya Sharma"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="clientAge">Age *</label>
                    <input
                      id="clientAge"
                      type="number"
                      min="12"
                      max="120"
                      required
                      placeholder="e.g. 26"
                      value={clientAge}
                      onChange={(e) => setClientAge(e.target.value)}
                    />
                  </div>
                  <div className="field field-span">
                    <label htmlFor="clientEmail">Email Address *</label>
                    <input
                      id="clientEmail"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      required
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                    />
                  </div>
                  <div className="field field-span">
                    <label htmlFor="clientGender">Gender *</label>
                    <select
                      id="clientGender"
                      required
                      value={clientGender}
                      onChange={(e) => setClientGender(e.target.value)}
                    >
                      <option value="">Please choose</option>
                      <option>Woman</option>
                      <option>Man</option>
                      <option>Non-binary</option>
                      <option>Self-describe</option>
                      <option>Prefer not to say</option>
                    </select>
                  </div>
                  <div className="field field-span">
                    <label htmlFor="whatsappNumber">WhatsApp Phone Number *</label>
                    <div className="phone-group">
                      <select
                        id="phoneCode"
                        aria-label="Country calling code"
                        value={phoneCode}
                        onChange={(e) => setPhoneCode(e.target.value)}
                      >
                        <option value="+91">+91 IN</option>
                        <option value="+1">+1 US/CA</option>
                        <option value="+44">+44 UK</option>
                        <option value="+61">+61 AU</option>
                        <option value="+971">+971 UAE</option>
                        <option value="+92">+92 PK</option>
                        <option value="+880">+880 BD</option>
                        <option value="+94">+94 LK</option>
                        <option value="+65">+65 SG</option>
                        <option value="+49">+49 DE</option>
                        <option value="+33">+33 FR</option>
                        <option value="+27">+27 ZA</option>
                      </select>
                      <input
                        id="whatsappNumber"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel-national"
                        placeholder="Phone number"
                        required
                        value={whatsappNumber}
                        onChange={(e) => setWhatsappNumber(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="field field-span">
                    <label htmlFor="prepNote">Focus areas or concerns to help Hamda prepare (optional)</label>
                    <textarea
                      id="prepNote"
                      rows={3}
                      placeholder="Brief note on what brings you to therapy..."
                      value={prepNote}
                      onChange={(e) => setPrepNote(e.target.value)}
                    ></textarea>
                  </div>
                </div>

                <div className="policy-ack">
                  <input
                    id="agreePolicy"
                    type="checkbox"
                    required
                    checked={agreePolicy}
                    onChange={(e) => setAgreePolicy(e.target.checked)}
                  />
                  <label htmlFor="agreePolicy">
                    I have read and agree to the{' '}
                    <a href="#policy" target="_blank" rel="noopener">
                      Booking, Cancellation &amp; Refund Policy
                    </a>
                    . I understand full payment is due before the session and fees are non-refundable.
                  </label>
                </div>

                <p className="tiny">
                  All records and consultations are confidential. Meeting links are dispatched to your WhatsApp and email.
                </p>

                <button className="button" type="submit" id="continueToPayment">
                  Continue to payment &amp; verification
                </button>
              </form>
            </>
          )}

          {modalStep === 'payment' && (
            <>
              <div className="modal-head">
                <span className="eyebrow">Payment options · Secure verification</span>
                <button
                  type="button"
                  className="modal-close"
                  aria-label="Close"
                  onClick={() => setModalStep(null)}
                >
                  ×
                </button>
              </div>
              <h2 id="modalTitle">Review &amp; Complete Payment</h2>
              <p>
                Transfer the consultation fee using your preferred method below, then submit your <strong>Transaction UTR / Reference ID</strong> to secure your appointment.
              </p>
              <div className="summary">
                <strong>{serviceInfo[service].name}</strong>
                <br />
                {duration}-minute consultation
                <br />
                Hamda’s India time: {selectedDate ? formatLong(selectedDate) : ''} · {time} IST
                <br />
                Your time zone ({timeZone}):{' '}
                {selectedDate ? formatSlotTime(selectedDate, time, timeZone) : ''}
                <br />
                <strong>Amount Payable: ₹{Number(currentFee).toLocaleString('en-IN')}</strong>
              </div>

              <div className="payment-method-tabs">
                <button
                  type="button"
                  className={paymentMethod === 'qr' ? 'active' : ''}
                  onClick={() => setPaymentMethod('qr')}
                >
                  UPI QR
                </button>
                <button
                  type="button"
                  className={paymentMethod === 'upi' ? 'active' : ''}
                  onClick={() => setPaymentMethod('upi')}
                >
                  UPI ID
                </button>
                <button
                  type="button"
                  className={paymentMethod === 'bank' ? 'active' : ''}
                  onClick={() => setPaymentMethod('bank')}
                >
                  Bank transfer
                </button>
              </div>

              <div className="payment-method-box" id="paymentMethodBox">
                {paymentMethod === 'qr' && (
                  <div className="qr-live-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <div
                      style={{
                        background: '#ffffff',
                        padding: '12px',
                        borderRadius: '16px',
                        border: '1.5px solid #d5dfd3',
                        boxShadow: '0 6px 20px rgba(0, 0, 0, 0.08)',
                        display: 'inline-block',
                      }}
                    >
                      <img
                        src="/assets/aistudio/Screenshot_2026-10-26_005601_f47921d7.png"
                        alt="Official Google Pay QR Code - Fathima Hamda"
                        style={{
                          width: '190px',
                          height: '190px',
                          display: 'block',
                          borderRadius: '8px',
                          objectFit: 'contain',
                        }}
                      />
                    </div>
                    <div style={{ marginTop: '12px', width: '100%' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#1f3e2e' }}>
                        Scan &amp; Pay via Any UPI App
                      </div>
                      <div style={{ fontSize: '10px', color: '#566e60', marginTop: '2px' }}>
                        Google Pay · PhonePe · Paytm · BHIM · Kotak · Any Banking App
                      </div>
                      <div style={{ fontSize: '10px', color: '#566e60', marginTop: '4px' }}>
                        Account Name: <strong style={{ color: '#1b3a28' }}>FATHIMA HAMDA</strong>
                      </div>
                      <div style={{ marginTop: '8px' }}>
                        <button
                          type="button"
                          className="upi-copy-badge"
                          onClick={() => {
                            navigator.clipboard.writeText('hamdazubair121-1@okaxis');
                            showToast('UPI ID copied: hamdazubair121-1@okaxis');
                          }}
                          title="Click to copy UPI ID"
                          style={{
                            background: '#f2f8f3',
                            border: '1px solid #c2dbcb',
                            color: '#1a4e32',
                            fontWeight: 700,
                            padding: '6px 14px',
                            borderRadius: '20px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          hamdazubair121-1@okaxis 📋
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {paymentMethod === 'upi' && (
                  <div>
                    <h3 style={{ margin: '0 0 4px', fontSize: '13px' }}>Pay via UPI Application</h3>
                    <p style={{ margin: '0 0 12px', fontSize: '11px', color: '#526b5c' }}>
                      Transfer directly to Fathima Hamda’s clinical receiving UPI handles:
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {/* Primary UPI ID */}
                      <div style={{ background: '#f8faf7', border: '1px solid #dce8da', borderRadius: '9px', padding: '10px 12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <small style={{ fontSize: '9px', fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                            Primary UPI ID (Google Pay / Axis)
                          </small>
                          <small style={{ fontSize: '9px', color: '#15803d', fontWeight: 600 }}>● Active</small>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700, fontSize: '13px', color: '#1f3e2e' }}>
                            hamdazubair121-1@okaxis
                          </span>
                          <button
                            type="button"
                            className="save-mini"
                            onClick={() => {
                              navigator.clipboard.writeText('hamdazubair121-1@okaxis');
                              showToast('UPI ID copied: hamdazubair121-1@okaxis');
                            }}
                            style={{ padding: '4px 10px', fontSize: '10px' }}
                          >
                            Copy UPI ID
                          </button>
                        </div>
                      </div>

                      {/* Kotak UPI Handle */}
                      <div style={{ background: '#f8faf7', border: '1px solid #dce8da', borderRadius: '9px', padding: '10px 12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <small style={{ fontSize: '9px', fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                            Kotak UPI Handle
                          </small>
                          <small style={{ fontSize: '9px', color: '#0369a1', fontWeight: 600 }}>● Active</small>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700, fontSize: '13px', color: '#1f3e2e' }}>
                            9744492939@kotak
                          </span>
                          <button
                            type="button"
                            className="save-mini"
                            onClick={() => {
                              navigator.clipboard.writeText('9744492939@kotak');
                              showToast('Kotak UPI Handle copied: 9744492939@kotak');
                            }}
                            style={{ padding: '4px 10px', fontSize: '10px' }}
                          >
                            Copy UPI Handle
                          </button>
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: '12px', padding: '8px 12px', background: '#f2f7ef', borderRadius: '8px', fontSize: '10px', color: '#496654' }}>
                      Account Name: <strong style={{ color: '#1b3a28' }}>FATHIMA HAMDA</strong>
                    </div>
                  </div>
                )}

                {paymentMethod === 'bank' && (
                  <div>
                    <h3 style={{ margin: '0 0 4px', fontSize: '13px' }}>Direct Bank Transfer (NEFT / IMPS / RTGS)</h3>
                    <p style={{ margin: '0 0 10px', fontSize: '11px', color: '#526b5c' }}>
                      Official Kotak Mahindra clinical practice bank account details:
                    </p>
                    <div className="bank-grid">
                      <div className="bank-field">
                        <small>Bank Name</small>
                        <strong style={{ fontSize: '12px', color: '#1b3a28' }}>Kotak Mahindra</strong>
                      </div>
                      <div className="bank-field">
                        <small>Account Name</small>
                        <strong style={{ fontSize: '12px', color: '#1b3a28' }}>FATHIMA HAMDA</strong>
                      </div>
                      <div className="bank-field">
                        <small>Account Number</small>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                          <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 800, fontSize: '13px', color: '#1b3a28' }}>
                            6447312720
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText('6447312720');
                              showToast('Account Number copied: 6447312720');
                            }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px', color: '#15803d', fontWeight: 700 }}
                            title="Copy Account Number"
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                      <div className="bank-field">
                        <small>IFSC Code</small>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                          <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 800, fontSize: '13px', color: '#1b3a28' }}>
                            KKBK0008083
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText('KKBK0008083');
                              showToast('IFSC Code copied: KKBK0008083');
                            }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px', color: '#15803d', fontWeight: 700 }}
                            title="Copy IFSC Code"
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                      <div className="bank-field" style={{ gridColumn: '1 / -1' }}>
                        <small>UPI Handle</small>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                          <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700, fontSize: '12px', color: '#1b3a28' }}>
                            9744492939@kotak
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText('9744492939@kotak');
                              showToast('UPI Handle copied: 9744492939@kotak');
                            }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px', color: '#15803d', fontWeight: 700 }}
                            title="Copy UPI Handle"
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="save-mini"
                      style={{ marginTop: '10px', width: '100%', textAlign: 'center', padding: '8px' }}
                      onClick={() => {
                        const info = `Account Name: FATHIMA HAMDA\nBank Name: Kotak Mahindra\nAccount Number: 6447312720\nIFSC Code: KKBK0008083\nUPI Handle: 9744492939@kotak`;
                        navigator.clipboard.writeText(info);
                        showToast('All bank account details copied to clipboard!');
                      }}
                    >
                      Copy All Bank Account Details
                    </button>
                  </div>
                )}
              </div>

              {/* Payment Verification Form */}
              <div className="payment-verify-box">
                <label htmlFor="paymentUtr">Transaction UTR / Reference ID *</label>
                <div className="payment-verify-input-group">
                  <input
                    id="paymentUtr"
                    className="payment-verify-input"
                    type="text"
                    required
                    placeholder="Enter 12-digit UPI UTR or Bank Ref ID"
                    value={paymentUtr}
                    onChange={(e) => {
                      setPaymentUtr(e.target.value);
                      if (paymentValidationError) setPaymentValidationError(null);
                    }}
                  />
                </div>
                <small style={{ display: 'block', fontSize: '9px', color: '#76877c', marginTop: '4px' }}>
                  Locate the 12-digit UTR in your Google Pay, PhonePe, Paytm, or Net Banking receipt.
                </small>

                <div style={{ marginTop: '10px' }}>
                  <label htmlFor="payerNote" style={{ fontSize: '9px', color: '#687b70' }}>
                    Payer name or bank account remark (optional)
                  </label>
                  <input
                    id="payerNote"
                    type="text"
                    placeholder="e.g. Sent from Google Pay or Kotak Account"
                    value={paymentPayerNote}
                    onChange={(e) => setPaymentPayerNote(e.target.value)}
                    style={{
                      width: '100%',
                      border: '1px solid #d5dfd3',
                      borderRadius: '7px',
                      padding: '7px 9px',
                      fontSize: '11px',
                    }}
                  />
                </div>

                <div className="policy-ack" style={{ marginTop: '10px' }}>
                  <input
                    id="confirmTransferMade"
                    type="checkbox"
                    checked={paymentConfirmedAck}
                    onChange={(e) => setPaymentConfirmedAck(e.target.checked)}
                  />
                  <label htmlFor="confirmTransferMade" style={{ fontSize: '9px', color: '#445b4e' }}>
                    I confirm that I have transferred ₹{Number(currentFee).toLocaleString('en-IN')} to FATHIMA HAMDA and this reference ID is accurate.
                  </label>
                </div>

                {paymentValidationError && (
                  <div
                    style={{
                      marginTop: '10px',
                      color: '#991b1b',
                      fontSize: '10px',
                      background: '#fee2e2',
                      border: '1px solid #fecaca',
                      padding: '8px 10px',
                      borderRadius: '6px',
                    }}
                  >
                    {paymentValidationError}
                  </div>
                )}

                <button
                  type="button"
                  className="btn-verify-submit"
                  onClick={handlePaymentVerificationSubmit}
                >
                  <svg style={{ width: 15, height: 15, stroke: 'currentColor', fill: 'none' }} viewBox="0 0 24 24">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Verify &amp; Confirm Booking
                </button>
              </div>
            </>
          )}

          {modalStep === 'receipt' && recentBooking && (
            <div className="receipt-success-card">
              <div className="receipt-check-icon">
                <svg viewBox="0 0 24 24">
                  <path d="M20 6 9 17l-5-5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h2 id="modalTitle" style={{ margin: '0 0 6px' }}>
                Booking &amp; Payment Submitted
              </h2>
              <p style={{ margin: '0 0 14px' }}>
                Your consultation request and transaction reference have been securely recorded.
              </p>

              <div className="receipt-meta-box">
                <div className="receipt-meta-row">
                  <span>Booking Reference:</span>
                  <strong style={{ fontFamily: 'ui-monospace, monospace' }}>{recentBooking.id}</strong>
                </div>
                <div className="receipt-meta-row">
                  <span>Status:</span>
                  <span className="badge" style={{ background: '#fff3db', color: '#8e6118', fontWeight: 700 }}>
                    Pending Clinician Verification
                  </span>
                </div>
                <div className="receipt-meta-row">
                  <span>Service:</span>
                  <strong>{recentBooking.service} ({recentBooking.duration} mins)</strong>
                </div>
                <div className="receipt-meta-row">
                  <span>Appointment:</span>
                  <strong>{recentBooking.dateStr} · {recentBooking.timeStr}</strong>
                </div>
                <div className="receipt-meta-row">
                  <span>Amount Paid:</span>
                  <strong>₹{Number(recentBooking.fee).toLocaleString('en-IN')}</strong>
                </div>
                <div className="receipt-meta-row">
                  <span>Payment Method:</span>
                  <span>{recentBooking.paymentMethod}</span>
                </div>
                <div className="receipt-meta-row">
                  <span>Transaction UTR:</span>
                  <strong style={{ fontFamily: 'ui-monospace, monospace', color: '#274b37' }}>
                    {recentBooking.utr}
                  </strong>
                </div>
                <div className="receipt-meta-row">
                  <span>Contact:</span>
                  <span>{recentBooking.name} ({recentBooking.whatsapp})</span>
                </div>
              </div>

              <div style={{ textAlign: 'left', background: '#f5f8f4', border: '1px solid #dce8da', borderRadius: '10px', padding: '12px 14px', fontSize: '10px', lineHeight: 1.6, color: '#4a6254' }}>
                <strong>What happens next:</strong>
                <ul style={{ margin: '6px 0 0', paddingLeft: '16px' }}>
                  <li>Hamda verifies incoming transfers against official bank ledger records.</li>
                  <li>Once verified, your consultation status updates to <strong>Confirmed</strong>.</li>
                  <li>Your private, encrypted Google Meet link will be dispatched to your WhatsApp and email 24 hours prior to your session.</li>
                </ul>
              </div>

              <button
                type="button"
                className="button"
                style={{ width: '100%', marginTop: '16px' }}
                onClick={() => {
                  setModalStep(null);
                  showToast('Appointment request saved. We look forward to meeting you.');
                }}
              >
                Done / Close Receipt
              </button>
            </div>
          )}
        </div>
      </div>



      {/* Toast Notification */}
      <div className={`toast ${toastMessage ? 'show' : ''}`} id="toast">
        {toastMessage}
      </div>
    </>
  );
}
