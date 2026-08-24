import { useEffect, useState } from "react";
import SiteNav from "../components/SiteNav";
import ProductCard from "../components/ProductCard";
import { getProducts } from "../api";

export default function Catalog() {
  const [products, setProducts] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    getProducts()
      .then(setProducts)
      .catch(() => setError(true));
  }, []);

  return (
    <>
      <SiteNav />
      <main className="max-w-[1080px] mx-auto px-6 py-10">
        <h1 className="text-3xl font-extrabold mb-8">Каталог</h1>

        {error && <div className="empty-state">Не вдалося завантажити каталог.</div>}

        {products && (
          <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
