import React, { useState } from 'react';
import { Search, Plus, FileText, Tag, Download, Upload } from 'lucide-react';
import { Note, SearchResult } from '../types';
import { searchNotes } from '../utils/noteUtils';
import { toDateString } from '../utils/dateUtils';

interface SidebarProps {
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (noteId: string) => void;
  onCreateNote: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  notes,
  selectedNoteId,
  onSelectNote,
  onCreateNote,
  onExport,
  onImport
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'search' | 'tags'>('all');

  const searchResults = searchQuery ? searchNotes(searchQuery, notes) : [];
  const allTags = [...new Set(notes.flatMap(note => note.tags))].sort();
  
  const filteredNotes = selectedTag 
    ? notes.filter(note => note.tags.includes(selectedTag))
    : notes;

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImport(file);
      event.target.value = '';
    }
  };

  const displayNotes = activeTab === 'search' && searchQuery ? searchResults.map(r => r.note) : filteredNotes;

  return (
    <div className="w-80 bg-white dark:bg-dark-800 border-r border-gray-200 dark:border-dark-700 flex flex-col h-full transition-colors">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-dark-700">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Zettelkasten</h1>
          <div className="flex gap-2">
            <button
              onClick={onExport}
              className="p-2 text-gray-600 dark:text-dark-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
              title="Export notes"
            >
              <Download size={18} />
            </button>
            <label className="p-2 text-gray-600 dark:text-dark-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors cursor-pointer" title="Import notes">
              <Upload size={18} />
              <input
                type="file"
                accept=".json"
                onChange={handleFileImport}
                className="hidden"
              />
            </label>
            <button
              onClick={onCreateNote}
              className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm"
              title="Create new note"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 text-gray-400 dark:text-dark-500" size={16} />
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (e.target.value) setActiveTab('search');
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-dark-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          />
        </div>

        {/* Tabs */}
        <div className="flex mt-3 bg-gray-100 dark:bg-dark-700 rounded-lg p-1">
          <button
            onClick={() => {
              setActiveTab('all');
              setSelectedTag(null);
            }}
            className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'all' 
                ? 'bg-white dark:bg-dark-600 text-gray-900 dark:text-white shadow-sm' 
                : 'text-gray-600 dark:text-dark-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <FileText size={14} className="inline mr-1" />
            All
          </button>
          <button
            onClick={() => setActiveTab('tags')}
            className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'tags' 
                ? 'bg-white dark:bg-dark-600 text-gray-900 dark:text-white shadow-sm' 
                : 'text-gray-600 dark:text-dark-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Tag size={14} className="inline mr-1" />
            Tags
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'tags' ? (
          <div className="p-4">
            <div className="space-y-2">
              {selectedTag && (
                <button
                  onClick={() => setSelectedTag(null)}
                  className="w-full text-left px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                >
                  ← Back to all tags
                </button>
              )}
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => {
                    setSelectedTag(tag);
                    setActiveTab('all');
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-dark-300 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors flex items-center justify-between"
                >
                  <span>#{tag}</span>
                  <span className="text-xs text-gray-500 dark:text-dark-500">
                    {notes.filter(note => note.tags.includes(tag)).length}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4">
            {selectedTag && (
              <div className="mb-4 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-lg text-sm flex items-center justify-between">
                <span>Filtered by #{selectedTag}</span>
                <button
                  onClick={() => setSelectedTag(null)}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                >
                  Clear
                </button>
              </div>
            )}
            
            <div className="space-y-2">
              {displayNotes.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-dark-500">
                  {searchQuery ? 'No notes found' : 'No notes yet'}
                </div>
              ) : (
                displayNotes.map(note => (
                  <button
                    key={note.id}
                    onClick={() => onSelectNote(note.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedNoteId === note.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                        : 'hover:bg-gray-50 dark:hover:bg-dark-700 border border-transparent'
                    }`}
                  >
                    <div className="font-medium text-gray-900 dark:text-white mb-1 line-clamp-1">
                      {note.title}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-dark-400 line-clamp-2 mb-2">
                      {note.content.slice(0, 100)}...
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {note.tags.slice(0, 3).map(tag => (
                          <span
                            key={tag}
                            className="px-1.5 py-0.5 bg-gray-100 dark:bg-dark-600 text-gray-700 dark:text-dark-300 text-xs rounded"
                          >
                            #{tag}
                          </span>
                        ))}
                        {note.tags.length > 3 && (
                          <span className="text-xs text-gray-500 dark:text-dark-500">+{note.tags.length - 3}</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-dark-500">
                        {toDateString(note.updatedAt)}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};