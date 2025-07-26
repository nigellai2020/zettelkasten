import { useAuthContext } from '../contexts/AuthContext';
import { Note } from '../types';

export const useSync = () => {
  const { getAuthHeaders } = useAuthContext();

  const syncNotes = async (notes: Note[], setNotes: React.Dispatch<React.SetStateAction<Note[]>>, updateAllLinks: (notesList: Note[]) => void) => {
    const endpoint = import.meta.env.VITE_WORKER_API_ENDPOINT;
    if (!endpoint) {
      alert('Worker API endpoint is not set. Please configure VITE_WORKER_API_ENDPOINT in your .env file.');
      return;
    }
    
    const authHeaders = getAuthHeaders();
    
    // 1. Upload dirty notes (excluding deleted ones - deleted notes are handled locally)
    const dirtyNotes = notes.filter(n => n.dirty && !n.deleted);
    for (const note of dirtyNotes) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders
          },
          body: JSON.stringify({
            id: note.id,
            title: note.title,
            content: note.content,
            tags: note.tags.join(','),
            links: note.links.join(','),
            deleted: note.deleted ? 1 : 0,
          })
        });
        
        // Handle authentication errors
        if (res.status === 401) {
          console.error('Authentication failed for note upload. Session may have expired.');
          throw new Error('Authentication failed. Please login again.');
        }
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
        headers: authHeaders,
      });
      
      if (res.status === 401) {
        throw new Error('Authentication failed. Please login again.');
      }
      
      if (!res.ok) throw new Error('Failed to fetch remote notes');
      const remoteNotesResult = await res.json();
      remoteNotes = remoteNotesResult.map((r: any) => ({
        ...r,
        tags: r.tags ? r.tags.split(',').map((tag: string) => tag.trim()) : [],
        links: r.links ? r.links.split(',').map((link: string) => link.trim()) : [],
        deleted: r.deleted === 1 || r.deleted === true,
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
      // Remove deleted notes from the local list (tombstone cleanup)
      const mergedNotes = Array.from(byId.values()).filter(n => !n.deleted);
      updateAllLinks(mergedNotes);
      return mergedNotes;
    });
  };

  return { syncNotes };
};
