/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Validate constants synchronized with firebase-blueprint.json
export const VALIDATION_CONSTRAINTS = {
  ID_REGEX: /^[a-zA-Z0-9_\-]+$/,
  ID_MAX_LENGTH: 128,
  DISPLAY_NAME_MAX: 100,
  TIMEZONE_MAX: 64,
  EMAIL_MAX: 160,
  PHONE_MAX: 32,
  EMERGENCY_CONTACT_MAX: 160,
  CONCERN_FOCUS_MAX: 240,
  RECORD_TITLE_MAX: 120,
  CIPHERTEXT_MAX: 8192,
  EMAIL_SUBJECT_MAX: 180,
} as const;

export function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, VALIDATION_CONSTRAINTS.ID_MAX_LENGTH);
  return cleaned.length > 0 ? cleaned : 'id_fallback';
}

export function truncateString(str: string, maxLen: number): string {
  return str.trim().slice(0, maxLen);
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface BookingRecordPayload {
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
  createdAt: string;
  verifiedAt?: string;
}

/**
 * Save booking into Cloud Firestore so all published clients and admin receive it across devices.
 */
export async function saveBookingToCloud(booking: BookingRecordPayload): Promise<boolean> {
  try {
    const bookingDocRef = doc(db, 'consultationBookings', booking.id);
    const cleanSlot = (booking.timeSlot || booking.timeStr).replace(/\s*IST\s*$/i, '').trim();

    const payload: Record<string, any> = {
      id: booking.id,
      name: booking.name,
      email: booking.email,
      whatsapp: booking.whatsapp,
      age: String(booking.age),
      gender: booking.gender,
      service: booking.service,
      duration: booking.duration,
      dateStr: booking.dateStr,
      dateKey: booking.dateKey || '2026-10-25',
      timeStr: booking.timeStr,
      timeSlot: cleanSlot,
      fee: Number(booking.fee),
      paymentMethod: booking.paymentMethod || 'UPI QR',
      utr: booking.utr || 'PENDING',
      verificationHash: booking.verificationHash || 'VERIF-AUTO',
      status: booking.status,
      createdAt: booking.createdAt,
    };
    if (booking.prepNote) payload.prepNote = booking.prepNote;
    if (booking.payerNote) payload.payerNote = booking.payerNote;
    if (booking.verifiedAt) payload.verifiedAt = booking.verifiedAt;

    await setDoc(bookingDocRef, payload);

    // Also write to publicBookedSlots to block this slot globally for all visitors
    if (booking.dateKey && cleanSlot) {
      const slotId = sanitizeId(`${booking.dateKey}_${cleanSlot}`);
      const slotRef = doc(db, 'publicBookedSlots', slotId);
      await setDoc(slotRef, {
        slotId,
        dateKey: booking.dateKey,
        timeSlot: cleanSlot,
        isBooked: true,
        bookingId: booking.id,
        createdAt: booking.createdAt,
      });
    }
    return true;
  } catch (error) {
    console.warn('Notice: Cloud Firestore booking save fallback to local:', error);
    return false;
  }
}

/**
 * Release a booked slot so it becomes instantly available across all devices worldwide
 */
export async function releasePublicBookedSlot(
  dateKey: string,
  timeSlot: string
): Promise<boolean> {
  try {
    const cleanSlot = timeSlot.replace(/\s*IST\s*$/i, '').trim();
    const slotId = sanitizeId(`${dateKey}_${cleanSlot}`);
    const slotRef = doc(db, 'publicBookedSlots', slotId);
    await deleteDoc(slotRef);
    return true;
  } catch (err) {
    console.warn('Notice: releasePublicBookedSlot fallback:', err);
    return false;
  }
}

/**
 * Reserve or re-reserve a public slot
 */
export async function reservePublicBookedSlot(
  dateKey: string,
  timeSlot: string,
  bookingId: string
): Promise<boolean> {
  try {
    const cleanSlot = timeSlot.replace(/\s*IST\s*$/i, '').trim();
    const slotId = sanitizeId(`${dateKey}_${cleanSlot}`);
    const slotRef = doc(db, 'publicBookedSlots', slotId);
    await setDoc(slotRef, {
      slotId,
      dateKey,
      timeSlot: cleanSlot,
      isBooked: true,
      bookingId,
      createdAt: new Date().toISOString(),
    });
    return true;
  } catch (err) {
    console.warn('Notice: reservePublicBookedSlot fallback:', err);
    return false;
  }
}

/**
 * Save practitioner session availability schedule (days & custom date slots) to Cloud Firestore
 * so session dates and times are unified across all devices (phones, tablets, laptops).
 */
export async function savePracticeScheduleToCloud(
  days: boolean[],
  dateSlots: { [dateKey: string]: string[] }
): Promise<boolean> {
  try {
    const scheduleRef = doc(db, 'practiceSchedule', 'availability');
    await setDoc(scheduleRef, {
      id: 'availability',
      days,
      dateSlots,
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (err) {
    console.warn('Notice: savePracticeScheduleToCloud fallback:', err);
    return false;
  }
}

/**
 * Subscribe to real-time practice schedule updates across all devices
 */
export function subscribeToPracticeSchedule(
  onUpdate: (data: { days?: boolean[]; dateSlots?: { [dateKey: string]: string[] } }) => void
): () => void {
  try {
    const scheduleRef = doc(db, 'practiceSchedule', 'availability');
    const unsubscribe = onSnapshot(
      scheduleRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          onUpdate({
            days: data.days,
            dateSlots: data.dateSlots,
          });
        }
      },
      (error) => {
        console.warn('Practice schedule listener notice:', error.message);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Could not initialize practice schedule listener:', err);
    return () => {};
  }
}

/**
 * Fetch practice schedule once from Cloud Firestore
 */
export async function fetchPracticeScheduleOnce(): Promise<{
  days?: boolean[];
  dateSlots?: { [dateKey: string]: string[] };
} | null> {
  try {
    const scheduleRef = doc(db, 'practiceSchedule', 'availability');
    const snapshot = await getDocFromServer(scheduleRef);
    if (snapshot.exists()) {
      const data = snapshot.data();
      return {
        days: data.days,
        dateSlots: data.dateSlots,
      };
    }
    return null;
  } catch (err) {
    console.warn('Notice: fetchPracticeScheduleOnce fallback:', err);
    return null;
  }
}

/**
 * Update booking status in Cloud Firestore (e.g. Verify & confirm, Discrepancy, Completed, Not Confirmed)
 */
export async function updateBookingInCloud(
  bookingId: string,
  updates: Partial<BookingRecordPayload>
): Promise<boolean> {
  try {
    const bookingRef = doc(db, 'consultationBookings', bookingId);
    await updateDoc(bookingRef, updates);
    return true;
  } catch (err) {
    console.warn('Notice: Cloud Firestore booking update fallback:', err);
    return false;
  }
}

/**
 * Delete booking from Cloud Firestore
 */
export async function deleteBookingFromCloud(
  bookingId: string,
  dateKey?: string,
  timeSlot?: string
): Promise<boolean> {
  try {
    const bookingRef = doc(db, 'consultationBookings', bookingId);
    await deleteDoc(bookingRef);

    if (dateKey && timeSlot) {
      await releasePublicBookedSlot(dateKey, timeSlot);
    }
    return true;
  } catch (err) {
    console.warn('Notice: Cloud Firestore booking delete fallback:', err);
    return false;
  }
}

/**
 * Listen to public booked slots in real time (called for all clients globally)
 */
export function subscribeToPublicBookedSlots(
  onUpdate: (slots: { dateKey: string; timeSlot: string }[]) => void
): () => void {
  try {
    const colRef = collection(db, 'publicBookedSlots');
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const slots: { dateKey: string; timeSlot: string }[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          if (data.isBooked && data.dateKey && data.timeSlot) {
            slots.push({
              dateKey: data.dateKey,
              timeSlot: data.timeSlot,
            });
          }
        });
        onUpdate(slots);
      },
      (error) => {
        console.warn('Public booked slots snapshot notice:', error.message);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Could not initialize public booked slots listener:', err);
    return () => {};
  }
}

/**
 * Listen to all consultation bookings in real time (for authenticated clinician admin)
 */
export function subscribeToConsultationBookings(
  onUpdate: (bookings: BookingRecordPayload[]) => void,
  onError?: (err: Error) => void
): () => void {
  try {
    const colRef = collection(db, 'consultationBookings');
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const list: BookingRecordPayload[] = [];
        snapshot.forEach((d) => {
          const data = d.data() as BookingRecordPayload;
          list.push(data);
        });
        onUpdate(list);
      },
      (error) => {
        console.warn('Consultation bookings snapshot notice:', error.message);
        if (onError) onError(error);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Could not initialize consultation bookings listener:', err);
    return () => {};
  }
}

/**
 * Fetch consultation bookings once from Cloud Firestore
 */
export async function fetchConsultationBookingsOnce(): Promise<BookingRecordPayload[]> {
  try {
    const colRef = collection(db, 'consultationBookings');
    const snapshot = await getDocs(colRef);
    const list: BookingRecordPayload[] = [];
    snapshot.forEach((d) => {
      list.push(d.data() as BookingRecordPayload);
    });
    return list;
  } catch (err) {
    console.warn('Notice: Manual fetch bookings fallback:', err);
    return [];
  }
}

/**
 * Fetch public booked slots once from Cloud Firestore
 */
export async function fetchPublicBookedSlotsOnce(): Promise<{ dateKey: string; timeSlot: string }[]> {
  try {
    const colRef = collection(db, 'publicBookedSlots');
    const snapshot = await getDocs(colRef);
    const slots: { dateKey: string; timeSlot: string }[] = [];
    snapshot.forEach((d) => {
      const data = d.data();
      if (data.isBooked && data.dateKey && data.timeSlot) {
        slots.push({
          dateKey: data.dateKey,
          timeSlot: data.timeSlot,
        });
      }
    });
    return slots;
  } catch (err) {
    console.warn('Notice: Manual fetch slots fallback:', err);
    return [];
  }
}

/**
 * Google Sign-In for Admin authentication
 */
export async function signInAdminWithGoogle(): Promise<User | null> {
  try {
    const res = await signInWithPopup(auth, googleProvider);
    return res.user;
  } catch (err) {
    console.error('Google Admin Sign-in error:', err);
    throw err;
  }
}

export async function signOutAdmin(): Promise<void> {
  try {
    await signOut(auth);
  } catch (err) {
    console.error('Sign out error:', err);
  }
}

export { onAuthStateChanged };

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

testConnection();
