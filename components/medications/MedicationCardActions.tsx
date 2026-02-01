"use client";

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Pencil, Trash2 } from 'lucide-react';
import { deleteMedication } from '@/app/app/medications/actions';

export default function MedicationCardActions({
  medicationId,
  editHref,
  labels
}: {
  medicationId: string;
  editHref: string;
  labels: {
    edit: string;
    delete: string;
    confirmDelete: string;
    deleteError: string;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    if (pending) return;
    if (typeof window !== 'undefined') {
      const confirmDelete = window.confirm(labels.confirmDelete);
      if (!confirmDelete) return;
    }
    setError(null);
    startTransition(async () => {
      const result = await deleteMedication(medicationId);
      if (!result?.ok) {
        setError(labels.deleteError);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Link
        href={editHref}
        className="icon-btn h-9 w-9"
        aria-label={labels.edit}
        title={labels.edit}
      >
        <Pencil className="h-4 w-4" />
      </Link>
      <button
        type="button"
        className="icon-btn h-9 w-9 border border-rose-500/30 bg-[color:rgba(244,63,94,0.12)] text-rose-200"
        aria-label={labels.delete}
        title={labels.delete}
        onClick={handleDelete}
        disabled={pending}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      </button>
      {error ? <span className="text-xs text-rose-200">{error}</span> : null}
    </div>
  );
}
