// hooks/useCurrentUser.ts
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export const useCurrentUser = () =>
  useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/auth/me`,
        { withCredentials: true }
      );
      return res.data;
    },
  });
