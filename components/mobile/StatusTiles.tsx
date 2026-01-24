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
          className={`premium-card p-4 text-left ${tile.accentClass}`}
          onClick={() => onSelect(tile.id)}
        >
          <div className="text-[11px] font-semibold uppercase tracking-wide text-tertiary">{tile.label}</div>
          <div className="mt-1 text-2xl font-semibold text-primary">{tile.count}</div>
        </button>
      ))}
    </div>
  );
}
