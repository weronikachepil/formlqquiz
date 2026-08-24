import { useEffect, useRef, useState } from "react";
import FlipCard from "../components/FlipCard";
import { getDecks } from "../api";
import { decryptJSON } from "../lib/crypto";
import { isSectionCompleted, markSectionCompleted, pluralSuffix, shuffle } from "../lib/studyProgress";

function UnlockForm({ block, onUnlocked, onCancel }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const data = await decryptJSON(password, block);
      onUnlocked(data);
    } catch (err) {
      setError("Неправильний пароль. Спробуй ще раз.");
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      onClick={(e) => e.stopPropagation()}
      className="w-full pt-3.5 mt-2.5 border-t border-dashed border-accent-soft flex gap-2.5 flex-wrap"
    >
      <input
        ref={inputRef}
        type="password"
        required
        autoComplete="off"
        placeholder="Пароль до блоку"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="flex-1 min-w-[160px] px-4 py-3 rounded-full border-2 border-accent-soft font-sans text-base outline-none bg-white focus:border-accent"
      />
      <button type="submit" disabled={submitting} className="btn">
        {submitting ? "Перевірка…" : "Відкрити"}
      </button>
      <button type="button" onClick={onCancel} className="btn btn-ghost">
        Скасувати
      </button>
      {error && <p className="error-text w-full m-0">{error}</p>}
    </form>
  );
}

function BlockList({ blocks, onUnlocked }) {
  const [openId, setOpenId] = useState(null);

  if (blocks.length === 0) {
    return <div className="empty-state">Блоків поки немає. Додай перший через адмінку.</div>;
  }

  return (
    <div className="flex flex-col gap-2.5">
      {blocks.map((block) => {
        const isPasswordless = !block.salt;
        const isOpen = openId === block.id;
        const sectionCount = block.sectionCount || block.sections?.length || 0;
        const cardCount = block.cardCount || block.sections?.reduce((sum, s) => sum + (s.cards?.length || 0), 0) || 0;
        const subParts = [];
        if (sectionCount) subParts.push(`${sectionCount} розділ${pluralSuffix(sectionCount)}`);
        if (cardCount) subParts.push(`${cardCount} карток`);
        if (block.subject) subParts.push(block.subject);

        return (
          <div
            key={block.id}
            onClick={() => {
              if (isPasswordless) onUnlocked(block, { sections: block.sections });
              else if (!isOpen) setOpenId(block.id);
            }}
            className={`bg-white shadow-pill flex flex-col px-5.5 py-3.5 border-2 transition-all ${
              isOpen ? "rounded-md border-accent cursor-default" : "rounded-full border-transparent hover:border-accent-soft hover:-translate-y-0.5 cursor-pointer"
            }`}
          >
            <div className="flex items-center justify-between gap-4 w-full">
              <div className="min-w-0">
                <p className="text-base font-bold m-0">{block.title}</p>
                <p className="text-[13px] text-ink-muted m-0 mt-0.5">{subParts.join(" · ") || "?"}</p>
              </div>
              {!isOpen && (
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-[15px] flex-shrink-0 ${
                    isPasswordless ? "bg-success-soft" : "bg-orange-100"
                  }`}
                >
                  {isPasswordless ? "▶" : "🔒"}
                </span>
              )}
            </div>
            {isOpen && !isPasswordless && (
              <UnlockForm block={block} onUnlocked={(data) => onUnlocked(block, data)} onCancel={() => setOpenId(null)} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function SectionList({ block, sections, onSelect, onExit }) {
  return (
    <section className="bg-surface-soft rounded-lg p-5.5 shadow-card mb-7">
      <div className="flex items-center justify-between gap-3 px-3 pb-3.5 text-xs font-bold uppercase tracking-wide text-ink-muted flex-wrap">
        <button type="button" onClick={onExit} className="btn btn-ghost px-4 py-2">
          ← Усі блоки
        </button>
        <span>{block.title}</span>
      </div>
      <div className="flex flex-col gap-2.5">
        {sections.map((section, i) => {
          const done = isSectionCompleted(block.id, i);
          return (
            <div
              key={i}
              onClick={() => onSelect(i)}
              className="bg-white rounded-full shadow-pill px-5.5 py-3.5 border-2 border-transparent hover:border-accent-soft hover:-translate-y-0.5 transition-all cursor-pointer flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <p className="text-base font-bold m-0">{section.title}</p>
                <p className="text-[13px] text-ink-muted m-0 mt-0.5">{(section.cards || []).length} карток</p>
              </div>
              <div className="flex items-center gap-2.5 flex-shrink-0">
                {done && <span className="badge-chip bg-success-soft text-[#1a7f43]">✓ Вивчено</span>}
                <span className="w-8 h-8 rounded-full bg-success-soft flex items-center justify-center text-[15px]">▶</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function StudySession({ block, section, sectionIndex, onExit, onRestart }) {
  const cards = section.cards || [];
  const [queue, setQueue] = useState(() => shuffle(cards.map((_, i) => i)));
  const [stats, setStats] = useState({ reviews: 0, mistakes: 0 });
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (done) return;
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        if (!flipped) setFlipped(true);
      } else if (e.code === "ArrowRight" && flipped) {
        rateCard(true);
      } else if (e.code === "ArrowLeft" && flipped) {
        rateCard(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipped, done, queue]);

  function rateCard(knewIt) {
    const cardIdx = queue[0];
    const nextQueue = queue.slice(1);
    const nextStats = { reviews: stats.reviews + 1, mistakes: stats.mistakes + (knewIt ? 0 : 1) };

    if (!knewIt) {
      const insertAt = Math.min(3, nextQueue.length);
      nextQueue.splice(insertAt, 0, cardIdx);
    }

    setStats(nextStats);
    setFlipped(false);

    if (nextQueue.length === 0) {
      markSectionCompleted(block.id, sectionIndex);
      setDone(true);
      if (window.confetti) window.confetti({ particleCount: 130, spread: 80, origin: { y: 0.6 } });
    } else {
      setQueue(nextQueue);
    }
  }

  function restart() {
    setQueue(shuffle(cards.map((_, i) => i)));
    setStats({ reviews: 0, mistakes: 0 });
    setFlipped(false);
    setDone(false);
  }

  const currentCard = !done ? cards[queue[0]] : null;

  return (
    <section className="flex flex-col items-center gap-6">
      <div className="w-full flex items-center justify-between flex-wrap gap-2.5">
        <button type="button" onClick={onExit} className="btn btn-ghost self-start">
          ← Розділи
        </button>
        <h2 className="text-xl font-extrabold m-0">{section.title}</h2>
        <span className="text-[13px] font-bold text-ink-muted bg-white px-3.5 py-1.5 rounded-full shadow-pill">
          {done ? "Завершено!" : `Свайпнуто: ${stats.reviews} · У черзі: ${queue.length}`}
        </span>
      </div>

      {!done && currentCard && (
        <div className="flex flex-col items-center gap-6 w-full">
          <FlipCard card={currentCard} flipped={flipped} onFlip={() => setFlipped(true)} onRate={rateCard} />

          <p className={`text-[13px] text-ink-muted -mt-3 ${flipped ? "hidden" : "block"}`}>
            Клікни картку, щоб перегорнути · після відповіді — свайпни вправо «Знаю» / вліво «Ще вчу»
          </p>

          {flipped && (
            <div className="flex items-center gap-3 flex-wrap justify-center">
              <button type="button" onClick={() => rateCard(false)} className="btn btn-ghost text-base px-7.5 py-4">
                🔁 Ще вчу
              </button>
              <button type="button" onClick={() => rateCard(true)} className="btn bg-success hover:bg-[#1ea34e] text-base px-7.5 py-4">
                ✅ Знаю
              </button>
            </div>
          )}
        </div>
      )}

      {done && (
        <div className="flex flex-col items-center gap-5 w-full max-w-[560px] card p-12 text-center">
          <div className="text-[56px] leading-none">🎉</div>
          <h2 className="text-2xl font-extrabold m-0">Розділ вивчено!</h2>
          <div className="flex gap-4 flex-wrap justify-center">
            <div className="flex flex-col items-center bg-surface-soft rounded-md px-6 py-4 min-w-[96px]">
              <span className="text-[28px] font-extrabold text-accent-dark">{cards.length}</span>
              <span className="text-[11px] font-bold uppercase tracking-wide text-ink-muted mt-1">карток</span>
            </div>
            <div className="flex flex-col items-center bg-surface-soft rounded-md px-6 py-4 min-w-[96px]">
              <span className="text-[28px] font-extrabold text-accent-dark">{stats.reviews}</span>
              <span className="text-[11px] font-bold uppercase tracking-wide text-ink-muted mt-1">повторень</span>
            </div>
            <div className="flex flex-col items-center bg-surface-soft rounded-md px-6 py-4 min-w-[96px]">
              <span className="text-[28px] font-extrabold text-accent-dark">{stats.mistakes}</span>
              <span className="text-[11px] font-bold uppercase tracking-wide text-ink-muted mt-1">виправлено</span>
            </div>
          </div>
          <div className="flex gap-2.5 flex-wrap justify-center">
            <button type="button" onClick={restart} className="btn btn-ghost">
              🔁 Повторити ще раз
            </button>
            <button type="button" onClick={onExit} className="btn">
              ← Інші розділи
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default function Study() {
  const [blocks, setBlocks] = useState([]);
  const [activeBlock, setActiveBlock] = useState(null);
  const [sections, setSections] = useState([]);
  const [activeSectionIndex, setActiveSectionIndex] = useState(null);

  useEffect(() => {
    getDecks()
      .then(setBlocks)
      .catch(() => setBlocks([]));
  }, []);

  function handleUnlocked(block, data) {
    const sectionsData = data.sections && data.sections.length ? data.sections : [{ title: block.title, cards: data.cards || [] }];
    setActiveBlock(block);
    setSections(sectionsData);
  }

  return (
    <main className="max-w-[860px] mx-auto px-6 py-14">
      <div className="text-center font-script text-4xl font-bold text-accent-dark mb-1">formlq</div>
      <h1 className="text-center text-[13px] font-bold uppercase tracking-widest text-ink-muted mb-10">Квіз-картки</h1>

      {activeSectionIndex !== null ? (
        <StudySession
          block={activeBlock}
          section={sections[activeSectionIndex]}
          sectionIndex={activeSectionIndex}
          onExit={() => setActiveSectionIndex(null)}
        />
      ) : activeBlock ? (
        <SectionList
          block={activeBlock}
          sections={sections}
          onSelect={setActiveSectionIndex}
          onExit={() => {
            setActiveBlock(null);
            setSections([]);
          }}
        />
      ) : (
        <BlockList blocks={blocks} onUnlocked={handleUnlocked} />
      )}
    </main>
  );
}
