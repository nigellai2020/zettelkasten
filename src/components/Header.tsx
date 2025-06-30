import React, { useState } from 'react';
import { Brain, Network, TreePine, FileText, Sun, Moon, Search } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { SearchModal } from './SearchModal';
import { Note } from '../types';

interface HeaderProps {
  currentView: 'notes' | 'tree' | 'graph';
  onViewChange: (view: 'notes' | 'tree' | 'graph') => void;
  noteCount: number;
  tagCount: number;
  notes: Note[];
  onSelectNote: (noteId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onViewChange,
  noteCount,
  tagCount,
  notes,
  onSelectNote
}) => {
  const { theme, toggleTheme } = useTheme();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <>
      <header className="bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-dark-700 shadow-sm transition-colors">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Title */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                <Brain className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Zettelkasten</h1>
                <p className="text-sm text-gray-600 dark:text-dark-400">Personal Knowledge Management</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex items-center gap-2">
              <button
                onClick={() => onViewChange('notes')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  currentView === 'notes'
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
                    : 'text-gray-600 dark:text-dark-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-700'
                }`}
              >
                <FileText size={18} />
                <span>Notes</span>
              </button>
              <button
                onClick={() => onViewChange('tree')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  currentView === 'tree'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 shadow-sm'
                    : 'text-gray-600 dark:text-dark-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-700'
                }`}
              >
                <TreePine size={18} />
                <span>Tree View</span>
              </button>
              <button
                onClick={() => onViewChange('graph')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  currentView === 'graph'
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 shadow-sm'
                    : 'text-gray-600 dark:text-dark-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-700'
                }`}
              >
                <Network size={18} />
                <span>Graph</span>
              </button>
            </nav>

            {/* Right side - Search, Stats and Theme Toggle */}
            <div className="flex items-center gap-4">
              {/* Global Search Button */}
              <button
                onClick={() => setIsSearchOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 text-gray-700 dark:text-dark-300 rounded-lg transition-colors group"
                title="Search all notes (Ctrl+K)"
              >
                <Search size={16} />
                <span className="text-sm">Search...</span>
                <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-xs font-mono bg-white dark:bg-dark-800 text-gray-500 dark:text-dark-400 border border-gray-300 dark:border-dark-600 rounded">
                  ⌘K
                </kbd>
              </button>

              {/* Stats */}
              <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-dark-400">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>{noteCount} notes</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>{tagCount} tags</span>
                </div>
              </div>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 text-gray-600 dark:text-dark-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-all duration-200 group"
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                <div className="relative w-5 h-5">
                  <Sun 
                    size={20} 
                    className={`absolute inset-0 transition-all duration-300 ${
                      theme === 'light' 
                        ? 'opacity-100 rotate-0 scale-100' 
                        : 'opacity-0 rotate-90 scale-75'
                    }`} 
                  />
                  <Moon 
                    size={20} 
                    className={`absolute inset-0 transition-all duration-300 ${
                      theme === 'dark' 
                        ? 'opacity-100 rotate-0 scale-100' 
                        : 'opacity-0 -rotate-90 scale-75'
                    }`} 
                  />
                </div>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Global Search Modal */}
      <SearchModal
        notes={notes}
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectNote={onSelectNote}
      />
    </>
  );
};