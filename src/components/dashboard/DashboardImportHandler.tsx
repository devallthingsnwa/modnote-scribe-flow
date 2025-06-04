
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
    
    // Immediate refresh to get the latest data
    console.log('🔄 Performing immediate refresh after import...');
    
    try {
      // Wait a bit for database consistency
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // First refresh attempt
      console.log('🔄 First refresh attempt...');
      const firstRefresh = await refetch();
      console.log('📋 First refresh result:', {
        notesCount: firstRefresh.data?.length,
        foundImported: firstRefresh.data?.some((n: any) => n.title === note.title)
      });
      
      // If not found, try again with a longer delay
      if (!firstRefresh.data?.some((n: any) => n.title === note.title)) {
        console.log('⏳ Note not found, waiting longer for database sync...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const secondRefresh = await refetch();
        console.log('📋 Second refresh result:', {
          notesCount: secondRefresh.data?.length,
          foundImported: secondRefresh.data?.some((n: any) => n.title === note.title)
        });
        
        // Final attempt if still not found
        if (!secondRefresh.data?.some((n: any) => n.title === note.title)) {
          console.log('⏳ Still not found, one final attempt...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const finalRefresh = await refetch();
          console.log('📋 Final refresh result:', {
            notesCount: finalRefresh.data?.length,
            foundImported: finalRefresh.data?.some((n: any) => n.title === note.title)
          });
          
          if (!finalRefresh.data?.some((n: any) => n.title === note.title)) {
            console.warn('⚠️ Imported note still not visible after all attempts');
            toast({
              title: "Note imported but may need refresh",
              description: "Your note was saved successfully. If it doesn't appear, try refreshing the page.",
              variant: "default",
            });
          }
        }
      }
      
      // Index the imported note for semantic search
      if (note.content) {
        // Get the latest notes after all refresh attempts
        const latestNotes = await refetch();
        const importedNote = latestNotes.data?.find((n: any) => n.title === note.title);
        
        if (importedNote) {
          try {
            await indexNote(importedNote);
            console.log('✅ Imported note indexed for semantic search');
          } catch (indexError) {
            console.warn('⚠️ Failed to index imported note:', indexError);
          }
        } else {
          console.warn('⚠️ Could not find imported note for indexing');
        }
      }
      
    } catch (error) {
      console.error('❌ Error during import refresh sequence:', error);
      toast({
        title: "Import may need verification",
        description: "There was an issue refreshing the list. Please refresh the page to see your imported content.",
        variant: "default",
      });
    }
  };

  return { handleImport };
}
