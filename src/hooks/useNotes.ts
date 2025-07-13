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
      links: [],
      dirty: true
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
            tags: updates.content ? extractTags(updates.content) : note.tags,
            dirty: true
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
          new RegExp(`\[\[${escapeRegExp(noteToDelete.title)}\]\]`, 'gi'),
          noteToDelete.title // Convert [[Title]] back to plain text
        ),
        dirty: true
      }));

      updateAllLinks(newNotes);
      return newNotes;
    });
  };
  // --- SYNC LOGIC ---
  /**
   * Sync notes with remote backend:
   * 1. Upload all dirty notes (POST/upsert)
   * 2. Download all remote notes updated after latest local updated_at
   * 3. Merge remote notes, resolving conflicts by updated_at (latest wins)
   * 4. Mark uploaded notes as clean
   */
  const syncNotes = async () => {
    const endpoint = import.meta.env.VITE_WORKER_API_ENDPOINT;
    const apiKey = import.meta.env.VITE_WORKER_API_KEY;
    if (!endpoint) {
      alert('Worker API endpoint is not set. Please configure VITE_WORKER_API_ENDPOINT in your .env file.');
      return;
    }
    // 1. Upload dirty notes
    const dirtyNotes = notes.filter(n => n.dirty);
    for (const note of dirtyNotes) {
      try {
        await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { 'X-API-Key': apiKey } : {})
          },
          body: JSON.stringify({
            id: note.id,
            title: note.title,
            content: note.content,
            tags: note.tags.join(','),
            links: note.links.join(','),
          })
        });
      } catch (e) {
        // If upload fails, keep dirty flag
        console.error('Failed to upload note', note.id, e);
      }
    }

    // 2. Download remote notes updated after latest local updated_at
    const latestLocal = notes.length > 0 ? Math.max(...notes.map(n => n.updatedAt.getTime())) : 0;
    let remoteNotes: any[] = [];
    try {
      const url = endpoint + (endpoint.includes('?') ? '&' : '?') + 'updated_after=' + latestLocal;
      const res = await fetch(url, {
        headers: apiKey ? { 'X-API-Key': apiKey } : {},
      });
      if (!res.ok) throw new Error('Failed to fetch remote notes');
      const remoteNotesResult = await res.json();
      remoteNotes = remoteNotesResult.map((r: any) => ({
        ...r,
        tags: r.tags ? r.tags.split(',').map((tag: string) => tag.trim()) : [],
        links: r.links ? r.links.split(',').map((link: string) => link.trim()) : []
      }));
    } catch (e) {
      console.error('Failed to download remote notes', e);
      alert('Failed to download remote notes: ' + (e && (e as any).message));
      return;
    }

    // 3. Merge remote notes, resolving conflicts by updated_at (latest wins)
    setNotes(prev => {
      const byId = new Map<string, Note>();
      // Add all local notes
      for (const n of prev) {
        byId.set(n.id, n);
      }
      // Merge remote notes
      for (const r of remoteNotes) {
        const local = byId.get(r.id);
        const remoteUpdated = new Date(r.updated_at || r.updatedAt);
        if (!local || remoteUpdated > local.updatedAt) {
          byId.set(r.id, {
            ...local,
            ...r,
            createdAt: new Date(r.created_at || r.createdAt),
            updatedAt: remoteUpdated,
            dirty: false,
          });
        }
      }
      // After upload, clear dirty flag for notes that were uploaded
      for (const n of dirtyNotes) {
        const merged = byId.get(n.id);
        if (merged && merged.updatedAt.getTime() === n.updatedAt.getTime()) {
          merged.dirty = false;
        }
      }
      const mergedNotes = Array.from(byId.values());
      updateAllLinks(mergedNotes);
      return mergedNotes;
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
            // Normalize literal \n to real newlines in content
            content: typeof note.content === 'string' ? note.content.replace(/\\n/g, '\n') : note.content,
            links: note.links ? note.links.split(',').map((link: string) => link.trim()) : [],
            tags: note.tags ? note.tags.split(',').map((tag: string) => tag.trim()) : [],
            createdAt: parseToDate(note.createdAt),
            updatedAt: parseToDate(note.updatedAt)
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

  // Helper to robustly parse unix timestamp, ISO string, or Date
  function parseToDate(val: any): Date {
    if (val instanceof Date) return val;
    if (typeof val === 'number' && !isNaN(val)) return new Date(val);
    if (typeof val === 'string') {
      // Try parse as number first (unix ms)
      const num = Number(val);
      if (!isNaN(num) && val.trim() !== '') return new Date(num);
      // Fallback: parse as ISO string
      const d = new Date(val);
      if (!isNaN(d.getTime())) return d;
    }
    // Fallback: now
    return new Date();
  }

  return {
    notes,
    loading,
    createNote,
    updateNote,
    deleteNote,
    exportNotes,
    importNotes,
    syncNotes
  };
};