import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useAuthModal } from "../context/AuthModalContext";

export default function SiteNav() {
  const { user, loading } = useAuth();
  const { count } = useCart();
  const { openLogin, openRegister } = useAuthModal();

  const linkClass = ({ isActive }) =>
    `inline-flex items-center gap-1.5 font-bold px-3.5 py-2 rounded-full transition-colors ${
      isActive ? "text-accent-dark bg-accent-soft" : "text-ink hover:bg-accent-soft"
    }`;

  return (
    <header className="sticky top-0 z-30 border-b border-accent/10 bg-[rgba(247,246,251,0.78)] backdrop-blur-md">
      <div className="max-w-[1080px] mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <Link to="/" className="font-script text-3xl font-bold text-accent-dark no-underline">
          formlq
        </Link>
        <nav className="flex items-center gap-2.5">
          <NavLink to="/catalog" className={linkClass}>
            Каталог
          </NavLink>
          <NavLink to="/cart" className={linkClass}>
            Кошик
            {count > 0 && (
              <span className="bg-danger text-white text-[10px] font-extrabold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                {count}
              </span>
            )}
          </NavLink>
          {!loading &&
            (user ? (
              <NavLink to="/account" className={linkClass}>
                Кабінет
              </NavLink>
            ) : (
              <>
                <button type="button" onClick={() => openLogin()} className="btn btn-ghost">
                  Увійти
                </button>
                <button type="button" onClick={() => openRegister()} className="btn">
                  Створити акаунт
                </button>
              </>
            ))}
        </nav>
      </div>
    </header>
  );
}
