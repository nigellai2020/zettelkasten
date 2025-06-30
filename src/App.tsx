import React, { useState, useEffect } from 'react';
import { Network } from 'lucide-react';
import { useNotes } from './hooks/useNotes';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { NoteEditor } from './components/NoteEditor';
import { MetadataPanel } from './components/MetadataPanel';
import { GraphView } from './components/GraphView';
import { TreeView } from './components/TreeView';

function App() {
  const { notes, loading, createNote, updateNote, deleteNote, exportNotes, importNotes } = useNotes();
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'notes' | 'tree' | 'graph'>('notes');
  const [showGraphModal, setShowGraphModal] = useState(false);

  const selectedNote = selectedNoteId ? notes.find(note => note.id === selectedNoteId) : null;
  const allTags = [...new Set(notes.flatMap(note => note.tags))];

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

  const handleCreateNote = () => {
    const title = `New Note ${notes.length + 1}`;
    const newNote = createNote(title);
    setSelectedNoteId(newNote.id);
    if (currentView !== 'notes') {
      setCurrentView('notes');
    }
  };

  const handleSelectNote = (noteId: string) => {
    setSelectedNoteId(noteId);
    if (currentView !== 'notes') {
      setCurrentView('notes');
    }
  };

  const handleDeleteNote = (noteId: string) => {
    deleteNote(noteId);
    if (selectedNoteId === noteId) {
      setSelectedNoteId(notes.length > 1 ? notes.find(n => n.id !== noteId)?.id || null : null);
    }
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
      />
      
      <div className="flex-1 flex overflow-hidden">
        {currentView === 'notes' ? (
          <>
            <Sidebar
              notes={notes}
              selectedNoteId={selectedNoteId}
              onSelectNote={handleSelectNote}
              onCreateNote={handleCreateNote}
              onExport={exportNotes}
              onImport={importNotes}
            />
            
            <div className="flex-1 flex">
              <NoteEditor
                note={selectedNote}
                notes={notes}
                onUpdateNote={updateNote}
                onDeleteNote={handleDeleteNote}
                onSelectNote={handleSelectNote}
              />
              
              <MetadataPanel
                note={selectedNote}
                notes={notes}
                onSelectNote={handleSelectNote}
              />
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
          selectedNoteId={selectedNoteId}
          onSelectNote={(noteId) => {
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