import React from "react";
import { FlagsContext, useFlagsProvider } from "./useFlags";

export function FlagsProvider({ children }: { children: React.ReactNode }) {
  const flagsValue = useFlagsProvider();

  return (
    <FlagsContext.Provider value={flagsValue}>{children}</FlagsContext.Provider>
  );
}
