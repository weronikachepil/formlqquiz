import { Link } from "react-router-dom";
import ProductCover from "./ProductCover";
import { CartIcon } from "./Icons";
import { useCart, defaultFormatsFor } from "../context/CartContext";

export function formatPrice(product) {
  if (product.status === "soon" || product.price == null) return "₴---";
  return `₴${product.price}`;
}

export default function ProductCard({ product }) {
  const { addToCart, isInCart } = useCart();
  const available = product.status === "available";
  const inCart = isInCart(product.id);

  return (
    <div className="card p-4 flex flex-col gap-3.5 transition-all duration-200 hover:-translate-y-1 hover:shadow-card-hover">
      <ProductCover product={product} />
      <p className="text-[15px] font-bold m-0 min-h-10">{product.title}</p>
      <div className="flex items-center gap-2">
        <Link to={`/product/${product.id}`} className="btn btn-ghost flex-1 text-center text-[12.5px] px-3.5">
          Дізнатися більше
        </Link>
        <span className="bg-[#16132b] text-white font-extrabold text-[13px] rounded-full px-3.5 py-2.5 whitespace-nowrap">
          {formatPrice(product)}
        </span>
        <button
          type="button"
          disabled={!available}
          title={available ? "Додати в кошик" : "Скоро у продажу"}
          onClick={() => available && addToCart(product.id, defaultFormatsFor(product))}
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white transition-colors ${
            !available ? "bg-accent-soft cursor-not-allowed" : inCart ? "bg-success" : "bg-accent hover:bg-accent-dark cursor-pointer"
          }`}
        >
          <CartIcon className="w-[18px] h-[18px]" />
        </button>
      </div>
    </div>
  );
}
