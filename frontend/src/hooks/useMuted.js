import { useEffect, useState } from "react";
import { isMuted, setMuted, subscribeMute } from "@/lib/sound";

export function useMuted() {
  const [m, setM] = useState(isMuted());
  useEffect(() => subscribeMute(setM), []);
  return [m, setMuted];
}
