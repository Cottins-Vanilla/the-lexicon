/* =========================================================
   词匣 · ARTWORK
   基于名称/ID 的确定性几何封面生成器
   ========================================================= */

(function () {
  'use strict';

  const Lexicon = window.Lexicon = window.Lexicon || {};

  const PALETTES = [
    { bg: '#11181a', bg2: '#080c0e', ink: '#e5d8c3', accent: '#b9654b', soft: '#4f6768', glow: '#d18b6c' },
    { bg: '#11191a', bg2: '#080d0f', ink: '#d8ccb7', accent: '#789188', soft: '#425a5c', glow: '#adc3b6' },
    { bg: '#151412', bg2: '#0a0908', ink: '#e6d9c4', accent: '#a57b57', soft: '#53615c', glow: '#d1ad87' },
    { bg: '#10161b', bg2: '#080c10', ink: '#d7ccba', accent: '#7c96a1', soft: '#3f515b', glow: '#aec5ce' },
    { bg: '#181410', bg2: '#0b0908', ink: '#e1d2bb', accent: '#c08a62', soft: '#4d5b54', glow: '#e1b18c' },
    { bg: '#11191a', bg2: '#080d0f', ink: '#ded1bb', accent: '#a86e54', soft: '#3d5052', glow: '#c6a580' }
  ];

  function hashString(value) {
    let hash = 2166136261;
    const text = String(value);
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function mulberry32(seed) {
    let value = seed >>> 0;
    return function random() {
      value = (value + 0x6D2B79F5) >>> 0;
      let result = value;
      result = Math.imul(result ^ (result >>> 15), result | 1);
      result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
      return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
    };
  }

  function round(value) {
    return Math.round(value * 10) / 10;
  }

  function buildVariant(variant, W, H, palette, random, uid) {
    const ink = palette.ink;
    const accent = palette.accent;
    const soft = palette.soft;
    const glow = palette.glow;

    if (variant === 0) {
      const cx = W * (0.57 + random() * 0.18);
      const cy = H * (0.28 + random() * 0.12);
      const radius = Math.min(W, H) * (0.25 + random() * 0.1);
      return `
        <g fill="none" stroke="${ink}">
          <circle cx="${round(cx)}" cy="${round(cy)}" r="${round(radius)}" stroke-opacity=".42"/>
          <circle cx="${round(cx)}" cy="${round(cy)}" r="${round(radius * 1.42)}" stroke-opacity=".2" stroke-dasharray="2 9"/>
          <circle cx="${round(cx - radius * 0.28)}" cy="${round(cy + radius * 0.08)}" r="${round(radius * 0.12)}" stroke-opacity=".4"/>
          <path d="M ${round(W * 0.04)} ${round(H * 0.76)} C ${round(W * 0.24)} ${round(H * 0.54)}, ${round(W * 0.42)} ${round(H * 0.86)}, ${round(W * 0.62)} ${round(H * 0.64)} S ${round(W * 0.84)} ${round(H * 0.48)}, ${round(W * 0.98)} ${round(H * 0.58)}" stroke-opacity=".55"/>
          <path d="M ${round(W * 0.08)} ${round(H * 0.16)} L ${round(W * 0.08)} ${round(H * 0.44)} L ${round(W * 0.26)} ${round(H * 0.44)}" stroke-opacity=".35"/>
          <path d="M ${round(W * 0.82)} ${round(H * 0.15)} l 5 10 10 5 -10 5 -5 10 -5 -10 -10 -5 10 -5z" stroke-opacity=".55"/>
        </g>
        <rect x="${round(W * 0.08)}" y="${round(H * 0.16)}" width="${round(W * 0.18)}" height="${round(H * 0.02)}" fill="${accent}" opacity=".7"/>
        <circle cx="${round(W * 0.79)}" cy="${round(H * 0.7)}" r="3.5" fill="${glow}" opacity=".9"/>
        <circle cx="${round(W * 0.2)}" cy="${round(H * 0.58)}" r="2" fill="${ink}" opacity=".6"/>
        <path d="M ${round(W * 0.08)} ${round(H * 0.84)} H ${round(W * 0.46)}" stroke="${ink}" stroke-opacity=".32"/>
        <path d="M ${round(W * 0.08)} ${round(H * 0.87)} H ${round(W * 0.25)}" stroke="${accent}" stroke-opacity=".6"/>
      `;
    }

    if (variant === 1) {
      const base = H * (0.78 + random() * 0.06);
      const archW = W * (0.24 + random() * 0.06);
      const left = W * (0.16 + random() * 0.08);
      const archH = H * (0.44 + random() * 0.08);
      const sunX = W * (0.68 + random() * 0.08);
      const sunY = H * (0.28 + random() * 0.06);
      return `
        <g fill="none" stroke="${ink}">
          <path d="M ${round(left)} ${round(base)} L ${round(left)} ${round(base - archH)} Q ${round(left)} ${round(base - archH - archW * 0.58)} ${round(left + archW / 2)} ${round(base - archH - archW * 0.58)} Q ${round(left + archW)} ${round(base - archH - archW * 0.58)} ${round(left + archW)} ${round(base - archH)} L ${round(left + archW)} ${round(base)}" stroke-opacity=".48"/>
          <path d="M ${round(left + archW * 0.22)} ${round(base)} L ${round(left + archW * 0.22)} ${round(base - archH * 0.7)} Q ${round(left + archW * 0.22)} ${round(base - archH * 0.7 - archW * 0.32)} ${round(left + archW * 0.5)} ${round(base - archH * 0.7 - archW * 0.32)} Q ${round(left + archW * 0.78)} ${round(base - archH * 0.7 - archW * 0.32)} ${round(left + archW * 0.78)} ${round(base - archH * 0.7)} L ${round(left + archW * 0.78)} ${round(base)}" stroke-opacity=".24"/>
          <path d="M 0 ${round(H * 0.8)} H ${W}" stroke-opacity=".28"/>
          <path d="M ${round(W * 0.62)} ${round(H * 0.08)} V ${round(H * 0.92)}" stroke-opacity=".2"/>
          <path d="M 0 ${round(H * 0.12)} H ${round(W * 0.18)}" stroke-opacity=".38"/>
        </g>
        <circle cx="${round(sunX)}" cy="${round(sunY)}" r="${round(Math.min(W, H) * 0.145)}" fill="${accent}" opacity=".54"/>
        <circle cx="${round(sunX)}" cy="${round(sunY)}" r="${round(Math.min(W, H) * 0.15)}" fill="none" stroke="${glow}" stroke-opacity=".35"/>
        <rect x="${round(W * 0.68)}" y="${round(H * 0.72)}" width="${round(W * 0.19)}" height="${round(H * 0.015)}" fill="${ink}" opacity=".45"/>
        <rect x="${round(W * 0.68)}" y="${round(H * 0.76)}" width="${round(W * 0.11)}" height="${round(H * 0.008)}" fill="${accent}" opacity=".8"/>
        <circle cx="${round(W * 0.83)}" cy="${round(H * 0.18)}" r="2.2" fill="${ink}" opacity=".7"/>
      `;
    }

    if (variant === 2) {
      const top = H * (0.14 + random() * 0.08);
      const fold = W * (0.45 + random() * 0.1);
      return `
        <polygon points="0,${round(top)} ${round(fold)},${round(top + H * 0.12)} ${round(W * 0.58)},${round(H * 0.86)} 0,${round(H * 0.94)}" fill="${soft}" opacity=".28"/>
        <polygon points="${round(W * 0.52)},${round(top + H * 0.04)} ${round(W)},${round(top)} ${round(W)},${round(H * 0.68)} ${round(W * 0.62)},${round(H * 0.78)}" fill="${accent}" opacity=".2"/>
        <path d="M ${round(W * 0.12)} ${round(H * 0.16)} L ${round(W * 0.76)} ${round(H * 0.88)} M ${round(W * 0.28)} 0 L ${round(W * 0.9)} ${round(H * 0.7)}" stroke="${ink}" stroke-opacity=".2"/>
        <path d="M ${round(W * 0.54)} ${round(H * 0.1)} L ${round(W * 0.66)} ${round(H * 0.4)} L ${round(W * 0.58)} ${round(H * 0.62)} L ${round(W * 0.82)} ${round(H * 0.86)}" fill="none" stroke="${ink}" stroke-opacity=".45"/>
        <circle cx="${round(W * 0.32)}" cy="${round(H * 0.38)}" r="${round(Math.min(W, H) * 0.18)}" fill="none" stroke="${glow}" stroke-opacity=".28"/>
        <circle cx="${round(W * 0.32)}" cy="${round(H * 0.38)}" r="${round(Math.min(W, H) * 0.07)}" fill="${accent}" opacity=".58"/>
        <path d="M ${round(W * 0.12)} ${round(H * 0.78)} H ${round(W * 0.38)} M ${round(W * 0.12)} ${round(H * 0.82)} H ${round(W * 0.25)}" stroke="${ink}" stroke-opacity=".36"/>
      `;
    }

    if (variant === 3) {
      const points = Array.from({ length: 7 }, (_, index) => ({
        x: W * (0.12 + random() * 0.78),
        y: H * (0.12 + random() * 0.72),
        r: 1.3 + random() * 2.2
      }));
      const lines = points.slice(0, -1).map((point, index) => {
        const next = points[index + 1];
        return `<line x1="${round(point.x)}" y1="${round(point.y)}" x2="${round(next.x)}" y2="${round(next.y)}" stroke="${ink}" stroke-opacity=".23"/>`;
      }).join('');
      const dots = points.map((point) => `<circle cx="${round(point.x)}" cy="${round(point.y)}" r="${round(point.r)}" fill="${indexColor(point, accent, glow)}"/>`).join('');
      return `
        <rect width="${W}" height="${H}" fill="url(#dots-${uid})" opacity=".55"/>
        <g>${lines}</g>
        <g>${dots}</g>
        <circle cx="${round(W * 0.73)}" cy="${round(H * 0.3)}" r="${round(Math.min(W, H) * 0.24)}" fill="none" stroke="${ink}" stroke-opacity=".22" stroke-dasharray="1 7"/>
        <circle cx="${round(W * 0.73)}" cy="${round(H * 0.3)}" r="${round(Math.min(W, H) * 0.07)}" fill="none" stroke="${accent}" stroke-opacity=".62"/>
        <path d="M ${round(W * 0.1)} ${round(H * 0.88)} H ${round(W * 0.9)}" stroke="${ink}" stroke-opacity=".25"/>
        <path d="M ${round(W * 0.1)} ${round(H * 0.88)} V ${round(H * 0.84)} M ${round(W * 0.9)} ${round(H * 0.88)} V ${round(H * 0.84)}" stroke="${ink}" stroke-opacity=".45"/>
      `;
    }

    const cx = W * (0.63 + random() * 0.1);
    const cy = H * (0.3 + random() * 0.09);
    const radius = Math.min(W, H) * (0.24 + random() * 0.06);
    return `
      <rect x="${round(W * 0.16)}" y="${round(H * 0.2)}" width="${round(W * 0.17)}" height="${round(H * 0.66)}" fill="${soft}" opacity=".34"/>
      <rect x="${round(W * 0.2)}" y="${round(H * 0.26)}" width="${round(W * 0.09)}" height="${round(H * 0.54)}" fill="none" stroke="${ink}" stroke-opacity=".22"/>
      <circle cx="${round(cx)}" cy="${round(cy)}" r="${round(radius)}" fill="${accent}" opacity=".42"/>
      <circle cx="${round(cx)}" cy="${round(cy)}" r="${round(radius * 1.07)}" fill="none" stroke="${glow}" stroke-opacity=".4"/>
      <path d="M 0 ${round(H * 0.74)} H ${W} M ${round(W * 0.5)} ${round(H * 0.1)} V ${round(H * 0.9)}" stroke="${ink}" stroke-opacity=".23"/>
      <path d="M ${round(W * 0.54)} ${round(H * 0.78)} H ${round(W * 0.86)}" stroke="${accent}" stroke-opacity=".7"/>
      <path d="M ${round(W * 0.78)} ${round(H * 0.13)} l 4 8 8 4 -8 4 -4 8 -4 -8 -8 -4 8 -4z" fill="none" stroke="${ink}" stroke-opacity=".5"/>
      <circle cx="${round(W * 0.41)}" cy="${round(H * 0.36)}" r="2" fill="${ink}" opacity=".65"/>
      <circle cx="${round(W * 0.48)}" cy="${round(H * 0.58)}" r="1.5" fill="${glow}" opacity=".8"/>
      <rect x="${round(W * 0.07)}" y="${round(H * 0.86)}" width="${round(W * 0.18)}" height="2" fill="${ink}" opacity=".35"/>
    `;
  }

  function indexColor(point, accent, glow) {
    return point.x > 180 ? glow : accent;
  }

  function cover(seed, kind, hint) {
    const isFolder = kind === 'folder';
    const W = isFolder ? 460 : 360;
    const H = isFolder ? 270 : 520;
    const hash = hashString(seed);
    const hintValue = Number.isFinite(hint) ? Math.abs(Math.trunc(hint)) : 0;
    const random = mulberry32(hash + hintValue * 977);
    const palette = PALETTES[(hash + hintValue * 2 + (isFolder ? 2 : 0)) % PALETTES.length];
    const variant = (Math.floor(random() * 5) + hintValue) % 5;
    const uid = 'art' + (hash % 999999) + '-' + hintValue;
    const layers = buildVariant(variant, W, H, palette, random, uid);
    const cornerSize = isFolder ? 18 : 24;

    return `
      <svg class="generated-art" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="bg-${uid}" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="${palette.bg}"/>
            <stop offset="100%" stop-color="${palette.bg2}"/>
          </linearGradient>
          <radialGradient id="warm-${uid}" cx="78%" cy="22%" r="60%">
            <stop offset="0%" stop-color="${palette.glow}" stop-opacity=".2"/>
            <stop offset="100%" stop-color="${palette.glow}" stop-opacity="0"/>
          </radialGradient>
          <pattern id="dots-${uid}" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="1.2" cy="1.2" r=".8" fill="${palette.ink}" opacity=".28"/>
          </pattern>
          <pattern id="grid-${uid}" width="34" height="34" patternUnits="userSpaceOnUse">
            <path d="M 34 0 L 0 0 0 34" fill="none" stroke="${palette.ink}" stroke-opacity=".08" stroke-width=".7"/>
          </pattern>
        </defs>
        <rect width="${W}" height="${H}" fill="url(#bg-${uid})"/>
        <rect width="${W}" height="${H}" fill="url(#warm-${uid})"/>
        <rect width="${W}" height="${H}" fill="url(#grid-${uid})"/>
        <rect width="${W}" height="${H}" fill="url(#dots-${uid})" opacity=".38"/>
        <g>${layers}</g>
        <g fill="none" stroke="${palette.ink}" stroke-opacity=".22">
          <path d="M 0 ${cornerSize} V 0 H ${cornerSize}"/>
          <path d="M ${W - cornerSize} 0 H ${W} V ${cornerSize}"/>
          <path d="M 0 ${H - cornerSize} V ${H} H ${cornerSize}"/>
          <path d="M ${W - cornerSize} ${H} H ${W} V ${H - cornerSize}"/>
        </g>
        <rect width="${W}" height="${H}" fill="none" stroke="${palette.ink}" stroke-opacity=".08"/>
      </svg>
    `;
  }

  Lexicon.Art = {
    cover,
    hash: hashString
  };
})();
