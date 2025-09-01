"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useLoading } from "../context/LoadingContext";

export default function useRouteLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { setLoading } = useLoading();

  useEffect(() => {
    setLoading(true);

    // Small delay so it doesn’t flicker on very fast loads
    const timeout = setTimeout(() => setLoading(false), 400);

    return () => clearTimeout(timeout);
  }, [pathname, searchParams]);
}
