/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Security Rules Dirty Dozen Verification Suite (Phase 0 TDD Specification)
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  auth: { uid: string; email: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expectedOutcome: 'PERMISSION_DENIED';
  enforcedByRuleGate: string;
}

export const DIRTY_DOZEN_SECURITY_TESTS: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Identity Spoofing on Appointment Create',
    operation: 'create',
    path: '/appointments/apt_spoof_01',
    auth: { uid: 'user_A', email: 'a@example.com', email_verified: true },
    payload: {
      appointmentId: 'apt_spoof_01',
      clientId: 'user_B',
      therapistId: 'therapist_ananya',
      therapistName: 'Dr. Ananya Sharma',
      clientName: 'User A',
      sessionDate: '2026-10-20',
      sessionTime: '10:00 AM IST',
      sessionType: 'video',
      durationMinutes: 50,
      amountInr: 1800,
      paymentStatus: 'paid',
      paymentReference: 'PAY_998123',
      status: 'confirmed',
      meetingRoomCode: 'ROOM_A12',
      emailConfirmationSent: true,
      reminderScheduled: true,
      concernFocus: 'Anxiety & Work Stress',
    },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRuleGate: 'data.clientId == request.auth.uid',
  },
  {
    id: 2,
    name: 'Shadow Field Injection on Appointment Create',
    operation: 'create',
    path: '/appointments/apt_shadow_02',
    auth: { uid: 'user_A', email: 'a@example.com', email_verified: true },
    payload: {
      appointmentId: 'apt_shadow_02',
      clientId: 'user_A',
      isFreeOverride: true,
    },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRuleGate: 'data.keys().hasOnly(...)',
  },
  {
    id: 3,
    name: 'Unverified Email Write Attempt',
    operation: 'create',
    path: '/encryptedRecords/rec_unverified_03',
    auth: { uid: 'user_A', email: 'a@example.com', email_verified: false },
    payload: {
      recordId: 'rec_unverified_03',
      ownerId: 'user_A',
    },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRuleGate: 'isVerifiedUser() -> request.auth.token.email_verified == true',
  },
  {
    id: 4,
    name: 'PII Blanket Read Attack on Private Info',
    operation: 'get',
    path: '/users/user_A/private/info',
    auth: { uid: 'user_B', email: 'b@example.com', email_verified: true },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRuleGate: 'request.auth.uid == userId || isAdmin()',
  },
  {
    id: 5,
    name: 'Orphaned Subcollection Write Without Parent User',
    operation: 'create',
    path: '/users/user_no_parent/private/info',
    auth: { uid: 'user_no_parent', email: 'np@example.com', email_verified: true },
    payload: {
      uid: 'user_no_parent',
      email: 'np@example.com',
      phone: '+919876543210',
      emergencyContact: 'Parent +919876543211',
      emailRemindersEnabled: true,
    },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRuleGate: 'exists(/databases/$(database)/documents/users/$(userId))',
  },
  {
    id: 6,
    name: 'Terminal State Mutation on Completed Appointment',
    operation: 'update',
    path: '/appointments/apt_completed_06',
    auth: { uid: 'user_A', email: 'a@example.com', email_verified: true },
    payload: {
      sessionTime: '04:00 PM IST',
      status: 'rescheduled',
    },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRuleGate: "existing().status != 'completed' && existing().status != 'cancelled'",
  },
  {
    id: 7,
    name: 'Value Poisoning on Appointment Update',
    operation: 'update',
    path: '/appointments/apt_active_07',
    auth: { uid: 'user_A', email: 'a@example.com', email_verified: true },
    payload: {
      sessionTime: 'X'.repeat(5000),
      status: 'rescheduled',
    },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRuleGate: 'isValidAppointment(incoming()) -> data.sessionTime.size() <= 32',
  },
  {
    id: 8,
    name: 'Immortal Field Tampering (amountInr / createdAt)',
    operation: 'update',
    path: '/appointments/apt_active_08',
    auth: { uid: 'user_A', email: 'a@example.com', email_verified: true },
    payload: {
      amountInr: 500,
    },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRuleGate: 'incoming().amountInr == existing().amountInr && affectedKeys().hasOnly(...)',
  },
  {
    id: 9,
    name: 'Forged Past Client Timestamp on Encrypted Record',
    operation: 'create',
    path: '/encryptedRecords/rec_forged_time_09',
    auth: { uid: 'user_A', email: 'a@example.com', email_verified: true },
    payload: {
      createdAt: '2020-01-01T00:00:00Z',
    },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRuleGate: 'incoming().createdAt == request.time',
  },
  {
    id: 10,
    name: 'ID Poisoning Attack with Invalid Characters',
    operation: 'create',
    path: '/encryptedRecords/rec_$$invalid_id$$',
    auth: { uid: 'user_A', email: 'a@example.com', email_verified: true },
    payload: {
      recordId: 'rec_$$invalid_id$$',
    },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRuleGate: "isValidId(recordId) -> id.matches('^[a-zA-Z0-9_\\\\-]+$')",
  },
  {
    id: 11,
    name: 'Unauthorized List Scraping of Encrypted Patient Records',
    operation: 'list',
    path: '/encryptedRecords',
    auth: { uid: 'attacker_uid', email: 'attacker@example.com', email_verified: true },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRuleGate: 'resource.data.ownerId == request.auth.uid || resource.data.therapistId == request.auth.uid',
  },
  {
    id: 12,
    name: 'Self-Assigned Admin Escalation',
    operation: 'create',
    path: '/admins/user_A',
    auth: { uid: 'user_A', email: 'a@example.com', email_verified: true },
    payload: {
      uid: 'user_A',
    },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRuleGate: 'allow create, update: if isAdmin()',
  },
];
