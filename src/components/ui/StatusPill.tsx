import { STATUS_LABEL, STATUS_PILL, type ItemStatus } from "./tokens";

type Props = {
  status: ItemStatus | string;
  size?: "sm" | "md";
};

export function StatusPill({ status, size = "sm" }: Props) {
  const key = (status in STATUS_LABEL ? status : "sourced") as ItemStatus;
  const tone = STATUS_PILL[key];
  const padding = size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[11px]";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${tone.bg} ${tone.fg} ${padding}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} aria-hidden />
      {STATUS_LABEL[key]}
    </span>
  );
}
