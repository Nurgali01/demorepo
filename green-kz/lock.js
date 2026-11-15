/* Green.kz — кіру құлпы: 4 санды код және биометрия (саусақ ізі / бет тану).
 *
 * window.GreenLock = { start({onUnlock, onWipe, toast}), lock(), changePin(), isOpen(), back(),
 *                      bioInfo(), setBio(on), noteFilePicker() }
 *
 * - Код ешқашан ашық түрде сақталмайды: тұз (salt) + PBKDF2-SHA256 хэші ғана.
 * - Биометрия Android қосымшасында ғана бар (window.GreenNative көпірі). Жүйелік терезе
 *   саусақ ізін де, бет тануды да көрсете алады — қайсысы шығатынын телефон шешеді.
 * - Бұл — қосымша деңгейіндегі экран құлпы; деректер шифрланбайды.
 */
(function () {
  "use strict";

  const KEY = "greenkz-lock-v1";
  const PIN_LEN = 4;
  const RELOCK_MS = 10 * 1000;           // қосымшадан шыққаннан кейін осы уақыт ішінде қайта кірсе, сұрамайды
  const PICKER_GRACE_MS = 5 * 60 * 1000; // файл таңдап жатқанда құлыпталмайды
  const TRIES = 5;                       // осынша қате әрекеттен кейін күту басталады
  const ITERATIONS = 150000;
  const BIO_CANCEL = [5, 10, 13];        // Android: бас тарту / «Кодты енгізу» батырмасы

  const byId = (id) => document.getElementById(id);

  const ICON_FINGER = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.3 6.6A7.6 7.6 0 0119.6 12v1.2"/><path d="M4.4 12c0-1.2.3-2.4.8-3.4"/><path d="M4.6 15.5c.3 1 .4 2 .2 3"/><path d="M8 20.2c1-1.9 1.4-3.8 1.4-6.2v-2a2.6 2.6 0 015.2 0v2.2c0 1.8-.2 3.6-.8 5.3"/><path d="M12 12v2.2c0 2.5-.5 4.7-1.5 6.8"/><path d="M7 12a5 5 0 0110 0v2c0 2-.2 4-.8 5.8"/></svg>';
  const ICON_DEL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5h11a1 1 0 011 1v12a1 1 0 01-1 1H9l-6-7z"/><path d="M12 9.5l5 5M17 9.5l-5 5"/></svg>';

  let cfg = load();
  let hooks = { onUnlock() {}, onWipe() {}, toast() {} };
  let flow = "unlock";   // unlock — кіру | setup — алғашқы орнату | change — кодты өзгерту
  let mode = "enter";    // enter | old | create | repeat
  let entered = "", first = "", busy = false;
  let locked = true, started = false, bound = false;
  let hiddenAt = 0, skipRelockUntil = 0, ticker = 0, bioBusy = false, bioOk = false;

  // ---------- Сақтау ----------
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) { /* ignore */ }
  }

  // ---------- Кодты хэштеу ----------
  const hasSubtle = () => !!(window.crypto && window.crypto.subtle && window.TextEncoder);
  const toHex = (buf) => Array.prototype.map.call(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
  function fromHex(hex) {
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
    return out;
  }
  function randomSalt() {
    const b = new Uint8Array(16);
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(b);
    else for (let i = 0; i < b.length; i++) b[i] = Math.floor(Math.random() * 256);
    return toHex(b);
  }
  // cyrb53 — crypto.subtle жоқ ортаға арналған қосалқы (криптографиялық емес) хэш
  function cyrb53(str, seed) {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
  }
  async function derive(pin, salt, kdf, iter) {
    if (kdf === "pbkdf2") {
      const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
      const bits = await crypto.subtle.deriveBits(
        { name: "PBKDF2", hash: "SHA-256", salt: fromHex(salt), iterations: iter }, key, 256);
      return toHex(bits);
    }
    let h = salt + ":" + pin;
    for (let i = 0; i < 2000; i++) h = cyrb53(h + salt, i).toString(16) + cyrb53(salt + h, i + 7).toString(16);
    return h;
  }
  async function setPin(pin) {
    cfg.kdf = hasSubtle() ? "pbkdf2" : "simple";
    cfg.iter = ITERATIONS;
    cfg.salt = randomSalt();
    cfg.hash = await derive(pin, cfg.salt, cfg.kdf, cfg.iter);
    cfg.fails = 0;
    cfg.until = 0;
    save();
  }
  async function verify(pin) {
    try { return (await derive(pin, cfg.salt, cfg.kdf, cfg.iter)) === cfg.hash; }
    catch (e) { return false; }
  }

  // ---------- Биометрия (Android көпірі) ----------
  // Күй: 0 — дайын; 11 — саусақ ізі/бет тіркелмеген; -1 — көпір жоқ (браузер); басқасы — қолжетімсіз
  function bioStatus() {
    try {
      const n = window.GreenNative;
      return n && typeof n.bioStatus === "function" ? Number(n.bioStatus()) : -1;
    } catch (e) { return -1; }
  }
  function bioAuth() {
    return new Promise((resolve) => {
      if (bioBusy || bioStatus() !== 0) return resolve({ ok: false, code: -1, msg: "" });
      bioBusy = true;
      window.greenBioResult = (ok, code, msg) => {
        bioBusy = false;
        window.greenBioResult = null;
        resolve({ ok: !!ok, code: Number(code) || 0, msg: msg || "" });
      };
      try {
        window.GreenNative.bioAuth("Green.kz", "Саусақ ізі немесе бет арқылы кіріңіз", "Кодты енгізу");
      } catch (e) {
        bioBusy = false;
        window.greenBioResult = null;
        resolve({ ok: false, code: -2, msg: "" });
      }
    });
  }
  const bioReady = () => !!cfg.bio && bioStatus() === 0;

  function tryBio() {
    if (!(locked && flow === "unlock" && mode === "enter" && bioReady())) return;
    bioAuth().then((r) => {
      if (r.ok) { if (locked && flow === "unlock") unlock(); return; }
      if (r.msg && BIO_CANCEL.indexOf(r.code) < 0) setMsg(r.msg, true);
    });
  }

  // ---------- Интерфейс ----------
  const TITLES = {
    enter: "Кіру кодын енгізіңіз",
    old: "Қазіргі кодты енгізіңіз",
    create: "4 санды код ойлап табыңыз",
    repeat: "Кодты қайталаңыз"
  };

  function buildPad() {
    const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "bio", "0", "del"];
    return keys.map((k) => {
      if (k === "bio") return '<button class="key key-ghost" data-k="bio" aria-label="Саусақ ізі немесе бет арқылы кіру">' + ICON_FINGER + "</button>";
      if (k === "del") return '<button class="key key-ghost" data-k="del" aria-label="Өшіру">' + ICON_DEL + "</button>";
      return '<button class="key" data-k="' + k + '">' + k + "</button>";
    }).join("");
  }

  function renderBody() {
    byId("lockBody").innerHTML =
      '<div class="lock-mid">' +
        '<p class="lock-title" id="lockTitle"></p>' +
        '<div class="lock-dots" id="lockDots">' + "<i></i>".repeat(PIN_LEN) + "</div>" +
        '<p class="lock-msg" id="lockMsg" role="status" aria-live="polite"></p>' +
      "</div>" +
      '<div class="lock-pad" id="lockPad">' + buildPad() + "</div>" +
      '<button class="lock-forgot" id="lockForgot">Кодты ұмыттыңыз ба?</button>';
    byId("lockPad").addEventListener("click", (e) => {
      const b = e.target.closest("[data-k]");
      if (b) press(b.dataset.k);
    });
    byId("lockForgot").addEventListener("click", askReset);
    refresh();
  }

  // Екі батырмасы бар панель (кодты қалпына келтіру / биометрияны қосу ұсынысы)
  function renderPanel(icon, title, text, yes, no, onYes, onNo, danger) {
    byId("lockBody").innerHTML =
      '<div class="lock-panel"><div class="big-ic">' + icon + "</div><h2></h2><p></p>" +
      '<p class="lock-msg" id="lockMsg" role="status" aria-live="polite"></p>' +
      '<button class="btn' + (danger ? " danger" : "") + '" id="lockYes"></button>' +
      '<button class="btn ghost" id="lockNo"></button></div>';
    const p = byId("lockBody").firstChild;
    p.querySelector("h2").textContent = title;
    p.querySelector("p").textContent = text;
    byId("lockYes").textContent = yes;
    byId("lockNo").textContent = no;
    byId("lockYes").addEventListener("click", onYes);
    byId("lockNo").addEventListener("click", onNo);
  }
  const panelOpen = () => !!byId("lockYes");

  function refresh() {
    if (!byId("lockTitle")) return;
    byId("lockTitle").textContent = mode === "create" && flow === "change" ? "Жаңа кодты ойлап табыңыз" : TITLES[mode];
    const dots = byId("lockDots").children;
    for (let i = 0; i < dots.length; i++) dots[i].classList.toggle("on", i < entered.length);
    byId("lockForgot").hidden = !(flow === "unlock" && mode === "enter");
    byId("lockClose").hidden = flow !== "change";
    const bio = byId("lockPad").querySelector('[data-k="bio"]');
    bio.classList.toggle("off", !(flow === "unlock" && mode === "enter" && bioOk));
  }

  function setMsg(text, isError) {
    const m = byId("lockMsg");
    if (!m) return;
    m.textContent = text || "";
    m.classList.toggle("err", !!isError);
  }

  function setMode(m) {
    mode = m;
    entered = "";
    busy = false;
    bioOk = bioReady(); // жүйеден режим ауысқанда бір рет қана сұраймыз
    if (panelOpen() || !byId("lockTitle")) renderBody(); else refresh();
    setMsg("");
    watchThrottle();
  }

  function shake() {
    const d = byId("lockDots");
    if (!d) return;
    d.classList.remove("err");
    void d.offsetWidth; // анимацияны қайта бастау
    d.classList.add("err");
    setTimeout(() => { d.classList.remove("err"); entered = ""; refresh(); }, 420);
  }

  function show() {
    const a = document.activeElement;
    if (a && a.blur) a.blur(); // ашық пернетақтаны жабу
    byId("lock").hidden = false;
  }
  function hide() {
    byId("lock").hidden = true;
    clearInterval(ticker);
    ticker = 0;
  }

  // ---------- Қате әрекеттерден кейінгі күту ----------
  const waitLeft = () => Math.max(0, Math.ceil(((cfg.until || 0) - Date.now()) / 1000));
  const needsCode = () => mode === "enter" || mode === "old";

  function watchThrottle() {
    clearInterval(ticker);
    ticker = 0;
    if (!needsCode() || !waitLeft()) return;
    const tick = () => {
      const s = waitLeft();
      if (!needsCode()) { clearInterval(ticker); ticker = 0; return; }
      if (s > 0) return setMsg("Тым көп қате әрекет. " + s + " секундтан кейін қайталаңыз.", true);
      clearInterval(ticker);
      ticker = 0;
      setMsg("");
    };
    tick();
    ticker = setInterval(tick, 500);
  }

  // ---------- Код енгізу ----------
  function press(k) {
    if (busy || panelOpen()) return;
    if (k === "bio") return tryBio();
    if (needsCode() && waitLeft()) return;
    if (k === "del") { entered = entered.slice(0, -1); return refresh(); }
    if (!/^\d$/.test(k) || entered.length >= PIN_LEN) return;
    entered += k;
    refresh();
    if (entered.length === PIN_LEN) submit();
  }

  async function submit() {
    const pin = entered;
    if (mode === "create") {
      first = pin;
      return setTimeout(() => setMode("repeat"), 120);
    }
    if (mode === "repeat") {
      if (pin !== first) {
        first = "";
        setMsg("Кодтар сәйкес келмеді. Қайтадан бастаңыз.", true);
        shake();
        return setTimeout(() => { mode = "create"; refresh(); }, 430);
      }
      busy = true;
      await setPin(pin);
      busy = false;
      first = "";
      if (flow === "change") {
        hide();
        hooks.toast("Кіру коды өзгертілді");
        return;
      }
      return bioStatus() === 0 ? offerBio() : unlock();
    }
    // enter | old: кодты тексеру
    busy = true;
    const ok = await verify(pin);
    busy = false;
    if (ok) {
      cfg.fails = 0;
      cfg.until = 0;
      save();
      if (mode === "old") return setMode("create");
      return unlock();
    }
    cfg.fails = (cfg.fails || 0) + 1;
    if (cfg.fails % TRIES === 0) {
      cfg.until = Date.now() + Math.min(30000 * Math.pow(2, cfg.fails / TRIES - 1), 15 * 60000);
    }
    save();
    shake();
    if (waitLeft()) watchThrottle();
    else setMsg("Қате код. Тағы " + (TRIES - (cfg.fails % TRIES)) + " әрекет қалды.", true);
  }

  // ---------- Сценарийлер ----------
  function unlock() {
    locked = false;
    hiddenAt = 0;
    entered = "";
    hide();
    if (!started) {
      started = true;
      hooks.onUnlock();
    }
  }

  function lock() {
    if (!cfg.hash) return;
    locked = true;
    if (cfg.leftAt) { cfg.leftAt = 0; save(); }
    flow = "unlock";
    setMode("enter");
    show();
    tryBio();
  }

  function offerBio() {
    renderPanel('<span class="lock-badge">' + ICON_FINGER + "</span>", "Саусақ ізі немесе бет арқылы кіру",
      "Келесі жолы кодты термей-ақ, саусақ ізімен немесе бет танумен кіре аласыз. Мұны кейін Профиль бөлімінен өзгертуге болады.",
      "Қосу", "Кейінірек",
      () => {
        bioAuth().then((r) => {
          if (r.ok) { cfg.bio = true; save(); return unlock(); }
          if (r.msg && BIO_CANCEL.indexOf(r.code) < 0) setMsg(r.msg, true);
        });
      },
      unlock);
  }

  function askReset() {
    renderPanel("⚠️", "Кодты ұмыттыңыз ба?",
      "Жаңа код орнату үшін қосымшадағы барлық дерек өшіріледі: баланс, операциялар тарихы және жүктелген құжаттар. Бұл әрекетті қайтару мүмкін емес.",
      "Барлығын өшіріп, жаңа код орнату", "Болдырмау",
      async () => {
        byId("lockYes").disabled = true;
        try { await hooks.onWipe(); } catch (e) { /* ignore */ }
        cfg = {};
        try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
        flow = "setup";
        setMode("create");
      },
      () => setMode("enter"), true);
  }

  function changePin() {
    if (!cfg.hash) return;
    flow = "change";
    setMode("old");
    show();
  }

  // Android «Артқа» батырмасы: true — өзіміз өңдедік; false — қосымшадан шығу
  function back() {
    if (flow === "change") { hide(); return true; }
    if (panelOpen() && flow === "unlock") { setMode("enter"); return true; }
    return false;
  }

  function setBio(on) {
    if (!on) { cfg.bio = false; save(); return Promise.resolve(true); }
    return bioAuth().then((r) => {
      if (r.ok) { cfg.bio = true; save(); }
      else if (r.msg && BIO_CANCEL.indexOf(r.code) < 0) hooks.toast(r.msg);
      return r.ok;
    });
  }

  // ---------- Қосымшадан шығу / қайта кіру ----------
  // Код тек қосымшаға кірген кезде сұралады. Шыққаннан кейін RELOCK_MS ішінде қайта
  // кірсе — сұралмайды. Шыққан уақыт cfg.leftAt ішінде де сақталады: қосымша толық
  // жабылып, қайта ашылса да (суық іске қосу) сол ереже сақталады.
  const leftRecently = () => {
    const d = Date.now() - (cfg.leftAt || 0);
    return !!cfg.leftAt && d >= 0 && d < RELOCK_MS;
  };
  function onHidden() {
    if (hiddenAt) return;
    hiddenAt = Date.now();
    if (!locked && cfg.hash) { cfg.leftAt = hiddenAt; save(); }
  }
  function onShown() {
    const t = hiddenAt;
    hiddenAt = 0;
    if (cfg.leftAt) { cfg.leftAt = 0; save(); }
    if (!t || locked || !cfg.hash) return;
    if (Date.now() < skipRelockUntil) { skipRelockUntil = 0; return; }
    if (Date.now() - t >= RELOCK_MS) lock();
  }

  function bind() {
    if (bound) return;
    bound = true;
    document.addEventListener("visibilitychange", () => (document.hidden ? onHidden() : onShown()));
    // Android қабығы да хабарлайды (visibilitychange-ке қосымша сақтық)
    window.greenAppHidden = onHidden;
    window.greenAppShown = onShown;
    byId("lockClose").addEventListener("click", () => { if (flow === "change") hide(); });
    // Компьютер пернетақтасы (браузер нұсқасы үшін)
    document.addEventListener("keydown", (e) => {
      if (byId("lock").hidden || panelOpen()) return;
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") press("del");
    });
  }

  function start(h) {
    hooks = Object.assign(hooks, h || {});
    bind();
    if (cfg.hash && leftRecently()) {
      // Қосымшадан жаңа ғана шыққан (10 секундтан аз) — кодты қайта сұрамаймыз
      cfg.leftAt = 0;
      save();
      flow = "unlock";
      unlock();
    } else if (cfg.hash) {
      if (cfg.leftAt) { cfg.leftAt = 0; save(); }
      flow = "unlock";
      setMode("enter");
      show();
      tryBio();
    } else {
      flow = "setup";
      setMode("create");
      show();
    }
  }

  window.GreenLock = {
    start,
    lock,
    changePin,
    back,
    setBio,
    isOpen: () => !byId("lock").hidden,
    bioInfo: () => ({ status: bioStatus(), enabled: !!cfg.bio }),
    // Файл таңдау терезесі ашылғанда қосымша фонға кетеді — сол үшін құлыптамаймыз
    noteFilePicker: () => { skipRelockUntil = Date.now() + PICKER_GRACE_MS; }
  };
})();
