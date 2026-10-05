/* Store locator: city tabs + text search over data/showrooms.json */
(async () => {
  "use strict";
  const { $, $$, esc, icon, params, loadShowrooms, reveal } = window.KSIC;

  let data;
  try { data = await loadShowrooms(); } catch {
    $("#stores").innerHTML = `<p class="empty">Couldn't load showrooms. Serve the site over HTTP (see README).</p>`;
    return;
  }
  const cities = ["All", ...data.cities];
  let city = cities.includes(params().get("city")) ? params().get("city") : "All";
  let q = "";

  $("#cityTabs").innerHTML = cities.map((c) => {
    const n = c === "All" ? data.showrooms.length : data.showrooms.filter((s) => s.city === c).length;
    return `<button role="tab" data-city="${esc(c)}">${esc(c)}<sup>${n}</sup></button>`;
  }).join("");

  function draw() {
    $$("#cityTabs button").forEach((b) => { const on = b.dataset.city === city; b.classList.toggle("is-on", on); b.setAttribute("aria-selected", on); });
    const list = data.showrooms
      .filter((s) => city === "All" || s.city === city)
      .filter((s) => !q || `${s.name} ${s.address} ${s.city}`.toLowerCase().includes(q));
    $("#stores").innerHTML = list.length ? list.map((s, i) => `
      <article class="store">
        <small>${esc(s.city)}</small>
        <h3>${esc(s.name)}${s.flagship ? '<span class="badge badge--gold">Flagship</span>' : ""}</h3>
        <address>${esc(s.address)}</address>
        <div class="store__meta">
          <div>${icon("clock")}${esc(s.hours)}</div>
          ${s.phone ? `<div>${icon("phone")}<a href="tel:${s.phone.replace(/\s/g, "")}">${esc(s.phone)}</a></div>` : ""}
          <div>${icon("pin")}<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("KSIC Mysore Silk " + s.address)}" target="_blank" rel="noopener">Get directions</a></div>
        </div>
      </article>`).join("") : `<p class="empty">No showrooms match “${esc(q)}”.</p>`;
    window.KSIC.replay($("#stores"));
    const qs = city === "All" ? "" : `?city=${encodeURIComponent(city)}`;
    history.replaceState(null, "", `showrooms.html${qs}`);
  }

  $("#cityTabs").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) { city = b.dataset.city; draw(); } });
  $("#storeQ").addEventListener("input", (e) => { q = e.target.value.trim().toLowerCase(); draw(); });
  draw();
  reveal();
})();
