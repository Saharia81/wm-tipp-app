import { prisma } from "@/lib/prisma";

// Prisma + Buffer brauchen Node, nicht Edge.
export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarData: true },
  });

  if (!user?.avatarData) {
    return new Response("Not Found", { status: 404 });
  }

  // immutable: das <img src> trägt ?v=<avatarUpdatedAt>, neue URL = neues Bild.
  return new Response(new Uint8Array(user.avatarData), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
