
import { useToast } from "@/hooks/use-toast";
import { useNoteIndexing } from "@/hooks/useNoteIndexing";

interface ImportedNote {
  title: string;
  content: string;
  source_url?: string;
  thumbnail?: string;
  is_transcription?: boolean;
}

interface DashboardImportHandlerProps {
  refetch: () => Promise<any>;
}

export function useDashboardImportHandler({ refetch }: DashboardImportHandlerProps) {
  const { toast } = useToast();
  const { indexNote } = useNoteIndexing();

  const handleImport = async (note: ImportedNote) => {
    console.log('📥 Content imported callback triggered:', note.title);
    
    // Show immediate feedback
    toast({
      title: "Content imported successfully",
      description: `Your content "${note.title}" has been imported and is available in your notes.`,
    });
    
    // Aggressively refresh the notes list multiple times to ensure database sync
    console.log('🔄 Starting aggressive notes list refresh...');
    
    try {
      // First immediate refresh
      console.log('🔄 Refresh attempt 1...');
      await refetch();
      
      // Second refresh after 500ms delay
      setTimeout(async () => {
        console.log('🔄 Refresh attempt 2 (500ms delay)...');
        const secondRefresh = await refetch();
        console.log('📋 Second refresh result:', {
          notesCount: secondRefresh.data?.length,
          foundImported: secondRefresh.data?.some((n: any) => n.title === note.title)
        });
      }, 500);
      
      // Third refresh after 1.5s delay to catch slower database writes
      setTimeout(async () => {
        console.log('🔄 Refresh attempt 3 (1.5s delay)...');
        const thirdRefresh = await refetch();
        console.log('📋 Third refresh result:', {
          notesCount: thirdRefresh.data?.length,
          foundImported: thirdRefresh.data?.some((n: any) => n.title === note.title)
        });
      }, 1500);
      
      // Fourth refresh after 3s as final fallback
      setTimeout(async () => {
        console.log('🔄 Final refresh attempt (3s delay)...');
        const finalRefresh = await refetch();
        console.log('📋 Final refresh result:', {
          notesCount: finalRefresh.data?.length,
          foundImported: finalRefresh.data?.some((n: any) => n.title === note.title)
        });
        
        // If still not found, show a helpful message
        if (!finalRefresh.data?.some((n: any) => n.title === note.title)) {
          console.warn('⚠️ Imported note still not visible after all refresh attempts');
          toast({
            title: "Note may need manual refresh",
            description: "If your imported note doesn't appear, try refreshing the page.",
            variant: "default",
          });
        }
      }, 3000);
      
      // Index the imported note for semantic search in the background
      if (note.content) {
        setTimeout(async () => {
          try {
            // Wait for the note to appear in the list before indexing
            const latestNotes = await refetch();
            const importedNote = latestNotes.data?.find((n: any) => n.title === note.title);
            
            if (importedNote) {
              await indexNote(importedNote);
              console.log('✅ Imported note indexed for semantic search');
            } else {
              console.warn('⚠️ Could not find imported note for indexing');
            }
          } catch (error) {
            console.warn('⚠️ Failed to index imported note:', error);
          }
        }, 2000);
      }
    } catch (error) {
      console.error('❌ Error during notes refresh sequence:', error);
      // Emergency fallback refresh
      setTimeout(async () => {
        try {
          console.log('🚨 Emergency fallback refresh...');
          await refetch();
        } catch (retryError) {
          console.error('❌ Emergency refresh also failed:', retryError);
        }
      }, 4000);
    }
  };

  return { handleImport };
}
