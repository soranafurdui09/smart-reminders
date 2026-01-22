"use client";

type TileId = 'overdue' | 'today' | 'soon' | 'meds';

type Tile = {
  id: TileId;
  label: string;
  count: number;
  accentClass: string;
};

export default function StatusTiles({
  tiles,
  onSelect
}: {
  tiles: Tile[];
  onSelect: (id: TileId) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {tiles.map((tile) => (
        <button
          key={tile.id}
          type="button"
          className={`rounded-3xl border border-white/10 bg-[rgba(14,20,33,0.88)] p-4 text-left shadow-[0_20px_45px_rgba(6,12,24,0.35)] ${tile.accentClass}`}
          onClick={() => onSelect(tile.id)}
        >
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{tile.label}</div>
          <div className="mt-1 text-2xl font-semibold text-slate-100">{tile.count}</div>
        </button>
      ))}
    </div>
  );
}
