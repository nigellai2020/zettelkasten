
import { useState, useEffect } from 'react';
import { Note } from '../types';
import { extractLinks, extractTags } from '../utils/noteUtils';
import { getAllNotes, saveNotes } from '../utils/db';



export const useNotes = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllNotes().then(setNotes).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading) {
      saveNotes(notes);
    }
  }, [notes, loading]);

  const createNote = (title: string, content: string = '') => {
    const now = new Date();
    const newNote: Note = {
      id: crypto.randomUUID(),
      title,
      content,
      tags: extractTags(content),
      createdAt: now,
      updatedAt: now,
      links: []
    };

    setNotes(prev => {
      const newNotes = [newNote, ...prev];
      updateAllLinks(newNotes);
      return newNotes;
    });
    return newNote;
  };

  const updateNote = (id: string, updates: Partial<Note>) => {
    setNotes(prev => {
      const noteToUpdate = prev.find(note => note.id === id);
      if (!noteToUpdate) return prev;

      const oldTitle = noteToUpdate.title;
      const newTitle = updates.title;
      
      // Check if title is being changed
      const titleChanged = newTitle && newTitle !== oldTitle;

      let newNotes = prev.map(note => {
        if (note.id === id) {
          const updatedNote = {
            ...note,
            ...updates,
            updatedAt: new Date(),
            tags: updates.content ? extractTags(updates.content) : note.tags
          };
          return updatedNote;
        }
        return note;
      });

      // If title changed, update all references to the old title in other notes
      if (titleChanged) {
        newNotes = updateLinksAfterTitleChange(newNotes, oldTitle, newTitle!);
      }
      
      updateAllLinks(newNotes);
      return newNotes;
    });
  };

  const deleteNote = (id: string) => {
    setNotes(prev => {
      const noteToDelete = prev.find(note => note.id === id);
      if (!noteToDelete) return prev;

      // Remove the note and update all links
      let newNotes = prev.filter(note => note.id !== id);
      
      // Remove any broken links that pointed to the deleted note
      newNotes = newNotes.map(note => ({
        ...note,
        content: note.content.replace(
          new RegExp(`\\[\\[${escapeRegExp(noteToDelete.title)}\\]\\]`, 'gi'),
          noteToDelete.title // Convert [[Title]] back to plain text
        )
      }));

      updateAllLinks(newNotes);
      return newNotes;
    });
  };

  const updateLinksAfterTitleChange = (notesList: Note[], oldTitle: string, newTitle: string): Note[] => {
    return notesList.map(note => {
      // Skip the note that was renamed
      if (note.title === newTitle) return note;

      // Update content to replace old title references with new title
      const oldLinkPattern = new RegExp(`\\[\\[${escapeRegExp(oldTitle)}\\]\\]`, 'gi');
      const updatedContent = note.content.replace(oldLinkPattern, `[[${newTitle}]]`);

      // Only update the note if content actually changed
      if (updatedContent !== note.content) {
        return {
          ...note,
          content: updatedContent,
          updatedAt: new Date()
        };
      }

      return note;
    });
  };

  const updateAllLinks = (notesList: Note[]) => {
    const titleToIdMap = new Map(
      notesList.map(note => [note.title.toLowerCase(), note.id])
    );

    notesList.forEach(note => {
      const linkedTitles = extractLinks(note.content);
      note.links = linkedTitles
        .map(title => titleToIdMap.get(title.toLowerCase()))
        .filter(Boolean) as string[];
    });
  };

  // Helper function to escape special regex characters
  const escapeRegExp = (string: string): string => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  const exportNotes = () => {
    const dataStr = JSON.stringify(notes, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `zettelkasten-export-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importNotes = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedNotes = JSON.parse(e.target?.result as string);
        const validNotes = importedNotes
          .filter((note: any) => note.id && note.title && note.content !== undefined)
          .map((note: any) => ({
            ...note,
            createdAt: new Date(note.createdAt),
            updatedAt: new Date(note.updatedAt)
          }));
        
        setNotes(prev => {
          const existingIds = new Set(prev.map(n => n.id));
          const newNotes = validNotes.filter((n: Note) => !existingIds.has(n.id));
          const merged = [...prev, ...newNotes];
          updateAllLinks(merged);
          return merged;
        });
      } catch (error) {
        console.error('Error importing notes:', error);
        alert('Error importing notes. Please check the file format.');
      }
    };
    reader.readAsText(file);
  };

  return {
    notes,
    loading,
    createNote,
    updateNote,
    deleteNote,
    exportNotes,
    importNotes
  };
};