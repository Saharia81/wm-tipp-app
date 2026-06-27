"use client";

import { useEffect } from "react";

// Springt beim Laden direkt zum aktuellen Spieltag, damit man nicht erst
// durch alle vorherigen/künftigen Tage scrollen muss.
export function ScrollToTarget() {
  useEffect(() => {
    document
      .querySelector("[data-tipps-target='true']")
      ?.scrollIntoView({ block: "start" });
  }, []);
  return null;
}
