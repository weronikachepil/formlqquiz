import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import SiteNav from "../components/SiteNav";
import ProductCover from "../components/ProductCover";
import { formatPrice } from "../components/ProductCard";
import { useCart, defaultFormatsFor } from "../context/CartContext";
import { getProducts } from "../api";

const FORMAT_LABELS = { pdf: "PDF", print: "Друк" };

export default function Product() {
  const { id } = useParams();
  const [products, setProducts] = useState(null);
  const [error, setError] = useState(false);
  const { addToCart, isInCart } = useCart();

  useEffect(() => {
    getProducts()
      .then(setProducts)
      .catch(() => setError(true));
  }, []);

  const product = products?.find((p) => p.id === id);

  return (
    <>
      <SiteNav />
      <main className="max-w-[1080px] mx-auto px-6 py-10">
        <Link to="/catalog" className="plain-link inline-block mb-5">
          ← До каталогу
        </Link>

        {error && <div className="empty-state">Не вдалося завантажити товар.</div>}
        {products && !product && <div className="empty-state">Товар не знайдено.</div>}

        {product && (
          <div className="grid md:grid-cols-[260px_1fr] gap-8 card p-7">
            <ProductCover product={product} />
            <div>
              <h1 className="text-3xl font-extrabold mb-2">{product.title}</h1>
              <p className="text-ink-muted leading-relaxed mb-6">{product.description}</p>
              <div className="flex gap-5 mb-6">
                {(product.formats || []).map((f) => (
                  <span key={f} className="badge-chip">
                    {FORMAT_LABELS[f] || f}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-3 max-w-[360px]">
                <span className="bg-[#16132b] text-white font-extrabold text-sm rounded-full px-3.5 py-2.5">
                  {formatPrice(product)}
                </span>
                <button
                  type="button"
                  disabled={product.status !== "available"}
                  onClick={() => addToCart(product.id, defaultFormatsFor(product))}
                  className="btn"
                >
                  {product.status !== "available" ? "Скоро у продажу" : isInCart(product.id) ? "У кошику ✓" : "Додати в кошик"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
