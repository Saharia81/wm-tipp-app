// Mobile-friendly labeled input used on /login and /register.
export function AuthField({
  label,
  name,
  type = "text",
  autoComplete,
  defaultValue,
  required = true,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-white/80">{label}</span>
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        required={required}
        className="h-12 px-4 rounded-xl bg-white/10 border border-white/15 placeholder-white/40 text-white text-base focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
      />
    </label>
  );
}
