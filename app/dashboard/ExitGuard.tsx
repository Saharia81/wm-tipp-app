"use client";

import { useEffect } from "react";

/**
 * Fängt die Zurück-Taste auf dem Dashboard ab.
 *
 * Problem: Nach dem Login lag im Verlauf .. → /login → /dashboard. Drückte man
 * auf dem Dashboard "Zurück", landete man wieder auf /login und hielt sich für
 * ausgeloggt (obwohl die Session noch gültig war) und meldete sich neu an.
 *
 * Lösung: Wir legen einen Platzhalter-Eintrag in den Verlauf. Der nächste
 * "Zurück"-Druck wird hier abgefangen:
 *  - In einer installierten App (PWA, Standalone) versuchen wir window.close()
 *    – das verlässt die App tatsächlich.
 *  - In einem normalen Browser-Tab darf eine Website sich nicht selbst schließen,
 *    deshalb bleiben wir einfach auf dem Dashboard, statt zum Login zu springen.
 */
export function ExitGuard() {
  useEffect(() => {
    // Platzhalter-Eintrag: so trifft der erste "Zurück"-Druck wieder das Dashboard.
    window.history.pushState(null, "", window.location.href);

    const onPopState = () => {
      // Best-effort: schließt die App nur im installierten Standalone-Modus.
      window.close();
      // Falls das Fenster noch offen ist (normaler Browser-Tab), wieder
      // einen Platzhalter setzen, damit wir nicht auf /login fallen.
      window.history.pushState(null, "", window.location.href);
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  return null;
}
