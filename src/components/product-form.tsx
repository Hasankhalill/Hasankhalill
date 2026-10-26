import Link from "next/link";
import { saveProductAction } from "@/app/actions/admin";
import { VariantEditor } from "./variant-editor";
import { BoundForm } from "@/components/bound-form";

export function ProductForm({
  categories,
  product,
}: {
  categories: { id: string; name: string }[];
  product?: {
    id: string;
    name: string;
    description: string;
    categoryId: string;
    priceCents: number;
    salePriceCents: number | null;
    featured: boolean;
    isNew: boolean;
    isBestseller: boolean;
    published: boolean;
    backorderEnabled: boolean;
    lowStockThreshold: number;
    slug: string;
    images: { id: string; url: string; alt: string }[];
    variants: { id: string; sku: string; size: string | null; color: string | null; optionLabel: string | null; priceCents: number | null; salePriceCents: number | null; stock: number }[];
  };
}) {
  const dollars = (cents: number | null | undefined) => (cents == null ? "" : (cents / 100).toFixed(2));
  return (
    <BoundForm action={saveProductAction} className="space-y-4" encType="multipart/form-data">
      {product ? <input type="hidden" name="id" value={product.id} /> : null}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl">{product ? "Edit product" : "New product"}</h1>
        {product ? <Link href={`/admin/products/${product.id}/delete`}>Delete</Link> : null}
      </div>
      <label className="field"><span>Name</span><input name="name" required defaultValue={product?.name} /></label>
      <label className="field"><span>Description</span><textarea name="description" required rows={5} defaultValue={product?.description} /></label>
      <label className="field"><span>Category</span>
        <select name="categoryId" defaultValue={product?.categoryId} required>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="field"><span>Price</span><input name="price" required defaultValue={dollars(product?.priceCents)} /></label>
        <label className="field"><span>Sale price</span><input name="salePrice" defaultValue={dollars(product?.salePriceCents)} /></label>
        <label className="field"><span>Low stock at</span><input name="lowStockThreshold" type="number" defaultValue={product?.lowStockThreshold ?? 5} /></label>
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <label><input type="checkbox" name="published" defaultChecked={product?.published ?? true} /> Visible</label>
        <label><input type="checkbox" name="featured" defaultChecked={product?.featured} /> Featured</label>
        <label><input type="checkbox" name="isNew" defaultChecked={product?.isNew} /> New</label>
        <label><input type="checkbox" name="isBestseller" defaultChecked={product?.isBestseller} /> Bestseller</label>
        <label><input type="checkbox" name="backorderEnabled" defaultChecked={product?.backorderEnabled} /> Allow backorder</label>
      </div>
      <VariantEditor initial={(product?.variants || []).map((variant) => ({
        id: variant.id,
        sku: variant.sku,
        size: variant.size || "",
        color: variant.color || "",
        optionLabel: variant.optionLabel || "",
        price: dollars(variant.priceCents),
        salePrice: dollars(variant.salePriceCents),
        stock: String(variant.stock),
      }))} />
      {product?.images.length ? (
        <fieldset>
          <legend className="text-sm font-semibold">Current photos</legend>
          <ul className="mt-2 flex flex-wrap gap-3">
            {product.images.map((image) => (
              <li key={image.id} className="text-xs">
                <img src={image.url} alt={image.alt} className="h-20 w-20 rounded-xl object-cover" />
                <label className="mt-1 block"><input type="checkbox" name="removeImage" value={image.id} /> Remove</label>
              </li>
            ))}
          </ul>
        </fieldset>
      ) : null}
      <label className="field"><span>Add photos</span><input name="images" type="file" accept="image/jpeg,image/png,image/webp" multiple /></label>
      <p className="text-xs text-muted">Percent off is calculated from the regular price and sale price. Negative prices and a sale above the regular price are rejected.</p>
      <button className="btn" type="submit">Save product</button>
    </BoundForm>
  );
}
