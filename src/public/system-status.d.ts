export type SystemHealthStatus = "checking" | "ready" | "degraded" | "offline";

export type SystemStatusPresentation = {
  label: string;
  tone: "ok" | "pending" | "error";
  title: string;
};

export function systemStatusPresentation(snapshot?: {
  status?: SystemHealthStatus | string;
  version?: string;
}): SystemStatusPresentation;
