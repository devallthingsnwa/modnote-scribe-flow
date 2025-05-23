import { useState, useCallback, useRef } from 'react';

interface NoteVersion {
  id: string;
  content: string | null;
  title: string;
  timestamp: Date;
  tags: string[];
}

interface UseNoteVersionsOptions {
  maxVersions?: number;
  initialContent?: string | null;
  initialTitle?: string;
  initialTags?: string[];
}

export function useNoteVersions({
  maxVersions = 10,
  initialContent = null,
  initialTitle = '',
  initialTags = []
}: UseNoteVersionsOptions = {}) {
  const [versions, setVersions] = useState<NoteVersion[]>([]);
  const [currentVersionIndex, setCurrentVersionIndex] = useState(-1);
  const versionIdCounter = useRef(0);

  // Save current state as a new version
  const saveVersion = useCallback((content: string | null, title: string, tags: string[] = []) => {
    const newVersion: NoteVersion = {
      id: `version_${++versionIdCounter.current}`,
      content,
      title,
      tags: [...tags],
      timestamp: new Date()
    };

    setVersions(prev => {
      const newVersions = [...prev, newVersion];
      // Keep only the last maxVersions
      if (newVersions.length > maxVersions) {
        return newVersions.slice(-maxVersions);
      }
      return newVersions;
    });

    setCurrentVersionIndex(versions.length); // Point to the new version
  }, [maxVersions, versions.length]);

  // Restore to a specific version
  const restoreVersion = useCallback((versionId: string) => {
    const versionIndex = versions.findIndex(v => v.id === versionId);
    if (versionIndex !== -1) {
      setCurrentVersionIndex(versionIndex);
      return versions[versionIndex];
    }
    return null;
  }, [versions]);

  // Undo to previous version
  const undo = useCallback(() => {
    if (currentVersionIndex > 0) {
      const newIndex = currentVersionIndex - 1;
      setCurrentVersionIndex(newIndex);
      return versions[newIndex];
    }
    return null;
  }, [currentVersionIndex, versions]);

  // Redo to next version
  const redo = useCallback(() => {
    if (currentVersionIndex < versions.length - 1) {
      const newIndex = currentVersionIndex + 1;
      setCurrentVersionIndex(newIndex);
      return versions[newIndex];
    }
    return null;
  }, [currentVersionIndex, versions.length]);

  // Get current version
  const getCurrentVersion = useCallback(() => {
    if (currentVersionIndex >= 0 && currentVersionIndex < versions.length) {
      return versions[currentVersionIndex];
    }
    return null;
  }, [currentVersionIndex, versions]);

  // Initialize with initial content if provided
  const initialize = useCallback(() => {
    if (versions.length === 0 && (initialContent || initialTitle)) {
      saveVersion(initialContent, initialTitle, initialTags);
    }
  }, [versions.length, initialContent, initialTitle, initialTags, saveVersion]);

  return {
    versions,
    currentVersionIndex,
    saveVersion,
    restoreVersion,
    undo,
    redo,
    getCurrentVersion,
    initialize,
    canUndo: currentVersionIndex > 0,
    canRedo: currentVersionIndex < versions.length - 1,
    hasVersions: versions.length > 0
  };
}
