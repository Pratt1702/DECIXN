import { Navigate, Outlet } from "react-router-dom";
import { useSupabaseAuth } from "../../contexts/AuthContext";

export function ProtectedRoute() {
  const { user, loading } = useSupabaseAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-bg-main">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
