export default function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      {description ? <p className="text-sm text-slate-500">{description}</p> : null}
    </div>
  );
}
