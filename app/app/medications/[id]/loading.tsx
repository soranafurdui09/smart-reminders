export default function LoadingMedicationDetail() {
  return (
    <div className="space-y-6 pb-24">
      <div className="space-y-2">
        <div className="h-6 w-40 rounded-2xl bg-surface3 animate-pulse" />
        <div className="h-4 w-56 rounded-2xl bg-surface3/70 animate-pulse" />
      </div>
      {[0, 1, 2].map((index) => (
        <div key={index} className="card space-y-3">
          <div className="h-4 w-32 rounded-2xl bg-surface3 animate-pulse" />
          <div className="h-3 w-full rounded-2xl bg-surface3/70 animate-pulse" />
          <div className="h-3 w-3/4 rounded-2xl bg-surface3/70 animate-pulse" />
        </div>
      ))}
    </div>
  );
}
