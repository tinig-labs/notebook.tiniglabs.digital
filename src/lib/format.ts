export const fmtDuration = (ms: number) => {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export const fmtDate = (t: number) => new Date(t).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
export const fmtDay = (t: number) =>
  new Date(t).toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
export const fmtTime = (t: number) => new Date(t).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
export const dayKey = (t: number) => new Date(t).toLocaleDateString("en-CA");

export const age = (birthYear?: number) => (birthYear ? `${new Date().getFullYear() - birthYear} y` : null);

/** Safe for file names on every OS. */
export const slug = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "untitled";
