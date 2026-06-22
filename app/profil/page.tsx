import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ProfilForm } from "./_components/ProfilForm";
import { PushToggle } from "./_components/PushToggle";

export default async function ProfilPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  // Frisch aus der DB, damit nach einem Namenswechsel sofort der neue Name angezeigt wird
  // (das JWT-Token enthält noch den alten Namen, bis sich der User neu anmeldet).
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, avatarUpdatedAt: true },
  });
  if (!user) redirect("/login");

  return (
    <main className="flex-1 flex flex-col items-center px-5 py-8 bg-gradient-to-b from-[#0a1f44] to-[#142a5c] text-white">
      <div className="w-full max-w-md flex flex-col gap-6">
        <header className="sticky top-0 z-20 -mx-5 px-5 py-3 flex items-center justify-between border-b border-white/10 bg-[#0a1f44]/90 backdrop-blur">
          <h1 className="text-2xl font-bold">Profil</h1>
          <Link href="/dashboard" className="text-sm text-white/70">
            ← Zurück
          </Link>
        </header>

        <section className="rounded-2xl bg-white/5 border border-white/10 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/50">
            E-Mail
          </p>
          <p className="mt-1 text-white/90">{user.email}</p>
        </section>

        <PushToggle />

        <ProfilForm
          currentName={user.name}
          userId={user.id}
          avatarVersion={user.avatarUpdatedAt?.toISOString() ?? null}
        />
      </div>
    </main>
  );
}
