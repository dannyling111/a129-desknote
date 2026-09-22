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
  function clusterCalls(calls) {
    const map = {};
    calls.forEach((c) => {
      const k = c.x.toFixed(2) + "|" + (c.y ?? "");
      (map[k] = map[k] || []).push(c);
    });
    return Object.values(map);
  }
  function railSVG(q) {
    const W = 640, H = 168, x0 = 36, x1 = W - 36, y = 96, ax = q.axisX;
    const ticks = [0, 0.25, 0.5, 0.75, 1]
      .map((t) => {
        const x = x0 + t * (x1 - x0);
        const v = ax.min + t * (ax.max - ax.min);
        return (
          "<g><line x1='" + x + "' y1='" + (y - 5) + "' x2='" + x + "' y2='" + (y + 5) + "' stroke='var(--subtle)' />" +
          "<text x='" + x + "' y='" + (y + 22) + "' text-anchor='middle' fill='var(--subtle)' font-size='10' font-family='IBM Plex Mono,monospace'>" +
          esc(fmtAxis(v, ax.format)) + "</text></g>"
        );
      })
      .join("");
    const desk = q.desk || {};
    let range = "";
    if (desk.filled && desk.xMin != null && desk.xMax != null) {
      const a = xOf(desk.xMin, ax.min, ax.max, x0, x1);
      const b = xOf(desk.xMax, ax.min, ax.max, x0, x1);
      range =
        "<rect x='" + a + "' y='" + (y - 10) + "' width='" + Math.max(4, b - a) +
        "' height='20' rx='4' fill='color-mix(in srgb, var(--good) 25%, transparent)' />";
    }
    const groups = clusterCalls(q.calls || []);
    const dots = groups
      .map((g, i) => {
        const c = g[0];
        const x = xOf(c.x, ax.min, ax.max, x0, x1);
        const above = i % 2 === 0;
        const label =
          g.length > 1
            ? (c.camp === "hike" ? "再加阵营" : c.camp === "hold" ? "终点阵营" : c.org) + " · " + g.length
            : c.label;
        return (
          "<g><circle cx='" + x + "' cy='" + y + "' r='6' fill='var(--fg)' />" +
          "<text x='" + x + "' y='" + (above ? y - 16 : y + 40) + "' text-anchor='middle' fill='var(--fg)' font-size='11'>" +
          esc(label) + "</text></g>"
        );
      })
      .join("");
    let deskDot = "";
    if (desk.filled && desk.x != null) {
      const x = xOf(desk.x, ax.min, ax.max, x0, x1);
      deskDot =
        "<g><circle cx='" + x + "' cy='" + y + "' r='8' fill='none' stroke='var(--good)' stroke-width='2' />" +
        "<text x='" + x + "' y='" + (y - 32) + "' text-anchor='middle' fill='var(--good)' font-size='10'>本台</text></g>";
    }
    return (
      "<div class='chartbox'><svg class='rail' viewBox='0 0 " + W + " " + H + "'>" +
      "<line x1='" + x0 + "' y1='" + y + "' x2='" + x1 + "' y2='" + y + "' stroke='var(--border)' stroke-width='2' />" +
      ticks + range + dots + deskDot + "</svg></div>"
    );
  }
  function quadSVG(q) {
    const W = 560, H = 560, pad = 56;
    const ax = q.axisX, ay = q.axisY;
    const xMid = W / 2, yMid = H / 2;
    const toX = (v) => xOf(v, ax.min, ax.max, pad, W - pad);
    const toY = (v) => {
      const t = (v - ay.min) / (ay.max - ay.min);
      return H - pad - Math.min(1, Math.max(0, t)) * (H - pad * 2);
    };
    const L = q.quad || {};
    const dots = (q.calls || [])
      .map((c, i) => {
        if (c.y == null) return "";
        const dy = i % 2 === 0 ? -12 : 16;
        return (
          "<g><circle cx='" + toX(c.x) + "' cy='" + toY(c.y) + "' r='5' fill='var(--fg)' />" +
          "<text x='" + (toX(c.x) + 8) + "' y='" + (toY(c.y) + dy) + "' fill='var(--fg)' font-size='11'>" +
          esc(c.org) + "</text></g>"
        );
      })
      .join("");
    const desk = q.desk || {};
    let deskDot = "";
    if (desk.filled && desk.x != null && desk.y != null) {
      deskDot =
        "<g><circle cx='" + toX(desk.x) + "' cy='" + toY(desk.y) + "' r='10' fill='none' stroke='var(--good)' stroke-width='2' />" +
        "<text x='" + (toX(desk.x) + 12) + "' y='" + (toY(desk.y) + 4) + "' fill='var(--good)' font-size='12'>本台中枢</text></g>";
    }
    return (
      "<div class='chartbox'><svg class='quad' viewBox='0 0 " + W + " " + H + "'>" +
      "<rect x='" + xMid + "' y='" + pad + "' width='" + (W - pad - xMid) + "' height='" + (yMid - pad) + "' fill='color-mix(in srgb, var(--fg) 3%, transparent)' />" +
      "<rect x='" + pad + "' y='" + pad + "' width='" + (xMid - pad) + "' height='" + (yMid - pad) + "' fill='color-mix(in srgb, var(--warn) 8%, transparent)' />" +
      "<rect x='" + pad + "' y='" + yMid + "' width='" + (xMid - pad) + "' height='" + (H - pad - yMid) + "' fill='color-mix(in srgb, var(--good) 7%, transparent)' />" +
      "<rect x='" + xMid + "' y='" + yMid + "' width='" + (W - pad - xMid) + "' height='" + (H - pad - yMid) + "' fill='color-mix(in srgb, var(--bad) 7%, transparent)' />" +
      "<line x1='" + pad + "' y1='" + yMid + "' x2='" + (W - pad) + "' y2='" + yMid + "' stroke='var(--border)' />" +
      "<line x1='" + xMid + "' y1='" + pad + "' x2='" + xMid + "' y2='" + (H - pad) + "' stroke='var(--border)' />" +
      "<text x='" + (W - pad) + "' y='" + (yMid + 18) + "' text-anchor='end' fill='var(--subtle)' font-size='11'>" + esc(ax.label) + " →</text>" +
      "<text x='" + (xMid + 8) + "' y='" + (pad + 14) + "' fill='var(--subtle)' font-size='11'>" + esc(ay.label) + " →</text>" +
      "<text x='" + (W - pad - 8) + "' y='" + (pad + 22) + "' text-anchor='end' fill='var(--muted)' font-size='11'>" + esc(L.q1 || "") + "</text>" +
      "<text x='" + (pad + 8) + "' y='" + (pad + 22) + "' fill='var(--muted)' font-size='11'>" + esc(L.q2 || "") + "</text>" +
      "<text x='" + (pad + 8) + "' y='" + (H - pad - 10) + "' fill='var(--muted)' font-size='11'>" + esc(L.q3 || "") + "</text>" +
      "<text x='" + (W - pad - 8) + "' y='" + (H - pad - 10) + "' text-anchor='end' fill='var(--muted)' font-size='11'>" + esc(L.q4 || "") + "</text>" +
      dots + deskDot + "</svg></div>"
    );
  }
  function chartFor(q) {
    if (!q || q.chart === "none") {
      return "<p class='muted' style='border:1px dashed var(--border);border-radius:16px;padding:16px'>这个问题还画不成尺子或平面——缺可核对的数字。</p>";
    }
    if (q.chart === "quad" && q.axisY) return quadSVG(q);
    return railSVG(q);
  }
  function cellHtml(cell) {
    if (!cell || !cell.text) return "<span class='empty-cell'>—</span>";
    if (cell.qId) return "<a href='#/forecast/" + esc(cell.qId) + "'>" + esc(cell.text) + "</a>";
    return esc(cell.text);
  }

  window.renderForecast = function renderForecast() {
    const F = D.forecast;
    if (!F) {
      $app().innerHTML = "<p class='lead'>预测数据还没导出。</p>";
      return;
    }
    const H = F.headline || {};
    const quad = (F.questions || []).find((q) => q.id === "quad");
    const rows = (F.questions || []).slice().sort((a, b) => a.n - b.n);
    $app().innerHTML =
      "<p class='kicker'>Investment engine</p>" +
      "<h1>带着问题看研报</h1>" +
      "<p class='lead'>信息只是原料和信心。真正的产品是：六个真驱动怎么变，公式算出短中长期区间，再把各家的点标到象限和尺子上。没有数字的格子空着，继续找。</p>" +
      "<p class='subtle mono' style='font-size:12px'>截至 " + esc(F.asOf) +
      " · 20 问里本台填了 " + H.filled + " 格 · " + H.empty + " 格空着 · " + H.evidence + " 个机构点</p>" +
      "<div class='stats'>" +
      (F.formulas || [])
        .slice(0, 3)
        .map(
          (f) =>
            "<div class='stat'><span>" + esc(f.law) + "</span><b style='font-family:Newsreader,Georgia,serif;font-size:20px'>" +
            esc(f.title) + "</b><p class='muted' style='font-size:13px;margin:8px 0 0;text-transform:none;letter-spacing:0'>" +
            esc(f.text) + "</p></div>",
        )
        .join("") +
      "</div>" +
      "<h2 style='font-family:Newsreader,Georgia,serif;font-weight:500;margin-top:40px'>增长 × 通胀</h2>" +
      "<p class='muted' style='font-size:14px'>各家的未来落在哪一象限。空心圈是本台中枢。</p>" +
      (quad ? chartFor(quad) : "") +
      "<p class='muted' style='margin-top:12px;font-size:14px'>" + esc(quad && quad.desk ? quad.desk.why : "") + "</p>" +
      "<p style='margin-top:8px'><a href='#/forecast/quad'>打开第 20 问 →</a></p>" +
      "<h2 style='font-family:Newsreader,Georgia,serif;font-weight:500;margin-top:40px'>四情景</h2>" +
      (F.scenarios || [])
        .map(
          (s) =>
            "<div class='barrow'><span>" + esc(s.name) + "</span><div class='hbar'><span style='width:" +
            parseInt(s.p, 10) + "%'></span></div><b class='mono'>" + esc(s.p) + "</b></div>",
        )
        .join("") +
      "<ul class='muted' style='font-size:14px'>" +
      (F.scenarios || [])
        .map(
          (s) =>
            "<li><b style='color:var(--fg)'>" + esc(s.name) + "</b> <span class='mono'>" +
            esc(s.equity) + "</span> " + esc(s.trigger) + "</li>",
        )
        .join("") +
      "</ul>" +
      "<h2 style='font-family:Newsreader,Georgia,serif;font-weight:500;margin-top:40px'>跨资产 · 短中长期</h2>" +
      "<p class='muted' style='font-size:14px'>有答案就填，没有就空着。</p>" +
      "<div class='table-wrap' style='margin-top:12px'><table><thead><tr><th>资产</th><th>短期</th><th>中期</th><th>长期</th></tr></thead><tbody>" +
      (F.assets || [])
        .map(
          (a) =>
            "<tr><td>" + esc(a.name) + "</td><td>" + cellHtml(a.st) + "</td><td>" +
            cellHtml(a.mt) + "</td><td>" + cellHtml(a.lt) + "</td></tr>",
        )
        .join("") +
      "</tbody></table></div>" +
      "<h2 style='font-family:Newsreader,Georgia,serif;font-weight:500;margin-top:40px'>未来 20 问</h2>" +
      "<div class='table-wrap' style='margin-top:12px'><table><thead><tr><th>#</th><th>窗口</th><th>问题</th><th>本台</th><th>机构点</th><th>信心</th></tr></thead><tbody>" +
      rows
        .map(
          (q) =>
            "<tr data-q='" + esc(q.id) + "'><td class='mono subtle'>" + String(q.n).padStart(2, "0") +
            "</td><td class='subtle'>" + esc((F.horizonShort || {})[q.horizon] || q.horizon) +
            "</td><td><div><a href='#/forecast/" + esc(q.id) + "'>" + esc(q.title) +
            "</a></div><div class='muted' style='font-size:12px'>" + esc(q.question) +
            "</div></td><td>" + (q.desk && q.desk.filled ? esc(q.desk.label) : "<span class='empty-cell'>—</span>") +
            "</td><td class='mono'>" + (q.calls && q.calls.length ? q.calls.length : "—") +
            "</td><td><span class='badge " + confTone(q.desk && q.desk.confidence) + "'>" +
            esc((F.confZh || {})[q.desk.confidence] || "") + "</span></td></tr>",
        )
        .join("") +
      "</tbody></table></div>";
    $app().querySelectorAll("tr[data-q]").forEach((tr) => {
      tr.addEventListener("click", () => {
        location.hash = "#/forecast/" + tr.dataset.q;
      });
    });
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
      ? "<div class='table-wrap'><table><thead><tr><th>机构</th><th>点</th><th>原话</th><th>日期</th><th>链接</th></tr></thead><tbody>" +
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
