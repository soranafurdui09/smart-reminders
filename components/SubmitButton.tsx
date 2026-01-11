'use client';

import { useFormStatus } from 'react-dom';

export default function SubmitButton({
  label,
  loading,
  className = 'btn btn-primary w-full'
}: {
  label: string;
  loading: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button className={className} type="submit" disabled={pending}>
      {pending ? loading : label}
    </button>
  );
}
