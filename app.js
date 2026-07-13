(function () {
  const DATA = Array.isArray(window.OPPORTUNITIES) ? window.OPPORTUNITIES : [];

  const state = {
    search: "",
    category: new Set(),
    stage: new Set(),
    focus: new Set(),
    region: new Set(),
    equity: new Set(), // "Equity-free" | "Takes equity"
    format: new Set(), // "In-person" | "Remote" | "Hybrid"
    statusTab: "all", // all | rolling | dated | closed
    sort: "name",
  };

  const els = {
    grid: document.getElementById("cardGrid"),
    empty: document.getElementById("emptyState"),
    emptyClear: document.getElementById("emptyClear"),
    resultCount: document.getElementById("resultCount"),
    stats: document.getElementById("stats"),
    search: document.getElementById("searchInput"),
    sort: document.getElementById("sortSelect"),
    clearFilters: document.getElementById("clearFilters"),
    statusTabs: document.getElementById("statusTabs"),
    overlay: document.getElementById("detailOverlay"),
    overlayCard: document.getElementById("overlayCard"),
    lastRefresh: document.getElementById("lastRefresh"),
    filterCategory: document.getElementById("filterCategory"),
    filterStage: document.getElementById("filterStage"),
    filterFocus: document.getElementById("filterFocus"),
    filterRegion: document.getElementById("filterRegion"),
    filterEquity: document.getElementById("filterEquity"),
    filterFormat: document.getElementById("filterFormat"),
  };

  function classifyDeadline(item) {
    const d = (item.applicationDeadline || "").toLowerCase();
    if (!d || d === "unknown") return "unknown";
    if (d.includes("rolling") || d.includes("ongoing") || d.includes("apply anytime")) return "rolling";
    if (d.includes("closed") || d.includes("not currently open") || d.includes("inactive")) return "closed";
    return "dated";
  }

  function equityBucket(item) {
    const e = (item.equity || "").toLowerCase();
    if (e.includes("equity-free") || e.includes("no equity") || e === "0%" || e.includes("$0")) return "Equity-free";
    return "Takes equity";
  }

  function formatBucket(item) {
    const f = (item.format || "").toLowerCase();
    if (f.startsWith("remote")) return "Remote";
    if (f.startsWith("hybrid")) return "Hybrid";
    if (f.startsWith("in-person")) return "In-person";
    return item.format || "Unknown";
  }

  function uniqueSorted(values) {
    return Array.from(new Set(values.filter(Boolean))).sort();
  }

  function buildFacets() {
    return {
      category: uniqueSorted(DATA.map((d) => d.category)),
      stage: uniqueSorted(DATA.map((d) => d.stage)),
      focus: uniqueSorted(DATA.flatMap((d) => d.focusAreas || [])),
      region: uniqueSorted(DATA.map((d) => d.region)),
      equity: ["Equity-free", "Takes equity"],
      format: uniqueSorted(DATA.map(formatBucket)),
    };
  }

  function renderChipGroup(container, key, values) {
    container.innerHTML = "";
    values.forEach((val) => {
      const count = DATA.filter((d) => matchesSingle(d, key, val)).length;
      const chip = document.createElement("button");
      chip.className = "chip" + (state[key].has(val) ? " active" : "");
      chip.innerHTML = `${escapeHtml(val)} <span class="count">${count}</span>`;
      chip.addEventListener("click", () => {
        if (state[key].has(val)) state[key].delete(val);
        else state[key].add(val);
        renderAll();
      });
      container.appendChild(chip);
    });
  }

  function matchesSingle(item, key, val) {
    switch (key) {
      case "category": return item.category === val;
      case "stage": return item.stage === val;
      case "focus": return (item.focusAreas || []).includes(val);
      case "region": return item.region === val;
      case "equity": return equityBucket(item) === val;
      case "format": return formatBucket(item) === val;
      default: return true;
    }
  }

  function matchesFilters(item) {
    for (const key of ["category", "stage", "focus", "region", "equity", "format"]) {
      const set = state[key];
      if (set.size === 0) continue;
      let ok = false;
      for (const val of set) {
        if (matchesSingle(item, key, val)) { ok = true; break; }
      }
      if (!ok) return false;
    }
    if (state.statusTab !== "all" && classifyDeadline(item) !== state.statusTab) return false;
    if (state.search) {
      const hay = [
        item.name, item.description, item.eligibility, item.country, item.region,
        (item.focusAreas || []).join(" "), (item.highlights || []).join(" "),
      ].join(" ").toLowerCase();
      if (!hay.includes(state.search.toLowerCase())) return false;
    }
    return true;
  }

  function fundingScore(item) {
    const s = (item.fundingAmount || "").replace(/,/g, "");
    const m = s.match(/\$?([\d.]+)\s*([MK])?/i);
    if (!m) return 0;
    let n = parseFloat(m[1]);
    if (isNaN(n)) return 0;
    if (m[2] && m[2].toUpperCase() === "M") n *= 1000000;
    else if (m[2] && m[2].toUpperCase() === "K") n *= 1000;
    return n;
  }

  function sortItems(items) {
    const arr = items.slice();
    switch (state.sort) {
      case "funding":
        arr.sort((a, b) => fundingScore(b) - fundingScore(a));
        break;
      case "deadline": {
        const rank = { dated: 0, rolling: 1, unknown: 2, closed: 3 };
        arr.sort((a, b) => rank[classifyDeadline(a)] - rank[classifyDeadline(b)]);
        break;
      }
      case "category":
        arr.sort((a, b) => (a.category || "").localeCompare(b.category || "") || a.name.localeCompare(b.name));
        break;
      default:
        arr.sort((a, b) => a.name.localeCompare(b.name));
    }
    return arr;
  }

  function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function deadlineBadge(item) {
    const cls = classifyDeadline(item);
    const label = item.applicationDeadline || "Unknown";
    const clsMap = { rolling: "deadline-rolling", dated: "deadline-dated", closed: "deadline-closed", unknown: "deadline-unknown" };
    return `<span class="deadline-badge ${clsMap[cls]}">${escapeHtml(label)}</span>`;
  }

  function cardTemplate(item) {
    const tags = (item.focusAreas || []).map((f) => `<span class="tag">${escapeHtml(f)}</span>`).join("");
    return `
      <article class="card" data-id="${escapeHtml(item.id)}">
        <div class="card-top">
          <div class="card-title">${escapeHtml(item.name)}</div>
          <div class="card-cat">${escapeHtml(item.category || "")}</div>
        </div>
        <div class="card-meta">
          <span class="meta-pill">${escapeHtml(item.region || "")}${item.country ? " · " + escapeHtml(item.country) : ""}</span>
          <span class="meta-pill">${escapeHtml(item.stage || "")}</span>
          <span class="meta-pill">${escapeHtml(formatBucket(item))}</span>
        </div>
        <p class="card-desc">${escapeHtml(item.description || "")}</p>
        <div class="card-terms">
          <div><div class="term-label">Funding</div><div class="term-value">${escapeHtml(item.fundingAmount || "Unknown")}</div></div>
          <div><div class="term-label">Cost</div><div class="term-value">${escapeHtml(item.equity || "Unknown")}</div></div>
          <div><div class="term-label">Length</div><div class="term-value">${escapeHtml(item.programLength || "Unknown")}</div></div>
          <div><div class="term-label">Window</div><div class="term-value">${escapeHtml(item.applicationWindow || "Unknown")}</div></div>
        </div>
        <div class="card-tags">${tags}</div>
        <div class="card-footer">
          ${deadlineBadge(item)}
          <a class="apply-btn" href="${escapeHtml(item.applyLink || item.website || "#")}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">Apply →</a>
        </div>
      </article>
    `;
  }

  function overlayTemplate(item) {
    const highlights = (item.highlights || []).map((h) => `<li>${escapeHtml(h)}</li>`).join("") || "<li>Not available</li>";
    const alumni = (item.notableAlumni || []).length ? item.notableAlumni.join(", ") : "Not publicly listed";
    const tags = (item.focusAreas || []).map((f) => `<span class="tag">${escapeHtml(f)}</span>`).join("");
    return `
      <button class="overlay-close" id="overlayCloseBtn">✕</button>
      <h2>${escapeHtml(item.name)}</h2>
      <div class="overlay-sub">${escapeHtml(item.category || "")} · ${escapeHtml(item.region || "")}${item.country ? " · " + escapeHtml(item.country) : ""} · ${escapeHtml(item.stage || "")}</div>
      <div class="card-tags" style="margin-bottom:14px;">${tags}</div>

      <div class="overlay-section">
        <h4>Overview</h4>
        <p>${escapeHtml(item.description || "No description available.")}</p>
      </div>

      <div class="overlay-section overlay-grid">
        <div><h4>Funding</h4><p>${escapeHtml(item.fundingAmount || "Unknown")}</p></div>
        <div><h4>Cost to apply</h4><p>${escapeHtml(item.equity || "Unknown")}</p></div>
        <div><h4>Program length</h4><p>${escapeHtml(item.programLength || "Unknown")}</p></div>
        <div><h4>Format</h4><p>${escapeHtml(item.format || "Unknown")}</p></div>
        <div><h4>Application window</h4><p>${escapeHtml(item.applicationWindow || "Unknown")}</p></div>
        <div><h4>Deadline status</h4><p>${deadlineBadge(item)}</p></div>
      </div>

      <div class="overlay-section">
        <h4>Eligibility</h4>
        <p>${escapeHtml(item.eligibility || "Not specified.")}</p>
      </div>

      <div class="overlay-section">
        <h4>Highlights</h4>
        <ul>${highlights}</ul>
      </div>

      <div class="overlay-section">
        <h4>Notable alumni / portfolio</h4>
        <p>${escapeHtml(alumni)}</p>
      </div>

      <div class="overlay-section">
        <h4>Last verified</h4>
        <p>${escapeHtml(item.lastVerified || "Unknown")}</p>
      </div>

      <div class="overlay-links">
        <a class="apply-btn" href="${escapeHtml(item.applyLink || item.website || "#")}" target="_blank" rel="noopener noreferrer">Apply now →</a>
        <a class="secondary" href="${escapeHtml(item.website || "#")}" target="_blank" rel="noopener noreferrer">Visit website</a>
      </div>
    `;
  }

  function openDetail(id) {
    const item = DATA.find((d) => d.id === id);
    if (!item) return;
    els.overlayCard.innerHTML = overlayTemplate(item);
    els.overlay.hidden = false;
    document.getElementById("overlayCloseBtn").addEventListener("click", closeDetail);
  }

  function closeDetail() {
    els.overlay.hidden = true;
    els.overlayCard.innerHTML = "";
  }

  els.overlay.addEventListener("click", (e) => {
    if (e.target === els.overlay) closeDetail();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDetail();
  });

  function renderStatusTabs() {
    const tabs = [
      { key: "all", label: "All" },
      { key: "rolling", label: "Rolling / Ongoing" },
      { key: "dated", label: "Has a deadline" },
      { key: "closed", label: "Closed / Inactive" },
    ];
    els.statusTabs.innerHTML = "";
    tabs.forEach((t) => {
      const btn = document.createElement("button");
      btn.className = "status-tab" + (state.statusTab === t.key ? " active" : "");
      btn.textContent = t.label;
      btn.addEventListener("click", () => {
        state.statusTab = t.key;
        renderAll();
      });
      els.statusTabs.appendChild(btn);
    });
  }

  function renderStats() {
    const cats = uniqueSorted(DATA.map((d) => d.category)).length;
    const regions = uniqueSorted(DATA.map((d) => d.region)).length;
    els.stats.innerHTML = `
      <span><b>${DATA.length}</b> opportunities</span>
      <span><b>${cats}</b> categories</span>
      <span><b>${regions}</b> regions</span>
    `;
  }

  function renderGrid() {
    const filtered = DATA.filter(matchesFilters);
    const sorted = sortItems(filtered);
    els.resultCount.innerHTML = `Showing <b>${sorted.length}</b> of <b>${DATA.length}</b> opportunities`;
    els.grid.innerHTML = sorted.map(cardTemplate).join("");
    els.empty.hidden = sorted.length !== 0;
    els.grid.querySelectorAll(".card").forEach((card) => {
      card.addEventListener("click", () => openDetail(card.dataset.id));
    });
  }

  function renderFacets() {
    const facets = buildFacets();
    renderChipGroup(els.filterCategory, "category", facets.category);
    renderChipGroup(els.filterStage, "stage", facets.stage);
    renderChipGroup(els.filterFocus, "focus", facets.focus);
    renderChipGroup(els.filterRegion, "region", facets.region);
    renderChipGroup(els.filterEquity, "equity", facets.equity);
    renderChipGroup(els.filterFormat, "format", facets.format);
  }

  function renderAll() {
    renderStatusTabs();
    renderFacets();
    renderGrid();
  }

  function clearAllFilters() {
    ["category", "stage", "focus", "region", "equity", "format"].forEach((k) => state[k].clear());
    state.statusTab = "all";
    state.search = "";
    els.search.value = "";
    renderAll();
  }

  els.search.addEventListener("input", (e) => {
    state.search = e.target.value;
    renderGrid();
  });
  els.sort.addEventListener("change", (e) => {
    state.sort = e.target.value;
    renderGrid();
  });
  els.clearFilters.addEventListener("click", clearAllFilters);
  els.emptyClear.addEventListener("click", clearAllFilters);

  renderStats();
  renderAll();

  const dates = DATA.map((d) => d.lastVerified).filter(Boolean).sort();
  els.lastRefresh.textContent = dates.length ? dates[dates.length - 1] : "N/A";
})();
