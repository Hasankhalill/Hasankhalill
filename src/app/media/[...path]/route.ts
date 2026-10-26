import { storage } from "@/lib/storage";

export async function GET(_request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const file = await storage().read(path.join("/"));
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file.body), {
    headers: { "Content-Type": file.contentType, "Cache-Control": "public, max-age=86400" },
  });
}
