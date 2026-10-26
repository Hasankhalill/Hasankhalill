import { queryCatalog } from "@/lib/catalog";
import { getSiteContent } from "@/lib/content";
import { effectivePrice, formatMoney } from "@/lib/money";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() || "";
  if (q.length < 2) return Response.json({ products: [] });
  const [content, products] = await Promise.all([getSiteContent(), queryCatalog({ q })]);
  return Response.json({
    products: products.slice(0, 8).map((product) => {
      const price = effectivePrice(product, product.variants[0]);
      return { slug: product.slug, name: product.name, price: formatMoney(price.unitPriceCents, content.currency) };
    }),
  });
}
