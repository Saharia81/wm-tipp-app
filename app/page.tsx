import Image from "next/image";

// Mobile-first landing page. Auth and the live tip flow will replace these placeholders.
export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center px-5 py-10 bg-gradient-to-b from-[#0a1f44] to-[#142a5c] text-white">
      <div className="w-full max-w-md flex flex-col gap-8">
        <header className="text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-white/60">
            FIFA Weltmeisterschaft 2026
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">
            WM-Tipp 2026
          </h1>
          <p className="mt-3 text-white/80">
            Tippe alle 104 Spiele. Tippe deinen Weltmeister. Sammle Punkte.
          </p>
        </header>

        <div className="flex justify-center">
          <Image
            src="/tipp-app-logo.png"
            alt="WM-Tipp Maskottchen"
            width={450}
            height={600}
            priority
            className="w-full max-w-xs h-auto rounded-2xl"
          />
        </div>

        <section className="rounded-2xl bg-white/5 border border-white/10 p-5 backdrop-blur">
          <h2 className="text-lg font-semibold">Punkte-System</h2>
          <ul className="mt-3 space-y-2 text-sm text-white/85">
            <li>
              <span className="font-bold text-emerald-300">4</span> · Exaktes
              Ergebnis
            </li>
            <li>
              <span className="font-bold text-emerald-300">3</span> · Sieger und
              Tordifferenz
            </li>
            <li>
              <span className="font-bold text-emerald-300">2</span> · Sieger
              richtig
            </li>
            <li>
              <span className="font-bold text-emerald-300">10</span> ·
              Weltmeister-Tipp (vor dem ersten Spiel)
            </li>
          </ul>
        </section>

        <div className="flex flex-col gap-3">
          <a
            href="/register"
            className="h-12 rounded-full bg-emerald-400 text-[#0a1f44] font-semibold flex items-center justify-center"
          >
            Registrieren
          </a>
          <a
            href="/login"
            className="h-12 rounded-full border border-white/30 font-medium flex items-center justify-center"
          >
            Anmelden
          </a>
        </div>
      </div>
    </main>
  );
}
