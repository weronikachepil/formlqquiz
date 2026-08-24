import { Link } from "react-router-dom";

export default function OrderFail() {
  return (
    <main className="max-w-[860px] mx-auto px-6 py-14">
      <div className="text-center font-script text-4xl font-bold text-accent-dark mb-4">formlq</div>
      <div className="card p-12 flex flex-col items-center gap-5 text-center max-w-[560px] mx-auto">
        <div className="text-[56px] leading-none">😕</div>
        <h1 className="text-2xl font-extrabold m-0">Оплату не завершено</h1>
        <p className="text-ink-muted m-0">Платіж скасовано або не пройшов. Кошик збережено — можна спробувати ще раз.</p>
        <Link to="/cart" className="btn">
          ← Повернутись до кошика
        </Link>
      </div>
    </main>
  );
}
