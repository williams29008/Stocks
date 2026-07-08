/* =========================================================================
   CONFIGURE ME
   =========================================================================
   1. SHEET_CSV_URL — paste the "Publish to web" CSV link from your Google
      Sheet here. Leave it as an empty string to run on demo data only.

   2. HOLDINGS — your list of tickers. `shares` is optional (defaults to 1);
      set it to get a real portfolio total, or leave at 1 to just watch
      per-share prices.

   Expected CSV columns (header row required), in any order:
     ticker, name, price, dayChangePct, yearChangePct, dividendYield
   ========================================================================= */

const SHEET_CSV_URL = ""; // e.g. "https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?output=csv"

const HOLDINGS = [
  { ticker: "AAPL", shares: 1 },
  { ticker: "MSFT", shares: 1 },
  { ticker: "GOOGL", shares: 1 },
  { ticker: "AMZN", shares: 1 },
  { ticker: "NVDA", shares: 1 },
];

/* Demo/fallback data — used if SHEET_CSV_URL is empty or the fetch fails. */
const DEMO_DATA = {
  AAPL:  { name: "Apple Inc.",            price: 213.14, dayChangePct:  0.62, yearChangePct:  18.4, dividendYield: 0.44 },
  MSFT:  { name: "Microsoft Corp.",       price: 471.92, dayChangePct: -0.28, yearChangePct:  24.1, dividendYield: 0.68 },
  GOOGL: { name: "Alphabet Inc.",         price: 187.33, dayChangePct:  1.14, yearChangePct:  31.7, dividendYield: 0.42 },
  AMZN:  { name: "Amazon.com Inc.",       price: 224.08, dayChangePct:  0.35, yearChangePct:  27.9, dividendYield: 0.00 },
  NVDA:  { name: "NVIDIA Corp.",          price: 168.55, dayChangePct: -1.42, yearChangePct:  91.6, dividendYield: 0.03 },
};

/* ========================================================================= */

let currentData = [];
let sortKey = null;
let sortDir = 1;

const fmtUSD = (n) =>
  n == null || isNaN(n) ? "—" : n.toLocaleString("en-US", { style: "currency", currency: "USD" });

const fmtPct = (n) =>
  n == null || isNaN(n) ? "—" : `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;

function pctClass(n) {
  if (n == null || isNaN(n) || n === 0) return "flat";
  return n > 0 ? "up" : "down";
}

function arrow(n) {
  if (n == null || isNaN(n) || n === 0) return "→";
  return n > 0 ? "▲" : "▼";
}

/* ---------- CSV parsing ---------- */
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const rows = {};
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cells = lines[i].split(",").map((c) => c.trim());
    const row = {};
    headers.forEach((h, idx) => (row[h] = cells[idx]));
    if (!row.ticker) continue;
    rows[row.ticker.toUpperCase()] = {
      name: row.name || row.ticker.toUpperCase(),
      price: parseFloat(row.price),
      dayChangePct: parseFloat(row.daychangepct),
      yearChangePct: parseFloat(row.yearchangepct),
      dividendYield: parseFloat(row.dividendyield),
    };
  }
  return rows;
}

async function loadData() {
  if (SHEET_CSV_URL) {
    try {
      const res = await fetch(SHEET_CSV_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      document.getElementById("source-label").textContent = "Google Sheet (GOOGLEFINANCE)";
      return parseCSV(text);
    } catch (err) {
      console.warn("Falling back to demo data — sheet fetch failed:", err);
      document.getElementById("source-label").textContent = "Demo data (sheet fetch failed)";
      return DEMO_DATA;
    }
  }
  document.getElementById("source-label").textContent = "Demo data";
  return DEMO_DATA;
}

/* ---------- Rendering ---------- */
function buildRows(dataSource) {
  return HOLDINGS.map(({ ticker, shares = 1 }) => {
    const d = dataSource[ticker] || {};
    return {
      ticker,
      name: d.name || ticker,
      price: d.price,
      dayChange: d.dayChangePct,
      yearChange: d.yearChangePct,
      dividendYield: d.dividendYield,
      shares,
      value: d.price != null ? d.price * shares : null,
    };
  });
}

function renderTable(rows) {
  const tbody = document.getElementById("ledger-body");
  const emptyState = document.getElementById("empty-state");
  tbody.innerHTML = "";

  if (!rows.length) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  rows.forEach((r) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="ticker-cell">${r.ticker}</td>
      <td class="name-cell">${r.name}</td>
      <td class="num-cell col-num">${fmtUSD(r.price)}</td>
      <td class="col-num"><span class="change-cell ${pctClass(r.dayChange)}">${arrow(r.dayChange)} ${fmtPct(r.dayChange)}</span></td>
      <td class="col-num"><span class="change-cell ${pctClass(r.yearChange)}">${arrow(r.yearChange)} ${fmtPct(r.yearChange)}</span></td>
      <td class="num-cell col-num">${r.dividendYield == null || isNaN(r.dividendYield) ? "—" : r.dividendYield.toFixed(2) + "%"}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderTotals(rows) {
  const withValue = rows.filter((r) => r.value != null);
  const totalValue = withValue.reduce((s, r) => s + r.value, 0);

  const withDay = rows.filter((r) => r.dayChange != null && r.value != null);
  const dayWeighted =
    withDay.reduce((s, r) => s + r.value * (r.dayChange / 100), 0);
  const dayPct = totalValue ? (dayWeighted / totalValue) * 100 : null;

  const withYear = rows.filter((r) => r.yearChange != null && r.value != null);
  const yearWeighted =
    withYear.reduce((s, r) => s + r.value * (r.yearChange / 100), 0);
  const yearPct = totalValue ? (yearWeighted / totalValue) * 100 : null;

  document.getElementById("total-value").textContent = fmtUSD(totalValue);
  document.getElementById("total-count").textContent = rows.length;

  const dayEl = document.getElementById("total-day");
  dayEl.textContent = fmtPct(dayPct);
  dayEl.className = `total-value ${pctClass(dayPct)}`;

  const yearEl = document.getElementById("total-year");
  yearEl.textContent = fmtPct(yearPct);
  yearEl.className = `total-value ${pctClass(yearPct)}`;
}

function renderTape(rows) {
  const tape = document.getElementById("tape");
  const items = rows
    .map(
      (r) => `
      <span class="tape-item">
        <strong>${r.ticker}</strong>${fmtUSD(r.price)}
        <span class="${pctClass(r.dayChange)}">${arrow(r.dayChange)} ${fmtPct(r.dayChange)}</span>
      </span>`
    )
    .join("");
  // duplicate content so the marquee loop is seamless
  tape.innerHTML = items + items;
}

function sortRows(rows, key) {
  if (!key) return rows;
  const dir = sortDir;
  return [...rows].sort((a, b) => {
    const av = a[key], bv = b[key];
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === "string") return av.localeCompare(bv) * dir;
    return (av - bv) * dir;
  });
}

function attachSortHandlers() {
  document.querySelectorAll(".ledger thead th").forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.dataset.key;
      sortDir = sortKey === key ? -sortDir : 1;
      sortKey = key;
      renderTable(sortRows(currentData, sortKey));
    });
  });
}

async function refresh() {
  const btn = document.getElementById("refresh-btn");
  btn.disabled = true;
  btn.textContent = "Refreshing…";

  const dataSource = await loadData();
  currentData = buildRows(dataSource);

  renderTable(sortRows(currentData, sortKey));
  renderTotals(currentData);
  renderTape(currentData);

  document.getElementById("last-updated").textContent = new Date().toLocaleString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });

  btn.disabled = false;
  btn.textContent = "Refresh";
}

document.getElementById("refresh-btn").addEventListener("click", refresh);
attachSortHandlers();
refresh();
