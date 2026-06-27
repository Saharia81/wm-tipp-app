// Sofort sichtbares Lade-Skelett für /admin, während die Daten laden.
export default function Loading() {
  return (
    <main className="flex-1 flex flex-col items-center px-5 py-8 bg-gradient-to-b from-[#0a1f44] to-[#142a5c] text-white">
      <div className="w-full max-w-md flex flex-col gap-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Admin</h1>
          <span className="text-sm font-medium px-3 py-1.5 rounded-full bg-white/10 border border-white/15">
            ← Zurück
          </span>
        </header>

        <section className="flex flex-col gap-2" aria-hidden>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-2xl bg-white/5 border border-white/10 animate-pulse"
            />
          ))}
        </section>
      </div>
    </main>
  );
}
