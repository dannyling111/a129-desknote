/* global DESKNOTE */
(function () {
  const D = window.DESKNOTE;
  const ESC = { "&": "&" + "amp;", "<": "&" + "lt;", ">": "&" + "gt;", '"': "&" + "quot;", "'": "&#39;" };
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ESC[c]);
  const $app = () => document.getElementById("app");

  function confTone(c) {
    return c === "high" ? "good" : c === "medium" ? "warn" : c === "low" ? "bad" : "";
  }
  function fmtAxis(n, format) {
    if (format === "percent" || format === "signed") {
      const s = n > 0 && format === "signed" ? "+" : "";
      return s + (Number.isInteger(n) ? n : n.toFixed(1)) + "%";
    }
    if (format === "bps") return n + "bp";
    if (format === "year") return String(Math.round(n));
    if (format === "index") return Number(n).toLocaleString("zh-CN");
    return Number.isInteger(n) ? String(n) : n.toFixed(1);
  }
  function xOf(v, min, max, x0, x1) {
    const t = (v - min) / (max - min);
    return x0 + Math.min(1, Math.max(0, t)) * (x1 - x0);
  }
  function linked(q) {
    return (q.calls || []).filter((c) => c.href && q.chart !== "none");
  }
  function lanesFor(xs, gap) {
    const used = [];
    return xs.map((x) => {
      let lane = 0;
      while ((used[lane] || []).some((px) => Math.abs(px - x) < gap)) lane += 1;
      (used[lane] = used[lane] || []).push(x);
      return lane;
    });
  }
  function pubDay(iso) {
    const p = String(iso || "").slice(0, 10).split("-");
    if (p.length < 3 || !p[1] || !p[2]) return String(iso || "");
    return Number(p[1]) + "-" + Number(p[2]);
  }
  function railSVG(q, calls) {
    if (!calls.length) return "";
    const W = 760, x0 = 110, x1 = W - 110, ax = q.axisX;
    const xs = calls.map((c) => xOf(c.x, ax.min, ax.max, x0, x1));
    const lanes = lanesFor(xs, 108);
    const maxLane = Math.max(0, ...lanes);
    const y = 28 + (maxLane + 1) * 52;
    const H = y + 36;
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => {
      const x = x0 + t * (x1 - x0);
      const v = ax.min + t * (ax.max - ax.min);
      return "<g><line x1='" + x + "' y1='" + (y - 4) + "' x2='" + x + "' y2='" + (y + 4) + "' stroke='var(--subtle)' />" +
        "<text x='" + x + "' y='" + (y + 18) + "' text-anchor='middle' fill='var(--subtle)' font-size='10' font-family='IBM Plex Mono,monospace'>" +
        esc(fmtAxis(v, ax.format)) + "</text></g>";
    }).join("");
    const dots = calls.map((c, i) => {
      const x = xs[i];
      const top = y - 14 - lanes[i] * 52;
      const anchor = x < 180 ? "start" : x > W - 180 ? "end" : "middle";
      const tx = anchor === "start" ? x + 8 : anchor === "end" ? x - 8 : x;
      return "<a href='" + esc(c.href) + "' target='_blank' rel='noreferrer'>" +
        "<line x1='" + x + "' y1='" + (top + 2) + "' x2='" + x + "' y2='" + y + "' stroke='var(--border)' />" +
        "<circle cx='" + x + "' cy='" + y + "' r='5' fill='var(--fg)' />" +
        "<text x='" + tx + "' y='" + (top - 30) + "' text-anchor='" + anchor + "' fill='var(--fg)' font-size='11'>" + esc(c.org) + "</text>" +
        "<text x='" + tx + "' y='" + (top - 16) + "' text-anchor='" + anchor + "' fill='var(--fg)' font-size='11' font-family='IBM Plex Mono,monospace'>" + esc(c.label) + "</text>" +
        "<text x='" + tx + "' y='" + (top - 3) + "' text-anchor='" + anchor + "' fill='var(--muted)' font-size='9'>预测 " + esc(c.forWhen || "") + " · 发布 " + esc(pubDay(c.asOf)) + "</text></a>";
    }).join("");
    return "<div class='quad-wrap' style='overflow-x:auto'><svg viewBox='0 0 " + W + " " + H + "' width='100%' style='min-width:640px;height:" + Math.max(168, Math.round(H * 0.72)) + "px'>" +
      "<line x1='" + x0 + "' y1='" + y + "' x2='" + x1 + "' y2='" + y + "' stroke='var(--border)' stroke-width='2' />" +
      ticks + dots + "</svg></div>";
  }
  function quadSVG(calls) {
    const pts = calls.filter((c) => c.y != null);
    if (!pts.length) return "";
    const S = 560, pad = 28, mid = S / 2;
    const xy = (x, y) => {
      const px = pad + ((x - -1) / 2) * (S - pad * 2);
      const py = pad + ((1 - y) / 2) * (S - pad * 2);
      return [px, py];
    };
    const dots = pts.map((c) => {
      const [px, py] = xy(c.x, c.y);
      const above = py > pad + 78;
      const ty = above ? py - 34 : py + 18;
      return "<a href='" + esc(c.href) + "' target='_blank' rel='noreferrer'>" +
        "<circle cx='" + px + "' cy='" + py + "' r='6' fill='var(--fg)' />" +
        "<text x='" + px + "' y='" + ty + "' text-anchor='middle' fill='var(--fg)' font-size='12'>" + esc(c.org + " · " + c.label) + "</text>" +
        "<text x='" + px + "' y='" + (ty + 14) + "' text-anchor='middle' fill='var(--muted)' font-size='10'>预测 " + esc(c.forWhen || "") + "</text>" +
        "<text x='" + px + "' y='" + (ty + 26) + "' text-anchor='middle' fill='var(--subtle)' font-size='10' font-family='IBM Plex Mono,monospace'>发布 " + esc(pubDay(c.asOf)) + "</text></a>";
    }).join("");
    return "<div class='quad-wrap'><svg viewBox='0 0 " + S + " " + S + "' width='100%' style='max-width:560px'>" +
      "<line x1='" + mid + "' y1='" + pad + "' x2='" + mid + "' y2='" + (S - pad) + "' stroke='var(--border)' />" +
      "<line x1='" + pad + "' y1='" + mid + "' x2='" + (S - pad) + "' y2='" + mid + "' stroke='var(--border)' />" +
      "<text x='" + (pad + 8) + "' y='" + (pad + 16) + "' fill='var(--subtle)' font-size='11'>Q3 增长↓通胀↑ · 金 / 现金</text>" +
      "<text x='" + (mid + 8) + "' y='" + (pad + 16) + "' fill='var(--subtle)' font-size='11'>Q2 增长↑通胀↑ · 商品</text>" +
      "<text x='" + (pad + 8) + "' y='" + (S - pad - 8) + "' fill='var(--subtle)' font-size='11'>Q4 增长↓通胀↓ · 久期</text>" +
      "<text x='" + (mid + 8) + "' y='" + (S - pad - 8) + "' fill='var(--subtle)' font-size='11'>Q1 增长↑通胀↓ · 股票</text>" +
      "<text x='" + (S - pad) + "' y='" + (mid - 8) + "' text-anchor='end' fill='var(--subtle)' font-size='10'>增长 →</text>" +
      "<text x='" + (mid - 8) + "' y='" + (pad + 28) + "' text-anchor='end' fill='var(--subtle)' font-size='10'>通胀 ↑</text>" +
      dots + "</svg></div>";
  }
  function chartFor(q) {
    if (!q || q.chart === "none") return "";
    const calls = linked(q);
    if (!calls.length) return "";
    const order = [];
    const map = {};
    calls.forEach((c) => {
      const w = c.window || "";
      if (!map[w]) { map[w] = []; order.push(w); }
      map[w].push(c);
    });
    const split = order.filter(Boolean).length > 1;
    return order.map((w) => {
      const group = map[w];
      const svg = q.chart === "quad" && q.axisY ? quadSVG(group) : railSVG(q, group);
      const head = split ? "<p class='kicker' style='margin:12px 0 6px'>预测窗口 · " + esc(w) + "</p>" : "";
      return head + svg;
    }).join("");
  }
  function cellHtml(cell) {
    if (!cell || !cell.text) return "<span class='empty-cell'>—</span>";
    if (cell.qId) return "<a href='#/forecast/" + esc(cell.qId) + "'>" + esc(cell.text) + "</a>";
    return esc(cell.text);
  }
  function aiStrip() {
    const slots = (D.forecast && D.forecast.aiSlots) || [];
    if (!slots.length) return "";
    return "<div class='stats' style='grid-template-columns:repeat(5,1fr)'>" + slots.map((s) => {
      const inner = "<span>" + esc(s.lane) + "</span><b style='font-size:13px;font-family:IBM Plex Sans,sans-serif'>" +
        (s.fact ? esc(s.org) + " · " + esc(s.fact) : "空着") + "</b>";
      return s.href ? "<a class='stat' href='" + esc(s.href) + "' target='_blank' rel='noreferrer'>" + inner + "</a>" : "<div class='stat'>" + inner + "</div>";
    }).join("") + "</div>";
  }

  window.renderForecast = function renderForecast() {
    const F = D.forecast;
    if (!F) { $app().innerHTML = "<p class='lead'>预测数据还没导出。</p>"; return; }
    const H = F.headline || {};
    const byId = Object.fromEntries((F.questions || []).map((q) => [q.id, q]));
    const layers = (F.pyramid || []).map((layer) => {
      const blocks = (layer.qIds || []).map((id) => {
        const q = byId[id];
        if (!q) return "";
        const n = linked(q).length;
        const chart = chartFor(q);
        return "<article style='margin-top:28px'><h3 style='font-family:Newsreader,Georgia,serif;font-weight:500;margin:0'>" +
          "<a href='#/forecast/" + esc(q.id) + "'>" + String(q.n).padStart(2, "0") + " " + esc(q.title) + "</a></h3>" +
          "<p class='muted' style='font-size:14px'>" + esc(q.question) + "</p>" +
          (chart ? chart + "<p class='subtle' style='font-size:12px'>" + (q.chart === "quad" ? "增长×通胀只收写明了象限的机构。当前和下一阶段拆开。点一下打开原文。" : esc(q.axisX.label) + "。期限不同就拆成上下两张。点一下打开原文。") + "</p>"
            : "<p class='muted' style='border:1px dashed var(--border);border-radius:12px;padding:12px'>" + esc(q.desk && q.desk.filled ? q.desk.label : "这一问还空着。") + " " + esc(q.seeking || "") + "</p>") +
          "</article>";
      }).join("");
      return "<section id='layer-" + esc(layer.id) + "' style='margin-top:48px'><p class='kicker'>" + esc(layer.id) + "</p>" +
        "<h2 style='font-family:Newsreader,Georgia,serif;font-weight:500;margin:4px 0'>" + esc(layer.name) + "</h2>" +
        "<p class='muted'>" + esc(layer.one) + "</p>" +
        (layer.id === "T1" ? aiStrip() : "") + blocks + "</section>";
    }).join("");
    $app().innerHTML =
      "<p class='kicker'>Investment engine</p>" +
      "<h1>先看层，再看尺子</h1>" +
      "<p class='lead'>经济按五层往下传。图上只放能点开原文的机构点，点上写清预测到什么时候、哪天发的。增长×通胀是唯一的平面，而且只收明确写成象限的观点。估值和点位走横轴。</p>" +
      "<p class='subtle mono' style='font-size:12px'>截至 " + esc(F.asOf) + " · 本台填了 " + (H.filled || "") + " · 空着 " + (H.empty || "") + " · 可点开的点 " + (H.evidence || "") + "</p>" +
      "<div class='stats'>" + (F.pyramid || []).map((layer) =>
        "<a class='stat' href='#layer-" + esc(layer.id) + "'><span>" + esc(layer.id) + "</span><b style='font-size:16px;font-family:Newsreader,Georgia,serif'>" + esc(layer.name) + "</b><p class='muted' style='font-size:12px;margin:6px 0 0;text-transform:none;letter-spacing:0'>" + esc(layer.one) + "</p></a>"
      ).join("") + "</div>" +
      layers +
      "<h2 style='font-family:Newsreader,Georgia,serif;font-weight:500;margin-top:48px'>四情景 · 不画进图</h2>" +
      "<p class='muted' style='font-size:14px'>这是本台自己的概率，没有一篇原文，所以不标成点。</p>" +
      (F.scenarios || []).map((s) =>
        "<div class='barrow'><span>" + esc(s.name) + "</span><div class='hbar'><span style='width:" + parseInt(s.p, 10) + "%'></span></div><b class='mono'>" + esc(s.p) + "</b></div>"
      ).join("") +
      "<h2 style='font-family:Newsreader,Georgia,serif;font-weight:500;margin-top:40px'>跨资产 · 短中长期</h2>" +
      "<div class='table-wrap' style='margin-top:12px'><table><thead><tr><th>资产</th><th>短期</th><th>中期</th><th>长期</th></tr></thead><tbody>" +
      (F.assets || []).map((a) => "<tr><td>" + esc(a.name) + "</td><td>" + cellHtml(a.st) + "</td><td>" + cellHtml(a.mt) + "</td><td>" + cellHtml(a.lt) + "</td></tr>").join("") +
      "</tbody></table></div>";
  };

  window.renderForecastQ = function renderForecastQ(id) {
    const F = D.forecast;
    const q = (F.questions || []).find((x) => x.id === id);
    if (!q) {
      $app().innerHTML = "<p class='lead'>没有这个问题。</p><p><a href='#/forecast'>回引擎</a></p>";
      return;
    }
    const others = (F.questions || []).filter((x) => x.id !== q.id).slice(0, 8);
    const callRows = (q.calls || []).length
      ? "<div class='table-wrap'><table><thead><tr><th>机构</th><th>点</th><th>预测到何时</th><th>原话</th><th>发布</th><th>链接</th></tr></thead><tbody>" +
        q.calls
          .map((c) => {
            const name = c.orgId
              ? "<a href='#/org/" + esc(c.orgId) + "'>" + esc(c.org) + "</a>"
              : esc(c.org);
            const link = c.href
              ? "<a href='" + esc(c.href) + "' target='_blank' rel='noreferrer'>看原帖</a>"
              : "—";
            return (
              "<tr><td>" + name + "</td><td class='mono'>" + esc(c.label) +
              "</td><td class='muted'>" + esc(c.forWhen || "") +
              "</td><td class='muted'>" + esc(c.quote) + "</td><td class='mono subtle'>" +
              esc((c.asOf || "").slice(5)) + "</td><td>" + link + "</td></tr>"
            );
          })
          .join("") +
        "</tbody></table></div>"
      : "<p class='muted'>还没有能落在尺子上的机构预测。</p>";
    $app().innerHTML =
      "<div class='detail'><p><a class='subtle' href='#/forecast'>← 20 问</a></p>" +
      "<p class='kicker'>" + String(q.n).padStart(2, "0") + " · " + esc((F.horizonZh || {})[q.horizon] || "") + "</p>" +
      "<h1>" + esc(q.title) + "</h1>" +
      "<p class='lead'>" + esc(q.question) + "</p>" +
      "<p class='muted'>" + esc(q.why) + "</p>" +
      "<p class='chips' style='margin-top:12px'><span class='badge " + confTone(q.desk.confidence) + "'>" +
      esc((F.confZh || {})[q.desk.confidence] || "") + "</span> " +
      (q.laws || []).map((l) => "<span class='badge accent'>" + esc(l) + "</span>").join(" ") + "</p>" +
      "<div style='margin-top:24px'>" + chartFor(q) + "</div>" +
      "<div class='block'><p class='kicker'>本台判断</p>" +
      "<h2 style='font-family:Newsreader,Georgia,serif;font-weight:500;margin:8px 0'>" +
      (q.desk.filled ? esc(q.desk.label) : "这一格空着") + "</h2>" +
      "<p class='muted'>" + esc(q.desk.why) + "</p>" +
      "<p class='formula'>" + esc(q.desk.formula) + "</p></div>" +
      "<h2 style='font-family:Newsreader,Georgia,serif;font-weight:500;margin-top:40px'>机构把点标在哪</h2>" +
      callRows +
      "<div class='block' style='border-style:dashed'><p class='kicker'>在找</p><p class='muted'>" +
      esc(q.seeking) + "</p></div>" +
      "<p class='muted' style='font-size:13px'>影响到的资产：" + esc((q.assets || []).join(" · ")) + "</p>" +
      "<h2 style='font-family:Newsreader,Georgia,serif;font-weight:500;margin-top:32px'>其他问题</h2>" +
      "<p class='chips'>" +
      others
        .map(
          (o) =>
            "<a href='#/forecast/" + esc(o.id) + "'><button>" + String(o.n).padStart(2, "0") + " " +
            esc(o.title) + "</button></a>",
        )
        .join(" ") +
      "</p></div>";
  };
})();
