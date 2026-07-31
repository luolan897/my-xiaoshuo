const supportedSystemStatuses = new Set(["checking", "ready", "degraded", "offline"]);

export function systemStatusPresentation(snapshot = {}) {
  const status = supportedSystemStatuses.has(snapshot.status) ? snapshot.status : "checking";
  const version = String(snapshot.version ?? "").trim();
  if (status === "ready") {
    return {
      label: "就绪",
      tone: "ok",
      title: version ? `服务连接正常 · v${version}` : "服务连接正常"
    };
  }
  if (status === "degraded") return { label: "服务异常", tone: "error", title: "服务可访问，但请求出现异常" };
  if (status === "offline") return { label: "连接中断", tone: "error", title: "无法连接到本地服务，系统将自动重试" };
  return { label: "检测中", tone: "pending", title: "正在检查本地服务状态" };
}
