/* Green.kz — Green Travel: әуе билеттерін іздеу, сатып алу және қайтару (демо).
 *
 * Рейстер нағыз емес. Олар бағыт пен күннен детерминді түрде құрастырылады (бір іздеу
 * әрқашан бірдей нәтиже береді): ұшу ұзақтығы мен баға қалалар арасындағы қашықтыққа
 * негізделген, қону уақыты барған жердің жергілікті уақытымен көрсетіледі.
 * «Green Air» авиакомпаниясы ойдан шығарылған; билет ұшуға жарамсыз.
 */
(window.GreenModules = window.GreenModules || []).push(function (A) {
  "use strict";
  const { $, money, esc, fold, toast, openSheet, closeSheet, go, addTx, save, icons: I } = A;

  // ---------- Қалалар: [әуежай коды, қала, ел, ендік, бойлық, UTC ығысуы (сағ)] ----------
  // Тек жазғы уақытқа ауыспайтын елдер алынған, сондықтан ығысу жыл бойы тұрақты.
  const KZ = "Қазақстан";
  const CITIES = [
    ["ALA", "Алматы", KZ, 43.35, 77.04, 5],
    ["NQZ", "Астана", KZ, 51.02, 71.47, 5],
    ["CIT", "Шымкент", KZ, 42.36, 69.48, 5],
    ["SCO", "Ақтау", KZ, 43.86, 51.09, 5],
    ["GUW", "Атырау", KZ, 47.12, 51.82, 5],
    ["AKX", "Ақтөбе", KZ, 50.25, 57.21, 5],
    ["KGF", "Қарағанды", KZ, 49.67, 73.33, 5],
    ["UKK", "Өскемен", KZ, 50.04, 82.49, 5],
    ["PWQ", "Павлодар", KZ, 52.19, 77.07, 5],
    ["KSN", "Қостанай", KZ, 53.21, 63.55, 5],
    ["URA", "Орал", KZ, 51.15, 51.54, 5],
    ["KZO", "Қызылорда", KZ, 44.71, 65.59, 5],
    ["DMB", "Тараз", KZ, 42.85, 71.30, 5],
    ["PLX", "Семей", KZ, 50.35, 80.23, 5],
    ["HSA", "Түркістан", KZ, 43.31, 68.19, 5],
    ["IST", "Стамбұл", "Түркия", 41.26, 28.74, 3],
    ["AYT", "Анталья", "Түркия", 36.90, 30.80, 3],
    ["DXB", "Дубай", "БАӘ", 25.25, 55.36, 4],
    ["TAS", "Ташкент", "Өзбекстан", 41.26, 69.28, 5],
    ["FRU", "Бішкек", "Қырғызстан", 43.06, 74.48, 6],
    ["TBS", "Тбилиси", "Грузия", 41.67, 44.95, 4],
    ["GYD", "Баку", "Әзербайжан", 40.47, 50.05, 4],
    ["DEL", "Дели", "Үндістан", 28.56, 77.10, 5.5],
    ["BKK", "Бангкок", "Таиланд", 13.69, 100.75, 7],
    ["HKT", "Пхукет", "Таиланд", 8.11, 98.31, 7],
    ["ICN", "Сеул", "Оңтүстік Корея", 37.46, 126.44, 9]
  ].map(([code, city, country, lat, lon, tz]) => ({ code, city, country, lat, lon, tz }));
  const BY = {};
  CITIES.forEach((c) => { BY[c.code] = c; });

  const POPULAR = [["ALA", "NQZ"], ["NQZ", "ALA"], ["ALA", "IST"], ["ALA", "DXB"], ["NQZ", "CIT"], ["ALA", "SCO"]];
  const CLS = { eco: "Эконом", biz: "Бизнес" };
  const CARRIER = "Green Air";
  const MAX_PAX = 6;
  const MONTHS = ["қаңтар", "ақпан", "наурыз", "сәуір", "мамыр", "маусым", "шілде", "тамыз", "қыркүйек", "қазан", "қараша", "желтоқсан"];
  const DAYS = ["жс", "дс", "сс", "ср", "бс", "жм", "сн"];
  const ICON_SWAP = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v16M7 20l-4-4M7 20l4-4M17 20V4M17 4l-4 4M17 4l4 4"/></svg>';

  // ---------- Күн мен уақыт ----------
  const pad = (n) => String(n).padStart(2, "0");
  const toISO = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const parseISO = (s) => { const p = s.split("-").map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  const todayISO = () => toISO(new Date());
  const addDays = (iso, n) => { const d = parseISO(iso); d.setDate(d.getDate() + n); return toISO(d); };
  const isISO = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || "") && toISO(parseISO(s)) === s;
  const fmtDay = (iso) => { const d = parseISO(iso); return d.getDate() + " " + MONTHS[d.getMonth()] + ", " + DAYS[d.getDay()]; };
  const fmtTime = (min) => pad(Math.floor(min / 60) % 24) + ":" + pad(min % 60);
  const fmtDur = (min) => Math.floor(min / 60) + " сағ" + (min % 60 ? " " + pad(min % 60) + " мин" : "");
  const nowMinutes = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };

  // ---------- Рейстерді құрастыру ----------
  function hash(str) { // FNV-1a
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) { // xorshift32: [0, 1) аралығындағы қайталанатын «кездейсоқ» сандар
    let s = seed || 1;
    return () => {
      s ^= s << 13; s >>>= 0;
      s ^= s >>> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  }
  function distanceKm(a, b) { // үлкен шеңбер бойынша қашықтық (haversine)
    const rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
    return 6371 * 2 * Math.asin(Math.sqrt(h));
  }

  // query: {from, to, date, cls}. Бағасы — бір жолаушыға, таңдалған класс үшін.
  function searchFlights(query) {
    const a = BY[query.from], b = BY[query.to];
    if (!a || !b || a === b || !isISO(query.date)) return [];
    const km = distanceKm(a, b);
    const rnd = rng(hash(query.from + ">" + query.to + "@" + query.date));
    const intl = a.country !== KZ || b.country !== KZ;
    const dur = Math.round((km / 790 * 60 + 35) / 5) * 5;          // ~790 км/сағ + ұшу-қону уақыты
    const base = (6500 + km * 11.5) * (intl ? 1.6 : 1) * (query.cls === "biz" ? 2.4 : 1);
    const count = km < 1600 ? 6 : km < 4200 ? 4 : 3;               // жақын бағытта рейс көбірек
    const wd = parseISO(query.date).getDay();
    const dayK = wd === 5 || wd === 0 ? 1.1 : wd === 2 || wd === 3 ? 0.94 : 1; // жұма/жексенбі қымбатырақ
    const step = 1050 / count;                                     // 05:30–23:00 аралығын тең бөлеміз
    const list = [];
    for (let i = 0; i < count; i++) {
      const dep = Math.round((330 + step * i + rnd() * step * 0.7) / 5) * 5;
      const peak = (dep >= 420 && dep <= 570) || (dep >= 1050 && dep <= 1230) ? 1.12 : dep < 390 || dep > 1320 ? 0.9 : 1;
      const price = Math.round(base * dayK * peak * (0.86 + rnd() * 0.42) / 10) * 10;
      const arrAbs = dep + dur + Math.round((b.tz - a.tz) * 60);   // барған жердің жергілікті уақыты
      list.push({
        id: query.from + query.to + query.date + query.cls + i,
        no: "GR " + (101 + Math.floor(rnd() * 880)),
        dep, dur,
        arr: ((arrAbs % 1440) + 1440) % 1440,
        dayShift: Math.floor(arrAbs / 1440),
        price,
        bag: Math.round(Math.max(4000, price * 0.18) / 10) * 10    // багаж қосылған тарифтің үстемесі
      });
    }
    // Бүгінгі күн үшін ұшуына 1,5 сағаттан аз қалған рейстер көрсетілмейді
    return query.date === todayISO() ? list.filter((f) => f.dep >= nowMinutes() + 90) : list;
  }

  // ---------- Күй ----------
  let q = { from: "ALA", to: "NQZ", date: addDays(todayISO(), 1), pax: 1, cls: "eco" };
  let results = [];
  let sortBy = "price";
  let pick = null;      // таңдалған рейс
  let fare = "light";   // light | bag | biz

  const tickets = () => (A.state.tickets = A.state.tickets || []);
  const fares = () => (q.cls === "biz"
    ? [{ id: "biz", name: "Бизнес", note: "Қол жүгі 10 кг және багаж 30 кг", price: pick.price }]
    : [{ id: "light", name: "Жеңіл", note: "Тек қол жүгі, 5 кг", price: pick.price },
       { id: "bag", name: "Багажбен", note: "Қол жүгі 5 кг және багаж 20 кг", price: pick.price + pick.bag }]);
  const FARE_TEXT = { light: "Қол жүгі 5 кг", bag: "Қол жүгі 5 кг + багаж 20 кг", biz: "Қол жүгі 10 кг + багаж 30 кг" };

  function validQuery() {
    if (q.from === q.to) return "Ұшу және қону қаласы бірдей болмауы керек";
    if (!isISO(q.date)) return "Ұшу күнін таңдаңыз";
    if (q.date < todayISO()) return "Өткен күнге билет алуға болмайды";
    if (q.date > addDays(todayISO(), 330)) return "Тым алыс күн: билеттер 11 айға дейін сатылады";
    return null;
  }

  // ---------- Ортақ бөліктер ----------
  const flightCard = (f, tag, cheapest) => `
    <${tag} class="flight" ${tag === "button" ? `data-flight="${f.id}"` : ""}>
      <div class="fl-top"><span>${CARRIER} · ${f.no}</span>${cheapest ? '<span class="fl-badge">Ең арзан</span>' : ""}</div>
      <div class="fl-times">
        <div><b>${fmtTime(f.dep)}</b><small>${q.from}</small></div>
        <div class="fl-mid"><small>${fmtDur(f.dur)}</small><i></i><small>тікелей рейс</small></div>
        <div><b>${fmtTime(f.arr)}${f.dayShift ? '<sup>+' + f.dayShift + "</sup>" : ""}</b><small>${q.to}</small></div>
      </div>
      <div class="fl-bottom"><span>${q.cls === "biz" ? "Бизнес · багаж 30 кг" : "Қол жүгі 5 кг"}</span><b>${money(f.price)}</b></div>
    </${tag}>`;

  function barcode(seed) { // брондау кодынан құрастырылған сәндік жолақтар (нағыз штрих-код емес)
    const r = rng(hash(seed));
    let out = "";
    for (let i = 0; i < 44; i++) out += `<i style="width:${1 + Math.floor(r() * 3)}px;margin-right:${1 + Math.floor(r() * 3)}px"></i>`;
    return `<div class="barcode" aria-hidden="true">${out}</div>`;
  }

  function makePnr() {
    const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // O/0, I/1 сияқты шатасатын таңбаларсыз
    const buf = new Uint8Array(6);
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(buf);
    else for (let i = 0; i < buf.length; i++) buf[i] = Math.floor(Math.random() * 256);
    return Array.from(buf, (b) => abc[b % abc.length]).join("");
  }

  // ---------- 1-экран: іздеу формасы және билеттерім ----------
  function ticketsHtml() {
    const list = tickets();
    if (!list.length) {
      return '<section class="list"><div class="empty" style="padding:26px 10px"><div class="big-ic">🎫</div><b>Әзірге билет жоқ</b>' +
        '<p class="note">Сатып алған билеттеріңіз осы жерде көрсетіледі.</p></div></section>';
    }
    const now = todayISO();
    const key = (t) => t.date + " " + pad(Math.floor(t.dep / 60)) + pad(t.dep % 60);
    const upcoming = list.filter((t) => t.date >= now).sort((x, y) => key(x).localeCompare(key(y)));
    const past = list.filter((t) => t.date < now).sort((x, y) => key(y).localeCompare(key(x)));
    const row = (t, old) => `<button class="row tk-row${old ? " old" : ""}" data-ticket="${t.id}">
        <span class="ic">${I.travel}</span>
        <span class="txt"><b>${BY[t.from].city} → ${BY[t.to].city}</b>
          <small>${fmtDay(t.date)} · ${fmtTime(t.dep)} · ${t.names.length} жолаушы${old ? " · өткен сапар" : ""}</small></span>${I.chev}</button>`;
    return `<section class="list">${upcoming.map((t) => row(t, false)).join("")}${past.map((t) => row(t, true)).join("")}</section>`;
  }

  A.titles.travel = "Green Travel";
  A.screens.travel = () => {
    const a = BY[q.from], b = BY[q.to];
    return `
      <div class="seg" id="tvTabs">
        <button class="on">Әуе билеттері</button><button data-soon="1">Пойыз</button><button data-soon="1">Турлар</button>
      </div>
      <section class="panel tv-form">
        <div class="tv-route">
          <button class="tv-field" id="tvFrom"><small>Қайдан</small><b>${a.city}</b><i>${a.code}</i></button>
          <button class="tv-swap" id="tvSwap" aria-label="Бағытты кері ауыстыру">${ICON_SWAP}</button>
          <button class="tv-field" id="tvTo"><small>Қайда</small><b>${b.city}</b><i>${b.code}</i></button>
        </div>
        <div class="tv-row">
          <label class="tv-field"><small>Ұшу күні</small>
            <input type="date" id="tvDate" value="${q.date}" min="${todayISO()}" max="${addDays(todayISO(), 330)}"></label>
          <div class="tv-field"><small>Жолаушылар</small>
            <div class="stepper"><button id="tvMinus" aria-label="Жолаушыны азайту">−</button><b id="tvPax">${q.pax}</b><button id="tvPlus" aria-label="Жолаушы қосу">+</button></div></div>
        </div>
        <div class="chips" id="tvCls">
          ${Object.keys(CLS).map((k) => `<button class="chip${q.cls === k ? " on" : ""}" data-v="${k}">${CLS[k]}</button>`).join("")}
        </div>
        <button class="btn" id="tvSearch">Рейстерді іздеу</button>
      </section>
      <div class="section-title">Танымал бағыттар</div>
      <div class="chips" id="tvPopular">
        ${POPULAR.map((r) => `<button class="chip" data-from="${r[0]}" data-to="${r[1]}">${BY[r[0]].city} → ${BY[r[1]].city}</button>`).join("")}
      </div>
      <div class="section-title">Менің билеттерім</div>
      <div id="tvTickets">${ticketsHtml()}</div>`;
  };

  function cityPicker(which) {
    openSheet(`<h2>${which === "from" ? "Қайдан ұшасыз?" : "Қайда ұшасыз?"}</h2>
      <input class="input" id="cityQ" type="search" autocomplete="off" placeholder="Қала, ел немесе әуежай коды">
      <div class="city-list" id="cityList"></div>`, (s) => {
      const list = $("#cityList", s);
      const draw = (text) => {
        const t = fold(text.trim());
        const found = CITIES.filter((c) => !t || fold(c.city + " " + c.country + " " + c.code).includes(t));
        list.innerHTML = found.length
          ? found.map((c) => `<button class="row" data-code="${c.code}"><span class="ic">${I.pin}</span>
              <span class="txt"><b>${c.city}</b><small>${c.country}</small></span><span class="val">${c.code}</span></button>`).join("")
          : '<div class="empty">Ештеңе табылмады</div>';
      };
      draw("");
      $("#cityQ", s).addEventListener("input", (e) => draw(e.target.value));
      list.addEventListener("click", (e) => {
        const b = e.target.closest("[data-code]");
        if (!b) return;
        const other = which === "from" ? "to" : "from";
        if (q[other] === b.dataset.code) q[other] = q[which]; // екінші өрістегі қала таңдалса — орындарын ауыстырамыз
        q[which] = b.dataset.code;
        closeSheet();
        if (A.current === "travel") go("travel", false);
      });
    });
  }

  A.after.travel = () => {
    $("#tvFrom").addEventListener("click", () => cityPicker("from"));
    $("#tvTo").addEventListener("click", () => cityPicker("to"));
    $("#tvSwap").addEventListener("click", () => {
      const t = q.from; q.from = q.to; q.to = t;
      go("travel", false);
    });
    $("#tvDate").addEventListener("change", (e) => { q.date = e.target.value; });
    const setPax = (n) => { q.pax = Math.min(MAX_PAX, Math.max(1, n)); $("#tvPax").textContent = q.pax; };
    $("#tvMinus").addEventListener("click", () => setPax(q.pax - 1));
    $("#tvPlus").addEventListener("click", () => {
      if (q.pax >= MAX_PAX) toast("Бір тапсырыста ең көбі " + MAX_PAX + " жолаушы");
      setPax(q.pax + 1);
    });
    $("#tvCls").addEventListener("click", (e) => {
      const b = e.target.closest(".chip");
      if (!b) return;
      q.cls = b.dataset.v;
      $("#tvCls").querySelectorAll(".chip").forEach((x) => x.classList.toggle("on", x === b));
    });
    $("#tvTabs").addEventListener("click", (e) => {
      if (e.target.closest("[data-soon]")) toast("Бұл бөлім жақында қосылады");
    });
    $("#tvPopular").addEventListener("click", (e) => {
      const b = e.target.closest(".chip");
      if (!b) return;
      q.from = b.dataset.from;
      q.to = b.dataset.to;
      go("travel", false);
    });
    $("#tvSearch").addEventListener("click", () => {
      const err = validQuery();
      if (err) return toast(err);
      results = searchFlights(q);
      sortBy = "price";
      go("flights");
    });
    $("#tvTickets").addEventListener("click", (e) => {
      const b = e.target.closest("[data-ticket]");
      if (b) openTicket(b.dataset.ticket, false);
    });
  };

  // ---------- 2-экран: табылған рейстер ----------
  function flightsHtml() {
    if (!results.length) {
      return '<div class="empty"><div class="big-ic">🛫</div><b>Бұл күнге рейс қалмады</b><p class="note">Басқа күнді таңдап көріңіз.</p></div>';
    }
    const min = Math.min.apply(null, results.map((f) => f.price));
    const sorted = results.slice().sort((x, y) => (sortBy === "price" ? x.price - y.price || x.dep - y.dep : x.dep - y.dep));
    let marked = false; // «Ең арзан» белгісі тек бір рейске қойылады
    return sorted.map((f) => {
      const cheapest = !marked && f.price === min;
      if (cheapest) marked = true;
      return flightCard(f, "button", cheapest);
    }).join("");
  }

  A.titles.flights = "Рейстер";
  A.screens.flights = () => `
      <section class="panel tv-summary">
        <div><b>${BY[q.from].city} → ${BY[q.to].city}</b>
          <small>${fmtDay(q.date)} · ${q.pax} жолаушы · ${CLS[q.cls]}</small></div>
        <button class="chip" id="flEdit">Өзгерту</button>
      </section>
      ${results.length > 1 ? `<div class="chips fl-sort" id="flSort">
        <button class="chip${sortBy === "price" ? " on" : ""}" data-s="price">Алдымен арзаны</button>
        <button class="chip${sortBy === "time" ? " on" : ""}" data-s="time">Ұшу уақыты бойынша</button></div>` : ""}
      <div id="flList">${flightsHtml()}</div>
      <p class="note">Демо: рейстер, уақыт пен бағалар ойдан құрастырылған. Баға бір жолаушыға көрсетілген.</p>`;

  A.after.flights = () => {
    $("#flEdit").addEventListener("click", () => A.back());
    const sort = $("#flSort");
    if (sort) {
      sort.addEventListener("click", (e) => {
        const b = e.target.closest(".chip");
        if (!b) return;
        sortBy = b.dataset.s;
        sort.querySelectorAll(".chip").forEach((x) => x.classList.toggle("on", x === b));
        $("#flList").innerHTML = flightsHtml();
      });
    }
    $("#flList").addEventListener("click", (e) => {
      const b = e.target.closest("[data-flight]");
      if (!b) return;
      pick = results.find((f) => f.id === b.dataset.flight) || null;
      if (!pick) return;
      fare = q.cls === "biz" ? "biz" : "light";
      go("booking");
    });
  };

  // ---------- 3-экран: рәсімдеу және төлеу ----------
  const NAME_RE = /^[\p{L}][\p{L} '’-]{1,39}$/u; // кемінде 2 әріп; бос орын, дефис, апостроф рұқсат
  const tidy = (v) => v.trim().replace(/\s+/g, " ");
  const farePrice = () => (fares().find((x) => x.id === fare) || fares()[0]).price;

  A.titles.booking = "Билетті рәсімдеу";
  A.screens.booking = () => {
    if (!pick) {
      return '<div class="empty"><div class="big-ic">✈️</div><b>Рейс таңдалмаған</b>' +
        '<button class="btn" data-go="travel" style="max-width:260px;margin:14px auto 0">Іздеуге өту</button></div>';
    }
    const pax = [];
    for (let i = 0; i < q.pax; i++) {
      pax.push(`<div class="pax"><b>${i + 1}-жолаушы</b>
        <div class="pax-row">
          <input class="input" data-pax="${i}" data-f="last" placeholder="Тегі" autocomplete="off" maxlength="40">
          <input class="input" data-pax="${i}" data-f="first" placeholder="Аты" autocomplete="off" maxlength="40"
            value="${i === 0 ? esc(A.state.name || "") : ""}">
        </div></div>`);
    }
    return `
      <div class="section-title" style="margin-top:16px">${BY[q.from].city} → ${BY[q.to].city} · ${fmtDay(q.date)}</div>
      ${flightCard(pick, "div", false)}
      <div class="section-title">Тариф</div>
      <div class="fares" id="bkFares">
        ${fares().map((x) => `<button class="fare${x.id === fare ? " on" : ""}" data-fare="${x.id}">
          <span><b>${x.name}</b><small>${x.note}</small></span><b>${money(x.price)}</b></button>`).join("")}
      </div>
      <div class="section-title">Жолаушылар</div>
      <section class="panel" id="bkPax">${pax.join("")}
        <p class="note">Тегі мен атын құжаттағыдай жазыңыз.</p></section>
      <section class="panel pay-box">
        <div class="pay-line"><span>Билет × ${q.pax}</span><b id="bkSum"></b></div>
        <div class="pay-line"><span>Төлем көзі</span><b>Green Gold · ${money(A.state.balance)}</b></div>
        <button class="btn" id="bkPay"></button>
        <p class="note">Демо: нағыз ақша алынбайды, ал билет ұшуға жарамсыз.</p>
      </section>`;
  };

  A.after.booking = () => {
    if (!pick) return;
    const total = () => farePrice() * q.pax;
    const sync = () => {
      $("#bkSum").textContent = money(total());
      $("#bkPay").textContent = "Төлеу · " + money(total());
    };
    sync();
    $("#bkFares").addEventListener("click", (e) => {
      const b = e.target.closest("[data-fare]");
      if (!b) return;
      fare = b.dataset.fare;
      $("#bkFares").querySelectorAll(".fare").forEach((x) => x.classList.toggle("on", x === b));
      sync();
    });
    $("#bkPay").addEventListener("click", () => {
      const names = [];
      for (let i = 0; i < q.pax; i++) {
        const last = $(`[data-pax="${i}"][data-f="last"]`), first = $(`[data-pax="${i}"][data-f="first"]`);
        const l = tidy(last.value), f = tidy(first.value);
        if (!NAME_RE.test(l) || !NAME_RE.test(f)) {
          (NAME_RE.test(l) ? first : last).focus();
          return toast((i + 1) + "-жолаушының тегі мен атын толық жазыңыз");
        }
        names.push((l + " " + f).toUpperCase());
      }
      const sum = total();
      if (sum > A.state.balance) return toast("Қаражат жеткіліксіз. Алдымен шотты толтырыңыз.");
      const t = {
        id: "t" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36),
        pnr: makePnr(),
        from: q.from, to: q.to, date: q.date,
        dep: pick.dep, arr: pick.arr, dur: pick.dur, dayShift: pick.dayShift, no: pick.no,
        cls: q.cls, fare, names, total: sum, boughtAt: Date.now()
      };
      addTx("Green Travel", q.from + " → " + q.to + " · " + fmtDay(q.date), -sum, "travel");
      A.state.tickets = [t].concat(tickets()).slice(0, 40);
      save();
      pick = null;
      results = [];
      A.resetTo("travel"); // рейстер мен рәсімдеу экрандары тарихтан алынады
      openTicket(t.id, true);
    });
  };

  // ---------- Билет ----------
  function openTicket(id, justBought) {
    const t = tickets().find((x) => x.id === id);
    if (!t) return;
    const a = BY[t.from], b = BY[t.to];
    const head = justBought
      ? '<div class="center" style="padding:2px 0 10px"><div class="big-ic">✅</div><h2 style="margin:0">Билет рәсімделді</h2></div>'
      : "<h2>Электрондық билет</h2>";
    openSheet(`${head}
      <div class="ticket">
        <div class="tk-head"><b>${CARRIER}</b><span>${t.no}</span></div>
        <div class="tk-route">
          <div><b>${a.code}</b><small>${a.city}</small></div>
          <span class="tk-plane">${I.travel}</span>
          <div><b>${b.code}</b><small>${b.city}</small></div>
        </div>
        <div class="tk-grid">
          <div><small>Күні</small><b>${fmtDay(t.date)}</b></div>
          <div><small>Ұшу</small><b>${fmtTime(t.dep)}</b></div>
          <div><small>Қону</small><b>${fmtTime(t.arr)}${t.dayShift ? " (+" + t.dayShift + " күн)" : ""}</b></div>
          <div><small>Класс</small><b>${CLS[t.cls] || ""}</b></div>
          <div class="wide"><small>Жүк</small><b>${FARE_TEXT[t.fare] || ""}</b></div>
        </div>
        <div class="tk-pax"><small>Жолаушылар</small>${t.names.map((n) => "<b>" + esc(n) + "</b>").join("")}</div>
        <div class="tk-cut"></div>
        <div class="tk-code">${barcode(t.pnr)}
          <b class="tk-pnr">${esc(t.pnr)}</b><small class="tk-label">Брондау коды</small>
          <small>ДЕМО БИЛЕТ · ұшуға жарамсыз</small></div>
      </div>
      <p class="note" style="text-align:center">Төленген сома: <b>${money(t.total)}</b></p>
      ${t.date >= todayISO() ? '<button class="btn danger" id="tkRefund">Билетті қайтару</button>' : ""}
      <button class="btn ghost" id="tkClose">${justBought ? "Дайын" : "Жабу"}</button>`, (s) => {
      $("#tkClose", s).addEventListener("click", closeSheet);
      const refund = $("#tkRefund", s);
      if (!refund) return;
      refund.addEventListener("click", () => {
        s.innerHTML = `<div class="grab"></div><h2>Билет қайтарылсын ба?</h2>
          <p class="note" style="margin-top:0">${a.city} → ${b.city}, ${fmtDay(t.date)}. Green Gold шотыңызға <b>${money(t.total)}</b> қайтарылады.</p>
          <button class="btn danger" id="tkYes">Иә, қайтару</button>
          <button class="btn ghost" id="tkNo">Болдырмау</button>`;
        $("#tkNo", s).addEventListener("click", closeSheet);
        $("#tkYes", s).addEventListener("click", () => {
          if (!tickets().some((x) => x.id === t.id)) return closeSheet(); // екі рет басылса
          A.state.tickets = tickets().filter((x) => x.id !== t.id);
          addTx("Билетті қайтару", t.from + " → " + t.to + " · " + fmtDay(t.date), t.total, "travel");
          closeSheet();
          toast("Билет қайтарылды: " + money(t.total));
          if (A.current === "travel") go("travel", false);
        });
      });
    });
  }

  // Тесттер мен жөндеуге арналған
  window.GreenTravel = { CITIES, searchFlights, distanceKm };
});
