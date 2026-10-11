import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes
} from 'react';

export function Field({
  label,
  children,
  hint,
  error,
  group = false
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  error?: string | null;
  /**
   * For multi-control groups (e.g. chip buttons): use an aria group instead
   * of a <label> — a wrapping label would leak its text (and the siblings'
   * text) into the accessible name of the first button inside it.
   */
  group?: boolean;
}) {
  // Single-control fields use a wrapping <label>: screen readers announce
  // the label and label clicks focus/activate the control.
  return (
    <div>
      {group ? (
        <div role="group" aria-label={label} className="label-base block">
          <span className="block">{label}</span>
          <span className="mt-1.5 block">{children}</span>
        </div>
      ) : (
        <label className="label-base block">
          <span className="block">{label}</span>
          <span className="mt-1.5 block">{children}</span>
        </label>
      )}
      {hint ? <p className="mt-1 text-xs text-navy-500 dark:text-navy-400">{hint}</p> : null}
      {error ? (
        <p className="mt-1 text-xs font-semibold text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`input-base ${props.className ?? ''}`} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`input-base min-h-[80px] ${props.className ?? ''}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`input-base ${props.className ?? ''}`} />;
}
