'use client';

/** Dual-handle range built from two overlaid native range inputs (keyboard + touch friendly). */
export function RangeSlider({
  min,
  max,
  step = 0.1,
  value,
  onChange,
  labelMin,
  labelMax,
}: {
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onChange: (v: [number, number]) => void;
  labelMin: string;
  labelMax: string;
}) {
  const span = max - min;
  const left = ((value[0] - min) / span) * 100;
  const right = ((value[1] - min) / span) * 100;
  return (
    <div className="range">
      <div className="range__track" />
      <div className="range__fill" style={{ left: `${left}%`, right: `${100 - right}%` }} />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value[0]}
        aria-label={labelMin}
        onChange={(e) => onChange([Math.min(Number(e.target.value), value[1]), value[1]])}
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value[1]}
        aria-label={labelMax}
        onChange={(e) => onChange([value[0], Math.max(Number(e.target.value), value[0])])}
      />
    </div>
  );
}
