import { saveContentAction } from "@/app/actions/admin";
import { getSiteContent } from "@/lib/content";
import { prisma } from "@/lib/db";
import { canManageContent } from "@/lib/rbac";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { BoundForm } from "@/components/bound-form";

export const metadata = { title: "Content" };

export default async function ContentAdmin() {
  const user = await getCurrentUser();
  if (!user || !canManageContent(user.role)) redirect("/admin");
  const [content, categories, outbox] = await Promise.all([
    getSiteContent(),
    prisma.category.findMany({ where: { published: true }, orderBy: { name: "asc" } }),
    prisma.emailMessage.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
  ]);
  return (
    <div className="space-y-8">
      <h1 className="font-display text-4xl">Content</h1>
      <p className="text-sm text-muted">Saved in the database. No redeploy is required. The hero photo is not hardcoded.</p>
      <BoundForm action={saveContentAction} className="grid gap-3">
        <label className="field"><span>Hero headline</span><input name="heroHeadline" defaultValue={content.heroHeadline} /></label>
        <label className="field"><span>Hero description</span><textarea name="heroSubhead" defaultValue={content.heroSubhead} rows={3} /></label>
        <label className="field"><span>Brand description</span><textarea name="brandDescription" defaultValue={content.brandDescription} rows={3} /></label>
        <label className="field"><span>About</span><textarea name="aboutText" defaultValue={content.aboutText} rows={5} /></label>
        <label className="text-sm"><input type="checkbox" name="promoEnabled" defaultChecked={content.promoEnabled} /> Show promo banner</label>
        <label className="field"><span>Promo title</span><input name="promoTitle" defaultValue={content.promoTitle} /></label>
        <label className="field"><span>Promo text</span><textarea name="promoBody" defaultValue={content.promoBody} rows={2} /></label>
        <label className="field"><span>Promo link</span><input name="promoHref" defaultValue={content.promoHref || ""} /></label>
        <fieldset>
          <legend className="text-sm font-semibold">Featured categories</legend>
          {categories.map((category) => (
            <label key={category.id} className="mr-4 text-sm"><input type="checkbox" name="featuredCategoryIds" value={category.id} defaultChecked={content.featuredCategoryIds.includes(category.id)} /> {category.name}</label>
          ))}
        </fieldset>
        <label className="field"><span>Hero image</span>{content.heroImageUrl ? <img src={content.heroImageUrl} alt="" className="mb-2 h-32 w-full rounded-2xl object-cover" /> : null}<input name="hero" type="file" accept="image/jpeg,image/png,image/webp" /></label>
        <label className="field"><span>Logo</span>{content.logoUrl ? <img src={content.logoUrl} alt="" className="mb-2 h-12" /> : null}<input name="logo" type="file" accept="image/jpeg,image/png,image/webp" /></label>
        <label className="field"><span>Contact email</span><input name="contactEmail" defaultValue={content.contactEmail} /></label>
        <label className="field"><span>Contact phone</span><input name="contactPhone" defaultValue={content.contactPhone} /></label>
        <label className="field"><span>Contact address</span><input name="contactAddress" defaultValue={content.contactAddress} /></label>
        <label className="field"><span>Instagram</span><input name="instagramUrl" defaultValue={content.instagramUrl || ""} /></label>
        <label className="field"><span>Facebook</span><input name="facebookUrl" defaultValue={content.facebookUrl || ""} /></label>
        <label className="field"><span>TikTok</span><input name="tiktokUrl" defaultValue={content.tiktokUrl || ""} /></label>
        <label className="field"><span>Shipping policy</span><textarea name="shippingPolicy" defaultValue={content.shippingPolicy} rows={4} /></label>
        <label className="field"><span>Returns policy</span><textarea name="returnsPolicy" defaultValue={content.returnsPolicy} rows={4} /></label>
        <label className="field"><span>Privacy</span><textarea name="privacyPolicy" defaultValue={content.privacyPolicy} rows={4} /></label>
        <label className="field"><span>Terms</span><textarea name="termsPolicy" defaultValue={content.termsPolicy} rows={4} /></label>
        <label className="field"><span>Tax basis points (100 = 1%)</span><input name="taxRateBps" type="number" defaultValue={content.taxRateBps} /></label>
        <label className="field"><span>Currency</span><input name="currency" defaultValue={content.currency} /></label>
        <label className="field"><span>Free shipping threshold</span><input name="freeShipping" defaultValue={content.freeShippingThresholdCents != null ? (content.freeShippingThresholdCents / 100).toFixed(2) : ""} /></label>
        <label className="text-sm"><input type="checkbox" name="allowGuestCheckout" defaultChecked={content.allowGuestCheckout} /> Allow guest checkout</label>
        <button className="btn w-fit" type="submit">Save content</button>
      </BoundForm>
      <section>
        <h2 className="font-display text-2xl">Email outbox</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {outbox.length === 0 ? <li>No messages.</li> : outbox.map((message) => (
            <li key={message.id} className="card p-3">
              <p>{message.status === "SENT" ? "Sent" : message.status === "FAILED" ? "Failed" : "Not sent"} · {message.toEmail} · {message.subject}</p>
              {message.status !== "SENT" ? <p className="text-muted">This message was not delivered.</p> : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
