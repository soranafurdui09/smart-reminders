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
          className={`rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm ${tile.accentClass}`}
          onClick={() => onSelect(tile.id)}
        >
          <div className="text-xs font-semibold uppercase text-slate-500">{tile.label}</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">{tile.count}</div>
        </button>
      ))}
    </div>
  );
}
