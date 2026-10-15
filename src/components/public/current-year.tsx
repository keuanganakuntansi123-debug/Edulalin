"use client";

import { useEffect, useState } from "react";

export function CurrentYear() {
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setYear(new Date().getFullYear()), 0);
    return () => clearTimeout(id);
  }, []);

  return <>{year}</>;
}