import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const STYLES: Record<Variant, string> = {
  primary:
    'bg-ocean-600 text-white hover:bg-ocean-700 active:bg-ocean-800 disabled:bg-ocean-600/50',
  secondary:
    'border border-navy-200 bg-white text-navy-800 hover:bg-navy-50 dark:border-navy-700 dark:bg-navy-900 dark:text-navy-100 dark:hover:bg-navy-800',
  ghost:
    'text-navy-700 hover:bg-navy-100 dark:text-navy-200 dark:hover:bg-navy-800',
  danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800'
};

export function Button({
  children,
  variant = 'primary',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; children: ReactNode }) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold
        transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500
        disabled:cursor-not-allowed disabled:opacity-60 ${STYLES[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
