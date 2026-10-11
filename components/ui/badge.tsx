import type { ReactNode } from 'react';

type Tone = 'neutral' | 'good' | 'warn' | 'bad' | 'info' | 'danger';

const TONES: Record<Tone, string> = {
  neutral:
    'bg-navy-100 text-navy-700 dark:bg-navy-800 dark:text-navy-200',
  good: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
  warn: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
  bad: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
  info: 'bg-ocean-100 text-ocean-800 dark:bg-ocean-900/50 dark:text-ocean-200',
  danger: 'bg-red-600 text-white'
};

export function Badge({
  children,
  tone = 'neutral',
  className = ''
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function safetyTone(status: string): Tone {
  switch (status) {
    case 'favorable':
      return 'good';
    case 'caution':
      return 'warn';
    case 'unfavorable':
      return 'bad';
    case 'dangerous':
      return 'danger';
    default:
      return 'neutral';
  }
}
