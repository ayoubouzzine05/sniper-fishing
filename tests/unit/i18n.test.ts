/**
 * i18n tests:
 *  - all 4 locales exist, are valid JSON, and share the SAME key set as en.
 *  - every code-referenced t('...') key exists in en (catches missing keys
 *    that a parity-only check would miss).
 *  - RTL locales are exactly ar + ary; default locale is ary.
 *  - locale-aware formatting (wall dates, numbers, Arabic script for ar/ary).
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { LOCALES, RTL_LOCALES, isRtl, routing } from '@/i18n/routing';
import {
  intlLocale,
  formatNumber,
  formatPercent,
  formatWallTime,
  formatWallDate,
  formatDurationHours,
  formatAge
} from '@/lib/i18n/format';

const LOCALE_FILES: Record<string, Record<string, unknown>> = {};
for (const locale of LOCALES) {
  const file = path.join(__dirname, `../../messages/${locale}.json`);
  LOCALE_FILES[locale] = JSON.parse(fs.readFileSync(file, 'utf8'));
}

function flatKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out.push(...flatKeys(v as Record<string, unknown>, key));
    } else {
      out.push(key);
    }
  }
  return out;
}

describe('locale files', () => {
  it('ships exactly the 4 declared locales; default is ary', () => {
    expect([...LOCALES].sort()).toEqual(['ar', 'ary', 'en', 'fr']);
    expect(routing.defaultLocale).toBe('ary');
  });

  it('every locale has the exact same key set as the canonical en file', () => {
    const en = new Set(flatKeys(LOCALE_FILES.en));
    for (const locale of LOCALES) {
      if (locale === 'en') continue;
      const keys = new Set(flatKeys(LOCALE_FILES[locale]));
      const missing = [...en].filter((k) => !keys.has(k));
      const extra = [...keys].filter((k) => !en.has(k));
      expect(missing, `missing in ${locale}`).toEqual([]);
      expect(extra, `extra in ${locale}`).toEqual([]);
    }
    expect(en.size).toBeGreaterThan(200);
  });

  it('no locale has empty string values', () => {
    for (const locale of LOCALES) {
      const walk = (obj: Record<string, unknown>, p = '') => {
        for (const [k, v] of Object.entries(obj)) {
          const key = p ? `${p}.${k}` : k;
          if (typeof v === 'string') {
            expect(v.trim().length, `${locale}:${key}`).toBeGreaterThan(0);
          } else if (v && typeof v === 'object') {
            walk(v as Record<string, unknown>, key);
          }
        }
      };
      walk(LOCALE_FILES[locale]);
    }
  });

  it('RTL locales are exactly ar and ary; LTR are en and fr', () => {
    expect([...RTL_LOCALES].sort()).toEqual(['ar', 'ary']);
    expect(isRtl('ar')).toBe(true);
    expect(isRtl('ary')).toBe(true);
    expect(isRtl('en')).toBe(false);
    expect(isRtl('fr')).toBe(false);
  });
});

describe('code-referenced keys exist in en (canonical)', () => {
  function collectFiles(): string[] {
    const roots = ['app', 'components'];
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(p);
        else if (/\.(tsx|ts)$/.test(entry.name)) files.push(p);
      }
    };
    for (const r of roots) walk(path.join(__dirname, '../../', r));
    return files;
  }

  it('every static t("...") key used in app/ and components/ resolves', () => {
    const en = new Set(flatKeys(LOCALE_FILES.en));
    const keyRe = /\bt\(\s*['"]([a-zA-Z][\w]*(?:\.[\w]+)+)['"]/g;
    const used = new Set<string>();
    for (const file of collectFiles()) {
      const src = fs.readFileSync(file, 'utf8');
      for (const m of src.matchAll(keyRe)) used.add(m[1]!);
    }

    const missing = [...used].filter((k) => !en.has(k)).sort();
    expect(missing, `keys used in code but missing from en.json: ${missing.join(', ')}`).toEqual([]);
    expect(used.size).toBeGreaterThan(50);
  });

  it('every namespace-scoped bare t("key") resolves against its useTranslations namespace', () => {
    const enRaw = LOCALE_FILES.en;
    const nsKeys = (ns: string): Set<string> | null => {
      const o = ns ? enRaw[ns as keyof typeof enRaw] : enRaw;
      if (!o || typeof o !== 'object') return null;
      return new Set(Object.keys(o as Record<string, unknown>));
    };
    const problems: string[] = [];
    for (const file of collectFiles()) {
      const src = fs.readFileSync(file, 'utf8');
      // (name, namespace, index) — a file may declare the same variable name
      // twice in different component scopes; the declaration nearest BEFORE
      // a usage is the one in scope (good-enough approximation).
      const vars: [string, string, number][] = [];
      for (const m of src.matchAll(/const\s+(\w+)\s*=\s*useTranslations\(\s*(?:'([^']*)')?\s*\)/g)) {
        vars.push([m[1]!, m[2] ?? '', m.index]);
      }
      if (vars.length === 0) continue;
      for (const m of src.matchAll(/(\w+)\(\s*['"]([a-zA-Z][\w]*)['"]\s*\)?/g)) {
        const candidates = vars.filter(([n, , idx]) => n === m[1] && idx < m.index);
        if (candidates.length === 0) continue;
        const v = candidates[candidates.length - 1]!;
        const set = nsKeys(v[1]);
        const nsName = v[1] || '(root)';
        if (!set) {
          problems.push(`${file}: namespace missing: ${nsName}`);
        } else if (!set.has(m[2]!)) {
          problems.push(`${file}: missing ${nsName}.${m[2]}`);
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it('dynamic score explanation keys from the engine exist in score.*', () => {
    const engine = fs.readFileSync(path.join(__dirname, '../../lib/scoring/engine.ts'), 'utf8');
    // Every 'fSomething' string literal in the engine is an explanation key
    // rendered as t(`score.${key}`) — all must exist in en.json.
    const keys = new Set<string>();
    for (const m of engine.matchAll(/'(f[A-Za-z][A-Za-z0-9]*)'/g)) keys.add(m[1]!);
    expect(keys.size).toBeGreaterThan(10);
    const score = LOCALE_FILES.en.score as Record<string, unknown>;
    const missing = [...keys].filter((k) => score[k] == null);
    expect(missing, `missing score keys: ${missing.join(', ')}`).toEqual([]);
  });

  it('safety alert keys from assessSafety exist in safety.*', () => {
    const assess = fs.readFileSync(path.join(__dirname, '../../lib/safety/assess.ts'), 'utf8');
    const keys = new Set<string>();
    for (const m of assess.matchAll(/key:\s*'(a\w+)'/g)) keys.add(m[1]!);
    expect(keys.size).toBeGreaterThanOrEqual(10);
    for (const k of keys) {
      expect((LOCALE_FILES.en.safety as Record<string, unknown>)[k], `missing safety.${k}`).not.toBeNull();
    }
  });

  it('forecast page method description keys (methods.desc*) exist', () => {
    const methods = LOCALE_FILES.en.methods as Record<string, unknown>;
    for (const suffix of [
      'descSurfcasting',
      'descShoreSpinning',
      'descHarbor',
      'descRock',
      'descFloat',
      'descBoat',
      'descKayak'
    ]) {
      expect(methods[suffix], `missing methods.${suffix}`).toBeTypeOf('string');
    }
  });
});

describe('locale-aware formatting', () => {
  it('maps app locales to valid Intl locales', () => {
    expect(intlLocale('ary')).toBe('ar-MA-u-nu-latn');
    expect(intlLocale('ar')).toBe('ar-MA-u-nu-latn');
    expect(intlLocale('fr')).toBe('fr-MA');
    expect(intlLocale('en')).toBe('en-GB');
    // All must be accepted by Intl.
    for (const l of [intlLocale('ary'), intlLocale('ar'), intlLocale('fr'), intlLocale('en')]) {
      expect(() => new Intl.DateTimeFormat(l)).not.toThrow();
    }
  });

  it('formats wall dates (provider-local time) with locale structure', () => {
    const fr = formatWallDate('fr', '2026-10-11T14:30');
    const en = formatWallDate('en', '2026-10-11T14:30');
    expect(fr).not.toBe(en);
    expect(fr).toContain('2026');
    expect(en).toContain('2026');
    expect(formatWallDate('en', null)).toBe('—');
  });

  it('formats wall times without touching a UTC offset', () => {
    expect(formatWallTime('2026-10-11T07:26')).toBe('07:26');
    expect(formatWallTime(null)).toBe('—');
  });

  it('Arabic locales render Arabic-script weekday names; digits stay Latin (ar-MA-u-nu-latn)', () => {
    const ary = formatWallDate('ary', '2026-10-11T14:30', { weekday: true });
    const ar = formatWallDate('ar', '2026-10-11T14:30', { weekday: true });
    expect(ary).toMatch(/[؀-ۿ]/); // contains Arabic script
    expect(ar).toMatch(/[؀-ۿ]/);
    // Latin digits convention (Moroccan practice).
    expect(ary).toContain('11');
    expect(ary).toContain('2026');
  });

  it('numbers and percents are locale-formatted', () => {
    expect(formatNumber('en', 3.14159, 2)).toBe('3.14');
    expect(formatPercent('en', 73.4)).toBe('73%');
    // Moroccan convention: "." thousands separator, Latin digits.
    expect(formatNumber('ary', 1234.5, 0)).toBe('1.235');
    // en-GB uses "," thousands separator — the grouping differs by locale.
    expect(formatNumber('en', 1234.5, 0)).toBe('1,235');
  });

  it('duration and age helpers', () => {
    expect(formatDurationHours('en', 11.1)).toBe('11h 6m');
    expect(formatDurationHours('en', null)).toBe('—');
    expect(formatAge('en', 12)).toBe('12 min');
    expect(formatAge('en', 150)).toBe('2 h');
    expect(formatAge('en', 60 * 48)).toBe('2 d');
  });
});
