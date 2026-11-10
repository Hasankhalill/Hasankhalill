import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { branding } from "../config/branding.js";
import { categoriesById } from "../data/categories.js";
import { resolveImage } from "../data/images.js";
import { getProductBySlug, products } from "../data/products.js";
import { relatedProducts } from "../lib/catalog.js";
import { formatPrice } from "../lib/format.js";
import { useCart } from "../context/CartContext.jsx";
import { CatalogImage } from "../components/CatalogImage.jsx";
import { ProductCard } from "../components/ProductCard.jsx";
import { QuantityInput } from "../components/QuantityInput.jsx";

export function ProductPage() {
  const { slug } = useParams();
  const product = getProductBySlug(slug);
  const { addLine } = useCart();
  const [photo, setPhoto] = useState(0);
  const [selected, setSelected] = useState({});
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState("");

  if (!product) {
    return (
      <div className="shell py-20">
        <h1 className="font-display text-5xl text-navy">That product is not in the sample catalog</h1>
        <Link className="btn btn-navy mt-8" to="/shop">
          Back to the shop
        </Link>
      </div>
    );
  }

  const category = categoriesById[product.category];
  const gallery = product.images.map((key) => resolveImage(key));
  const active = gallery[Math.min(photo, gallery.length - 1)];
  const related = relatedProducts(products, product);
  const missing = product.options.filter((option) => !selected[option.name]);

  return (
    <div className="shell py-10">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link className="text-teal-deep underline-offset-4 hover:underline" to="/">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link className="text-teal-deep underline-offset-4 hover:underline" to="/shop">
              Shop
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link className="text-teal-deep underline-offset-4 hover:underline" to={`/shop?category=${product.category}`}>
              {category?.name}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-navy">{product.name}</li>
        </ol>
      </nav>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div>
          <div
            className="overflow-hidden rounded-[1.35rem] bg-cream"
            tabIndex={gallery.length > 1 ? 0 : undefined}
            aria-label={gallery.length > 1 ? "Product photos" : undefined}
            onKeyDown={(event) => {
              if (gallery.length < 2) return;
              if (event.key === "ArrowRight") setPhoto((index) => (index + 1) % gallery.length);
              if (event.key === "ArrowLeft") setPhoto((index) => (index - 1 + gallery.length) % gallery.length);
            }}
          >
            <CatalogImage
              image={active}
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="aspect-square w-full object-cover"
            />
          </div>
          {gallery.length > 1 && (
            <ul className="mt-3 flex gap-3">
              {gallery.map((image, index) => (
                <li key={image.src}>
                  <button
                    type="button"
                    className={`overflow-hidden rounded-2xl border ${index === photo ? "border-navy" : "border-line"}`}
                    aria-label={`Show photo ${index + 1} of ${gallery.length}`}
                    aria-current={index === photo ? "true" : undefined}
                    onClick={() => setPhoto(index)}
                  >
                    <CatalogImage image={image} className="h-20 w-20 object-cover" sizes="80px" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-sm text-muted">{branding.copy.imageNote}</p>
        </div>

        <div>
          <p className="eyebrow">{branding.copy.sampleLabel}</p>
          <h1 className="mt-3 font-display text-5xl text-navy">{product.name}</h1>
          <p className="mt-3 text-muted">
            {product.brand}
            {category ? ` · ${category.name}` : ""}
          </p>
          <p className="mt-5 font-display text-4xl text-navy">{formatPrice(product.price)}</p>
          <p className={`mt-2 text-sm font-semibold ${product.inStock ? "text-teal-deep" : "text-danger"}`}>
            {product.inStock ? branding.copy.inStock : branding.copy.outOfStock}
          </p>
          <p className="mt-6 text-lg leading-relaxed">{product.summary}</p>

          <div className="mt-6 grid gap-4">
            {product.options.map((option) => (
              <fieldset key={option.name} className="border-0 p-0">
                <legend className="font-semibold text-navy">{option.name}</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {option.values.map((value) => (
                    <label key={value} className="pill text-sm">
                      <input
                        className="sr-only"
                        type="radio"
                        name={`${product.id}-${option.name}`}
                        value={value}
                        checked={selected[option.name] === value}
                        onChange={() => {
                          setSelected((current) => ({ ...current, [option.name]: value }));
                          setError("");
                        }}
                      />
                      {value}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <QuantityInput id={`${product.id}-qty`} value={quantity} onChange={setQuantity} label={`Quantity for ${product.name}`} />
            <button
              type="button"
              className="btn btn-accent"
              disabled={!product.inStock}
              onClick={() => {
                if (!product.inStock) return;
                if (missing.length) {
                  setError(`Choose ${missing.map((option) => option.name.toLowerCase()).join(" and ")} before adding to the cart.`);
                  return;
                }
                addLine({ productId: product.id, options: selected, quantity });
                setError("");
              }}
            >
              {product.inStock ? branding.copy.addToCart : branding.copy.outOfStock}
            </button>
          </div>
          {error && (
            <p className="mt-3 text-sm font-medium text-danger" role="alert">
              {error}
            </p>
          )}

          <div className="mt-10">
            <h2 className="font-display text-3xl text-navy">Description</h2>
            <p className="mt-3 leading-relaxed">{product.description}</p>
          </div>
          <div className="mt-8">
            <h2 className="font-display text-3xl text-navy">Specifications</h2>
            <dl className="mt-4 divide-y divide-line rounded-[1.2rem] border border-line bg-paper">
              {product.specs.map((spec) => (
                <div key={spec.label} className="grid gap-1 px-4 py-3 sm:grid-cols-[10rem_1fr]">
                  <dt className="font-semibold text-navy">{spec.label}</dt>
                  <dd>{spec.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      <section className="mt-16" aria-labelledby="related-title">
        <h2 id="related-title" className="font-display text-4xl text-navy">
          Related equipment
        </h2>
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {related.map((item) => (
            <li key={item.id}>
              <ProductCard product={item} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
