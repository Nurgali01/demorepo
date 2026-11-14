/* Green.kz — демо супер-қосымша (банк, төлемдер, аударымдар, кредит, дүкен) */
(function () {
  "use strict";

  // ---------- Иконкалар ----------
  const I = {
    bank: '<svg viewBox="0 0 24 24"><path d="M3 10l9-6 9 6"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 21h18"/></svg>',
    pay: '<svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20M6 15h4"/></svg>',
    transfer: '<svg viewBox="0 0 24 24"><path d="M7 7h13l-4-4M17 17H4l4 4"/></svg>',
    credit: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .9-3 2s1 1.7 3 2 3 .9 3 2-1.3 2-3 2c-1.4 0-2.6-.6-3-1.6M12 6v2M12 16v2"/></svg>',
    shop: '<svg viewBox="0 0 24 24"><path d="M6 7h12l-1 13H7z"/><path d="M9 7a3 3 0 016 0"/></svg>',
    travel: '<svg viewBox="0 0 24 24"><path d="M10 14l-7-3 1-2 9 1 5-6a1.5 1.5 0 012 2l-6 5 1 9-2 1-3-7z"/></svg>',
    gov: '<svg viewBox="0 0 24 24"><path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z"/><path d="M9 12l2 2 4-4"/></svg>',
    ads: '<svg viewBox="0 0 24 24"><path d="M3 11v3a1 1 0 001 1h2l5 4V6L6 10H4a1 1 0 00-1 1zM15 9a4 4 0 010 6M18 6a8 8 0 010 12"/></svg>',
    guide: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></svg>',
    deposit: '<svg viewBox="0 0 24 24"><path d="M4 20V10l8-6 8 6v10z"/><path d="M12 11v6M9.5 13.5h5"/></svg>',
    phone: '<svg viewBox="0 0 24 24"><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/></svg>',
    home: '<svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8v9H3z"/><path d="M10 20v-5h4v5"/></svg>',
    wifi: '<svg viewBox="0 0 24 24"><path d="M2 9a15 15 0 0120 0M5 12.5a10 10 0 0114 0M8.5 16a5 5 0 017 0"/><circle cx="12" cy="19" r="1"/></svg>',
    car: '<svg viewBox="0 0 24 24"><path d="M5 16V11l2-5h10l2 5v5M3 16h18v3H3z"/><circle cx="7.5" cy="13.5" r="1"/><circle cx="16.5" cy="13.5" r="1"/></svg>',
    edu: '<svg viewBox="0 0 24 24"><path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/></svg>',
    tax: '<svg viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6z"/><path d="M9 12h7M9 16h7M9 8h3"/></svg>',
    user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>',
    card: '<svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20"/></svg>',
    globe: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
    eye: '<svg viewBox="0 0 24 24"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    eyeOff: '<svg viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 5.1A10 10 0 0112 5c6 0 10 7 10 7a17 17 0 01-3.2 3.9M6.6 6.6C3.9 8.4 2 12 2 12s4 7 10 7c1.6 0 3-.4 4.3-1"/></svg>',
    chev: '<svg class="chev" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
    settings: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-2.9 1.2V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-2.9-1.2l-.1.1a2 2 0 11-2.8-2.8l.1-.1A1.7 1.7 0 003 15H3a2 2 0 110-4h.1a1.7 1.7 0 001.2-2.9l-.1-.1a2 2 0 112.8-2.8l.1.1A1.7 1.7 0 009 4.6V3a2 2 0 114 0v.1a1.7 1.7 0 002.9 1.2l.1-.1a2 2 0 112.8 2.8l-.1.1A1.7 1.7 0 0021 11h.1a2 2 0 110 4z"/></svg>',
    logout: '<svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>'
  };

  // Басты бет мәзірі (8 сервис). ­ — жұмсақ тасымал: тар экранда ұзын сөз
  // буын бойынша бөлінеді («Хабар-ландыру»), әйтпесе бір жолда тұрады.
  const SERVICES = [
    { id: "bank", name: "Менің банкім", icon: "bank" },
    { id: "payments", name: "Төлемдер", icon: "pay" },
    { id: "transfers", name: "Аударым­дар", icon: "transfer" },
    { id: "credit", name: "Кредит", icon: "credit" },
    { id: "shop", name: "Дүкен", icon: "shop" },
    { id: "travel", name: "Travel", icon: "travel" },
    { id: "gov", name: "Мем. қызметтер", icon: "gov" },
    { id: "ads", name: "Хабар­ландыру", icon: "ads" }
  ];
  const EXTRA_SERVICES = [
    { id: "guide", name: "Green Гид", icon: "guide" },
    { id: "deposit", name: "Депозит", icon: "deposit" }
  ];

  const TITLES = {
    bank: "Менің банкім", payments: "Төлемдер", transfers: "Аударымдар",
    credit: "Green Кредит", shop: "Green Дүкен", travel: "Travel",
    gov: "Мемлекеттік қызметтер", ads: "Хабарландырулар", guide: "Green Гид",
    deposit: "Депозит", messages: "Хабарламалар", qr: "QR төлем",
    services: "Барлық сервистер", profile: "Профиль"
  };

  // ---------- Күй (state) ----------
  const STORAGE_KEY = "greenkz-state-v1";
  const defaultState = {
    name: "Айгерім",
    balance: 248500,
    hidden: false,
    loans: [],
    history: [
      { title: "Magnum", sub: "Сатып алу", amount: -12450, icon: "shop" },
      { title: "Жалақы", sub: "Кіріс", amount: 350000, icon: "bank" },
      { title: "Beeline", sub: "Мобильді байланыс", amount: -2500, icon: "phone" }
    ]
  };

  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return Object.assign({}, defaultState, JSON.parse(raw));
    } catch (e) { /* localStorage қолжетімсіз */ }
    return JSON.parse(JSON.stringify(defaultState));
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  // ---------- Көмекші функциялар ----------
  const $ = (s, r = document) => r.querySelector(s);
  const money = (n) => Math.round(n).toLocaleString("ru-RU").replace(/,/g, " ") + " ₸";
  const signed = (n) => (n > 0 ? "+" : "−") + money(Math.abs(n));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (t.hidden = true), 2400);
  }

  function addTx(title, sub, amount, icon) {
    state.history.unshift({ title, sub, amount, icon });
    state.history = state.history.slice(0, 30);
    state.balance += amount;
    save();
  }

  // ---------- Bottom sheet ----------
  // sheetSeq әр ашылу/жабылу сайын өседі: кешіктірілген әрекеттер (setTimeout)
  // жабылған немесе ауыстырылған терезеге жазып жібермеуі үшін.
  let sheetSeq = 0;
  function openSheet(html, onMount) {
    sheetSeq++;
    const sheet = $("#sheet");
    sheet.innerHTML = '<div class="grab"></div>' + html;
    $("#sheetBackdrop").hidden = false;
    if (onMount) onMount(sheet);
  }
  function closeSheet() { sheetSeq++; $("#sheetBackdrop").hidden = true; }
  const sheetAlive = (id) => id === sheetSeq && !$("#sheetBackdrop").hidden;
  $("#sheetBackdrop").addEventListener("click", (e) => { if (e.target.id === "sheetBackdrop") closeSheet(); });

  // ---------- Маршрутизация ----------
  const stack = [];
  let current = "home";

  function go(screen, push = true) {
    if (!SCREENS[screen]) screen = "soon";
    if (push && current !== screen) stack.push(current);
    current = screen;
    const isHome = screen === "home";
    $("#brand").hidden = !isHome;
    $("#screenTitle").hidden = isHome;
    $("#screenTitle").textContent = TITLES[screen] || "";
    $("#backBtn").hidden = isHome || ["messages", "qr", "services", "profile"].includes(screen);
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === screen));
    $("#content").innerHTML = SCREENS[screen]();
    if (AFTER[screen]) AFTER[screen]();
    window.scrollTo(0, 0);
  }

  function back() {
    go(stack.pop() || "home", false);
  }

  $("#backBtn").addEventListener("click", back);
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-go]");
    if (el) { e.preventDefault(); go(el.dataset.go); }
  });
  document.querySelectorAll(".tab").forEach((t) =>
    t.addEventListener("click", () => { stack.length = 0; go(t.dataset.tab, false); })
  );

  // ---------- Экрандар ----------
  const serviceTile = (s) =>
    `<button class="service" data-go="${s.id}"><span class="ic">${I[s.icon]}</span><span>${s.name}</span></button>`;

  const txRow = (t) => `
    <div class="row">
      <span class="ic">${I[t.icon] || I.card}</span>
      <span class="txt"><b>${esc(t.title)}</b><small>${esc(t.sub)}</small></span>
      <span class="val ${t.amount > 0 ? "plus" : ""}">${signed(t.amount)}</span>
    </div>`;

  const SCREENS = {
    home() {
      const bal = state.hidden ? "•••••• ₸" : money(state.balance);
      const stories = [
        ["🎁", "Бонустар"], ["💳", "Жаңа карта"], ["🏠", "Ипотека"],
        ["✈️", "Саяхат"], ["📱", "Смартфондар"], ["🛒", "Жеңілдік"]
      ];
      return `
        <section class="hero">
          <label class="search">${I.search}<input type="search" id="searchInput" placeholder="Сервис, тауар немесе төлем іздеу"></label>
        </section>

        <section class="balance-card">
          <div class="label">Green Gold карта
            <button class="eye" id="toggleBal" aria-label="Балансты жасыру">${state.hidden ? I.eyeOff : I.eye}</button>
          </div>
          <div class="amount">${bal}</div>
          <div class="mini-card">GREEN</div>
          <div class="quick">
            <button data-go="transfers">Аудару</button>
            <button data-go="payments">Төлеу</button>
            <button id="topUp">Толтыру</button>
          </div>
        </section>

        <div class="stories">
          ${stories.map(([e, t]) => `<div class="story"><div class="ring"><div>${e}</div></div>${t}</div>`).join("")}
        </div>

        <div class="section-title">Сервистер <a href="#" data-go="services">Барлығы</a></div>
        <section class="grid" id="serviceGrid">${SERVICES.map(serviceTile).join("")}</section>

        <button class="promo" data-go="credit">
          <span class="big">💸</span>
          <span><b>Green Кредит</b><small>5 000 000 ₸ дейін · шешім 2 минутта</small></span>
        </button>

        <div class="section-title">Соңғы операциялар <a href="#" data-go="bank">Тарих</a></div>
        <section class="list">${state.history.slice(0, 4).map(txRow).join("")}</section>
      `;
    },

    services() {
      return `<div class="section-title">Негізгі</div>
        <section class="grid">${SERVICES.map(serviceTile).join("")}</section>
        <div class="section-title">Қосымша</div>
        <section class="grid">${EXTRA_SERVICES.map(serviceTile).join("")}</section>`;
    },

    bank() {
      const loanRows = state.loans.map((l) => `
        <div class="row"><span class="ic">${I.credit}</span>
          <span class="txt"><b>Кредит ${money(l.amount)}</b><small>${l.months} ай · айына ${money(l.monthly)}</small></span>
        </div>`).join("");
      return `
        <div class="bank-card">
          <div class="t">Green Gold</div>
          <div class="b">${state.hidden ? "•••••• ₸" : money(state.balance)}</div>
          <div class="n">•••• •••• •••• 4821</div>
        </div>
        <div class="quick" style="margin-top:14px">
          <button class="btn ghost" style="margin:0" data-go="transfers">Аудару</button>
          <button class="btn ghost" style="margin:0" data-go="payments">Төлеу</button>
          <button class="btn ghost" style="margin:0" id="topUp">Толтыру</button>
        </div>
        <div class="section-title">Шоттарым</div>
        <section class="list">
          <div class="row"><span class="ic">${I.card}</span><span class="txt"><b>Green Gold</b><small>Дебет карта</small></span><span class="val">${money(state.balance)}</span></div>
          <button class="row" data-go="deposit"><span class="ic">${I.deposit}</span><span class="txt"><b>Green Депозит</b><small>Жылына 14% дейін</small></span>${I.chev}</button>
          ${loanRows || `<button class="row" data-go="credit"><span class="ic">${I.credit}</span><span class="txt"><b>Кредит алу</b><small>Белсенді кредит жоқ</small></span>${I.chev}</button>`}
        </section>
        <div class="section-title">Операциялар тарихы</div>
        <section class="list">${state.history.map(txRow).join("")}</section>`;
    },

    payments() {
      const cats = [
        ["phone", "Мобильді байланыс", "Beeline, Kcell, Tele2, Altel"],
        ["home", "Коммуналдық қызметтер", "Жарық, су, газ, жылу"],
        ["wifi", "Интернет және ТВ", "Казахтелеком, iD Net"],
        ["car", "Айыппұлдар", "ЖЖЕ айыппұлдары"],
        ["tax", "Салықтар", "Мүлік, көлік, жер салығы"],
        ["edu", "Білім беру", "Мектеп, балабақша, ЖОО"]
      ];
      return `<div class="section-title">Санаттар</div>
        <section class="list">
          ${cats.map(([ic, t, s]) => `<button class="row pay-cat" data-cat="${t}"><span class="ic">${I[ic]}</span><span class="txt"><b>${t}</b><small>${s}</small></span>${I.chev}</button>`).join("")}
        </section>`;
    },

    transfers() {
      const types = [
        ["user", "Green клиентіне", "Телефон нөмірі бойынша, комиссиясыз"],
        ["transfer", "Өз шоттарым арасында", "Карта, депозит"],
        ["card", "Басқа банк картасына", "Visa, Mastercard"],
        ["globe", "Халықаралық аударым", "Ресей, Өзбекстан, Қырғызстан т.б."]
      ];
      return `<div class="section-title">Кімге аударамыз?</div>
        <section class="list">
          ${types.map(([ic, t, s]) => `<button class="row tr-type" data-type="${t}"><span class="ic">${I[ic]}</span><span class="txt"><b>${t}</b><small>${s}</small></span>${I.chev}</button>`).join("")}
        </section>`;
    },

    credit() {
      return `
        <section class="panel">
          <div class="field">
            <label>Кредит сомасы <b id="amtLbl"></b></label>
            <input type="range" id="amt" min="50000" max="5000000" step="10000" value="500000">
            <div class="range-ends"><span>50 000 ₸</span><span>5 000 000 ₸</span></div>
          </div>
          <div class="field">
            <label>Мерзімі <b id="termLbl"></b></label>
            <div class="chips" id="terms">
              ${[3, 6, 12, 24, 36, 60].map((m) => `<button class="chip ${m === 12 ? "on" : ""}" data-m="${m}">${m} ай</button>`).join("")}
            </div>
          </div>
          <div class="field">
            <label>Өтеу әдісі</label>
            <div class="chips" id="method">
              <button class="chip on" data-v="ann">Аннуитетті</button>
              <button class="chip" data-v="diff">Сараланған</button>
            </div>
          </div>
          <div class="summary">
            <div class="main"><small id="monthlyLbl">Ай сайынғы төлем</small><b id="monthly"></b></div>
            <div><small>Сыйақы мөлшерлемесі</small><b id="rate"></b></div>
            <div><small>Артық төлем</small><b id="overpay"></b></div>
            <div style="grid-column:1/-1"><small>Барлығы қайтарасыз</small><b id="total"></b></div>
          </div>
          <button class="btn" id="applyBtn">Өтінім беру</button>
          <button class="btn ghost" id="schedBtn">Төлем кестесі</button>
          <p class="note">Бұл — демо-калькулятор. Есептеу шамамен алынған, нақты банк ұсынысы емес.</p>
        </section>`;
    },

    shop() {
      const items = [
        ["📱", "Смартфон X12 128GB", 289990], ["💻", "Ноутбук Air 14", 459990],
        ["🎧", "Сымсыз құлаққап", 39990], ["⌚", "Смарт сағат S5", 79990],
        ["📺", "Теледидар 55\" 4K", 249990], ["🧊", "Тоңазытқыш NoFrost", 329990]
      ];
      return `<section class="products">
        ${items.map(([e, n, p]) => `
          <button class="product buy" data-name="${esc(n)}" data-price="${p}">
            <div class="img">${e}</div><b>${n}</b>
            <div class="price">${money(p)}</div>
            <span class="inst">12 ай × ${money(p / 12)}</span>
          </button>`).join("")}
      </section>`;
    },

    deposit() {
      return `<section class="panel">
        <div class="field"><label>Сома <b id="depLbl"></b></label>
          <input type="range" id="dep" min="10000" max="10000000" step="10000" value="1000000"></div>
        <div class="summary">
          <div class="main"><small>12 айдан кейін (14%, ай сайын капиталдандыру)</small><b id="depRes"></b></div>
        </div>
        <p class="note">Демо есептеу. Нақты мөлшерлеме шарттарға байланысты.</p>
      </section>`;
    },

    messages() {
      const msgs = [
        ["💸", "Green Кредит", "Сізге 1 500 000 ₸ дейін кредит алдын ала мақұлданды"],
        ["🎁", "Бонустар", "Осы аптада 3 000 бонус жинадыңыз"],
        ["🛒", "Green Дүкен", "Тапсырысыңыз жолда, ертең жеткізіледі"],
        ["🔐", "Қауіпсіздік", "Кодыңызды ешкімге айтпаңыз, тіпті банк қызметкеріне де"]
      ];
      return `<div class="section-title">Соңғы</div><section class="list">
        ${msgs.map(([e, t, s]) => `<div class="row"><span class="ic">${e}</span><span class="txt"><b>${t}</b><small>${s}</small></span></div>`).join("")}
      </section>`;
    },

    qr() {
      return `<div class="qr-screen">
          <div class="qr-frame"></div>
          <p class="note" style="font-size:14px;margin-top:18px">Төлеу үшін камераны QR кодқа бағыттаңыз</p>
          <button class="btn" id="fakeScan">Демо сканерлеу</button>
        </div>`;
    },

    profile() {
      return `<section class="panel" style="text-align:center">
          <div class="logo" style="width:72px;height:72px;margin:0 auto;border-radius:22px;background:var(--green-soft)">${I.user}</div>
          <h2 style="margin-top:12px">${esc(state.name)}</h2>
          <p class="note">+7 (7••) ••• •• 21</p>
        </section>
        <div class="section-title">Баптаулар</div>
        <section class="list">
          <button class="row" id="editName"><span class="ic">${I.user}</span><span class="txt"><b>Атымды өзгерту</b></span>${I.chev}</button>
          <div class="row"><span class="ic">${I.settings}</span><span class="txt"><b>Тіл</b><small>Қазақша</small></span></div>
          <button class="row" id="resetDemo"><span class="ic">${I.logout}</span><span class="txt"><b>Демо деректерді тазалау</b></span>${I.chev}</button>
        </section>`;
    },

    soon() {
      return `<div class="empty"><div class="big-ic">🌱</div><b>Жақында іске қосылады</b><p class="note">Бұл сервис әзірленуде.</p></div>`;
    }
  };
  ["travel", "gov", "ads", "guide"].forEach((k) => (SCREENS[k] = SCREENS.soon));

  // ---------- Экраннан кейінгі логика ----------
  function bindTopUp() {
    const b = $("#topUp");
    if (!b) return;
    b.addEventListener("click", () => {
      openSheet(`<h2>Шотты толтыру</h2>
        <input class="input" id="tuAmt" type="number" inputmode="numeric" placeholder="Сома, ₸" min="1">
        <button class="btn" id="tuOk">Толтыру</button>`, (s) => {
        $("#tuOk", s).addEventListener("click", () => {
          const v = Number($("#tuAmt", s).value);
          if (!(v > 0)) return toast("Соманы енгізіңіз");
          addTx("Шотты толтыру", "Басқа банк картасынан", v, "card");
          closeSheet(); toast("Шот толтырылды: " + money(v)); go(current, false);
        });
      });
    });
  }

  function payFlow(title, sub, icon, fields) {
    openSheet(`<h2>${esc(title)}</h2>
      ${fields}
      <input class="input" id="pAmt" type="number" inputmode="numeric" placeholder="Сома, ₸" min="1">
      <p class="note">Қолжетімді: ${money(state.balance)}</p>
      <button class="btn" id="pOk">Растау</button>`, (s) => {
      $("#pOk", s).addEventListener("click", () => {
        const v = Number($("#pAmt", s).value);
        const target = $("#pTarget", s);
        if (target && !target.value.trim()) return toast("Деректерді толтырыңыз");
        if (!(v > 0)) return toast("Соманы енгізіңіз");
        if (v > state.balance) return toast("Қаражат жеткіліксіз");
        addTx(target ? target.value.trim() : title, sub, -v, icon);
        s.innerHTML = `<div class="center"><div class="big-ic">✅</div><h2>Сәтті орындалды</h2>
          <p class="note">${esc(title)} · ${money(v)}</p><button class="btn" id="done">Жақсы</button></div>`;
        $("#done", s).addEventListener("click", () => { closeSheet(); go(current, false); });
      });
    });
  }

  const AFTER = {
    home() {
      $("#toggleBal").addEventListener("click", () => { state.hidden = !state.hidden; save(); go("home", false); });
      bindTopUp();
      const all = SERVICES.concat(EXTRA_SERVICES);
      $("#searchInput").addEventListener("input", (e) => {
        const q = e.target.value.trim().toLowerCase();
        const list = q ? all.filter((s) => s.name.replace(/­/g, "").toLowerCase().includes(q)) : SERVICES;
        $("#serviceGrid").innerHTML = list.length ? list.map(serviceTile).join("") :
          '<p class="note" style="grid-column:1/-1;text-align:center">Ештеңе табылмады</p>';
      });
    },

    bank: bindTopUp,

    payments() {
      document.querySelectorAll(".pay-cat").forEach((b) =>
        b.addEventListener("click", () =>
          payFlow(b.dataset.cat, "Төлем", "pay",
            '<input class="input" id="pTarget" placeholder="Шот нөмірі немесе телефон">')));
    },

    transfers() {
      document.querySelectorAll(".tr-type").forEach((b) =>
        b.addEventListener("click", () => {
          const t = b.dataset.type;
          const ph = t.includes("картасына") ? "Карта нөмірі" : t.includes("Өз") ? "Шот (депозит)" : "+7 (___) ___ __ __";
          payFlow(t, "Аударым", "transfer", `<input class="input" id="pTarget" placeholder="${ph}">`);
        }));
    },

    credit() {
      const ANNUAL = 0.245; // демо мөлшерлеме
      let months = 12, method = "ann";
      const amt = $("#amt");

      function calc() {
        const S = Number(amt.value), r = ANNUAL / 12;
        const rows = [];
        let rest = S, total = 0;
        const ann = S * r / (1 - Math.pow(1 + r, -months));
        for (let i = 1; i <= months; i++) {
          const interest = rest * r;
          const principal = method === "ann" ? ann - interest : S / months;
          const pay = principal + interest;
          rest = Math.max(0, rest - principal);
          total += pay;
          rows.push({ i, pay, principal, interest, rest });
        }
        return { S, rows, total, first: rows[0].pay, last: rows[rows.length - 1].pay };
      }

      function render() {
        const c = calc();
        $("#amtLbl").textContent = money(c.S);
        $("#termLbl").textContent = months + " ай";
        $("#monthlyLbl").textContent = method === "ann" ? "Ай сайынғы төлем" : "Алғашқы → соңғы төлем";
        $("#monthly").textContent = method === "ann" ? money(c.first) : `${money(c.first)} → ${money(c.last)}`;
        $("#rate").textContent = (ANNUAL * 100).toFixed(1) + "%";
        $("#overpay").textContent = money(c.total - c.S);
        $("#total").textContent = money(c.total);
        return c;
      }

      amt.addEventListener("input", render);
      $("#terms").addEventListener("click", (e) => {
        const b = e.target.closest(".chip"); if (!b) return;
        months = Number(b.dataset.m);
        $("#terms").querySelectorAll(".chip").forEach((x) => x.classList.toggle("on", x === b));
        render();
      });
      $("#method").addEventListener("click", (e) => {
        const b = e.target.closest(".chip"); if (!b) return;
        method = b.dataset.v;
        $("#method").querySelectorAll(".chip").forEach((x) => x.classList.toggle("on", x === b));
        render();
      });
      render();

      $("#schedBtn").addEventListener("click", () => {
        const c = calc();
        openSheet(`<h2>Төлем кестесі</h2>
          <table class="schedule"><thead><tr><th>Ай</th><th>Төлем</th><th>Негізгі</th><th>Сыйақы</th></tr></thead>
          <tbody>${c.rows.map((r) => `<tr><td>${r.i}</td><td>${money(r.pay)}</td><td>${money(r.principal)}</td><td>${money(r.interest)}</td></tr>`).join("")}</tbody></table>
          <button class="btn ghost" id="cl">Жабу</button>`, (s) => $("#cl", s).addEventListener("click", closeSheet));
      });

      $("#applyBtn").addEventListener("click", () => {
        const c = calc();
        openSheet(`<h2>Кредитке өтінім</h2>
          <input class="input" id="iin" inputmode="numeric" maxlength="12" placeholder="ЖСН (12 сан)">
          <input class="input" id="inc" type="number" inputmode="numeric" placeholder="Ай сайынғы табыс, ₸">
          <p class="note">Сома: <b>${money(c.S)}</b> · ${months} ай · айына ~${money(c.first)}</p>
          <button class="btn" id="send">Жіберу</button>`, (s) => {
          $("#send", s).addEventListener("click", () => {
            const iin = $("#iin", s).value.trim();
            const inc = Number($("#inc", s).value);
            if (!/^\d{12}$/.test(iin)) return toast("ЖСН 12 саннан тұруы керек");
            if (!(inc > 0)) return toast("Табысыңызды енгізіңіз");
            s.innerHTML = '<div class="center"><div class="spinner"></div><h2>Өтінім қаралуда…</h2><p class="note">Әдетте 2 минуттан аспайды</p></div>';
            const myId = sheetSeq;
            setTimeout(() => {
              if (!sheetAlive(myId)) return; // пайдаланушы терезені жауып қойды
              // Демо скоринг: ай сайынғы төлем табыстың 50%-ынан аспауы керек
              const ok = c.first <= inc * 0.5;
              if (ok) {
                s.innerHTML = `<div class="center"><div class="big-ic">🎉</div><h2>Мақұлданды!</h2>
                  <p class="note">${money(c.S)} Green Gold картаңызға аударылады</p>
                  <button class="btn" id="take">Ақшаны алу</button></div>`;
                $("#take", s).addEventListener("click", () => {
                  state.loans.push({ amount: c.S, months, monthly: Math.round(c.first) });
                  addTx("Green Кредит", months + " айға", c.S, "credit");
                  closeSheet(); toast("Кредит картаға түсті"); go("bank");
                });
              } else {
                s.innerHTML = `<div class="center"><div class="big-ic">😔</div><h2>Өкінішке орай, бас тартылды</h2>
                  <p class="note">Ай сайынғы төлем табысыңыздың 50%-ынан аспауы керек. Соманы азайтып немесе мерзімді ұзартып көріңіз.</p>
                  <button class="btn ghost" id="cl">Жабу</button></div>`;
                $("#cl", s).addEventListener("click", closeSheet);
              }
            }, 1800);
          });
        });
      });
    },

    shop() {
      document.querySelectorAll(".buy").forEach((b) =>
        b.addEventListener("click", () => {
          const n = b.dataset.name, p = Number(b.dataset.price);
          openSheet(`<h2>${esc(n)}</h2>
            <p class="note" style="font-size:15px">Бағасы: <b>${money(p)}</b></p>
            <button class="btn" id="full">Бірден төлеу</button>
            <button class="btn ghost" id="inst">12 айға бөліп төлеу · ${money(p / 12)}/ай</button>`, (s) => {
            $("#full", s).addEventListener("click", () => {
              if (p > state.balance) return toast("Қаражат жеткіліксіз");
              addTx(n, "Green Дүкен", -p, "shop"); closeSheet(); toast("Тапсырыс рәсімделді");
            });
            $("#inst", s).addEventListener("click", () => {
              state.loans.push({ amount: p, months: 12, monthly: Math.round(p / 12) });
              save(); closeSheet(); toast("Бөліп төлеу рәсімделді");
            });
          });
        }));
    },

    deposit() {
      const d = $("#dep");
      const r = () => {
        const S = Number(d.value);
        $("#depLbl").textContent = money(S);
        $("#depRes").textContent = money(S * Math.pow(1 + 0.14 / 12, 12));
      };
      d.addEventListener("input", r); r();
    },

    qr() {
      $("#fakeScan").addEventListener("click", () =>
        payFlow("Кофейня «Жасыл»", "QR төлем", "pay", ""));
    },

    profile() {
      $("#editName").addEventListener("click", () => {
        openSheet(`<h2>Атыңыз</h2><input class="input" id="nm" value="${esc(state.name)}"><button class="btn" id="ok">Сақтау</button>`, (s) => {
          $("#ok", s).addEventListener("click", () => {
            const v = $("#nm", s).value.trim(); if (!v) return;
            state.name = v; save(); closeSheet(); go("profile", false);
          });
        });
      });
      $("#resetDemo").addEventListener("click", () => {
        state = JSON.parse(JSON.stringify(defaultState)); save(); toast("Деректер тазаланды"); go("home", false);
      });
    }
  };

  // ---------- Android қосымшасымен байланыс ----------
  // APK ішінде бет index.html#app=1&sat=<статус-бар биіктігі> ретінде ашылады.
  const params = new URLSearchParams(location.hash.slice(1));
  if (params.get("app") === "1") document.documentElement.classList.add("in-app");

  // Статус-бар биіктігі (CSS px): жасыл тақырып оның астына да созылады.
  window.greenSetInset = (px) => {
    const v = Number(px);
    if (Number.isFinite(v) && v >= 0) document.documentElement.style.setProperty("--sat", v + "px");
  };
  if (params.has("sat")) window.greenSetInset(params.get("sat"));

  // Телефонның «Артқа» батырмасы: алдымен терезені жабады, сосын алдыңғы экранға
  // қайтады. Басты бетте false қайтарады — сонда Android қосымшадан шығады.
  window.greenBack = () => {
    if (!$("#sheetBackdrop").hidden) { closeSheet(); return true; }
    if (current !== "home") { back(); return true; }
    return false;
  };

  go("home", false);
})();
