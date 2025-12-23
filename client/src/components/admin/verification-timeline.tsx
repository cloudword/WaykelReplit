import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface VerificationLogEntry {
  id?: string;
  entityType: string;
  entityId: string;
  action: string;
  reason?: string | null;
  performedBy: string;
  performedByName?: string | null;
  performedByEmail?: string | null;
  performedAt: string;
  meta?: Record<string, unknown> | null;
}

interface VerificationTimelineProps {
  logs?: VerificationLogEntry[];
  loading?: boolean;
  emptyMessage?: string;
}

const ACTION_STYLES: Record<string, { label: string; dot: string; text: string }> = {
  approved: { label: "Approved", dot: "border-green-500 bg-green-50", text: "text-green-700" },
  rejected: { label: "Rejected", dot: "border-red-500 bg-red-50", text: "text-red-700" },
  flagged: { label: "Flagged", dot: "border-amber-500 bg-amber-50", text: "text-amber-700" },
  unflagged: { label: "Unflagged", dot: "border-blue-500 bg-blue-50", text: "text-blue-700" },
  pending: { label: "Pending", dot: "border-gray-500 bg-white", text: "text-gray-700" },
  default: { label: "Updated", dot: "border-gray-400 bg-white", text: "text-gray-700" },
};

const prettifyKey = (key: string) =>
  key
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatMetaValue = (value: unknown) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const formatTimestamp = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export function VerificationTimeline({ logs, loading, emptyMessage = "No verification activity yet." }: VerificationTimelineProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading timeline...
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return <p className="text-sm text-gray-500">{emptyMessage}</p>;
  }

  return (
    <div className="relative pl-4">
      <div className="absolute left-1 top-2 bottom-2 w-px bg-gray-200" />
      <div className="space-y-4">
        {logs.map((log, index) => {
          const meta = ACTION_STYLES[log.action] ?? ACTION_STYLES.default;
          const performerLabel = log.performedByName || `Admin ${log.performedBy.slice(0, 6)}`;
          const timestamp = formatTimestamp(log.performedAt);
          const metaEntries = Object.entries(log.meta ?? {}).filter(([, value]) => value !== null && value !== undefined && value !== "");

          return (
            <div key={log.id ?? `${log.action}-${index}`} className="relative pl-6">
              <span
                className={cn(
                  "absolute left-0 top-[6px] h-3 w-3 rounded-full border-2",
                  meta.dot
                )}
              />
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className={cn("font-semibold uppercase tracking-wide", meta.text)}>{meta.label}</span>
                {timestamp && <span className="text-gray-500">{timestamp}</span>}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                By {performerLabel}
                {log.performedByEmail && <span className="text-gray-400 ml-1">({log.performedByEmail})</span>}
              </p>
              {log.reason && <p className="text-xs text-gray-700 mt-1">Reason: {log.reason}</p>}
              {metaEntries.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {metaEntries.map(([key, value]) => (
                    <span key={`${key}-${String(value)}`} className="text-[11px] uppercase tracking-wide bg-gray-100 text-gray-600 px-2 py-1 rounded-md">
                      {prettifyKey(key)}: {formatMetaValue(value)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
