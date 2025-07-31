import React, { useState, useEffect } from 'react';
import { useNotes } from './hooks/useNotes';
import { useSync } from './hooks/useSync';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { NoteEditor } from './components/NoteEditor';
import { MetadataPanel } from './components/MetadataPanel';
import { GraphView } from './components/GraphView3D';
import { TreeView } from './components/TreeView';

function App() {
  const { notes, loading, createNote, updateNote, deleteNote, exportNotes, importNotes, updateAllLinks, setNotes } = useNotes();
  const { syncNotes } = useSync();

  // Sync notes with Worker API
  const handleSyncNotes = async () => {
    await syncNotes(notes, setNotes, updateAllLinks);
  };

  // Multi-tab state, persisted in localStorage
  const [openTabs, setOpenTabs] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('zettelkasten-openTabs');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [activeTabId, setActiveTabId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('zettelkasten-activeTabId') || null;
    } catch {
      return null;
    }
  });
  const [currentView, setCurrentView] = useState<'notes' | 'tree' | 'graph'>('notes');
  const [showGraphModal, setShowGraphModal] = useState(false);

  // Multi-tab logic
  const allTags = [...new Set(notes.flatMap((note: any) => note.tags))];

  // Persist openTabs and activeTabId to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('zettelkasten-openTabs', JSON.stringify(openTabs));
    } catch {}
  }, [openTabs]);

  useEffect(() => {
    try {
      if (activeTabId) {
        localStorage.setItem('zettelkasten-activeTabId', activeTabId);
      } else {
        localStorage.removeItem('zettelkasten-activeTabId');
      }
    } catch {}
  }, [activeTabId]);

  // Remove closed/deleted notes from openTabs
  useEffect(() => {
    if (loading) return; // Avoid running this during initial load
    setOpenTabs((tabs: string[]) => tabs.filter((id: string) => notes.some((n: any) => n.id === id)));
    setActiveTabId((id: string | null) => (id && notes.some((n: any) => n.id === id) ? id : openTabs[0] || null));
  }, [notes]);

  // Find the active note for the tabbed editor
  const activeNote = notes.find((n: any) => n.id === activeTabId) || null;

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K for global search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        // This will be handled by the SearchModal in Header
        const searchButton = document.querySelector('[title="Search all notes (Ctrl+K)"]') as HTMLButtonElement;
        searchButton?.click();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Open a note in a tab (like VS Code)
  const openNoteTab = (noteId: string) => {
    setOpenTabs((tabs: string[]) => {
      if (tabs.includes(noteId)) return tabs;
      return [...tabs, noteId];
    });
    setActiveTabId(noteId);
    if (currentView !== 'notes') {
      setCurrentView('notes');
    }
  };

  // Close a tab (like VS Code)
  const closeTab = (noteId: string) => {
    setOpenTabs((tabs: string[]) => {
      const idx = tabs.indexOf(noteId);
      const newTabs = tabs.filter((id: string) => id !== noteId);
      // If closing the active tab, activate the next tab to the right, or left if at end
      if (activeTabId === noteId) {
        setActiveTabId(newTabs.length > 0 ? newTabs[Math.min(idx, newTabs.length - 1)] : null);
      }
      return newTabs;
    });
  };

  // For sidebar and other navigation
  const handleCreateNote = () => {
    const title = `New Note ${notes.length + 1}`;
    const newNote = createNote(title);
    openNoteTab(newNote.id);
  };

  const handleSelectNote = (noteId: string) => {
    openNoteTab(noteId);
  };

  const handleDeleteNote = (noteId: string) => {
    deleteNote(noteId);
    closeTab(noteId);
  };

  const handleViewChange = (view: 'notes' | 'tree' | 'graph') => {
    if (view === 'graph') {
      setShowGraphModal(true);
    } else {
      setCurrentView(view);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-dark-900 flex items-center justify-center transition-colors">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-dark-400">Loading your knowledge base...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-dark-900 transition-colors">
      <Header
        currentView={currentView}
        onViewChange={handleViewChange}
        noteCount={notes.length}
        tagCount={allTags.length}
        notes={notes}
        onSelectNote={handleSelectNote}
        onDownloadFromWorker={handleSyncNotes}
      />
      {/* Tab Bar */}
      <div className="flex-shrink-0 flex bg-gray-100 dark:bg-dark-700 border-b border-gray-200 dark:border-dark-600">
        {openTabs.map((id: string) => {
          const note = notes.find((n: any) => n.id === id);
          if (!note) return null;
          return (
            <div
              key={id}
              className={`flex items-center px-4 py-2 cursor-pointer border-r border-gray-200 dark:border-dark-600 ${
                id === activeTabId
                  ? 'bg-white dark:bg-dark-800 font-bold text-blue-600 dark:text-blue-300'
                  : 'text-gray-700 dark:text-dark-300 hover:bg-gray-200 dark:hover:bg-dark-600'
              }`}
              onClick={() => setActiveTabId(id)}
            >
              <span className="truncate max-w-xs">{note.title || 'Untitled'}</span>
              <button
                className="ml-2 text-gray-400 hover:text-red-500"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(id);
                }}
                title="Close tab"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
      <div className="flex-1 flex overflow-hidden">
        {currentView === 'notes' ? (
          <>
            <Sidebar
              notes={notes
                .slice()
                .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                // .slice(0, 50)
              }
              selectedNoteId={activeTabId}
              onSelectNote={handleSelectNote}
              onCreateNote={handleCreateNote}
              onExport={exportNotes}
              onImport={importNotes}
            />
            <div className="flex-1 flex">
              {/* Only render NoteEditor and MetadataPanel if a tab is open */}
              {activeNote ? (
                <>
                  <NoteEditor
                    note={activeNote}
                    notes={notes}
                    onUpdateNote={updateNote}
                    onDeleteNote={handleDeleteNote}
                    onSelectNote={handleSelectNote}
                  />
                  <MetadataPanel
                    note={activeNote}
                    notes={notes}
                    onSelectNote={handleSelectNote}
                  />
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-dark-400">
                  No note selected
                </div>
              )}
            </div>
          </>
        ) : currentView === 'tree' ? (
          <TreeView
            notes={notes}
            onSelectNote={handleSelectNote}
          />
        ) : null}
      </div>
      {/* Graph view modal */}
      {showGraphModal && (
        <GraphView
          notes={notes}
          selectedNoteId={activeTabId}
          onSelectNote={(noteId: string) => {
            handleSelectNote(noteId);
            setShowGraphModal(false);
          }}
          onClose={() => setShowGraphModal(false)}
        />
      )}
    </div>
  );
}

export default App;