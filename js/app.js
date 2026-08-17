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

const MASTER_THRESHOLD = 2;
const COMPLETED_KEY = "formlq_completed_sections";

const state = {
  blocks: [],
  activeBlock: null,
  sections: [],
  activeSectionIndex: null,
  cards: [],
  queue: [],
  knownStreak: {},
  stats: { reviews: 0, mistakes: 0 },
  flipped: false,
};

function loadCompletedSections() {
  try {
    return JSON.parse(localStorage.getItem(COMPLETED_KEY)) || {};
  } catch (e) {
    return {};
  }
}

function markSectionCompleted(blockId, sectionIndex) {
  const data = loadCompletedSections();
  data[`${blockId}::${sectionIndex}`] = Date.now();
  localStorage.setItem(COMPLETED_KEY, JSON.stringify(data));
}

function isSectionCompleted(blockId, sectionIndex) {
  return !!loadCompletedSections()[`${blockId}::${sectionIndex}`];
}

const blockListEl = document.getElementById("deckList");
const blockListSection = document.getElementById("deckListSection");
const sectionListSection = document.getElementById("sectionListSection");
const sectionListEl = document.getElementById("sectionList");
const sectionListTitle = document.getElementById("sectionListTitle");
const studyViewEl = document.getElementById("studyView");

async function loadBlocks() {
  try {
    const res = await fetch("data/decks.json", { cache: "no-store" });
    state.blocks = await res.json();
  } catch (e) {
    state.blocks = [];
  }
  renderBlockList();
}

function renderBlockList() {
  blockListEl.innerHTML = "";

  if (state.blocks.length === 0) {
    blockListEl.innerHTML = '<div class="empty-state">Блоків поки немає. Додай перший через admin.html.</div>';
    return;
  }

  state.blocks.forEach((block) => {
    const row = document.createElement("div");
    row.className = "pill-row";
    row.dataset.blockId = block.id;

    const sectionCount = block.sectionCount || null;
    const subParts = [];
    if (sectionCount) subParts.push(`${sectionCount} розділ${pluralSuffix(sectionCount)}`);
    if (block.cardCount) subParts.push(`${block.cardCount} карток`);
    if (block.subject) subParts.push(escapeHtml(block.subject));

    row.innerHTML = `
      <div class="row-main">
        <p class="row-title">${escapeHtml(block.title)}</p>
        <p class="row-sub">${subParts.join(" · ") || "?"}</p>
      </div>
      <div class="row-right">
        <span class="lock-icon">🔒</span>
      </div>
    `;

    row.addEventListener("click", () => openUnlockForm(row, block));
    blockListEl.appendChild(row);
  });
}

function pluralSuffix(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "";
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return "и";
  return "ів";
}

function openUnlockForm(row, block) {
  if (row.classList.contains("is-open")) return;

  document.querySelectorAll(".pill-row.is-open").forEach((openRow) => closeUnlockForm(openRow));

  row.classList.add("is-open");
  row.querySelector(".row-right").innerHTML = "";

  const form = document.createElement("form");
  form.className = "unlock-form";
  form.innerHTML = `
    <input type="password" placeholder="Пароль до блоку" required autocomplete="off" />
    <button type="submit" class="btn">Відкрити</button>
    <button type="button" class="btn btn-ghost btn-cancel">Скасувати</button>
  `;

  form.addEventListener("click", (e) => e.stopPropagation());
  form.querySelector(".btn-cancel").addEventListener("click", () => {
    closeUnlockForm(row);
    renderBlockList();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const password = form.querySelector("input").value;
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "Перевірка…";

    const existingError = form.querySelector(".error-text");
    if (existingError) existingError.remove();

    try {
      const data = await decryptJSON(password, block);
      enterBlock(block, data);
    } catch (err) {
      const errorEl = document.createElement("p");
      errorEl.className = "error-text";
      errorEl.textContent = "Неправильний пароль. Спробуй ще раз.";
      form.appendChild(errorEl);
      submitBtn.disabled = false;
      submitBtn.textContent = "Відкрити";
    }
  });

  row.appendChild(form);
  form.querySelector("input").focus();
}

function closeUnlockForm(row) {
  row.classList.remove("is-open");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function shuffle(array) {
  const copy = array.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// --- Block -> Sections ---

function enterBlock(block, data) {
  const sections = data.sections && data.sections.length ? data.sections : [{ title: block.title, cards: data.cards || [] }];

  state.activeBlock = block;
  state.sections = sections;

  blockListSection.style.display = "none";
  sectionListSection.style.display = "";
  sectionListTitle.textContent = block.title;

  renderSectionList();
}

function renderSectionList() {
  sectionListEl.innerHTML = "";

  state.sections.forEach((section, i) => {
    const row = document.createElement("div");
    row.className = "pill-row";
    const done = isSectionCompleted(state.activeBlock.id, i);

    row.innerHTML = `
      <div class="row-main">
        <p class="row-title">${escapeHtml(section.title)}</p>
        <p class="row-sub">${(section.cards || []).length} карток</p>
      </div>
      <div class="row-right">
        ${done ? '<span class="badge-chip badge-success">✓ Вивчено</span>' : ""}
        <span class="lock-icon unlocked">▶</span>
      </div>
    `;

    row.addEventListener("click", () => startStudy(i));
    sectionListEl.appendChild(row);
  });
}

function exitBlock() {
  state.activeBlock = null;
  state.sections = [];
  sectionListSection.style.display = "none";
  blockListSection.style.display = "";
  renderBlockList();
}

// --- Study view (Leitner-style spaced repetition) ---

const studySessionEl = document.getElementById("studySession");
const studyCompleteEl = document.getElementById("studyComplete");
const ratingControlsEl = document.getElementById("ratingControls");
const studyHintEl = document.getElementById("studyHint");

function startStudy(sectionIndex) {
  const section = state.sections[sectionIndex];
  state.activeSectionIndex = sectionIndex;
  state.cards = section.cards || [];
  state.queue = shuffle(state.cards.map((_, i) => i));
  state.knownStreak = {};
  state.stats = { reviews: 0, mistakes: 0 };
  state.flipped = false;

  sectionListSection.style.display = "none";
  studyViewEl.classList.add("active");
  studySessionEl.style.display = "flex";
  studyCompleteEl.style.display = "none";

  document.getElementById("studyTitle").textContent = section.title;
  renderCard();
}

function exitStudy() {
  state.activeSectionIndex = null;
  studyViewEl.classList.remove("active");
  sectionListSection.style.display = "";
  renderSectionList();
}

function renderCard() {
  document.getElementById("studyProgress").textContent = `У черзі: ${state.queue.length}`;

  const card = state.cards[state.queue[0]];

  const flipCardEl = document.getElementById("flipCard");
  flipCardEl.classList.toggle("is-flipped", state.flipped);
  ratingControlsEl.style.display = state.flipped ? "flex" : "none";
  studyHintEl.style.display = state.flipped ? "none" : "block";

  const frontText = document.getElementById("cardFrontText");
  const backText = document.getElementById("cardBackText");
  frontText.innerHTML = escapeHtml(card.q);
  backText.innerHTML = escapeHtml(card.a);

  renderMath(frontText);
  renderMath(backText);

  const frontGraph = document.getElementById("cardFrontGraph");
  const backGraph = document.getElementById("cardBackGraph");
  const hasFrontGraph = !!(card.graph && card.graph.side === "q");
  const hasBackGraph = !!(card.graph && card.graph.side === "a");

  renderGraph(frontGraph, hasFrontGraph ? card.graph : null);
  renderGraph(backGraph, hasBackGraph ? card.graph : null);

  frontGraph.closest(".flip-card-face").classList.toggle("has-graph", hasFrontGraph);
  backGraph.closest(".flip-card-face").classList.toggle("has-graph", hasBackGraph);
}

function flipCard() {
  state.flipped = !state.flipped;
  document.getElementById("flipCard").classList.toggle("is-flipped", state.flipped);
  ratingControlsEl.style.display = state.flipped ? "flex" : "none";
  studyHintEl.style.display = state.flipped ? "none" : "block";
}

function rateCard(knewIt) {
  const cardIdx = state.queue[0];
  state.stats.reviews++;

  if (knewIt) {
    state.knownStreak[cardIdx] = (state.knownStreak[cardIdx] || 0) + 1;
  } else {
    state.knownStreak[cardIdx] = 0;
    state.stats.mistakes++;
  }

  state.queue.shift();

  if (state.knownStreak[cardIdx] < MASTER_THRESHOLD) {
    const insertAt = Math.min(3, state.queue.length);
    state.queue.splice(insertAt, 0, cardIdx);
  }

  state.flipped = false;

  if (state.queue.length === 0) {
    finishStudy();
  } else {
    renderCard();
  }
}

function finishStudy() {
  markSectionCompleted(state.activeBlock.id, state.activeSectionIndex);

  document.getElementById("studyProgress").textContent = "Завершено!";
  studySessionEl.style.display = "none";
  studyCompleteEl.style.display = "flex";

  document.getElementById("statCards").textContent = state.cards.length;
  document.getElementById("statReviews").textContent = state.stats.reviews;
  document.getElementById("statMistakes").textContent = state.stats.mistakes;

  if (window.confetti) {
    confetti({ particleCount: 130, spread: 80, origin: { y: 0.6 } });
  }
}

document.getElementById("flipCard").addEventListener("click", flipCard);
document.getElementById("btnKnow").addEventListener("click", () => rateCard(true));
document.getElementById("btnDontKnow").addEventListener("click", () => rateCard(false));
document.getElementById("btnRestartSession").addEventListener("click", () => startStudy(state.activeSectionIndex));
document.getElementById("btnBackToSections").addEventListener("click", exitStudy);
document.getElementById("btnExit").addEventListener("click", exitStudy);
document.getElementById("btnExitSections").addEventListener("click", exitBlock);

document.addEventListener("keydown", (e) => {
  if (!studyViewEl.classList.contains("active")) return;
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
  if (studyCompleteEl.style.display === "flex") return;

  if (e.code === "Space" || e.code === "Enter") {
    e.preventDefault();
    if (!state.flipped) flipCard();
  } else if (e.code === "ArrowRight" && state.flipped) {
    rateCard(true);
  } else if (e.code === "ArrowLeft" && state.flipped) {
    rateCard(false);
  }
});

loadBlocks();
