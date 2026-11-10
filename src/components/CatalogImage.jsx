export function CatalogImage({ image, priority = false, className = "", sizes }) {
  return (
    <img
      src={image.src}
      srcSet={image.srcSet}
      sizes={sizes}
      alt={image.alt}
      width={image.width}
      height={image.height}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      style={{ objectPosition: image.objectPosition }}
      className={className}
    />
  );
}
