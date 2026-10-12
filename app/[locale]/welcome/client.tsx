'use client';

/**
 * First-launch onboarding: language selection (4 languages shown in their
 * own scripts) + what the app does + entry to the dashboard.
 */
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import Logo from '@/components/layout/logo';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/lib/hooks/use-settings';
import type { AppLanguage } from '@/lib/models/types';

const LOCALES: AppLanguage[] = ['ary', 'ar', 'fr', 'en'];

const HIGHLIGHTS: Record<AppLanguage, string[]> = {
  ary: [
    'كيف داير البحر اليوم؟ الريح، الموج، الهول',
    'نتيجة ملاءمة الصيد + تقييم السلامة قبل كل جولة',
    'سجّل بلاصت ديالك و شنو صدتي — الإحصائيات من بياناتك فقط'
  ],
  ar: [
    'كيف هو البحر اليوم؟ الريح، الموج، الهول',
    'درجة ملاءمة الصيد + تقييم السلامة قبل كل جلسة',
    'احفظ مواضعك وسجل صيدك — التحليلات من بياناتك فقط'
  ],
  fr: [
    "Comment est la mer aujourd'hui ? Vent, houle, vagues",
    "Indice de pêche + évaluation de sécurité avant chaque sortie",
    'Enregistrez vos zones et vos captures — analyses sur vos données uniquement'
  ],
  en: [
    'How is the sea today? Wind, swell, waves',
    'Suitability score + safety assessment before every session',
    'Save your spots and log your catches — analytics from your records only'
  ]
};

export default function WelcomePage() {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const { update } = useSettings();
  const [choice, setChoice] = useState<AppLanguage>('ary');

  // Await persistence BEFORE navigating: otherwise the next page can read
  // the defaults (onboarding not done) and bounce back to this screen.
  // A locale change swaps the root <html>, so Next performs a full document
  // load anyway — do it explicitly: the previous page is guaranteed fully
  // settled (settings persisted) before the new document starts loading.
  async function go(next: AppLanguage) {
    await update({ language: next, onboardingDone: true });
    window.location.assign(`/${next}`);
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 py-8">
      <Logo size={88} />
      <div className="text-center">
        <h1 className="text-2xl font-extrabold">{t('onboarding.title')}</h1>
        <p className="mt-1 text-sm text-navy-500 dark:text-navy-400">{t('onboarding.subtitle')}</p>
      </div>

      <div className="w-full rounded-2xl border border-navy-100 bg-white p-4 shadow-card dark:border-navy-800 dark:bg-navy-900">
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t('settings.language')}>
          {LOCALES.map((l) => (
            <button
              key={l}
              role="radio"
              aria-checked={choice === l}
              dir="auto"
              onClick={() => setChoice(l)}
              className={`rounded-xl border px-3 py-4 text-base font-bold transition
                ${
                  choice === l
                    ? 'border-ocean-500 bg-ocean-50 text-ocean-800 shadow dark:bg-ocean-900/40 dark:text-ocean-200'
                    : 'border-navy-200 bg-white text-navy-700 hover:border-ocean-400 dark:border-navy-700 dark:bg-navy-900 dark:text-navy-200'
                }`}
            >
              {t(`langNames.${l}`)}
            </button>
          ))}
        </div>

        <ul className="mt-4 space-y-1.5 text-sm text-navy-600 dark:text-navy-300">
          {HIGHLIGHTS[choice].map((h, i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden className="text-ocean-600">✓</span>
              <span>{h}</span>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-xs text-navy-400">{t('onboarding.note')}</p>

        <Button className="mt-4 w-full" onClick={() => void go(choice)}>
          {t('onboarding.continue')}
        </Button>
      </div>
    </div>
  );
}
