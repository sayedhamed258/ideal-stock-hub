import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "admin" | "staff" | "viewer";

export function useUserRole() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserRole();
  }, []);

  const loadUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (roles && roles.length > 0) {
        // User can have multiple roles, prioritize: admin > staff > viewer
        if (roles.some(r => r.role === "admin")) {
          setRole("admin");
        } else if (roles.some(r => r.role === "staff")) {
          setRole("staff");
        } else {
          setRole("viewer");
        }
      } else {
        setRole(null);
      }
    } catch (error) {
      console.error("Error loading user role:", error);
      setRole(null);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = role === "admin";
  const canWrite = role === "admin" || role === "staff";
  const canDelete = role === "admin";

  return { role, loading, isAdmin, canWrite, canDelete, refetch: loadUserRole };
}
