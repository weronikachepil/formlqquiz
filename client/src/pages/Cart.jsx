import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SiteNav from "../components/SiteNav";
import ProductCover from "../components/ProductCover";
import { TrashIcon } from "../components/Icons";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useAuthModal } from "../context/AuthModalContext";
import { getProducts, checkout } from "../api";

const FORMAT_LABELS = { pdf: "PDF", print: "Друк" };

function CartItemRow({ item, product }) {
  const { removeFromCart, updateFormats } = useCart();

  const toggleFormat = (key, checked) => {
    const next = { ...item.formats, [key]: checked };
    if (!Object.values(next).some(Boolean)) next[key] = true;
    updateFormats(item.productId, next);
  };

  return (
    <div className="card p-4 px-5 flex items-center gap-4.5 flex-wrap">
      <div className="w-14 h-[74px] rounded-[10px] overflow-hidden relative flex-shrink-0">
        <ProductCover product={product} className="!absolute !top-0 !left-0 w-60 h-80 !rounded-none" style={{ transform: "scale(0.2333)", transformOrigin: "top left" }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-ink-muted m-0 mb-1">
          Додано {new Date(item.addedAt).toLocaleDateString("uk-UA")}
        </p>
        <p className="text-base font-bold m-0 mb-2">{product.title}</p>
        {(product.formats || []).length > 0 && (
          <div className="flex gap-4.5">
            {product.formats.map((f) => (
              <label key={f} className="flex items-center gap-1.5 text-sm font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!item.formats[f]}
                  onChange={(e) => toggleFormat(f, e.target.checked)}
                  className="w-[17px] h-[17px] accent-accent"
                />
                {FORMAT_LABELS[f] || f}
              </label>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2.5 flex-shrink-0">
        <Link to={`/product/${product.id}`} className="btn btn-ghost">
          Перейти до опису
        </Link>
        <button
          type="button"
          onClick={() => removeFromCart(product.id)}
          className="w-10 h-10 rounded-xl border-2 border-danger-soft bg-surface text-danger flex items-center justify-center hover:bg-danger-soft cursor-pointer"
        >
          <TrashIcon className="w-[17px] h-[17px]" />
        </button>
      </div>
    </div>
  );
}

export default function Cart() {
  const { items } = useCart();
  const { user, loading: authLoading } = useAuth();
  const { openLogin } = useAuthModal();
  const [products, setProducts] = useState(null);
  const [checkoutError, setCheckoutError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getProducts().then(setProducts);
  }, []);

  const productsById = useMemo(() => Object.fromEntries((products || []).map((p) => [p.id, p])), [products]);

  const total = useMemo(() => {
    if (!products) return 0;
    return items.reduce((sum, item) => {
      const product = productsById[item.productId];
      if (product && product.status === "available" && product.price != null) return sum + product.price;
      return sum;
    }, 0);
  }, [items, productsById, products]);

  async function handleCheckout() {
    setCheckoutError("");
    if (!user) {
      openLogin({ redirect: "/cart" });
      return;
    }
    setSubmitting(true);
    try {
      const { action, fields } = await checkout(items);
      const form = document.createElement("form");
      form.method = "POST";
      form.action = action;
      form.style.display = "none";
      Object.entries(fields).forEach(([key, value]) => {
        const values = Array.isArray(value) ? value : [value];
        values.forEach((v) => {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = Array.isArray(value) ? `${key}[]` : key;
          input.value = v;
          form.appendChild(input);
        });
      });
      document.body.appendChild(form);
      form.submit();
    } catch (e) {
      setCheckoutError(e.message || "Не вдалося створити замовлення.");
      setSubmitting(false);
    }
  }

  if (!products) {
    return (
      <>
        <SiteNav />
        <main className="max-w-[1080px] mx-auto px-6 py-10">
          <h1 className="text-3xl font-extrabold mb-8">Кошик</h1>
        </main>
      </>
    );
  }

  return (
    <>
      <SiteNav />
      <main className="max-w-[1080px] mx-auto px-6 py-10">
        <h1 className="text-3xl font-extrabold mb-8">Кошик</h1>

        {items.length === 0 ? (
          <div className="empty-state">
            Кошик порожній.{" "}
            <Link to="/catalog" className="plain-link">
              До каталогу
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4">
              {items.map((item) => {
                const product = productsById[item.productId];
                if (!product) return null;
                return <CartItemRow key={item.productId} item={item} product={product} />;
              })}
            </div>

            <div className="card p-5.5 mt-7 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm text-ink-muted font-bold m-0 mb-0.5">Разом</p>
                <p className="text-[26px] font-extrabold m-0">₴{total}</p>
              </div>
              <button
                type="button"
                onClick={handleCheckout}
                disabled={submitting || authLoading}
                className="btn"
              >
                {submitting ? "Оформлення…" : user ? "Оформити замовлення" : "Увійти, щоб оформити замовлення"}
              </button>
            </div>
            {checkoutError && <p className="error-text mt-3">{checkoutError}</p>}
          </>
        )}
      </main>
    </>
  );
}
