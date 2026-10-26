import { redirect } from "next/navigation";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const query = await searchParams;
  redirect(`/shop?q=${encodeURIComponent(query.q || "")}`);
}
