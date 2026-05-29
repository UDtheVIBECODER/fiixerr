import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getMyProfile } from "@/lib/auth.functions";

export type ProfileRole = "ULTIMATE_ADMIN" | "ADMIN" | "EMPLOYEE";

export function useMyProfile() {
  const fn = useServerFn(getMyProfile);
  return useQuery({
    queryKey: ["my-profile"],
    queryFn: () => fn(),
    staleTime: 60_000,
  });
}
