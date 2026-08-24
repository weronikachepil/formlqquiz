import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SiteNav from "../components/SiteNav";
import ProductCover from "../components/ProductCover";
import ProductCard from "../components/ProductCard";
import RevealItem from "../components/RevealItem";
import { BookIcon, CardsIcon, AccountIcon } from "../components/Icons";
import { useAuth } from "../context/AuthContext";
import { useAuthModal } from "../context/AuthModalContext";
import { getProducts } from "../api";

const FEATURES = [
  {
    icon: BookIcon,
    title: "Практичні збірники",
    text: "Тестові завдання, завдання на відповідність і з відкритою відповіддю — у PDF або друком.",
  },
  {
    icon: CardsIcon,
    title: "Квіз-картки",
    text: "Флеш-картки з формулами й графіками та системою інтервального повторення для швидкого закріплення.",
  },
  {
    icon: AccountIcon,
    title: "Особистий кабінет",
    text: "Усі покупки в одному місці: завантажуй PDF і повертайся до карток з будь-якого пристрою.",
  },
];

const STEPS = [
  { title: "Обери товар", text: "Знайди потрібний збірник чи набір карток у каталозі." },
  { title: "Оплати замовлення", text: "Швидка й безпечна оплата карткою." },
  { title: "Отримай доступ", text: "Матеріали з'являються в кабінеті одразу після оплати." },
];

export default function Landing() {
  const [available, setAvailable] = useState([]);
  const { user, loading } = useAuth();
  const { openLogin, openRegister } = useAuthModal();
  const navigate = useNavigate();

  useEffect(() => {
    getProducts()
      .then((products) => setAvailable(products.filter((p) => p.status === "available").slice(0, 3)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!loading && user) {
      navigate("/catalog", { replace: true });
    }
  }, [loading, user, navigate]);

  if (loading || user) return null;

  const back = available[0];
  const front = available[1] || available[0];

  return (
    <>
      <SiteNav />
      <main className="max-w-[1080px] mx-auto px-6 pb-10">
        {/* Hero */}
        <section className="relative grid md:grid-cols-[1.1fr_0.9fr] items-center gap-8 pt-12 md:pt-19 pb-16 text-center md:text-left">
          <div
            className="absolute -top-30 -left-35 w-[380px] h-[380px] rounded-full opacity-55 -z-10 pointer-events-none"
            style={{ background: "radial-gradient(circle, #e0e0fb 0%, transparent 70%)", filter: "blur(60px)" }}
          />
          <div
            className="absolute -bottom-25 -right-25 w-80 h-80 rounded-full opacity-55 -z-10 pointer-events-none"
            style={{ background: "radial-gradient(circle, #c9c3fb 0%, transparent 70%)", filter: "blur(60px)" }}
          />

          <RevealItem>
            <span className="inline-block bg-accent-soft text-accent-dark text-xs font-extrabold uppercase tracking-wide rounded-full px-4 py-2 mb-5">
              Підготовка до НМТ з математики
            </span>
            <h1 className="text-[32px] md:text-[46px] font-extrabold leading-[1.12] tracking-tight mb-4.5">
              Готуйся до НМТ впевнено,{" "}
              <span className="bg-gradient-to-r from-accent to-[#8b7ff6] bg-clip-text text-transparent">а не в стресі</span>
            </h1>
            <p className="text-[17px] text-ink-muted max-w-[480px] mx-auto md:mx-0 mb-8 leading-relaxed">
              Практичні збірники та інтерактивні квіз-картки з математики. Обирай PDF, друк
              або флеш-картки з інтервальним повторенням — і відстежуй прогрес у своєму кабінеті.
            </p>
            <div className="flex gap-3.5 flex-wrap justify-center md:justify-start">
              <Link to="/catalog" className="btn btn-lg">
                Перейти до каталогу
              </Link>
              <button type="button" onClick={() => openRegister()} className="btn btn-ghost btn-lg">
                Створити акаунт
              </button>
            </div>
          </RevealItem>

          <RevealItem delay={0.1} className="relative h-[260px] md:h-[340px] order-first md:order-none">
            {back && front && (
              <>
                <div
                  className="absolute top-1/2 left-1/2 w-[150px] h-[200px] md:w-[190px] md:h-[253px] animate-float-back"
                  style={{ marginTop: "-100px", marginLeft: "-75px" }}
                >
                  <ProductCover product={back} className="w-full h-full !rounded-none brightness-[0.97]" style={{ boxShadow: "0 24px 48px rgba(67,56,202,0.22)" }} />
                </div>
                <div
                  className="absolute top-1/2 left-1/2 w-[150px] h-[200px] md:w-[190px] md:h-[253px] animate-float-front"
                  style={{ marginTop: "-100px", marginLeft: "-75px" }}
                >
                  <ProductCover product={front} className="w-full h-full !rounded-none" style={{ boxShadow: "0 24px 48px rgba(67,56,202,0.22)" }} />
                </div>
              </>
            )}
          </RevealItem>
        </section>

        {/* Features */}
        <section className="py-12">
          <RevealItem as="h2" className="text-[26px] font-extrabold text-center mb-8">
            Що всередині
          </RevealItem>
          <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            {FEATURES.map((f, i) => (
              <RevealItem key={f.title} delay={i * 0.1} className="card p-7 px-6 text-center group">
                <div className="w-13 h-13 rounded-full bg-accent-soft text-accent-dark flex items-center justify-center mx-auto mb-4.5 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 group-hover:bg-accent group-hover:text-white">
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="text-[17px] font-extrabold mb-2">{f.title}</h3>
                <p className="text-sm text-ink-muted leading-relaxed m-0">{f.text}</p>
              </RevealItem>
            ))}
          </div>
        </section>

        {/* Steps */}
        <section className="py-12">
          <RevealItem as="h2" className="text-[26px] font-extrabold text-center mb-8">
            Як це працює
          </RevealItem>
          <div className="relative grid sm:grid-cols-3 gap-6">
            <div className="hidden sm:block absolute top-5 left-[calc(100%/6)] right-[calc(100%/6)] h-0.5 bg-accent-soft" />
            {STEPS.map((s, i) => (
              <RevealItem key={s.title} delay={i * 0.1} className="relative text-center">
                <span className="flex items-center justify-center w-10 h-10 rounded-full bg-accent text-white font-extrabold mx-auto mb-3.5 shadow-[0_6px_16px_rgba(79,70,229,0.35)]">
                  {i + 1}
                </span>
                <h3 className="text-base font-extrabold mb-1.5">{s.title}</h3>
                <p className="text-sm text-ink-muted m-0 leading-relaxed">{s.text}</p>
              </RevealItem>
            ))}
          </div>
        </section>

        {/* Popular */}
        <section className="py-12">
          <RevealItem as="h2" className="text-[26px] font-extrabold text-center mb-8">
            Популярне
          </RevealItem>
          <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
            {available.map((product, i) => (
              <RevealItem key={product.id} delay={i * 0.1}>
                <ProductCard product={product} />
              </RevealItem>
            ))}
          </div>
          <p className="text-center mt-7">
            <Link to="/catalog" className="plain-link">
              Дивитись весь каталог →
            </Link>
          </p>
        </section>

        {/* CTA */}
        <section className="py-12">
          <RevealItem className="relative overflow-hidden rounded-lg px-8 py-14 text-center text-white bg-gradient-to-br from-accent to-accent-dark">
            <div
              className="absolute inset-0 opacity-60"
              style={{
                backgroundImage: "radial-gradient(rgba(255,255,255,0.14) 1.5px, transparent 1.5px)",
                backgroundSize: "22px 22px",
              }}
            />
            <h2 className="relative text-[26px] font-extrabold mb-5">Готовий(-a) почати?</h2>
            <button
              type="button"
              onClick={() => openRegister()}
              className="relative btn btn-lg bg-white text-accent-dark hover:bg-[#f2f1ff]"
            >
              Створити акаунт безкоштовно
            </button>
          </RevealItem>
        </section>
      </main>

      <footer className="border-t border-accent-soft mt-6 px-6 pt-10 pb-7">
        <div className="max-w-[1080px] mx-auto flex items-start justify-between gap-5 flex-wrap">
          <div>
            <div className="font-script text-3xl font-bold text-accent-dark mb-1">formlq</div>
            <p className="text-xs text-ink-muted m-0">Практика для НМТ з математики</p>
          </div>
          <nav className="flex gap-4.5 flex-wrap">
            <Link to="/catalog" className="plain-link">
              Каталог
            </Link>
            <button type="button" onClick={() => openLogin()} className="plain-link bg-transparent border-none p-0 cursor-pointer">
              Вхід
            </button>
            <button type="button" onClick={() => openRegister()} className="plain-link bg-transparent border-none p-0 cursor-pointer">
              Реєстрація
            </button>
          </nav>
        </div>
        <p className="max-w-[1080px] mx-auto mt-7 pt-5 border-t border-accent-soft text-center text-ink-muted text-xs">
          © formlq
        </p>
      </footer>
    </>
  );
}
