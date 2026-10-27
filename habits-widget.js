// Habits widget for Scriptable — icon-only rings, like Streaks.
// Setup: paste into a new Scriptable script, set KEY below, add a Scriptable widget, choose this script.
// Widget Parameter (optional, long-press widget > Edit Widget > Parameter), e.g.:
//   water,run,stretch           -> only these habits, in this order
//   style=thin;bg=#1c1c1e        -> override CONFIG options
//   water,run;cols=3;style=bold  -> combine
// ===================== CONFIG =====================
const CONFIG = {
  KEY: "PASTE_YOUR_HABIT_KEY",          // your private habit key
  APP: "https://anthonyjonesdavid-cmyk.github.io/hb-6ef8c5a016cd/",
  SUPA: "https://hlsvzfdvvstojztmworm.supabase.co",
  ANON: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhsc3Z6ZmR2dnN0b2p6dG13b3JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MDE3MDQsImV4cCI6MjA5OTM3NzcwNH0.VAJwjJlpCS0-bzP6NCPj4E1rc8yg9PFy3b51n6uvkIY",
  habits: [],            // [] = all habits from the app, in app order. Or e.g. ["sleep","water","run"]
  colors: {},            // override colors per habit id, e.g. { water: "#00c7ff" }
  icons: {},             // override icons: SF Symbol name or letters, e.g. { g: "dumbbell.fill" }
  style: "normal",       // ring thickness: "thin" | "normal" | "bold"
  track: 0.22,           // opacity of the unfilled ring track (0–1)
  fillDone: true,        // tint the inside of a ring when done today
  dimDone: false,        // fade completed habits instead
  bg: "#000000",         // widget background color
  cols: 6,               // columns in medium/large (Streaks uses 6)
  maxSmall: 4,           // habits in the small widget (2x2)
  tapAction: "log",      // "log" = tap opens ?log=<id>; "open" = just open the app
};
// ==================================================
const p = (args.widgetParameter || "").trim();
if (p) for (const part of p.split(";")) {
  const [k, v] = part.split("=").map(s => s && s.trim());
  if (v === undefined) CONFIG.habits = k.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  else if (k in CONFIG) CONFIG[k] = isNaN(+v) || v === "" ? (v === "true" ? true : v === "false" ? false : v) : +v;
}
const fm = FileManager.local(), cache = fm.joinPath(fm.documentsDirectory(), "habits-cache.json");
async function load() {
  try {
    const r = new Request(CONFIG.SUPA + "/rest/v1/rpc/hb_state");
    r.method = "POST"; r.timeoutInterval = 10;
    r.headers = { apikey: CONFIG.ANON, Authorization: "Bearer " + CONFIG.ANON, "Content-Type": "application/json" };
    r.body = JSON.stringify({ k: CONFIG.KEY, days: 8 });
    const j = await r.loadJSON();
    if (!j.habits) throw new Error(j.message || "bad response");
    fm.writeString(cache, JSON.stringify(j)); return j;
  } catch (e) { if (fm.fileExists(cache)) return JSON.parse(fm.readString(cache)); throw e; }
}
function chiDay(t) { return new Date(t).toLocaleDateString("en-CA", { timeZone: "America/Chicago" }); }
function weekStart(dk) { const d = new Date(dk + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7); return d.toISOString().slice(0, 10); }
function progress(h, entries) {
  const t = chiDay(Date.now()), w = weekStart(t);
  const n = entries.filter(e => e.h === h.id && (h.period === "week" ? weekStart(chiDay(e.t)) === w : chiDay(e.t) === t)).length;
  return Math.min(n / (h.target || 1), 1);
}
function ringImage(sz, prog, color) {
  const lw = { thin: 0.07, normal: 0.11, bold: 0.16 }[CONFIG.style] || 0.11;
  const s = sz * 3, w = s * lw, dc = new DrawContext();
  dc.size = new Size(s, s); dc.opaque = false; dc.respectScreenScale = false;
  const c = new Color(color), r = (s - w) / 2, cx = s / 2;
  if (CONFIG.fillDone && prog >= 1) { dc.setFillColor(new Color(color, 0.28)); dc.fillEllipse(new Rect(w / 2, w / 2, s - w, s - w)); }
  dc.setStrokeColor(new Color(color, CONFIG.track)); dc.setLineWidth(w); dc.strokeEllipse(new Rect(w / 2, w / 2, s - w, s - w));
  if (prog > 0) {
    const path = new Path(), steps = Math.max(2, Math.ceil(120 * prog));
    for (let i = 0; i <= steps; i++) {
      const a = -Math.PI / 2 + 2 * Math.PI * prog * i / steps, pt = new Point(cx + r * Math.cos(a), cx + r * Math.sin(a));
      i ? path.addLine(pt) : path.move(pt);
    }
    dc.addPath(path); dc.setStrokeColor(c); dc.setLineWidth(w); dc.strokePath();
    // round caps
    dc.setFillColor(c);
    for (const a of [-Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * prog])
      dc.fillEllipse(new Rect(cx + r * Math.cos(a) - w / 2, cx + r * Math.sin(a) - w / 2, w, w));
  }
  return dc.getImage();
}
function addCell(parent, h, prog, sz) {
  const color = CONFIG.colors[h.id] || h.color, ic = CONFIG.icons[h.id] || h.icon || h.name.slice(0, 2);
  const st = parent.addStack(); st.size = new Size(sz, sz); st.backgroundImage = ringImage(sz, prog, color);
  st.centerAlignContent(); st.layoutHorizontally();
  if (CONFIG.dimDone && prog >= 1) st.backgroundColor = new Color(CONFIG.bg, 0.5);
  st.addSpacer();
  const sym = ic.includes(".") || ic.length > 3 ? SFSymbol.named(ic) : null;
  if (sym) { sym.applyFont(Font.boldSystemFont(sz * 0.36)); const im = st.addImage(sym.image); im.tintColor = new Color(color); im.imageSize = new Size(sz * 0.42, sz * 0.42); }
  else { const t = st.addText(ic); t.font = Font.heavyRoundedSystemFont(ic.length > 1 ? sz * 0.28 : sz * 0.36); t.textColor = new Color(color); t.lineLimit = 1; t.minimumScaleFactor = 0.5; }
  st.addSpacer();
  st.url = CONFIG.tapAction === "log" ? CONFIG.APP + "?log=" + encodeURIComponent(h.id) : CONFIG.APP;
}
async function build(family) {
  const w = new ListWidget(); w.backgroundColor = new Color(CONFIG.bg); w.url = CONFIG.APP;
  let data;
  try { data = await load(); } catch (e) { const t = w.addText("⚠︎"); t.textColor = Color.red(); t.centerAlignText(); return w; }
  let hs = data.habits;
  if (CONFIG.habits.length) hs = CONFIG.habits.map(id => hs.find(h => h.id === id || h.name.toLowerCase() === id)).filter(Boolean);
  const small = family === "small", large = family === "large";
  const cols = small ? 2 : CONFIG.cols;
  if (small) hs = hs.slice(0, CONFIG.maxSmall); else if (!large) hs = hs.slice(0, cols * 2);
  const rows = Math.ceil(hs.length / cols);
  // widget point sizes (approx, iPhone 6.1–6.7")
  const W = small ? 158 : 338, H = large ? 354 : 158, pad = small ? 14 : 12, gap = small ? 10 : 8;
  const sz = Math.floor(Math.min((W - pad * 2 - gap * (cols - 1)) / cols, (H - pad * 2 - gap * (Math.max(rows, 2) - 1)) / Math.max(rows, large ? 4 : 2)));
  w.setPadding(pad, pad, pad, pad);
  w.addSpacer();
  for (let r = 0; r < rows; r++) {
    const row = w.addStack(); row.layoutHorizontally(); row.addSpacer();
    for (let c = 0; c < cols; c++) {
      const h = hs[r * cols + c];
      if (h) addCell(row, h, progress(h, data.entries), sz); else { const e = row.addStack(); e.size = new Size(sz, sz); }
      row.addSpacer(c < cols - 1 ? gap : null);
    }
    if (r < rows - 1) w.addSpacer(gap);
  }
  w.addSpacer();
  w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000);
  return w;
}
const fam = config.widgetFamily || "medium";
const widget = await build(fam);
if (config.runsInWidget) Script.setWidget(widget);
else { fam === "small" ? widget.presentSmall() : fam === "large" ? widget.presentLarge() : widget.presentMedium(); }
Script.complete();
