
import { ModNoteLayout } from "@/components/modnote/ModNoteLayout";
import { NotesListView } from "@/components/modnote/NotesListView";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function ModNoteDashboard() {
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

  return (
    <ModNoteLayout>
      <NotesListView />
    </ModNoteLayout>
  );
}
