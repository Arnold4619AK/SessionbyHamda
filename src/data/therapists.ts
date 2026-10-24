/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SessionOffering {
  id: string;
  title: string;
  durationMinutes: 45 | 50 | 60 | 80;
  modality: 'video' | 'audio' | 'couples_video';
  feeInr: number;
  summary: string;
  clinicalHighlights: string[];
}

export const HAMDA_PROFILE = {
  id: 'hamda_zubair',
  name: 'Hamda Zubair',
  headline: 'Neuropsychologist · Behavioral Therapist · Psychology Content Creator',
  location: 'Hyderabad, India',
  email: 'hamda.connect@gmail.com',
  socialHandle: '@hamda.zubair',
  hospitalAffiliation: 'Neuropsychology Intern / Therapist · Mind & Brain Hospital',
  summary:
    'Hamda Zubair is a dedicated behavioral therapist and an aspiring clinical neuropsychologist based in Hyderabad, India. Blending structured clinical work with public digital advocacy, she specializes in advanced neurological interventions, mental wellness content creation, and active community outreach focused on the intersections of physical and mental health.',
  clinicalExperience: {
    role: 'Neuropsychology Intern / Therapist',
    institution: 'Mind & Brain Hospital, Hyderabad',
    description:
      'Actively handles clinical responsibilities, structured patient interactions, diagnostic assessments, and longitudinal cognitive case tracking.',
    competencies: [
      {
        title: 'rTMS & tDCS Brain Stimulation',
        detail:
          'Trained and assists in Repetitive Transcranial Magnetic Stimulation (rTMS) and Transcranial Direct Current Stimulation (tDCS) protocols.',
      },
      {
        title: 'Neurofeedback & Biofeedback Systems',
        detail:
          'Assists in physiological and cortical feedback training to support attention, emotional regulation, and neuro-rehabilitation.',
      },
      {
        title: "JPMR (Jacobson's Progressive Muscle Relaxation)",
        detail:
          'Guides structured somatic tension-release protocols for autonomic nervous system calming and anxiety reduction.',
      },
      {
        title: 'Core Behavioral & Cognitive Techniques',
        detail:
          'Evidence-based behavioral modification, cognitive restructuring, and individualized case tracking.',
      },
    ],
  },
  publicSpeaking: {
    event: 'Panelist at FEEL 2026 · Gachibowli Stadium, Hyderabad',
    description:
      "Invited as a key panel speaker at the high-profile mental wellness convention at Gachibowli Stadium, Hyderabad. Addressed critical issues regarding women's physical healthcare, hormonal changes, and their profound impact on long-term cognitive and emotional well-being.",
  },
  digitalAdvocacy: {
    handle: '@hamda.zubair',
    description:
      'Serves as a psychology creator demystifying neuroscience and clinical psychology for the public.',
    pillars: [
      'Educating students on academic and career pathways in neuropsychology within India.',
      'Sharing practical insights, daily mental health checks, and neuro-rehabilitation tool highlights.',
    ],
  },
  defaultSlots: [
    '10:00 AM IST',
    '11:30 AM IST',
    '02:30 PM IST',
    '04:30 PM IST',
    '06:00 PM IST',
  ],
};

export const HAMDA_PAYMENT_DETAILS = {
  payeeName: 'Hamda Zubair — Neuropsychology & Behavioral Practice',
  upiId: 'hamdazubair@okaxis',
  secondaryUpiId: 'hamda.connect@okicici',
  bankName: 'HDFC Bank · Banjara Hills Branch, Hyderabad',
  accountHolder: 'Hamda Zubair',
  accountNumber: '50100482910472',
  ifscCode: 'HDFC0000512',
  accountType: 'Current / Professional Practice Account',
};

export const HAMDA_SESSION_OFFERINGS: SessionOffering[] = [
  {
    id: 'behavioral_cognitive',
    title: '1-on-1 Behavioral & Cognitive Therapy',
    durationMinutes: 50,
    modality: 'video',
    feeInr: 1500,
    summary:
      'Individualized behavioral and cognitive therapy session with structured goal setting, emotional regulation, and cognitive case tracking.',
    clinicalHighlights: [
      'Core behavioral & cognitive therapeutic techniques',
      'Personalized cognitive & emotional case tracking',
      '50-minute private video or audio consultation',
    ],
  },
  {
    id: 'neuropsych_wellness',
    title: 'Neuropsychology & Brain-Body Consultation',
    durationMinutes: 60,
    modality: 'video',
    feeInr: 1800,
    summary:
      "Comprehensive consultation exploring the intersection of physical, hormonal, and cognitive health, including guidance on rTMS, tDCS, and neurofeedback interventions.",
    clinicalHighlights: [
      'Neuro-behavioral case review & cognitive screening',
      "Women's hormonal-cognitive & emotional wellness focus",
      'Orientation on rTMS, tDCS & Neurofeedback rehabilitation tools',
    ],
  },
  {
    id: 'jpmr_biofeedback',
    title: 'JPMR & Somatic Relaxation Session',
    durationMinutes: 45,
    modality: 'video',
    feeInr: 1300,
    summary:
      "Guided Jacobson's Progressive Muscle Relaxation (JPMR) and biofeedback-informed nervous system regulation for acute stress, somatic tension, and sleep recovery.",
    clinicalHighlights: [
      "Guided Jacobson's Progressive Muscle Relaxation (JPMR)",
      'Biofeedback-principled breathing & physiological pacing',
      'Take-home daily relaxation routine',
    ],
  },
  {
    id: 'student_mentorship',
    title: 'Neuropsychology Academic & Career Mentorship',
    durationMinutes: 45,
    modality: 'video',
    feeInr: 1000,
    summary:
      '1-on-1 mentorship for psychology students and aspiring clinicians navigating neuropsychology internships, hospital training, and academic pathways in India.',
    clinicalHighlights: [
      'Academic & clinical roadmap in neuropsychology within India',
      'Hospital internship preparation (rTMS, tDCS, case tracking)',
      'Q&A with @hamda.zubair',
    ],
  },
];

export const CONCERN_FOCUSES = [
  'Behavioral & Cognitive Therapy (Anxiety, Stress & Habit Regulation)',
  'Neuropsychological Wellness & Brain-Body / Hormonal Health',
  "JPMR (Jacobson's Progressive Muscle Relaxation) & Somatic Calm",
  'Guidance on rTMS, tDCS, Neurofeedback & Neuro-Rehabilitation',
  'Academic & Career Pathway Mentorship in Neuropsychology',
];
