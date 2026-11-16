import { useState } from "react";

import { currentMonth, isIsoMonth, shiftMonth } from "@/domain/dates";

export function useMonth(initial?: string | null) {
  const latest = currentMonth();
  const start = initial && isIsoMonth(initial) && initial <= latest ? initial : latest;
  const [month, setMonth] = useState(start);
  return {
    month,
    canForward: month < latest,
    back: () => setMonth((value) => shiftMonth(value, -1)),
    forward: () => setMonth((value) => (value < latest ? shiftMonth(value, 1) : value)),
  };
}
