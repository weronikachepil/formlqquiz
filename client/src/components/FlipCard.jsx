import { useEffect, useRef } from "react";
import GraphBox from "./GraphBox";
import { renderMath } from "../lib/katex";

const SWIPE_THRESHOLD = 90;

function CardFace({ text, graph, side, isBack }) {
  const textRef = useRef(null);
  useEffect(() => {
    renderMath(textRef.current);
  }, [text]);

  const hasGraph = !!(graph && graph.side === side);

  return (
    <div
      className={`absolute inset-0 flex flex-col items-center justify-center text-center rounded-lg shadow-card overflow-y-auto px-8 py-10 ${
        isBack ? "bg-accent-soft" : "bg-white"
      } ${hasGraph ? "md:!flex-row gap-5.5 md:!text-left" : ""}`}
      style={{ backfaceVisibility: "hidden", transform: isBack ? "rotateY(180deg)" : undefined }}
    >
      <span className="absolute top-5 left-6 text-[11px] font-bold uppercase tracking-wide text-ink-muted">
        {side === "q" ? "Питання" : "Відповідь"}
      </span>
      <div ref={textRef} className={`text-[19px] font-semibold leading-relaxed ${hasGraph ? "flex-1" : ""}`}>
        {text}
      </div>
      {hasGraph && <GraphBox graph={graph} className="flex-1 !mt-0 md:!mt-0" />}
    </div>
  );
}

export default function FlipCard({ card, flipped, onFlip, onRate }) {
  const cardRef = useRef(null);
  const stampKnowRef = useRef(null);
  const stampForgetRef = useRef(null);
  const drag = useRef({ active: false, startX: 0, deltaX: 0, suppressClick: false });

  useEffect(() => {
    resetTransform();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card]);

  function updateStamps(dx) {
    const progress = Math.min(Math.abs(dx) / SWIPE_THRESHOLD, 1);
    if (stampKnowRef.current) stampKnowRef.current.style.opacity = dx > 0 ? progress : 0;
    if (stampForgetRef.current) stampForgetRef.current.style.opacity = dx < 0 ? progress : 0;
  }

  function resetTransform() {
    if (cardRef.current) {
      cardRef.current.style.transform = "";
      cardRef.current.style.opacity = "";
    }
    updateStamps(0);
  }

  function onPointerDown(e) {
    if (!flipped) return;
    drag.current = { active: true, startX: e.clientX, deltaX: 0, suppressClick: false };
    cardRef.current.style.transition = "none";
    cardRef.current.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e) {
    if (!drag.current.active) return;
    drag.current.deltaX = e.clientX - drag.current.startX;
    if (Math.abs(drag.current.deltaX) > 8) drag.current.suppressClick = true;
    cardRef.current.style.transform = `translateX(${drag.current.deltaX}px) rotate(${drag.current.deltaX / 18}deg)`;
    updateStamps(drag.current.deltaX);
  }

  function onPointerUp() {
    if (!drag.current.active) return;
    drag.current.active = false;
    cardRef.current.style.transition = "";

    if (Math.abs(drag.current.deltaX) > SWIPE_THRESHOLD) {
      const knew = drag.current.deltaX > 0;
      const flyX = knew ? window.innerWidth : -window.innerWidth;
      cardRef.current.style.transition = "transform 0.35s ease-out, opacity 0.35s ease-out";
      cardRef.current.style.transform = `translateX(${flyX}px) rotate(${knew ? 30 : -30}deg)`;
      cardRef.current.style.opacity = "0";
      setTimeout(() => {
        if (cardRef.current) cardRef.current.style.transition = "none";
        resetTransform();
        onRate(knew);
      }, 300);
    } else {
      resetTransform();
    }
  }

  function handleClick() {
    if (drag.current.suppressClick) {
      drag.current.suppressClick = false;
      return;
    }
    onFlip();
  }

  return (
    <div
      ref={cardRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={handleClick}
      className="relative w-full max-w-[560px] min-h-[300px] cursor-pointer"
      style={{ perspective: "1600px", touchAction: "pan-y" }}
    >
      <span
        ref={stampKnowRef}
        className="absolute top-6 left-5 px-4.5 py-2 border-[3px] border-success rounded-[10px] font-extrabold text-xl uppercase tracking-wide text-success bg-white opacity-0 pointer-events-none z-10 -rotate-12"
      >
        Знаю
      </span>
      <span
        ref={stampForgetRef}
        className="absolute top-6 right-5 px-4.5 py-2 border-[3px] border-danger rounded-[10px] font-extrabold text-xl uppercase tracking-wide text-danger bg-white opacity-0 pointer-events-none z-10 rotate-12"
      >
        Ще вчу
      </span>

      <div
        className="relative w-full min-h-[300px] transition-transform duration-500"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : undefined,
          transitionTimingFunction: "cubic-bezier(0.4,0.2,0.2,1)",
        }}
      >
        <CardFace text={card.q} graph={card.graph} side="q" isBack={false} />
        <CardFace text={card.a} graph={card.graph} side="a" isBack={true} />
      </div>
    </div>
  );
}
