"use client";

import { useEffect, useState } from "react";
import { MQ } from "./breakpoints";

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);

    update();
    media.addEventListener("change", update);

    return () => media.removeEventListener("change", update);
  }, [query]);

  return matches;
}

export function useIsMobile() {
  return useMediaQuery(MQ.mobile);
}

export function useIsTablet() {
  return useMediaQuery(MQ.tablet);
}
