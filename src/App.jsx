import { useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation, useParams } from "react-router-dom";
import { branding } from "./config/branding.js";
import { getProductBySlug } from "./data/products.js";
import { CartProvider } from "./context/CartContext.jsx";
import { Layout } from "./components/Layout.jsx";
import { HomePage } from "./pages/HomePage.jsx";
import { ShopPage } from "./pages/ShopPage.jsx";
import { ProductPage } from "./pages/ProductPage.jsx";
import { CartPage } from "./pages/CartPage.jsx";
import { AboutPage } from "./pages/AboutPage.jsx";
import { ContactPage } from "./pages/ContactPage.jsx";
import { NotFoundPage } from "./pages/NotFoundPage.jsx";

const titles = {
  "/": branding.name,
  "/shop": `Shop · ${branding.name}`,
  "/cart": `Cart · ${branding.name}`,
  "/about": `About · ${branding.name}`,
  "/contact": `Contact · ${branding.name}`,
};

function TitleSync() {
  const location = useLocation();
  useEffect(() => {
    if (location.pathname.startsWith("/product/")) {
      const slug = decodeURIComponent(location.pathname.split("/")[2] ?? "");
      const product = getProductBySlug(slug);
      document.title = product ? `${product.name} · ${branding.name}` : branding.name;
      return;
    }
    document.title = titles[location.pathname] ?? branding.name;
  }, [location.pathname]);
  return null;
}

function ProductRoute() {
  const { slug } = useParams();
  return <ProductPage key={slug} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <CartProvider>
        <TitleSync />
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="shop" element={<ShopPage />} />
            <Route path="product/:slug" element={<ProductRoute />} />
            <Route path="cart" element={<CartPage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </CartProvider>
    </BrowserRouter>
  );
}
