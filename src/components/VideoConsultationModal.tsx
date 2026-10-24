/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Wind,
  FileText,
  Check,
} from 'lucide-react';

export interface VideoSessionProps {
  appointmentId: string;
  therapistId: string;
  therapistName: string;
  clientName: string;
  sessionDate: string;
  sessionTime: string;
  sessionType: 'video' | 'audio' | 'couples_video';
  meetingRoomCode: string;
  onClose: () => void;
  onCompleteSession: (appointmentId: string) => Promise<void>;
  onSaveSessionNote: (title: string, plainText: string, therapistId: string) => Promise<void>;
}

export function VideoConsultationModal({
  appointmentId,
  therapistId,
  therapistName,
  clientName,
  sessionDate,
  sessionTime,
  sessionType,
  meetingRoomCode,
  onClose,
  onCompleteSession,
  onSaveSessionNote,
}: VideoSessionProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraEnabled, setCameraEnabled] = useState(sessionType !== 'audio');
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraStatus, setCameraStatus] = useState<'connecting' | 'active' | 'fallback'>('connecting');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showBreathingGuide, setShowBreathingGuide] = useState(false);
  const [breathPhase, setBreathPhase] = useState<'Inhale (4s)' | 'Hold (7s)' | 'Exhale (8s)'>('Inhale (4s)');

  // In-call reflection scratchpad (encrypted automatically in the background)
  const [noteTitle, setNoteTitle] = useState(`Session Reflection — ${sessionDate}`);
  const [noteContent, setNoteContent] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteSavedToast, setNoteSavedToast] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // Elapsed timer
  useEffect(() => {
    const interval = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  // 4-7-8 Somatic Breathing cycle
  useEffect(() => {
    if (!showBreathingGuide) return;
    let tick = 0;
    const interval = window.setInterval(() => {
      tick = (tick + 1) % 19;
      if (tick < 4) setBreathPhase('Inhale (4s)');
      else if (tick < 11) setBreathPhase('Hold (7s)');
      else setBreathPhase('Exhale (8s)');
    }, 1000);
    return () => window.clearInterval(interval);
  }, [showBreathingGuide]);

  // Request camera/microphone stream
  useEffect(() => {
    let mounted = true;

    async function initMedia() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (mounted) setCameraStatus('fallback');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: sessionType !== 'audio',
          audio: true,
        });
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current && sessionType !== 'audio') {
          videoRef.current.srcObject = stream;
        }
        setCameraStatus('active');
      } catch {
        if (mounted) {
          setCameraStatus('fallback');
        }
      }
    }

    initMedia();

    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [sessionType]);

  const toggleCamera = () => {
    const nextState = !cameraEnabled;
    setCameraEnabled(nextState);
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = nextState;
      });
    }
  };

  const toggleMic = () => {
    const nextState = !micEnabled;
    setMicEnabled(nextState);
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = nextState;
      });
    }
  };

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  const handleSaveScratchpad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    setIsSavingNote(true);
    try {
      await onSaveSessionNote(noteTitle, noteContent, therapistId);
      setNoteContent('');
      setNoteSavedToast(true);
      setTimeout(() => setNoteSavedToast(false), 3000);
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleEndAndComplete = async () => {
    setIsCompleting(true);
    try {
      await onCompleteSession(appointmentId);
      onClose();
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#131A17]/95 backdrop-blur-md flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-6xl bg-[#1A231F] border border-[#2C3A34] rounded-2xl overflow-hidden flex flex-col lg:flex-row max-h-[92vh]">
        {/* Left / Main Video Sanctuary Stage */}
        <div className="flex-1 flex flex-col justify-between p-8 lg:p-10 relative min-h-[480px]">
          {/* Room Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#2C3A34] pb-5">
            <div>
              <div className="flex items-center gap-2 text-xs text-[#9BB0A5]">
                <span>Private Telehealth Sanctuary</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-tabular">Room {meetingRoomCode}</span>
              </div>
              <h2 className="font-display text-3xl font-semibold text-[#F4F3EE] mt-1">
                Session with {therapistName}
              </h2>
            </div>

            <div className="flex items-center gap-5">
              <div className="text-right">
                <p className="text-xs text-[#9BB0A5]">{sessionDate} · {sessionTime}</p>
                <p className="font-mono-tabular text-sm font-medium text-[#D5E3DC] mt-0.5">
                  Elapsed {formatDuration(elapsedSeconds)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBreathingGuide((prev) => !prev)}
                className={`px-4 py-2.5 rounded-xl text-xs font-medium transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 ${
                  showBreathingGuide
                    ? 'bg-[#2E5A47] text-white'
                    : 'bg-[#24302B] text-[#C8D6CE] hover:bg-[#2F3E38]'
                }`}
              >
                <Wind className="w-4 h-4" />
                {showBreathingGuide ? 'Hide Breathing Guide' : 'Guided Breathing'}
              </button>
            </div>
          </div>

          {/* Dual Video Feeds Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8 flex-1">
            {/* Clinician Feed */}
            <div className="relative rounded-2xl bg-[#222E29] border border-[#32423B] overflow-hidden flex flex-col items-center justify-center p-8 min-h-[260px]">
              <div className="w-24 h-24 rounded-full bg-[#2E4239] border border-[#435E52] flex items-center justify-center mb-4">
                <span className="font-display text-3xl text-[#E3ECE7]">
                  {therapistName
                    .replace(/^Dr\.\s+/i, '')
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </span>
              </div>
              <p className="font-display text-2xl text-[#F4F3EE] font-medium">{therapistName}</p>
              <p className="text-xs text-[#9BB0A5] mt-1.5">
                Clinical Psychologist · Connected
              </p>

              {showBreathingGuide && (
                <div className="mt-6 px-6 py-4 rounded-xl bg-[#16201C]/90 border border-[#385247] text-center">
                  <p className="text-xs text-[#9BB0A5]">4-7-8 Mindful Breathing</p>
                  <p className="font-display text-2xl text-[#E5F0EA] mt-1">{breathPhase}</p>
                </div>
              )}

              <div className="absolute bottom-4 left-4 text-xs text-[#C8D6CE] bg-[#131A17]/80 px-3 py-1.5 rounded-lg">
                {therapistName}
              </div>
            </div>

            {/* Client Local Camera Feed */}
            <div className="relative rounded-2xl bg-[#1E2824] border border-[#32423B] overflow-hidden flex flex-col items-center justify-center min-h-[260px]">
              {cameraStatus === 'active' && cameraEnabled && sessionType !== 'audio' ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-8">
                  <div className="w-20 h-20 rounded-full bg-[#293631] border border-[#3D4F47] flex items-center justify-center mx-auto mb-4">
                    <span className="font-display text-2xl text-[#E3ECE7]">
                      {clientName.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <p className="text-base font-medium text-[#E3ECE7]">{clientName} (You)</p>
                  <p className="text-xs text-[#9BB0A5] mt-1.5">
                    {sessionType === 'audio'
                      ? 'Voice-Only Consultation Mode'
                      : !cameraEnabled
                      ? 'Camera paused'
                      : 'Audio & Video Connected'}
                  </p>
                </div>
              )}

              <div className="absolute bottom-4 left-4 text-xs text-[#C8D6CE] bg-[#131A17]/80 px-3 py-1.5 rounded-lg">
                {clientName} · {micEnabled ? 'Mic On' : 'Muted'}
              </div>
            </div>
          </div>

          {/* Call Control Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-5 border-t border-[#2C3A34]">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleMic}
                className={`px-4 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
                  micEnabled
                    ? 'bg-[#283530] text-[#F4F3EE] hover:bg-[#32423C]'
                    : 'bg-[#7C2D2D] text-white'
                }`}
              >
                {micEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                {micEnabled ? 'Mute Audio' : 'Unmute Audio'}
              </button>

              {sessionType !== 'audio' && (
                <button
                  type="button"
                  onClick={toggleCamera}
                  className={`px-4 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
                    cameraEnabled
                      ? 'bg-[#283530] text-[#F4F3EE] hover:bg-[#32423C]'
                      : 'bg-[#7C2D2D] text-white'
                  }`}
                >
                  {cameraEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                  {cameraEnabled ? 'Pause Camera' : 'Resume Camera'}
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-medium bg-[#283530] text-[#D5E3DC] hover:bg-[#32423C] transition-colors whitespace-nowrap shrink-0"
              >
                Minimize Room
              </button>
              <button
                type="button"
                disabled={isCompleting}
                onClick={handleEndAndComplete}
                className="px-5 py-2.5 rounded-xl text-xs font-medium bg-[#9E3B33] text-white hover:bg-[#873029] transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                <PhoneOff className="w-4 h-4" />
                {isCompleting ? 'Ending Session...' : 'Complete Session'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Calm Personal Session Journal */}
        <div className="w-full lg:w-96 bg-[#151D1A] border-t lg:border-t-0 lg:border-l border-[#2C3A34] p-8 flex flex-col justify-between">
          <div>
            <p className="text-xs text-[#8AB09B] mb-2">Personal Journal</p>
            <h3 className="font-display text-2xl font-semibold text-[#F4F3EE]">
              Session Reflections
            </h3>
            <p className="text-xs text-[#9BB0A5] mt-2 leading-relaxed">
              Write down thoughts, gentle reminders, or reflections from your conversation today. Saved privately to your account.
            </p>

            <form onSubmit={handleSaveScratchpad} className="mt-6 space-y-5">
              <div>
                <label className="block text-xs text-[#B8C7BF] mb-1.5">Title</label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1E2824] border border-[#32423B] text-xs text-[#F4F3EE] focus:outline-none focus:border-[#6B9E85]"
                />
              </div>

              <div>
                <label className="block text-xs text-[#B8C7BF] mb-1.5">
                  Your Notes
                </label>
                <textarea
                  rows={6}
                  required
                  placeholder="Write takeaways or reflections from today's session..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1E2824] border border-[#32423B] text-xs text-[#F4F3EE] focus:outline-none focus:border-[#6B9E85] resize-none leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={isSavingNote || !noteContent.trim()}
                className="w-full py-3 px-4 rounded-xl bg-[#234E3E] hover:bg-[#2C614E] disabled:opacity-50 text-white text-xs font-medium transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
              >
                <FileText className="w-4 h-4" />
                {isSavingNote ? 'Saving Reflection...' : 'Save Reflection'}
              </button>

              {noteSavedToast && (
                <div className="p-3 rounded-xl bg-[#1F3A2E] border border-[#35634E] text-xs text-[#CBE6D8] flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>Saved to your private reflections in Dashboard.</span>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
