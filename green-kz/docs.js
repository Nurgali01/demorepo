/* Green.kz — цифрлық құжаттар: IndexedDB қоймасы және PDF қарау терезесі (PDF.js).
 *
 * window.GreenDocs = { MAX_BYTES, check(file), store: {list, put, get, remove, clear},
 *                      viewer: {open(id, title), close(), isOpen()} }
 *
 * Файлдар тек осы құрылғыда, браузердің/қосымшаның жеке қоймасында сақталады.
 */
(function () {
  "use strict";

  const MAX_BYTES = 25 * 1024 * 1024; // бір файлға ең көбі 25 МБ
  const DB_NAME = "greenkz-docs";
  const byId = (id) => document.getElementById(id);

  // ---------- Қойма (IndexedDB) ----------
  // "meta"  — шағын жазбалар {id, name, size, addedAt}: тізімді тез көрсету үшін
  // "files" — PDF мазмұны (ArrayBuffer), кілті — құжат id-і
  let dbPromise = null;

  function openDb() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        if (!window.indexedDB) return reject(new Error("IndexedDB қолжетімсіз"));
        const rq = indexedDB.open(DB_NAME, 1);
        rq.onupgradeneeded = () => {
          const db = rq.result;
          if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta", { keyPath: "id" });
          if (!db.objectStoreNames.contains("files")) db.createObjectStore("files");
        };
        rq.onsuccess = () => {
          const db = rq.result;
          db.onversionchange = () => { db.close(); dbPromise = null; };
          resolve(db);
        };
        rq.onerror = () => reject(rq.error || new Error("Қойманы ашу мүмкін болмады"));
        rq.onblocked = () => reject(new Error("Қойма бұғатталған"));
      }).catch((e) => { dbPromise = null; throw e; });
    }
    return dbPromise;
  }

  // Бір транзакция ішінде жұмыс орындайды; транзакция толық аяқталғанда ғана шешіледі.
  function run(stores, mode, work) {
    return openDb().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction(stores, mode);
      let result;
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error || new Error("Қойма қатесі"));
      tx.onabort = () => reject(tx.error || new Error("Транзакция үзілді"));
      work(tx, (v) => { result = v; });
    }));
  }

  const store = {
    list() {
      return run("meta", "readonly", (tx, done) => {
        const rq = tx.objectStore("meta").getAll();
        rq.onsuccess = () => done(rq.result || []);
      });
    },
    async put(id, file) {
      const data = await file.arrayBuffer();
      const meta = { id, name: file.name || "document.pdf", size: data.byteLength, addedAt: Date.now() };
      await run(["meta", "files"], "readwrite", (tx) => {
        tx.objectStore("meta").put(meta);
        tx.objectStore("files").put(data, id);
      });
      return meta;
    },
    get(id) {
      return run("files", "readonly", (tx, done) => {
        const rq = tx.objectStore("files").get(id);
        rq.onsuccess = () => done(rq.result || null);
      });
    },
    remove(id) {
      return run(["meta", "files"], "readwrite", (tx) => {
        tx.objectStore("meta").delete(id);
        tx.objectStore("files").delete(id);
      });
    },
    clear() {
      return run(["meta", "files"], "readwrite", (tx) => {
        tx.objectStore("meta").clear();
        tx.objectStore("files").clear();
      });
    }
  };

  // ---------- Файлды тексеру ----------
  // null — жарамды PDF; әйтпесе қате коды: "empty" | "big" | "notpdf"
  async function check(file) {
    if (!file) return "empty";
    if (file.size > MAX_BYTES) return "big";
    if (file.size < 8) return "notpdf";
    // PDF стандарты бойынша "%PDF-" белгісі файлдың алғашқы 1024 байтында болуы керек
    const head = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
    const sig = [0x25, 0x50, 0x44, 0x46, 0x2d];
    for (let i = 0; i + sig.length <= head.length; i++) {
      if (sig.every((b, k) => head[i + k] === b)) return null;
    }
    return "notpdf";
  }

  // ---------- PDF.js-ті қажет болғанда ғана жүктеу ----------
  // Екі файл да кәдімгі <script> ретінде жүктеледі: pdf.worker.min.js негізгі ағында
  // window.pdfjsWorker-ді анықтайды, сондықтан Web Worker керек емес (file:// бетінде
  // және Android WebView-та Worker жүктеуге тыйым салынған).
  let pdfjsPromise = null;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Жүктелмеді: " + src));
      document.head.appendChild(s);
    });
  }

  function loadPdfJs() {
    if (!pdfjsPromise) {
      pdfjsPromise = loadScript("vendor/pdfjs/pdf.min.js")
        .then(() => loadScript("vendor/pdfjs/pdf.worker.min.js"))
        .then(() => {
          if (!window.pdfjsLib || !window.pdfjsWorker) throw new Error("PDF.js жүктелмеді");
          return window.pdfjsLib;
        })
        .catch((e) => { pdfjsPromise = null; throw e; });
    }
    return pdfjsPromise;
  }

  // ---------- PDF қарау терезесі ----------
  const viewer = (() => {
    const ZOOMS = [1, 1.5, 2, 3];
    const MAX_W = 2200;   // канвас енінің шегі (px)
    const MAX_AREA = 9e6; // канвас ауданының шегі (px²) — жадты үнемдеу үшін
    const KEEP = 6;       // бір уақытта жадта тұратын бет саны

    let el, scroller, pagesEl, statusEl, countEl, titleEl, zoomIn, zoomOut;
    let token = 0;        // әр ашу/жабу сайын өседі: ескірген асинхрон нәтижелер еленбейді
    let task = null, pdf = null, pages = [], zi = 0, observer = null, busy = false, raf = 0;

    function dom() {
      if (el) return;
      el = byId("viewer");
      scroller = byId("viewerScroll");
      pagesEl = byId("viewerPages");
      statusEl = byId("viewerStatus");
      countEl = byId("viewerCount");
      titleEl = byId("viewerTitle");
      zoomIn = byId("viewerZoomIn");
      zoomOut = byId("viewerZoomOut");
      byId("viewerClose").addEventListener("click", close);
      zoomIn.addEventListener("click", () => setZoom(zi + 1));
      zoomOut.addEventListener("click", () => setZoom(zi - 1));
      // Екі рет түрту: 100% ↔ 200%
      pagesEl.addEventListener("dblclick", () => setZoom(zi === 0 ? 2 : 0));
      scroller.addEventListener("scroll", () => {
        if (raf) return;
        raf = requestAnimationFrame(() => { raf = 0; updateCount(); });
      }, { passive: true });
    }

    function setStatus(kind, text) {
      if (!kind) { statusEl.hidden = true; statusEl.innerHTML = ""; return; }
      statusEl.hidden = false;
      if (kind === "loading") {
        statusEl.innerHTML = '<div class="spinner"></div><p>Ашылуда…</p>';
      } else if (kind === "password") {
        statusEl.innerHTML = '<p></p><form><input class="input" type="password" autocomplete="off" placeholder="PDF құпиясөзі">' +
          '<button class="btn" type="submit">Ашу</button><button class="btn ghost" type="button">Болдырмау</button></form>';
        statusEl.querySelector("p").textContent = text;
        statusEl.querySelector("button[type=button]").addEventListener("click", close);
      } else {
        statusEl.innerHTML = '<div class="big-ic">📄</div><p></p><button class="btn ghost" type="button">Жабу</button>';
        statusEl.querySelector("p").textContent = text;
        statusEl.querySelector("button").addEventListener("click", close);
      }
    }

    // Алдыңғы құжаттың барлық күйін тазалайды
    function reset() {
      token++;
      if (observer) { observer.disconnect(); observer = null; }
      pages.forEach((p) => { if (p.render) { try { p.render.cancel(); } catch (e) { /* ignore */ } } });
      pages = [];
      busy = false;
      if (task) { try { task.destroy(); } catch (e) { /* ignore */ } }
      task = null;
      pdf = null;
      if (pagesEl) pagesEl.innerHTML = "";
      if (countEl) countEl.hidden = true;
    }

    function close() {
      if (!el) return;
      reset();
      setStatus(null);
      el.hidden = true;
    }

    const isOpen = () => !!el && !el.hidden;

    async function open(id, title) {
      dom();
      reset();
      const my = token;
      el.hidden = false;
      titleEl.textContent = title || "";
      zi = 0;
      pagesEl.style.width = "100%";
      syncZoomButtons();
      setStatus("loading");
      try {
        const loaded = await Promise.all([store.get(id), loadPdfJs()]);
        if (my !== token) return;
        const data = loaded[0];
        if (!data) throw new Error("Файл табылмады");
        task = window.pdfjsLib.getDocument({
          data: new Uint8Array(data),
          isEvalSupported: false, // PDF ішіндегі дерек ешқашан код ретінде орындалмайды
          enableXfa: false,
          verbosity: 0
        });
        task.onPassword = (update, reason) => {
          if (my !== token) return;
          setStatus("password", reason === 2 ? "Құпиясөз қате. Қайталап көріңіз." : "Бұл PDF құпиясөзбен қорғалған.");
          const form = statusEl.querySelector("form");
          form.addEventListener("submit", (e) => {
            e.preventDefault();
            const v = form.querySelector("input").value;
            if (!v) return;
            setStatus("loading");
            update(v);
          });
        };
        const doc = await task.promise;
        if (my !== token) return;
        pdf = doc;
        await build(my);
      } catch (e) {
        if (my !== token) return;
        setStatus("error", "PDF файлын ашу мүмкін болмады. Файл зақымдалған болуы мүмкін.");
      }
    }

    async function build(my) {
      const first = await pdf.getPage(1);
      if (my !== token) return;
      const vp = first.getViewport({ scale: 1 });
      const frag = document.createDocumentFragment();
      for (let n = 1; n <= pdf.numPages; n++) {
        const wrap = document.createElement("div");
        wrap.className = "pdf-page";
        // Нақты өлшем бет салынғанда анықталады; оған дейін 1-беттің пропорциясы
        wrap.style.aspectRatio = vp.width + " / " + vp.height;
        wrap.dataset.i = String(n - 1);
        const canvas = document.createElement("canvas");
        wrap.appendChild(canvas);
        frag.appendChild(wrap);
        pages.push({ n, wrap, canvas, visible: false, state: "empty", zoom: 0, render: null });
      }
      pagesEl.appendChild(frag);
      setStatus(null);
      scroller.scrollTop = 0;
      scroller.scrollLeft = 0;
      // Көрініп тұрған және оған жақын (бір экран жоғары/төмен) беттер ғана салынады
      observer = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          const p = pages[Number(en.target.dataset.i)];
          if (p) p.visible = en.isIntersecting;
        });
        pump();
      }, { root: scroller, rootMargin: "100% 0px" });
      pages.forEach((p) => observer.observe(p.wrap));
      updateCount();
    }

    function currentIndex() {
      const mid = scroller.scrollTop + scroller.clientHeight / 2;
      for (let i = 0; i < pages.length; i++) {
        const w = pages[i].wrap;
        if (w.offsetTop + w.offsetHeight >= mid) return i;
      }
      return Math.max(0, pages.length - 1);
    }

    function updateCount() {
      if (!pages.length) { countEl.hidden = true; return; }
      countEl.hidden = pages.length < 2;
      countEl.textContent = (currentIndex() + 1) + " / " + pages.length;
    }

    // Кезекпен (бір-бірден) салады: алдымен экран ортасына ең жақын бет
    function pump() {
      if (busy || !pdf) return;
      const cur = currentIndex();
      const z = ZOOMS[zi];
      let best = null, bestD = Infinity;
      pages.forEach((p, i) => {
        if (!p.visible || p.state === "error") return;
        if (p.state === "done" && p.zoom === z) return;
        const d = Math.abs(i - cur);
        if (d < bestD) { best = p; bestD = d; }
      });
      if (!best) return;
      busy = true;
      const my = token;
      renderPage(best, z, my).then(() => {
        if (my !== token) return;
        busy = false;
        trim();
        pump();
      });
    }

    async function renderPage(p, z, my) {
      try {
        const page = await pdf.getPage(p.n);
        if (my !== token) return;
        const vp1 = page.getViewport({ scale: 1 });
        p.wrap.style.aspectRatio = vp1.width + " / " + vp1.height;
        const cssW = p.wrap.clientWidth || scroller.clientWidth;
        let scale = Math.min(cssW * (window.devicePixelRatio || 1), MAX_W) / vp1.width;
        const area = vp1.width * scale * vp1.height * scale;
        if (area > MAX_AREA) scale *= Math.sqrt(MAX_AREA / area);
        const vp = page.getViewport({ scale });
        // Жаңа канвасқа салып, дайын болғанда ауыстырамыз — жыпылықтамайды
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.floor(vp.width));
        canvas.height = Math.max(1, Math.floor(vp.height));
        p.render = page.render({ canvasContext: canvas.getContext("2d", { alpha: false }), viewport: vp });
        await p.render.promise;
        p.render = null;
        if (my !== token) return;
        p.canvas.replaceWith(canvas);
        p.canvas = canvas;
        p.state = "done";
        p.zoom = z;
      } catch (e) {
        p.render = null;
        if (my !== token) return;
        p.state = e && e.name === "RenderingCancelledException" ? "empty" : "error";
      }
    }

    // Жадты босату: көрінбейтін, ағымдағы беттен ең алыс беттердің канвасын тазалайды
    function trim() {
      const done = pages.filter((p) => p.state === "done");
      if (done.length <= KEEP) return;
      const cur = currentIndex();
      done.filter((p) => !p.visible)
        .sort((a, b) => Math.abs(b.n - 1 - cur) - Math.abs(a.n - 1 - cur))
        .slice(0, done.length - KEEP)
        .forEach((p) => {
          p.canvas.width = 0;
          p.canvas.height = 0;
          p.state = "empty";
          p.zoom = 0;
        });
    }

    function syncZoomButtons() {
      zoomOut.disabled = zi === 0;
      zoomIn.disabled = zi === ZOOMS.length - 1;
    }

    function setZoom(i) {
      if (!pdf || i < 0 || i >= ZOOMS.length || i === zi) return;
      // Экран ортасындағы нүкте орнында қалуы үшін айналдыру күйін сақтаймыз
      const fx = (scroller.scrollLeft + scroller.clientWidth / 2) / (scroller.scrollWidth || 1);
      const fy = (scroller.scrollTop + scroller.clientHeight / 2) / (scroller.scrollHeight || 1);
      zi = i;
      pagesEl.style.width = ZOOMS[zi] * 100 + "%";
      scroller.scrollLeft = fx * scroller.scrollWidth - scroller.clientWidth / 2;
      scroller.scrollTop = fy * scroller.scrollHeight - scroller.clientHeight / 2;
      syncZoomButtons();
      updateCount();
      pump(); // бұрын салынған беттер жаңа ажыратымдылықпен қайта салынады
    }

    return { open, close, isOpen };
  })();

  window.GreenDocs = { MAX_BYTES, check, store, viewer };
})();
