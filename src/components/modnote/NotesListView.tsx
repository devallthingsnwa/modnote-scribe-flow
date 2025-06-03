
import { useState } from "react";
import { useModNotes } from "@/lib/modNoteApi";
import { NoteCard } from "../NoteCard";
import { PlusCircle, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { YouTubeTranscriptModal } from "./YouTubeTranscriptModal";
import { FileUploadModal } from "./FileUploadModal";

export function NotesListView() {
  const { data: notes, isLoading, error } = useModNotes();
  const [showYouTubeModal, setShowYouTubeModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load notes</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Content Section - No duplicate header here */}
      <div className="max-w-7xl mx-auto">
        {notes && notes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {notes.map((note) => (
              <NoteCard
                key={note.id}
                id={note.id}
                title={note.title}
                content={note.content || ""}
                updatedAt={note.updated_at}
                sourceUrl={note.source_url}
                isTranscription={note.is_transcription}
                thumbnail={note.thumbnail}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <PlusCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No notes yet</h3>
            <p className="text-gray-500 mb-6">Get started by creating your first note or importing content.</p>
            <div className="flex justify-center gap-4">
              <Button
                onClick={() => setShowYouTubeModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import from YouTube
              </Button>
              <Button
                onClick={() => setShowUploadModal(true)}
                variant="outline"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                Upload File
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <YouTubeTranscriptModal
        isOpen={showYouTubeModal}
        onClose={() => setShowYouTubeModal(false)}
        onSuccess={() => {
          setShowYouTubeModal(false);
          window.location.reload();
        }}
      />

      <FileUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onFileUploaded={() => {
          setShowUploadModal(false);
          window.location.reload();
        }}
      />
    </div>
  );
}
