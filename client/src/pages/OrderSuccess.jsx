import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";

export default function OrderSuccess() {
  const { clearCart } = useCart();

  useEffect(() => {
    if (window.confetti) window.confetti({ particleCount: 130, spread: 80, origin: { y: 0.6 } });
    clearCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="max-w-[860px] mx-auto px-6 py-14">
      <div className="text-center font-script text-4xl font-bold text-accent-dark mb-4">formlq</div>
      <div className="card p-12 flex flex-col items-center gap-5 text-center max-w-[560px] mx-auto">
        <div className="text-[56px] leading-none">🎉</div>
        <h1 className="text-2xl font-extrabold m-0">Дякуємо за покупку!</h1>
        <p className="text-ink-muted m-0">Оплату отримано. Доступ до матеріалів надішлемо на вказаний email найближчим часом.</p>
        <Link to="/catalog" className="btn">
          ← До каталогу
        </Link>
      </div>
    </main>
  );
}
