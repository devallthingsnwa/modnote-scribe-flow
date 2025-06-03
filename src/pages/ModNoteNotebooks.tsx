
import { ModNoteLayout } from "@/components/modnote/ModNoteLayout";
import { NotebooksListView } from "@/components/modnote/NotebooksListView";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function ModNoteNotebooks() {
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
      <NotebooksListView />
    </ModNoteLayout>
  );
}
