type PixelFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  hideLabel?: boolean;
};

export const PixelField = ({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  hideLabel,
}: PixelFieldProps) => {
  return (
    <label className="flex flex-col gap-1">
      <span className={hideLabel ? 'sr-only' : 'text-xs text-white/80 font-pixel'}>{label}</span>
      <input
        className="w-full font-pixel text-sm border-2 border-white/60 bg-black/40 px-3 py-2 text-white placeholder:text-white/40 outline-none focus:border-white transition-colors"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
      />
    </label>
  );
};
