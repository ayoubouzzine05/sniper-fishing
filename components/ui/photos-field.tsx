'use client';

/**
 * Reusable photo picker for spots and sessions.
 * Photos are kept locally as data URLs; each file is capped at 500 KB
 * (enforced here — the persistence boundary only sanity-checks size).
 */
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { IconPlus, IconX } from '@/components/layout/icons';

const MAX_PHOTO_BYTES = 500 * 1024;

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

export function PhotosField({
  photos,
  onChange,
  label,
  max = 4,
  testId
}: {
  photos: string[];
  onChange: (photos: string[]) => void;
  label: string;
  max?: number;
  testId?: string;
}) {
  const t = useTranslations();
  const [error, setError] = useState<string | null>(null);

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    // Copy the files BEFORE resetting the input: FileList is a live object
    // and clears as soon as the value is reset.
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;
    const next = [...photos];
    let tooLarge = false;
    let reachedMax = false;
    for (const f of files) {
      if (next.length >= max) {
        reachedMax = true;
        break;
      }
      if (f.size > MAX_PHOTO_BYTES) {
        tooLarge = true;
        continue;
      }
      next.push(await readFile(f));
    }
    if (next.length !== photos.length) onChange(next);
    setError(tooLarge ? t('photos.tooLarge') : reachedMax ? t('photos.max', { count: max }) : null);
  }

  return (
    <div className="space-y-1.5">
      <span className="label-base block">{label}</span>
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-dashed border-navy-300 px-3 py-1.5 text-xs font-semibold text-navy-600 transition-colors hover:border-ocean-500 hover:text-ocean-600 dark:border-navy-600 dark:text-navy-300 dark:hover:border-ocean-500 dark:hover:text-ocean-400">
          <IconPlus className="h-4 w-4" />
          {t('photos.add')}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            data-testid={testId}
            onChange={(e) => void onFiles(e)}
          />
        </label>
        {photos.map((p, i) => (
          <span key={`${i}-${p.slice(-16)}`} className="relative">
            <img
              src={p}
              alt=""
              className="h-14 w-14 rounded-lg border border-navy-200 object-cover dark:border-navy-700"
            />
            <button
              type="button"
              onClick={() => onChange(photos.filter((_, j) => j !== i))}
              aria-label={t('photos.remove')}
              className="absolute -end-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-navy-900/90 text-white shadow"
            >
              <IconX className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      {error ? (
        <p className="text-xs font-semibold text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
