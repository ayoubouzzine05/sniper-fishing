'use client';

import { useTranslations } from 'next-intl';
import { Button } from './button';
import { IconAlert } from '@/components/layout/icons';

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-10" role="status" aria-live="polite">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-ocean-600 border-t-transparent" />
      <span className="text-sm text-navy-500 dark:text-navy-400">{label}</span>
    </div>
  );
}

export function LoadingState() {
  const t = useTranslations('common');
  return <Spinner label={t('loading')} />;
}

export function ErrorState({
  message,
  onRetry,
  sub
}: {
  message: string;
  onRetry?: () => void;
  sub?: string;
}) {
  const t = useTranslations('errors');
  const tc = useTranslations('common');
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900 dark:bg-red-950/40"
      role="alert"
    >
      <IconAlert className="h-8 w-8 text-red-600 dark:text-red-400" />
      <p className="text-sm font-semibold text-red-800 dark:text-red-200">{message}</p>
      {sub ? <p className="text-xs text-red-700 dark:text-red-300">{sub}</p> : null}
      <p className="text-xs text-red-600/80 dark:text-red-300/70">{t('retryHint')}</p>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry}>
          {tc('retry')}
        </Button>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title,
  action,
  hint
}: {
  title: string;
  action?: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-navy-200 p-8 text-center dark:border-navy-700">
      <p className="text-sm text-navy-600 dark:text-navy-300">{title}</p>
      {hint ? <p className="max-w-sm text-xs text-navy-400 dark:text-navy-500">{hint}</p> : null}
      {action}
    </div>
  );
}
