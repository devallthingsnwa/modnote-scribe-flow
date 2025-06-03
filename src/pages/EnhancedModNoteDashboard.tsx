
import { EnhancedModNoteLayout } from "@/components/modnote/EnhancedModNoteLayout";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function EnhancedModNoteDashboard() {
  const { session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!session) {
      navigate('/');
    }
  }, [session, navigate]);

  if (!session) {
    return null;
  }

  return <EnhancedModNoteLayout />;
}
