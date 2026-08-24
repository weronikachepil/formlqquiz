import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { AuthModalProvider } from "./context/AuthModalContext";
import IntroSplash from "./components/IntroSplash";
import AuthModal from "./components/AuthModal";
import Landing from "./pages/Landing";
import Catalog from "./pages/Catalog";
import Product from "./pages/Product";
import Cart from "./pages/Cart";
import Account from "./pages/Account";
import Login from "./pages/Login";
import Register from "./pages/Register";
import OrderSuccess from "./pages/OrderSuccess";
import OrderFail from "./pages/OrderFail";
import Study from "./pages/Study";
import Admin from "./pages/Admin";
import Join from "./pages/Join";

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <AuthModalProvider>
            <IntroSplash />
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/catalog" element={<Catalog />} />
              <Route path="/product/:id" element={<Product />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/account" element={<Account />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/order-success" element={<OrderSuccess />} />
              <Route path="/order-fail" element={<OrderFail />} />
              <Route path="/study" element={<Study />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/join/:code" element={<Join />} />
            </Routes>
            <AuthModal />
          </AuthModalProvider>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}
