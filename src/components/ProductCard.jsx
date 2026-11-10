import { Link } from "react-router-dom";
import { branding } from "../config/branding.js";
import { categoriesById } from "../data/categories.js";
import { resolveImage } from "../data/images.js";
import { formatPrice } from "../lib/format.js";
import { CatalogImage } from "./CatalogImage.jsx";

export function ProductCard({ product }) {
  const image = resolveImage(product.images[0]);
  const category = categoriesById[product.category];

  return (
    <article className="card lift group h-full">
      <Link to={`/product/${product.slug}`} className="flex h-full flex-col no-underline text-inherit">
        <div className="media-zoom relative aspect-[4/5] overflow-hidden rounded-t-[1.35rem] bg-cream">
          <CatalogImage
            image={image}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="h-full w-full object-cover"
          />
          <span className="absolute left-3 top-3 rounded-full bg-paper px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-navy">
            {branding.copy.sampleLabel}
          </span>
          {product.isNew && (
            <span className="absolute right-3 top-3 rounded-full bg-teal px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-warm">
              New
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal">{category?.name}</p>
          <h3 className="font-display text-2xl text-navy">{product.name}</h3>
          <p className="text-sm text-muted">{product.brand}</p>
          <p className="mt-auto flex items-center justify-between pt-3 text-sm">
            <span className="font-semibold text-navy">{formatPrice(product.price)}</span>
            <span className={product.inStock ? "text-teal-deep" : "text-danger"}>
              {product.inStock ? branding.copy.inStock : branding.copy.outOfStock}
            </span>
          </p>
        </div>
      </Link>
    </article>
  );
}
