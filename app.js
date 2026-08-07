const API_BASE = "https://api.pokemontcg.io/v2";
const STORAGE_PREFIX = "pokey:collection:";
const LAST_SET_KEY = "pokey:lastSet";
const RING_CIRCUMFERENCE = 2 * Math.PI * 52;

const els = {
  setSelect: document.getElementById("set-select"),
  search: document.getElementById("search"),
  summary: document.getElementById("set-summary"),
  setLogo: document.getElementById("set-logo"),
  setName: document.getElementById("set-name"),
  setMeta: document.getElementById("set-meta"),
  ringFg: document.getElementById("ring-fg"),
  pctValue: document.getElementById("pct-value"),
  countValue: document.getElementById("count-value"),
  markAll: document.getElementById("mark-all"),
  clearAll: document.getElementById("clear-all"),
  status: document.getElementById("status"),
  grid: document.getElementById("card-grid"),
};

let currentSet = null;
let currentCards = [];
let owned = new Set();

init();

async function init() {
  els.ringFg.style.strokeDasharray = String(RING_CIRCUMFERENCE);
  els.setSelect.addEventListener("change", () => loadSet(els.setSelect.value));
  els.search.addEventListener("input", () => renderGrid());
  els.markAll.addEventListener("click", markAllOwned);
  els.clearAll.addEventListener("click", clearSet);
  els.grid.addEventListener("click", onGridClick);

  try {
    const sets = await fetchAllSets();
    populateSetSelect(sets);
    const lastSet = localStorage.getItem(LAST_SET_KEY);
    const initial = sets.find((s) => s.id === lastSet) ? lastSet : sets[0]?.id;
    if (initial) {
      els.setSelect.value = initial;
      await loadSet(initial);
    }
  } catch (err) {
    setStatus(`Couldn't load sets: ${err.message}`, true);
  }
}

async function fetchAllSets() {
  const res = await fetch(`${API_BASE}/sets?orderBy=-releaseDate`);
  if (!res.ok) throw new Error(`API returned ${res.status}`);
  const data = await res.json();
  return data.data;
}

function populateSetSelect(sets) {
  const bySeries = new Map();
  for (const set of sets) {
    const key = set.series || "Other";
    if (!bySeries.has(key)) bySeries.set(key, []);
    bySeries.get(key).push(set);
  }

  els.setSelect.innerHTML = "";
  for (const [series, seriesSets] of bySeries) {
    const group = document.createElement("optgroup");
    group.label = series;
    for (const set of seriesSets) {
      const opt = document.createElement("option");
      opt.value = set.id;
      opt.textContent = `${set.name} (${set.total})`;
      group.appendChild(opt);
    }
    els.setSelect.appendChild(group);
  }
  els.search.disabled = false;
}

async function loadSet(setId) {
  if (!setId) return;
  currentSet = null;
  currentCards = [];
  els.grid.innerHTML = "";
  els.summary.classList.add("hidden");
  setStatus("Loading cards…");

  try {
    const [set, cards] = await Promise.all([fetchSet(setId), fetchSetCards(setId)]);
    currentSet = set;
    currentCards = cards.sort((a, b) => cardNumberValue(a) - cardNumberValue(b));
    owned = loadOwned(setId);
    localStorage.setItem(LAST_SET_KEY, setId);

    els.setLogo.src = set.images?.logo || "";
    els.setLogo.alt = `${set.name} logo`;
    els.setName.textContent = set.name;
    els.setMeta.textContent = `${set.series} · released ${set.releaseDate} · ${currentCards.length} cards`;
    els.summary.classList.remove("hidden");
    els.search.value = "";

    renderGrid();
    updateProgress();
    setStatus("");
  } catch (err) {
    setStatus(`Couldn't load this set: ${err.message}`, true);
  }
}

async function fetchSet(setId) {
  const res = await fetch(`${API_BASE}/sets/${setId}`);
  if (!res.ok) throw new Error(`API returned ${res.status}`);
  const data = await res.json();
  return data.data;
}

async function fetchSetCards(setId) {
  const pageSize = 250;
  let page = 1;
  let all = [];
  while (true) {
    const res = await fetch(
      `${API_BASE}/cards?q=set.id:${setId}&pageSize=${pageSize}&page=${page}&orderBy=number`
    );
    if (!res.ok) throw new Error(`API returned ${res.status}`);
    const data = await res.json();
    all = all.concat(data.data);
    if (all.length >= data.totalCount || data.data.length === 0) break;
    page += 1;
  }
  return all;
}

function cardNumberValue(card) {
  const n = parseInt(card.number, 10);
  return Number.isNaN(n) ? Number.MAX_SAFE_INTEGER : n;
}

function loadOwned(setId) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + setId);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveOwned() {
  if (!currentSet) return;
  localStorage.setItem(STORAGE_PREFIX + currentSet.id, JSON.stringify([...owned]));
}

function renderGrid() {
  const query = els.search.value.trim().toLowerCase();
  const filtered = query
    ? currentCards.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.number.toLowerCase().includes(query)
      )
    : currentCards;

  els.grid.innerHTML = "";
  const fragment = document.createDocumentFragment();
  for (const card of filtered) {
    fragment.appendChild(buildCardTile(card));
  }
  els.grid.appendChild(fragment);
}

function buildCardTile(card) {
  const tile = document.createElement("button");
  tile.type = "button";
  tile.className = "card-tile" + (owned.has(card.id) ? " owned" : "");
  tile.dataset.cardId = card.id;
  tile.setAttribute(
    "aria-pressed",
    owned.has(card.id) ? "true" : "false"
  );
  tile.setAttribute("aria-label", `${card.name}, number ${card.number}`);

  const img = document.createElement("img");
  img.src = card.images?.small || "";
  img.alt = card.name;
  img.loading = "lazy";

  const badge = document.createElement("div");
  badge.className = "owned-badge";
  badge.textContent = "✓";
  badge.setAttribute("aria-hidden", "true");

  const number = document.createElement("div");
  number.className = "card-number";
  number.textContent = `#${card.number} / ${currentSet.printedTotal}`;

  const name = document.createElement("div");
  name.className = "card-name";
  name.textContent = card.name;

  tile.append(img, badge, number, name);
  return tile;
}

function onGridClick(e) {
  const tile = e.target.closest(".card-tile");
  if (!tile) return;
  const cardId = tile.dataset.cardId;
  if (owned.has(cardId)) {
    owned.delete(cardId);
  } else {
    owned.add(cardId);
  }
  tile.classList.toggle("owned");
  tile.setAttribute("aria-pressed", owned.has(cardId) ? "true" : "false");
  saveOwned();
  updateProgress();
}

function markAllOwned() {
  if (!currentCards.length) return;
  for (const card of currentCards) owned.add(card.id);
  saveOwned();
  renderGrid();
  updateProgress();
}

function clearSet() {
  if (!currentSet) return;
  if (!confirm(`Clear all collected cards for ${currentSet.name}?`)) return;
  owned.clear();
  saveOwned();
  renderGrid();
  updateProgress();
}

function updateProgress() {
  const total = currentCards.length;
  const collected = currentCards.filter((c) => owned.has(c.id)).length;
  const pct = total ? Math.round((collected / total) * 100) : 0;

  els.pctValue.textContent = pct;
  els.countValue.textContent = `${collected} / ${total}`;

  const offset = RING_CIRCUMFERENCE * (1 - pct / 100);
  els.ringFg.style.strokeDashoffset = String(offset);
}

function setStatus(message, isError = false) {
  els.status.textContent = message;
  els.status.style.color = isError ? "var(--accent)" : "";
}
