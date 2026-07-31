function validDate(value) {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function pad(value) {
  return String(value).padStart(2, "0");
}

export function formatAiMessageTime(createdAt) {
  const created = validDate(createdAt);
  if (!created) return "";
  const date = `${pad(created.getMonth() + 1)}-${pad(created.getDate())}`;
  const time = `${pad(created.getHours())}:${pad(created.getMinutes())}`;
  return `${date} ${time}`;
}
