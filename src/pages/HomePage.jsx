import { Link } from "react-router-dom";
import { branding } from "../config/branding.js";
import { categories } from "../data/categories.js";
import { resolveImage } from "../data/images.js";
import { products } from "../data/products.js";
import { CatalogImage } from "../components/CatalogImage.jsx";
import { ProductCard } from "../components/ProductCard.jsx";

function SectionIntro({ id, title, lead }) {
  return (
    <div className="max-w-2xl">
      <h2 id={id} className="font-display text-4xl text-navy sm:text-5xl">
        {title}
      </h2>
      {lead && <p className="mt-4 text-lg text-muted">{lead}</p>}
    </div>
  );
}

export function HomePage() {
  const hero = resolveImage(branding.images.hero);
  const promo = resolveImage(branding.images.promo);
  const bestsellers = products.filter((product) => product.bestseller);
  const arrivals = products.filter((product) => product.isNew);

  return (
    <>
      <section className="relative isolate min-h-[32rem] overflow-hidden bg-navy md:min-h-[88vh]">
        <CatalogImage
          image={hero}
          priority
          sizes="100vw"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="hero-shade absolute inset-0" />
        <div className="shell relative flex min-h-[32rem] items-end pb-8 pt-10 md:min-h-[88vh] md:items-center md:pb-16 md:pt-20">
          <div className="max-w-xl text-warm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cream">{branding.tagline}</p>
            <span className="mt-5 block h-0.5 w-12 bg-accent" />
            <h1 className="mt-5 font-display text-[2.7rem] leading-[1.05] text-warm sm:text-6xl">{branding.copy.headline}</h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-cream">{branding.copy.subheadline}</p>
            <Link className="btn btn-accent mt-8" to="/shop">
              {branding.copy.shopCta}
            </Link>
          </div>
        </div>
      </section>

      <section className="shell py-20" aria-labelledby="categories-title">
        <SectionIntro id="categories-title" title={branding.copy.categoriesTitle} lead={branding.copy.categoriesLead} />
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => (
            <li key={category.id}>
              <article className="card lift group h-full">
                <Link to={`/shop?category=${category.id}`} className="flex h-full flex-col no-underline text-inherit">
                  <div className="media-zoom aspect-[4/3] overflow-hidden rounded-t-[1.35rem] bg-cream">
                    <CatalogImage
                      image={resolveImage(category.image)}
                      sizes="(min-width: 1024px) 25vw, 50vw"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="font-display text-2xl text-navy">{category.name}</h3>
                    <p className="mt-2 text-sm text-muted">{category.description}</p>
                  </div>
                </Link>
              </article>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-cream py-20" aria-labelledby="bestsellers-title">
        <div className="shell">
          <SectionIntro id="bestsellers-title" title={branding.copy.bestsellersTitle} lead={branding.copy.bestsellersLead} />
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {bestsellers.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="shell py-20" aria-labelledby="arrivals-title">
        <SectionIntro id="arrivals-title" title={branding.copy.newArrivalsTitle} lead={branding.copy.newArrivalsLead} />
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {arrivals.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      </section>

      <section className="shell pb-8" aria-labelledby="promo-title">
        <div className="relative isolate overflow-hidden rounded-[1.6rem] bg-navy">
          <CatalogImage image={promo} sizes="100vw" className="absolute inset-0 h-full w-full object-cover" />
          <div className="hero-shade absolute inset-0" />
          <div className="relative grid gap-6 px-6 py-16 sm:px-10 md:max-w-xl md:py-20">
            <h2 id="promo-title" className="font-display text-4xl text-warm sm:text-5xl">
              {branding.copy.promoTitle}
            </h2>
            <p className="text-lg text-cream">{branding.copy.promoBody}</p>
            <Link className="btn btn-light w-fit" to={branding.copy.promoHref}>
              {branding.copy.promoCta}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
