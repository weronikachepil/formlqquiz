import { useEffect, useState } from "react";
import birdIcon from "../assets/bird.svg";

const SEEN_KEY = "formlq_intro_seen";

export default function IntroSplash() {
  const [phase, setPhase] = useState(() => (sessionStorage.getItem(SEEN_KEY) ? "done" : "visible"));

  useEffect(() => {
    if (phase !== "visible") return;
    sessionStorage.setItem(SEEN_KEY, "1");
    document.body.style.overflow = "hidden";
    const timer = setTimeout(() => setPhase("closing"), 2000);
    return () => clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "closing") return;
    const timer = setTimeout(() => {
      document.body.style.overflow = "";
      setPhase("done");
    }, 600);
    return () => clearTimeout(timer);
  }, [phase]);

  if (phase === "done") return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-surface/70 backdrop-blur-xl intro-overlay ${
        phase === "closing" ? "intro-overlay-closing" : ""
      }`}
    >
      <div
        className="intro-bird"
        style={{ WebkitMaskImage: `url(${birdIcon})`, maskImage: `url(${birdIcon})` }}
      />
      <div className="intro-text-wrap px-6 py-4">
        <span
          className="font-script text-6xl sm:text-7xl font-bold text-accent-dark whitespace-nowrap block"
          style={{ lineHeight: 1.5 }}
        >
          formlq
        </span>
      </div>
    </div>
  );
}
