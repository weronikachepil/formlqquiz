const KATEX_DELIMITERS = [
  { left: "$$", right: "$$", display: true },
  { left: "\\[", right: "\\]", display: true },
  { left: "$", right: "$", display: false },
  { left: "\\(", right: "\\)", display: false },
];

const KATEX_MACROS = {
  "\\tg": "\\operatorname{tg}",
  "\\ctg": "\\operatorname{ctg}",
  "\\arctg": "\\operatorname{arctg}",
  "\\arcctg": "\\operatorname{arcctg}",
};

function renderMath(el) {
  if (window.renderMathInElement) {
    renderMathInElement(el, { delimiters: KATEX_DELIMITERS, macros: KATEX_MACROS, throwOnError: false });
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

const sectionsContainer = document.getElementById("sectionsContainer");
let sectionCounter = 0;
let graphCounter = 0;

function debounce(fn, delay) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function parseDomain(str, fallback) {
  const parts = (str || "").split(",").map((s) => parseFloat(s.trim()));
  if (parts.length === 2 && parts.every((n) => !Number.isNaN(n))) return parts;
  return fallback;
}

function readGraphConfig(row) {
  const enabled = row.querySelector(".graph-enable").checked;
  if (!enabled) return null;

  const functions = row
    .querySelector(".graph-functions")
    .value.split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  if (functions.length === 0) return null;

  return {
    side: row.querySelector(".graph-side").value,
    functions,
    xDomain: parseDomain(row.querySelector(".graph-xdomain").value, [-10, 10]),
    yDomain: parseDomain(row.querySelector(".graph-ydomain").value, [-10, 10]),
  };
}

function addCardRow(cardsListEl) {
  graphCounter++;
  const previewId = `graph-preview-${graphCounter}`;

  const row = document.createElement("div");
  row.className = "card-editor";
  row.innerHTML = `
    <button type="button" class="card-editor-remove">Видалити картку</button>
    <div class="card-editor-grid">
      <div class="field">
        <label>Питання (LaTeX через $...$)</label>
        <textarea rows="3" class="card-q"></textarea>
        <div class="preview-box preview-q"></div>
      </div>
      <div class="field">
        <label>Відповідь</label>
        <textarea rows="3" class="card-a"></textarea>
        <div class="preview-box preview-a"></div>
      </div>
    </div>

    <label class="graph-toggle">
      <input type="checkbox" class="graph-enable" />
      Додати графік до цієї картки
    </label>

    <div class="graph-fields" style="display: none;">
      <div class="field">
        <label>Показати графік у:</label>
        <select class="graph-side">
          <option value="q">Питанні</option>
          <option value="a">Відповіді</option>
        </select>
      </div>
      <div class="field">
        <label>Функції (кожна з нового рядка, напр. x^2 - 2*x + 1)</label>
        <textarea rows="2" class="graph-functions" placeholder="x^2 - 2*x + 1"></textarea>
      </div>
      <div class="card-editor-grid">
        <div class="field">
          <label>Діапазон X (мін, макс)</label>
          <input type="text" class="graph-xdomain" placeholder="-10, 10" />
        </div>
        <div class="field">
          <label>Діапазон Y (мін, макс)</label>
          <input type="text" class="graph-ydomain" placeholder="-10, 10" />
        </div>
      </div>
      <div id="${previewId}" class="graph-preview"></div>
    </div>
  `;

  const qInput = row.querySelector(".card-q");
  const aInput = row.querySelector(".card-a");
  const qPreview = row.querySelector(".preview-q");
  const aPreview = row.querySelector(".preview-a");

  const updatePreview = (input, preview) => {
    preview.innerHTML = escapeHtml(input.value);
    renderMath(preview);
  };

  qInput.addEventListener("input", () => updatePreview(qInput, qPreview));
  aInput.addEventListener("input", () => updatePreview(aInput, aPreview));

  row.querySelector(".card-editor-remove").addEventListener("click", () => row.remove());

  const graphFields = row.querySelector(".graph-fields");
  const graphEnable = row.querySelector(".graph-enable");
  const graphPreviewEl = row.querySelector(`#${previewId}`);

  const updateGraphPreview = debounce(() => {
    renderGraph(graphPreviewEl, readGraphConfig(row));
  }, 400);

  graphEnable.addEventListener("change", () => {
    graphFields.style.display = graphEnable.checked ? "flex" : "none";
    updateGraphPreview();
  });

  row.querySelectorAll(".graph-side, .graph-functions, .graph-xdomain, .graph-ydomain").forEach((el) => {
    el.addEventListener("input", updateGraphPreview);
    el.addEventListener("change", updateGraphPreview);
  });

  cardsListEl.appendChild(row);
}

function addSectionBlock() {
  sectionCounter++;
  const section = document.createElement("div");
  section.className = "section-editor";
  section.innerHTML = `
    <div class="section-editor-header">
      <input type="text" class="section-title" placeholder="Назва розділу (наприклад: Логарифми)" required />
      <button type="button" class="card-editor-remove section-remove">Видалити розділ</button>
    </div>
    <div class="section-cards"></div>
    <div class="toolbar">
      <button type="button" class="btn btn-ghost btn-add-card">+ Додати картку</button>
    </div>
  `;

  const cardsListEl = section.querySelector(".section-cards");
  section.querySelector(".btn-add-card").addEventListener("click", () => addCardRow(cardsListEl));
  section.querySelector(".section-remove").addEventListener("click", () => section.remove());

  sectionsContainer.appendChild(section);
  addCardRow(cardsListEl);
}

document.getElementById("btnAddSection").addEventListener("click", addSectionBlock);

function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9а-яіїєґ\s-]/gi, "")
    .replace(/\s+/g, "-")
    .slice(0, 40);
}

document.getElementById("deckForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = document.getElementById("deckTitle").value.trim();
  const subject = document.getElementById("deckSubject").value.trim();
  const password = document.getElementById("deckPassword").value;
  const outputBox = document.getElementById("outputBox");
  const outputWrap = document.getElementById("outputWrap");

  const sections = [];
  sectionsContainer.querySelectorAll(".section-editor").forEach((sectionEl) => {
    const sectionTitle = sectionEl.querySelector(".section-title").value.trim();
    const cards = [];
    sectionEl.querySelectorAll(".card-editor").forEach((row) => {
      const q = row.querySelector(".card-q").value.trim();
      const a = row.querySelector(".card-a").value.trim();
      if (!q || !a) return;
      const graph = readGraphConfig(row);
      cards.push(graph ? { q, a, graph } : { q, a });
    });
    if (sectionTitle && cards.length > 0) sections.push({ title: sectionTitle, cards });
  });

  if (!title || !password || sections.length === 0) {
    alert("Заповни назву блоку, пароль і хоча б один розділ з карткою.");
    return;
  }

  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = "Шифрування…";

  const id = `${slugify(title)}-${Math.random().toString(36).slice(2, 8)}`;
  const cardCount = sections.reduce((sum, s) => sum + s.cards.length, 0);
  const encrypted = await encryptJSON(password, { sections });

  const blockObject = {
    id,
    title,
    subject: subject || undefined,
    sectionCount: sections.length,
    cardCount,
    salt: encrypted.salt,
    iv: encrypted.iv,
    ciphertext: encrypted.ciphertext,
  };

  outputBox.textContent = JSON.stringify(blockObject, null, 2);
  outputWrap.style.display = "block";
  outputWrap.scrollIntoView({ behavior: "smooth", block: "start" });

  submitBtn.disabled = false;
  submitBtn.textContent = "Згенерувати JSON";
});

document.getElementById("btnCopy").addEventListener("click", () => {
  const text = document.getElementById("outputBox").textContent;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById("btnCopy");
    const original = btn.textContent;
    btn.textContent = "Скопійовано ✓";
    setTimeout(() => (btn.textContent = original), 1500);
  });
});

addSectionBlock();
