import { Link } from "react-router-dom";
import { branding } from "../config/branding.js";
import { resolveImage } from "../data/images.js";
import { CatalogImage } from "../components/CatalogImage.jsx";

export function AboutPage() {
  const primary = resolveImage(branding.images.about);
  const secondary = resolveImage(branding.images.aboutSecondary);

  return (
    <div className="shell py-12">
      <p className="eyebrow">{branding.name}</p>
      <h1 className="mt-3 max-w-3xl font-display text-5xl text-navy sm:text-6xl">{branding.copy.aboutTitle}</h1>
      <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <CatalogImage
          image={primary}
          priority
          sizes="(min-width: 1024px) 60vw, 100vw"
          className="aspect-[4/3] w-full rounded-[1.35rem] object-cover"
        />
        <CatalogImage
          image={secondary}
          sizes="(min-width: 1024px) 30vw, 100vw"
          className="aspect-[4/3] w-full rounded-[1.35rem] object-cover lg:aspect-auto lg:h-full"
        />
      </div>
      <div className="mt-10 grid max-w-3xl gap-5 text-lg leading-relaxed">
        {branding.copy.aboutParagraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      <p className="mt-8 text-sm text-muted">{branding.copy.imageNote}</p>
      <Link className="btn btn-navy mt-8" to="/shop">
        {branding.copy.shopCta}
      </Link>
    </div>
  );
}
