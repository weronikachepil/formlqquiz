import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { claimShareLink, getShareLinkInfo } from "../api";
import { useAuth } from "../context/AuthContext";
import { useAuthModal } from "../context/AuthModalContext";

export default function Join() {
  const { code } = useParams();
  const { refresh } = useAuth();
  const { openLogin } = useAuthModal();
  const navigate = useNavigate();
  const [info, setInfo] = useState(null);
  const [linkError, setLinkError] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [claimError, setClaimError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    getShareLinkInfo(code)
      .then(setInfo)
      .catch((err) => setLinkError(err.message || "Посилання недійсне."));
  }, [code]);

  async function handleSubmit(e) {
    e.preventDefault();
    setClaimError("");
    setSubmitting(true);
    try {
      const res = await claimShareLink(code, email);
      if (res.autoLoggedIn) {
        await refresh();
        navigate("/study");
        return;
      }
      setResult({ email });
    } catch (err) {
      setClaimError(err.message || "Не вдалося перевірити пошту.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="max-w-[480px] mx-auto px-6 pt-[72px] pb-20">
      <div className="text-center font-script text-4xl font-bold text-accent-dark mb-7">formlq</div>

      <div className="card p-8 flex flex-col items-center gap-4 text-center">
        {linkError && (
          <>
            <div className="text-[40px] leading-none">😕</div>
            <h1 className="text-xl font-extrabold m-0">{linkError}</h1>
            <Link to="/catalog" className="btn btn-ghost">
              До каталогу
            </Link>
          </>
        )}

        {!linkError && !info && <p className="text-ink-muted m-0">Перевіряємо посилання…</p>}

        {!linkError && info && !result && (
          <>
            <h1 className="text-xl font-extrabold m-0">Приєднатися до «{info.productTitle}»</h1>
            <p className="text-ink-muted m-0">Введи пошту, яку вчитель додав до списку запрошених.</p>
            <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-full border-2 border-accent-soft font-sans text-base outline-none bg-white focus:border-accent text-center"
              />
              {claimError && <p className="error-text m-0">{claimError}</p>}
              <button type="submit" disabled={submitting} className="btn btn-block">
                {submitting ? "Перевірка…" : "Отримати доступ"}
              </button>
            </form>
          </>
        )}

        {result && (
          <>
            <div className="text-[40px] leading-none">🎉</div>
            <h1 className="text-xl font-extrabold m-0">Доступ надано!</h1>
            <p className="text-ink-muted m-0">
              У тебе вже є акаунт з поштою <strong>{result.email}</strong> — увійди з паролем, щоб побачити картки.
            </p>
            <button type="button" onClick={() => openLogin({ redirect: "/study", email: result.email })} className="btn">
              Увійти
            </button>
          </>
        )}
      </div>
    </main>
  );
}
