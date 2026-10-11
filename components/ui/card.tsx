import type { ReactNode } from 'react';

export function Card({
  children,
  className = '',
  as: Tag = 'div'
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article';
}) {
  return (
    <Tag
      className={`rounded-xl border border-navy-100 bg-white shadow-card
        dark:border-navy-800 dark:bg-navy-900 ${className}`}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({
  title,
  subtitle,
  action
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-navy-100 px-4 py-3 dark:border-navy-800">
      <div className="min-w-0">
        <h2 className="text-sm font-bold text-navy-900 dark:text-navy-50">{title}</h2>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-navy-500 dark:text-navy-400">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function CardBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`p-4 ${className}`}>{children}</div>;
}
