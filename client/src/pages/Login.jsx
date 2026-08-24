import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { GoogleLogo } from "../components/Icons";
import { useAuth } from "../context/AuthContext";
import { googleAuthUrl } from "../api";
import { safeRedirect } from "../lib/redirect";

export default function Login({ variant = "page", redirectOverride, emailOverride, onSuccess, onSwitchToRegister }) {
  const [params] = useSearchParams();
  const isModal = variant === "modal";
  const redirectTarget = redirectOverride ?? safeRedirect(params.get("redirect"));
  const googleFailed = !isModal && params.get("error") === "google";

  const [email, setEmail] = useState(emailOverride ?? params.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(googleFailed ? "Не вдалося увійти через Google. Спробуй ще раз." : "");
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      if (onSuccess) onSuccess();
      else navigate(redirectTarget);
    } catch (err) {
      setError(err.message || "Не вдалося увійти.");
      setSubmitting(false);
    }
  }

  const card = (
    <div className="card overflow-hidden">
      <div className="p-7 pb-6 flex flex-col gap-4">
        <h1 className="text-[22px] font-extrabold m-0">Увійти в акаунт</h1>

        <a href={googleAuthUrl(redirectTarget)} className="btn-google">
          <GoogleLogo className="w-[18px] h-[18px]" />
          Продовжити з Google
        </a>

        <p className="flex items-center gap-3 text-ink-muted text-xs font-bold uppercase tracking-wide my-0.5">
          <span className="flex-1 h-px bg-accent-soft" />
          або
          <span className="flex-1 h-px bg-accent-soft" />
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" required autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="password">Пароль</label>
            <input id="password" type="password" required autoComplete="current-password" placeholder="Твій пароль" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button type="submit" disabled={submitting} className="btn btn-block">
            {submitting ? "Вхід…" : "Увійти"}
          </button>
        </form>
      </div>
      <div className="bg-surface-soft border-t border-accent-soft px-7 py-4.5 text-center text-sm text-ink-muted">
        Немає акаунту?{" "}
        {isModal ? (
          <button type="button" onClick={onSwitchToRegister} className="plain-link bg-transparent border-none p-0 cursor-pointer font-bold">
            Зареєструватися
          </button>
        ) : (
          <Link to={`/register?redirect=${encodeURIComponent(redirectTarget)}`} className="plain-link">
            Зареєструватися
          </Link>
        )}
      </div>
    </div>
  );

  if (isModal) return card;

  return (
    <main className="max-w-[420px] mx-auto px-6 pt-[72px] pb-20">
      <div className="text-center font-script text-4xl font-bold text-accent-dark mb-7">formlq</div>
      {card}
    </main>
  );
}
