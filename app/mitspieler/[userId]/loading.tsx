// Sofort sichtbares Lade-Skelett für /mitspieler/[userId], während die Daten laden.
export default function Loading() {
  return (
    <main className="flex-1 flex flex-col items-center px-5 py-8 bg-gradient-to-b from-[#0a1f44] to-[#142a5c] text-white">
      <div className="w-full max-w-md flex flex-col gap-6">
        <header className="flex items-center justify-between">
          <div className="h-6 w-32 rounded bg-white/10 animate-pulse" />
          <span className="text-sm text-white/70">← Zurück</span>
        </header>

        <section className="flex flex-col items-center gap-3 rounded-2xl bg-white/5 border border-white/10 p-6 animate-pulse">
          <div className="w-32 h-32 rounded-full bg-white/10" />
          <div className="h-2.5 w-16 rounded bg-white/10" />
          <div className="h-9 w-20 rounded bg-white/10" />
          <div className="h-2.5 w-28 rounded bg-white/10" />
        </section>

        <section className="rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-col gap-2 animate-pulse">
          <div className="h-2.5 w-1/3 rounded bg-white/10" />
          <div className="h-5 w-1/2 rounded bg-white/10" />
        </section>

        <section className="flex flex-col gap-2" aria-hidden>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-2xl bg-white/5 border border-white/10 animate-pulse"
            />
          ))}
        </section>
      </div>
    </main>
  );
}
