type PixelSelectProps<TValue extends string | number> = {
  label: string;
  value: TValue;
  onChange: (value: TValue) => void;
  options: readonly TValue[];
  formatValue: (value: TValue) => string;
  hideLabel?: boolean;
};

export const PixelSelect = <TValue extends string | number>({
  label,
  value,
  onChange,
  options,
  formatValue,
  hideLabel,
}: PixelSelectProps<TValue>) => {
  return (
    <label className="flex flex-col gap-1">
      <span className={hideLabel ? 'sr-only' : 'text-xs text-white/80 font-pixel'}>{label}</span>
      <select
        className="appearance-none w-full font-pixel text-sm border-2 border-white/60 bg-black/40 px-3 py-2 text-white outline-none focus:border-white transition-colors cursor-pointer"
        value={String(value)}
        onChange={(e) => {
          const next = options.find((opt) => String(opt) === e.target.value);
          if (next !== undefined) onChange(next);
        }}
      >
        {options.map((opt) => (
          <option key={String(opt)} value={String(opt)} className="text-black bg-white font-pixel">
            {formatValue(opt)}
          </option>
        ))}
      </select>
    </label>
  );
};
