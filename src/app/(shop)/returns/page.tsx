import { getSiteContent } from "@/lib/content";
export const metadata = { title: "Returns" };
export default async function Page() {
  const content = await getSiteContent();
  return <div className="mx-auto max-w-3xl px-5 py-12"><h1 className="font-display text-5xl">Returns</h1><p className="mt-6 whitespace-pre-wrap leading-8">{content.returnsPolicy}</p></div>;
}
