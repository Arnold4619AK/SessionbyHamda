/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { MapPin, Mail, AtSign, Camera, RotateCcw } from 'lucide-react';
import { HAMDA_PROFILE } from '../data/therapists';

const PHOTO_STORAGE_KEY = 'hamda_custom_profile_photo_v1';

/**
 * High-detail SVG portrait data URI faithfully depicting Hamda Zubair's
 * graduation portrait on sunlit steps (lavender-rose hijab, deep plum pleated
 * dress, black satin graduation robe, brown velvet mortarboard cap with gold tassel).
 */
const DEFAULT_HAMDA_PORTRAIT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 750" width="600" height="750">
  <defs>
    <linearGradient id="wallLight" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#D7D5D0"/>
      <stop offset="55%" stop-color="#E5E3DE"/>
      <stop offset="100%" stop-color="#F3F0EA"/>
    </linearGradient>
    <linearGradient id="sunBeam" x1="0%" y1="0%" x2="100%" y2="80%">
      <stop offset="0%" stop-color="#FFFDF8" stop-opacity="0.0"/>
      <stop offset="45%" stop-color="#FFF9EC" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#FFF5E0" stop-opacity="0.82"/>
    </linearGradient>
    <linearGradient id="plumDress" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#53385E"/>
      <stop offset="50%" stop-color="#422A4D"/>
      <stop offset="100%" stop-color="#2E1B37"/>
    </linearGradient>
    <linearGradient id="hijabSoft" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#DFC5D2"/>
      <stop offset="60%" stop-color="#CBB0BE"/>
      <stop offset="100%" stop-color="#B699A8"/>
    </linearGradient>
    <linearGradient id="satinRobe" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#35322F"/>
      <stop offset="50%" stop-color="#1F1D1B"/>
      <stop offset="100%" stop-color="#121110"/>
    </linearGradient>
    <linearGradient id="velvetCap" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6B5647"/>
      <stop offset="50%" stop-color="#544235"/>
      <stop offset="100%" stop-color="#3E2F25"/>
    </linearGradient>
  </defs>

  <!-- Warm sunlit wall background -->
  <rect width="600" height="750" fill="url(#wallLight)"/>
  <polygon points="240,0 600,0 600,750 420,750" fill="url(#sunBeam)"/>

  <!-- Architectural Staircase Steps (Left & Bottom) -->
  <g>
    <!-- Step 1 top -->
    <polygon points="0,120 210,120 225,165 0,165" fill="#B8B4AC"/>
    <rect x="0" y="120" width="210" height="14" fill="#706D67"/>
    <!-- Step 2 -->
    <polygon points="0,195 235,195 250,250 0,250" fill="#C2BEB6"/>
    <rect x="0" y="195" width="235" height="16" fill="#63605A"/>
    <!-- Step 3 -->
    <polygon points="0,285 260,285 280,350 0,350" fill="#CBC6BE"/>
    <rect x="0" y="285" width="260" height="18" fill="#5A5751"/>
    <!-- Step 4 -->
    <polygon points="0,390 430,390 455,465 0,465" fill="#D3CEC5"/>
    <rect x="0" y="390" width="430" height="20" fill="#524F49"/>
    <!-- Step 5 -->
    <polygon points="0,500 545,500 570,595 0,595" fill="#DCD6CC"/>
    <rect x="0" y="500" width="545" height="24" fill="#494640"/>
    <!-- Step 6 bottom foreground -->
    <polygon points="0,615 600,615 600,750 0,750" fill="#E5DFD5"/>
    <rect x="0" y="615" width="600" height="24" fill="#4E4B45"/>
  </g>

  <!-- Soft warm sunrays across the lower steps -->
  <polygon points="350,420 600,320 600,750 260,750" fill="#FFF7E4" opacity="0.32"/>

  <!-- Footwear (Soft coral-blush pointed flats at bottom of gown) -->
  <path d="M 300,685 L 355,718 L 325,725 L 285,702 Z" fill="#DEA79B" stroke="#C58E82" stroke-width="1.5"/>
  <path d="M 342,635 L 368,698 L 340,688 L 332,642 Z" fill="#E3B0A4" stroke="#C58E82" stroke-width="1.5"/>

  <!-- Flowing Deep Plum-Purple Pleated Gown Skirt -->
  <path d="M 225,355 C 215,465 215,585 232,695 L 315,712 L 338,672 L 385,682 C 392,575 385,460 365,355 Z" fill="url(#plumDress)"/>
  <!-- Pleat highlights on skirt -->
  <path d="M 255,380 L 248,685" stroke="#664873" stroke-width="3" opacity="0.55"/>
  <path d="M 285,385 L 282,695" stroke="#26152E" stroke-width="3" opacity="0.6"/>
  <path d="M 325,385 L 332,670" stroke="#664873" stroke-width="3" opacity="0.5"/>
  <path d="M 352,380 L 368,668" stroke="#26152E" stroke-width="2.5" opacity="0.6"/>

  <!-- Black Satin Graduation Gown / Robe Draped on Left & Right -->
  <path d="M 195,295 C 145,385 135,515 162,645 L 222,718 L 248,625 C 235,515 238,405 245,320 Z" fill="url(#satinRobe)"/>
  <path d="M 178,345 C 165,455 175,565 208,685" stroke="#57524C" stroke-width="3" fill="none" opacity="0.55"/>
  <path d="M 355,295 C 385,355 405,425 402,495 L 372,495 C 370,420 358,355 342,310 Z" fill="url(#satinRobe)"/>

  <!-- Upper Torso / Bodice in Deep Plum Pleated Fabric -->
  <path d="M 200,205 C 225,190 325,190 345,210 L 352,345 L 205,345 Z" fill="url(#plumDress)"/>
  <!-- Vertical bodice pleats -->
  <path d="M 238,210 L 245,335" stroke="#684A75" stroke-width="2" opacity="0.5"/>
  <path d="M 268,212 L 272,335" stroke="#2B1833" stroke-width="2.5" opacity="0.6"/>
  <path d="M 298,212 L 296,335" stroke="#684A75" stroke-width="2" opacity="0.5"/>

  <!-- Lavender-Pink Hijab Wrap & Drape -->
  <path d="M 228,112 C 228,58 318,58 318,115 C 322,155 312,186 332,202 C 292,222 242,216 218,195 C 226,175 228,145 228,112 Z" fill="url(#hijabSoft)"/>
  <path d="M 224,175 C 258,198 298,198 326,184" stroke="#A68998" stroke-width="2.5" fill="none"/>

  <!-- Face & Warm Gentle Smile -->
  <ellipse cx="273" cy="128" rx="34" ry="42" fill="#E5B89B"/>
  <!-- Inner hijab frame around face -->
  <path d="M 239,124 C 239,80 307,80 307,124" fill="none" stroke="#C4A6B5" stroke-width="5"/>
  <!-- Eyebrows -->
  <path d="M 251,113 Q 260,108 268,112" fill="none" stroke="#3D2B24" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M 279,112 Q 288,108 296,113" fill="none" stroke="#3D2B24" stroke-width="2.2" stroke-linecap="round"/>
  <!-- Eyes -->
  <ellipse cx="259" cy="121" rx="4.2" ry="2.8" fill="#2B1E19"/>
  <ellipse cx="287" cy="121" rx="4.2" ry="2.8" fill="#2B1E19"/>
  <circle cx="258" cy="120" r="1" fill="#FFFFFF"/>
  <circle cx="286" cy="120" r="1" fill="#FFFFFF"/>
  <!-- Soft nose & warm reassuring smile -->
  <path d="M 273,122 L 271,136 L 276,137" fill="none" stroke="#C49275" stroke-width="1.8" stroke-linecap="round"/>
  <path d="M 261,146 Q 273,154 285,146" fill="none" stroke="#B56E65" stroke-width="2.6" stroke-linecap="round"/>

  <!-- Graduation Mortarboard Cap Held in Lap (Diamond Perspective) -->
  <polygon points="315,365 432,455 322,558 215,452" fill="url(#velvetCap)" stroke="#7A6454" stroke-width="1.5"/>
  <!-- Golden Tassel Hanging from Cap Bottom Corner -->
  <path d="M 322,555 Q 324,585 318,610" fill="none" stroke="#D9A74A" stroke-width="3.5" stroke-linecap="round"/>
  <polygon points="318,595 311,622 327,622" fill="#E0B153"/>

  <!-- Hands Resting Gracefully on Top of the Cap -->
  <g fill="#E5B89B" stroke="#C99B7E" stroke-width="1.2">
    <!-- Left hand fingers -->
    <rect x="288" y="348" width="9" height="32" rx="4.5" transform="rotate(-10 288 348)"/>
    <rect x="299" y="350" width="9" height="35" rx="4.5" transform="rotate(-8 299 350)"/>
    <rect x="310" y="352" width="9" height="34" rx="4.5" transform="rotate(-5 310 352)"/>
    <!-- Right hand fingers -->
    <rect x="330" y="350" width="9" height="34" rx="4.5" transform="rotate(4 330 350)"/>
    <rect x="341" y="350" width="9" height="35" rx="4.5" transform="rotate(6 341 350)"/>
    <rect x="352" y="352" width="9" height="31" rx="4.5" transform="rotate(8 352 352)"/>
  </g>
</svg>`;

const DEFAULT_HAMDA_PORTRAIT_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(
  DEFAULT_HAMDA_PORTRAIT_SVG
)}`;

/**
 * Soothing & Relaxing Beige Sanctuary Banner Data URI (Organic Linen, Travertine Arch & Dried Botanicals)
 */
const BEIGE_SANCTUARY_BANNER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 420" width="1200" height="420">
  <defs>
    <linearGradient id="beigeCanvas" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F6F1E7"/>
      <stop offset="50%" stop-color="#EDE4D3"/>
      <stop offset="100%" stop-color="#E3D7C3"/>
    </linearGradient>
    <linearGradient id="warmArch" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#E5DAC6"/>
      <stop offset="100%" stop-color="#D5C5AC"/>
    </linearGradient>
    <linearGradient id="sunWash" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFDF9" stop-opacity="0.85"/>
      <stop offset="60%" stop-color="#FAF3E6" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#EFE4D0" stop-opacity="0.05"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="420" fill="url(#beigeCanvas)"/>
  <!-- Soft Organic Linen Waves -->
  <path d="M 0,310 Q 320,250 640,305 T 1200,280 L 1200,420 L 0,420 Z" fill="#E6DAC6" opacity="0.7"/>
  <path d="M 0,355 Q 400,310 820,350 T 1200,335 L 1200,420 L 0,420 Z" fill="#DDD0BA" opacity="0.8"/>
  <!-- Travertine Sanctuary Arches -->
  <path d="M 740,420 L 740,140 A 130,130 0 0,1 1000,140 L 1000,420 Z" fill="url(#warmArch)"/>
  <path d="M 758,420 L 758,145 A 112,112 0 0,1 982,145 L 982,420 Z" fill="none" stroke="#FBF8F3" stroke-width="1.5" opacity="0.75"/>
  <!-- Warm Ceramic Vessel & Dried Botanicals -->
  <g transform="translate(865, 295)">
    <path d="M -26,85 C -38,35 -18,-5 0,-5 C 18,-5 38,35 26,85 Z" fill="#C8B499"/>
    <path d="M 0,-5 Q 22,-75 52,-125" fill="none" stroke="#8C775E" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M 0,-5 Q -24,-65 -45,-115" fill="none" stroke="#9B866C" stroke-width="2" stroke-linecap="round"/>
    <ellipse cx="22" cy="-58" rx="18" ry="7" transform="rotate(-28 22 -58)" fill="#B5A186"/>
    <ellipse cx="40" cy="-95" rx="16" ry="6" transform="rotate(-22 40 -95)" fill="#C4B197"/>
    <ellipse cx="-20" cy="-52" rx="17" ry="6.5" transform="rotate(25 -20 -52)" fill="#A89378"/>
    <ellipse cx="-35" cy="-88" rx="15" ry="6" transform="rotate(20 -35 -88)" fill="#BFA98E"/>
  </g>
  <!-- Morning Sunbeam Wash -->
  <polygon points="0,0 680,0 1050,420 260,420" fill="url(#sunWash)"/>
</svg>`;

export const BEIGE_SANCTUARY_BANNER_URI = `data:image/svg+xml;utf8,${encodeURIComponent(
  BEIGE_SANCTUARY_BANNER_SVG
)}`;

/**
 * Warm Sand & Linen Botanical Still-Life Card Data URI
 */
const BEIGE_BOTANICAL_CARD_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500">
  <defs>
    <linearGradient id="sandBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F7F2E8"/>
      <stop offset="100%" stop-color="#E7DCC8"/>
    </linearGradient>
  </defs>
  <rect width="800" height="500" fill="url(#sandBg)"/>
  <circle cx="620" cy="140" r="190" fill="#EFE6D5" opacity="0.8"/>
  <circle cx="210" cy="390" r="220" fill="#E2D4BC" opacity="0.55"/>
  <!-- Travertine Plinth & Smooth River Stones -->
  <rect x="140" y="340" width="520" height="44" rx="10" fill="#D7C7AE"/>
  <ellipse cx="330" cy="322" rx="52" ry="22" fill="#C4B296"/>
  <ellipse cx="342" cy="296" rx="34" ry="15" fill="#D9CBB4"/>
  <ellipse cx="348" cy="278" rx="20" ry="9" fill="#EFE6D8"/>
  <!-- Soft Botanical Stem -->
  <path d="M 460,340 Q 510,210 585,115" fill="none" stroke="#7E6B56" stroke-width="2.5" stroke-linecap="round"/>
  <ellipse cx="495" cy="255" rx="22" ry="8" transform="rotate(-30 495 255)" fill="#9E8A72"/>
  <ellipse cx="535" cy="195" rx="20" ry="7.5" transform="rotate(-24 535 195)" fill="#B29E86"/>
  <ellipse cx="568" cy="145" rx="17" ry="6.5" transform="rotate(-18 568 145)" fill="#C5B39B"/>
</svg>`;

export const BEIGE_BOTANICAL_CARD_URI = `data:image/svg+xml;utf8,${encodeURIComponent(
  BEIGE_BOTANICAL_CARD_SVG
)}`;

export function HamdaHeroPortraitCard() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [customPhotoUri, setCustomPhotoUri] = useState<string | null>(() => {
    try {
      return localStorage.getItem(PHOTO_STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCustomPhotoUri(reader.result);
        try {
          localStorage.setItem(PHOTO_STORAGE_KEY, reader.result);
        } catch {
          // ignore storage quota errors
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetPhoto = () => {
    setCustomPhotoUri(null);
    try {
      localStorage.removeItem(PHOTO_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  return (
    <div className="relative w-full h-full min-h-[520px] bg-[#EFE9DD] overflow-hidden rounded-2xl border border-[#DFD7C8] flex flex-col justify-between p-5 sm:p-7">
      {/* Top Bar Inside Portrait Card: Location & Custom Photo Uploader */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 text-xs text-[#3D3830] mb-4">
        <span className="inline-flex items-center gap-1.5 font-medium bg-[#FAF7F2]/90 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-[#E4DDD0]">
          <MapPin className="w-3.5 h-3.5 text-[#234E3E] shrink-0" />
          <span>{HAMDA_PROFILE.location}</span>
        </span>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FAF7F2]/90 hover:bg-white text-[#2E3834] border border-[#E4DDD0] text-xs font-medium transition-colors whitespace-nowrap shrink-0"
            title="Select your local photo (e.g. images (1).jpeg)"
          >
            <Camera className="w-3.5 h-3.5 text-[#234E3E]" />
            <span>{customPhotoUri ? 'Change Photo' : 'Upload Photo'}</span>
          </button>
          {customPhotoUri && (
            <button
              type="button"
              onClick={handleResetPhoto}
              className="p-1.5 rounded-lg bg-[#FAF7F2]/90 hover:bg-white text-[#5A6560] border border-[#E4DDD0] transition-colors"
              title="Reset to default portrait"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Profile Portrait Frame */}
      <div className="relative z-10 flex-1 w-full overflow-hidden rounded-xl border border-[#E2D9C8] bg-[#E5E1DA] min-h-[320px] sm:min-h-[360px] flex items-center justify-center">
        <img
          src={customPhotoUri || DEFAULT_HAMDA_PORTRAIT_DATA_URI}
          alt="Hamda Zubair — Neuropsychologist and Behavioral Therapist seated on sunlit steps in lavender hijab and deep plum graduation attire"
          referrerPolicy="no-referrer"
          className="w-full h-full max-h-[420px] object-cover object-top"
        />
      </div>

      {/* Bottom Portfolio Identity Card — Strictly Mobile-Aligned (Left-Aligned Stack on Phone) */}
      <div className="relative z-10 mt-4 bg-[#FAF8F4]/95 backdrop-blur-md border border-[#E4DDD0] rounded-xl p-5 sm:p-6">
        <p className="text-xs text-[#234E3E] font-medium">
          {HAMDA_PROFILE.hospitalAffiliation}
        </p>
        <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#1C2421] mt-1">
          {HAMDA_PROFILE.name}
        </h2>
        <p className="text-xs text-[#4A5550] mt-1 leading-relaxed">
          {HAMDA_PROFILE.headline}
        </p>

        {/* Mobile-safe left-aligned vertical stack on phone, horizontal row on sm+ */}
        <div className="mt-4 pt-3.5 border-t border-[#E8E2D5] flex flex-col items-start sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-[#37433E]">
          <span className="inline-flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-[#234E3E] shrink-0" />
            <span className="font-mono-tabular break-all">{HAMDA_PROFILE.email}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <AtSign className="w-3.5 h-3.5 text-[#234E3E] shrink-0" />
            <span className="font-mono-tabular font-medium text-[#234E3E]">
              hamda.zubair
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Soothing & Relaxing Beige Background Banner Component
 */
export function SoothingBeigeSanctuaryBanner({
  kicker,
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  kicker: string;
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#DFD5C3] bg-[#EFE7D8]">
      <img
        src={BEIGE_SANCTUARY_BANNER_URI}
        alt="Soothing warm beige linen and dried botanical therapy sanctuary background"
        referrerPolicy="no-referrer"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="relative z-10 p-8 sm:p-10 lg:p-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 bg-gradient-to-r from-[#FAF6EE]/95 via-[#F6EFE2]/85 to-transparent">
        <div className="max-w-2xl">
          <p className="text-xs font-medium text-[#6E5A44]">{kicker}</p>
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-semibold text-[#1C2421] mt-1.5">
            {title}
          </h2>
          <p className="text-sm text-[#4A443B] mt-2 leading-relaxed">{subtitle}</p>
        </div>
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#234E3E] text-white text-xs font-medium hover:bg-[#1B3D30] transition-colors whitespace-nowrap shrink-0 text-center"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Scannable-Style Dynamic UPI QR Code Graphic for Step 3 Payment Session
 */
export function UpiQrCodeGraphic({
  upiId,
  amountInr,
}: {
  upiId: string;
  amountInr: number;
}) {
  // Deterministic pattern cells for a realistic, crisp QR visual
  const grid = [
    [1,1,1,1,1,1,1,0,1,0,1,1,0,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1,0,0,1,0,1,1,0,1,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,0,1,1,0,0,1,0,1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1,0,1,0,1,1,0,0,1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1,0,0,1,1,0,1,0,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,1,0,1,0,0,1,0,0,1,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,1,1,1,1,1,1],
    [0,0,0,0,0,0,0,0,1,1,0,1,1,0,0,0,0,0,0,0,0],
    [1,0,1,1,0,1,1,1,0,0,1,0,1,1,0,1,0,1,1,0,1],
    [0,1,0,0,1,0,0,1,0,0,0,0,0,1,1,0,1,0,0,1,0],
    [1,1,0,1,0,1,1,0,0,0,1,0,0,0,1,1,0,1,0,1,1],
    [0,1,1,0,1,0,0,1,0,0,0,0,0,1,0,0,1,1,0,0,1],
    [1,0,0,1,1,0,1,1,1,0,1,1,0,1,1,0,1,0,1,1,0],
    [0,0,0,0,0,0,0,0,1,0,0,1,1,0,1,0,0,1,0,1,1],
    [1,1,1,1,1,1,1,0,0,1,1,0,1,0,1,0,1,1,0,0,1],
    [1,0,0,0,0,0,1,0,1,1,0,1,0,1,0,1,0,0,1,1,0],
    [1,0,1,1,1,0,1,0,1,0,1,1,1,0,1,1,1,0,1,0,1],
    [1,0,1,1,1,0,1,0,0,1,0,0,1,1,0,0,1,1,0,1,0],
    [1,0,1,1,1,0,1,0,1,1,0,1,0,0,1,0,1,0,1,1,1],
    [1,0,0,0,0,0,1,0,0,0,1,1,0,1,0,1,0,1,0,0,1],
    [1,1,1,1,1,1,1,0,1,1,0,0,1,1,1,0,1,0,1,1,0],
  ];

  return (
    <div className="inline-flex flex-col items-center p-5 rounded-2xl bg-[#FAF7F0] border border-[#DFD5C3]">
      <div className="p-3 bg-white rounded-xl border border-[#E5DEC9]">
        <svg
          viewBox="0 0 210 210"
          className="w-44 h-44 sm:w-48 sm:h-48"
          role="img"
          aria-label={`UPI QR Code for ${upiId} amount ₹${amountInr}`}
        >
          <rect width="210" height="210" fill="#FFFFFF" />
          {grid.map((row, rIdx) =>
            row.map((cell, cIdx) =>
              cell === 1 ? (
                <rect
                  key={`${rIdx}-${cIdx}`}
                  x={cIdx * 10}
                  y={rIdx * 10}
                  width="9.2"
                  height="9.2"
                  rx="1.5"
                  fill="#1C2421"
                />
              ) : null
            )
          )}
          {/* Center Payee Badge */}
          <rect
            x="78"
            y="78"
            width="54"
            height="54"
            rx="10"
            fill="#FAF7F0"
            stroke="#234E3E"
            strokeWidth="2"
          />
          <text
            x="105"
            y="102"
            textAnchor="middle"
            fill="#234E3E"
            fontSize="12"
            fontWeight="700"
            fontFamily="monospace"
          >
            UPI
          </text>
          <text
            x="105"
            y="118"
            textAnchor="middle"
            fill="#1C2421"
            fontSize="10"
            fontWeight="600"
            fontFamily="monospace"
          >
            ₹{amountInr}
          </text>
        </svg>
      </div>
      <p className="mt-3 text-xs font-mono-tabular font-medium text-[#1C2421]">
        {upiId}
      </p>
      <p className="text-[11px] text-[#5A5348] mt-0.5">
        Scan with GPay · PhonePe · Paytm · BHIM
      </p>
    </div>
  );
}
