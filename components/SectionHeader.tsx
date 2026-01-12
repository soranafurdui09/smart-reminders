export default function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-4 space-y-1">
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      {description ? <p className="text-sm text-muted">{description}</p> : null}
    </div>
  );
}
