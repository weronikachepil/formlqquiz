import { useEffect, useRef, useState } from "react";
import GraphBox from "../components/GraphBox";
import { renderMath } from "../lib/katex";
import { encryptJSON, decryptJSON } from "../lib/crypto";
import { getProducts } from "../api";

function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9а-яіїєґ\s-]/gi, "")
    .replace(/\s+/g, "-")
    .slice(0, 40);
}

function parseDomain(str, fallback) {
  const parts = (str || "").split(",").map((s) => parseFloat(s.trim()));
  if (parts.length === 2 && parts.every((n) => !Number.isNaN(n))) return parts;
  return fallback;
}

function newCard() {
  return { q: "", a: "", graphEnabled: false, graphSide: "q", graphFunctions: "", graphXDomain: "", graphYDomain: "" };
}

function newSection() {
  return { title: "", cards: [newCard()] };
}

function cardFromStored(card) {
  return {
    q: card.q,
    a: card.a,
    graphEnabled: !!card.graph,
    graphSide: card.graph?.side || "q",
    graphFunctions: card.graph?.functions?.join("\n") || "",
    graphXDomain: card.graph?.xDomain ? card.graph.xDomain.join(", ") : "",
    graphYDomain: card.graph?.yDomain ? card.graph.yDomain.join(", ") : "",
  };
}

function sectionsFromStored(sections) {
  return sections.map((section) => ({ title: section.title, cards: section.cards.map(cardFromStored) }));
}

function cardGraphConfig(card) {
  if (!card.graphEnabled) return null;
  const functions = card.graphFunctions.split("\n").map((s) => s.trim()).filter(Boolean);
  if (functions.length === 0) return null;
  return {
    side: card.graphSide,
    functions,
    xDomain: parseDomain(card.graphXDomain, [-10, 10]),
    yDomain: parseDomain(card.graphYDomain, [-10, 10]),
  };
}

// KaTeX auto-render mutates the DOM directly, so previews are synced imperatively via ref.
function usePreviewSync(ref, text) {
  useEffect(() => {
    if (ref.current) ref.current.textContent = text;
    renderMath(ref.current);
  }, [ref, text]);
}

function CardEditor({ card, onChange, onRemove }) {
  const qPreviewRef = useRef(null);
  const aPreviewRef = useRef(null);
  usePreviewSync(qPreviewRef, card.q);
  usePreviewSync(aPreviewRef, card.a);

  const graphConfig = cardGraphConfig(card);

  return (
    <div className="card p-4.5 flex flex-col gap-3 relative">
      <button type="button" onClick={onRemove} className="self-end bg-danger-soft text-danger rounded-full font-bold text-xs px-3.5 py-1.5">
        Видалити картку
      </button>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="field">
          <label>Питання (LaTeX через $...$)</label>
          <textarea rows={3} value={card.q} onChange={(e) => onChange({ ...card, q: e.target.value })} />
          <div ref={qPreviewRef} className="mt-1.5 text-sm min-h-5" />
        </div>
        <div className="field">
          <label>Відповідь</label>
          <textarea rows={3} value={card.a} onChange={(e) => onChange({ ...card, a: e.target.value })} />
          <div ref={aPreviewRef} className="mt-1.5 text-sm min-h-5" />
        </div>
      </div>

      <label className="flex items-center gap-2 text-[13px] font-bold text-ink-muted">
        <input
          type="checkbox"
          checked={card.graphEnabled}
          onChange={(e) => onChange({ ...card, graphEnabled: e.target.checked })}
          className="w-4 h-4"
        />
        Додати графік до цієї картки
      </label>

      {card.graphEnabled && (
        <div className="bg-surface-soft rounded-md p-4 flex flex-col gap-3">
          <div className="field">
            <label>Показати графік у:</label>
            <select
              value={card.graphSide}
              onChange={(e) => onChange({ ...card, graphSide: e.target.value })}
              className="px-4 py-3 rounded-md border-2 border-accent-soft bg-surface outline-none"
            >
              <option value="q">Питанні</option>
              <option value="a">Відповіді</option>
            </select>
          </div>
          <div className="field">
            <label>Функції (кожна з нового рядка, напр. x^2 - 2*x + 1)</label>
            <textarea
              rows={2}
              placeholder="x^2 - 2*x + 1"
              value={card.graphFunctions}
              onChange={(e) => onChange({ ...card, graphFunctions: e.target.value })}
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="field">
              <label>Діапазон X (мін, макс)</label>
              <input type="text" placeholder="-10, 10" value={card.graphXDomain} onChange={(e) => onChange({ ...card, graphXDomain: e.target.value })} />
            </div>
            <div className="field">
              <label>Діапазон Y (мін, макс)</label>
              <input type="text" placeholder="-10, 10" value={card.graphYDomain} onChange={(e) => onChange({ ...card, graphYDomain: e.target.value })} />
            </div>
          </div>
          <GraphBox graph={graphConfig} className="min-h-10 !mt-0 bg-white" />
        </div>
      )}
    </div>
  );
}

function SectionEditor({ section, onChange, onRemove }) {
  function updateCard(i, card) {
    const cards = section.cards.slice();
    cards[i] = card;
    onChange({ ...section, cards });
  }
  function removeCard(i) {
    onChange({ ...section, cards: section.cards.filter((_, idx) => idx !== i) });
  }
  function addCard() {
    onChange({ ...section, cards: [...section.cards, newCard()] });
  }

  return (
    <div className="bg-white rounded-md p-5 shadow-pill border-l-4 border-accent flex flex-col gap-3.5">
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Назва розділу (наприклад: Логарифми)"
          value={section.title}
          onChange={(e) => onChange({ ...section, title: e.target.value })}
          required
          className="flex-1 font-bold text-[15px] px-4 py-3 rounded-md border-2 border-accent-soft bg-surface-soft outline-none focus:border-accent"
        />
        <button type="button" onClick={onRemove} className="bg-danger-soft text-danger rounded-full font-bold text-xs px-3.5 py-1.5 whitespace-nowrap">
          Видалити розділ
        </button>
      </div>
      <div className="flex flex-col gap-3.5">
        {section.cards.map((card, i) => (
          <CardEditor key={i} card={card} onChange={(c) => updateCard(i, c)} onRemove={() => removeCard(i)} />
        ))}
      </div>
      <div>
        <button type="button" onClick={addCard} className="btn btn-ghost">
          + Додати картку
        </button>
      </div>
    </div>
  );
}

export default function Admin() {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [password, setPassword] = useState("");
  const [linkedProductId, setLinkedProductId] = useState("");
  const [products, setProducts] = useState([]);
  const [sections, setSections] = useState([newSection()]);
  const [output, setOutput] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [importRaw, setImportRaw] = useState("");
  const [importPassword, setImportPassword] = useState("");
  const [importedId, setImportedId] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");

  useEffect(() => {
    getProducts()
      .then(setProducts)
      .catch(() => setProducts([]));
  }, []);

  const isLinked = !!linkedProductId;

  function updateSection(i, section) {
    const next = sections.slice();
    next[i] = section;
    setSections(next);
  }
  function removeSection(i) {
    setSections(sections.filter((_, idx) => idx !== i));
  }
  function addSection() {
    setSections([...sections, newSection()]);
  }

  async function handleImport() {
    setImportError("");
    let parsed;
    try {
      parsed = JSON.parse(importRaw);
    } catch (err) {
      setImportError("Це не валідний JSON.");
      return;
    }
    if (!parsed.salt || !parsed.iv || !parsed.ciphertext) {
      setImportError("У цьому об'єкті немає salt/iv/ciphertext — це не зашифрований блок.");
      return;
    }
    setImporting(true);
    try {
      const decrypted = await decryptJSON(importPassword, parsed);
      setTitle(parsed.title || "");
      setSubject(parsed.subject || "");
      setSections(sectionsFromStored(decrypted.sections));
      setImportedId(parsed.id || null);
      setOutput(null);
    } catch (err) {
      setImportError("Не вдалося розшифрувати — перевір пароль.");
    } finally {
      setImporting(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const builtSections = sections
      .map((section) => ({
        title: section.title.trim(),
        cards: section.cards
          .map((card) => {
            const q = card.q.trim();
            const a = card.a.trim();
            if (!q || !a) return null;
            const graph = cardGraphConfig(card);
            return graph ? { q, a, graph } : { q, a };
          })
          .filter(Boolean),
      }))
      .filter((s) => s.title && s.cards.length > 0);

    if (!title || (!isLinked && !password) || builtSections.length === 0) {
      alert("Заповни назву блоку, пароль (якщо не привʼязано до товару) і хоча б один розділ з карткою.");
      return;
    }

    setSubmitting(true);
    const id = importedId || `${slugify(title)}-${Math.random().toString(36).slice(2, 8)}`;
    const cardCount = builtSections.reduce((sum, s) => sum + s.cards.length, 0);

    if (isLinked) {
      // No password: access is granted server-side to whoever bought (or was invited to) this product.
      setOutput({
        id,
        title,
        subject: subject || undefined,
        productId: linkedProductId,
        sectionCount: builtSections.length,
        cardCount,
        sections: builtSections,
      });
    } else {
      const encrypted = await encryptJSON(password, { sections: builtSections });
      setOutput({
        id,
        title,
        subject: subject || undefined,
        sectionCount: builtSections.length,
        cardCount,
        salt: encrypted.salt,
        iv: encrypted.iv,
        ciphertext: encrypted.ciphertext,
      });
    }
    setSubmitting(false);
  }

  function copyOutput() {
    navigator.clipboard.writeText(JSON.stringify(output, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <main className="max-w-[860px] mx-auto px-6 py-14">
      <div className="text-center font-script text-4xl font-bold text-accent-dark mb-1">formlq</div>
      <h1 className="text-center text-[13px] font-bold uppercase tracking-widest text-ink-muted mb-10">Новий блок</h1>

      <p className="text-sm text-ink-muted bg-accent-soft rounded-md px-4.5 py-3.5 leading-relaxed mb-6">
        Ця сторінка — лише для тебе, не для студентів (не додавай на неї посилання в навігації). Один пароль відкриває
        весь блок цілком. Всередині блоку — кілька розділів, у кожного розділу свої картки. Заповни форму, натисни
        «Згенерувати JSON» і встав отриманий об'єкт у масив усередині <code>data/decks.json</code>, потім перезапусти сервер.
      </p>

      <div className="bg-surface-soft rounded-lg p-6 shadow-card flex flex-col gap-3.5 mb-8">
        <p className="text-sm font-bold m-0">Перенести наявний блок із паролем на прив'язку до товару</p>
        <p className="text-sm text-ink-muted m-0 leading-relaxed">
          Встав сюди об'єкт існуючого блоку з <code>data/decks.json</code> (з полями salt/iv/ciphertext) і його пароль —
          розшифрується прямо в браузері й підставиться у форму нижче. Обери товар у полі «Привʼязати до товару» і натисни
          «Згенерувати JSON» — вийде готовий об'єкт без пароля, який заміняє старий у <code>decks.json</code> (id блоку
          збережеться, щоб не загубився прогрес учнів).
        </p>
        <textarea
          rows={4}
          placeholder="Встав сюди JSON існуючого блоку…"
          value={importRaw}
          onChange={(e) => setImportRaw(e.target.value)}
          className="w-full font-mono text-xs px-4 py-3 rounded-md border-2 border-accent-soft bg-surface outline-none"
        />
        <div className="flex items-center gap-2.5 flex-wrap">
          <input
            type="text"
            placeholder="Пароль до цього блоку"
            value={importPassword}
            onChange={(e) => setImportPassword(e.target.value)}
            className="flex-1 min-w-[200px] px-4 py-2.5 rounded-full border-2 border-accent-soft bg-surface outline-none"
          />
          <button type="button" onClick={handleImport} disabled={importing || !importRaw || !importPassword} className="btn px-4 py-2.5 text-xs">
            {importing ? "Розшифрування…" : "Розшифрувати і завантажити"}
          </button>
        </div>
        {importError && <p className="error-text m-0">{importError}</p>}
        {importedId && <p className="text-xs text-ink-muted m-0">Завантажено «{title}» — редагуй нижче й прив'яжи до товару.</p>}
      </div>

      <form onSubmit={handleSubmit} className="bg-surface-soft rounded-lg p-7 shadow-card flex flex-col gap-4.5">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="field">
            <label>Назва блоку</label>
            <input type="text" required placeholder="Наприклад: Алгебра — 10 клас" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="field">
            <label>Предмет / тег (необов'язково)</label>
            <input type="text" placeholder="Математика" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
        </div>

        <div className="field">
          <label>Привʼязати до товару (необовʼязково)</label>
          <select
            value={linkedProductId}
            onChange={(e) => setLinkedProductId(e.target.value)}
            className="px-4 py-3 rounded-md border-2 border-accent-soft bg-surface outline-none"
          >
            <option value="">— пароль до блоку (як зараз) —</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>

        {isLinked ? (
          <p className="text-sm text-ink-muted bg-surface rounded-md px-4.5 py-3.5 leading-relaxed">
            Пароль не потрібен — доступ отримає будь-хто, хто купив «{products.find((p) => p.id === linkedProductId)?.title}»,
            або скористався запрошенням від покупця (учні вчителя).
          </p>
        ) : (
          <div className="field">
            <label>Пароль до блоку</label>
            <input type="text" required placeholder="Пароль, який отримає репетитор" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        )}

        <div className="flex flex-col gap-5">
          {sections.map((section, i) => (
            <SectionEditor key={i} section={section} onChange={(s) => updateSection(i, s)} onRemove={() => removeSection(i)} />
          ))}
        </div>

        <div>
          <button type="button" onClick={addSection} className="btn btn-ghost">
            + Додати розділ
          </button>
        </div>

        <div>
          <button type="submit" disabled={submitting} className="btn">
            {submitting ? (isLinked ? "Створення…" : "Шифрування…") : "Згенерувати JSON"}
          </button>
        </div>
      </form>

      {output && (
        <div className="mt-6">
          <div className="field">
            <label>Готовий об'єкт — встав його в data/decks.json</label>
            <pre className="w-full min-h-40 font-mono text-[12.5px] px-4 py-4 rounded-md border-2 border-accent-soft bg-surface whitespace-pre overflow-auto">
              {JSON.stringify(output, null, 2)}
            </pre>
          </div>
          <div className="flex gap-2.5 mt-2.5">
            <button type="button" onClick={copyOutput} className="btn btn-ghost">
              {copied ? "Скопійовано ✓" : "Скопіювати"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
