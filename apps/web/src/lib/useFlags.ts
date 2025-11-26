"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { trpc } from "./trpc";

interface FlagsContextValue {
  flags: Record<string, boolean>;
  isLoading: boolean;
  // eslint-disable-next-line no-unused-vars
  isEnabled: (key: string) => boolean;
  refetch: () => void;
}

const FlagsContext = createContext<FlagsContextValue>({
  flags: {},
  isLoading: true,
  isEnabled: () => false,
  refetch: () => {},
});

export function useFlagsProvider() {
  const [flags, setFlags] = useState<Record<string, boolean>>({});

  const flagsQuery = trpc.flags.evaluate.useQuery(
    {},
    {
      staleTime: 30 * 1000, // 30 seconds cache
      refetchOnWindowFocus: false,
    }
  );

  useEffect(() => {
    if (flagsQuery.data) {
      setFlags(flagsQuery.data);
    }
  }, [flagsQuery.data]);

  const isEnabled = (key: string): boolean => {
    return flags[key] ?? false;
  };

  const refetch = () => {
    flagsQuery.refetch();
  };

  return {
    flags,
    isLoading: flagsQuery.isLoading,
    isEnabled,
    refetch,
  };
}

export function useFlags() {
  return useContext(FlagsContext);
}

export function useFlag(key: string): boolean {
  const { isEnabled } = useFlags();
  return isEnabled(key);
}

export { FlagsContext };
