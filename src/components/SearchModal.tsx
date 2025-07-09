import React, { useState, useEffect, useRef } from 'react';
import { Search, X, FileText, Tag, Calendar, ArrowRight, Filter, Clock } from 'lucide-react';
import { Note, SearchResult } from '../types';
import { searchNotes } from '../utils/noteUtils';
import { toDateString } from '../utils/dateUtils';

// Props interface
interface SearchModalProps {
  notes: Note[];
  isOpen: boolean;
  onClose: () => void;
  onSelectNote: (noteId: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  notes,
  isOpen,
  onClose,
  onSelectNote
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchMode, setSearchMode] = useState<'all' | 'title' | 'content' | 'tags'>('all');
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Advanced: tag scoping with combo box
  const allTags = Array.from(new Set(notes.flatMap(n => n.tags))).sort();
  const [tagScope, setTagScope] = useState<string[]>([]); // tags to filter by
  const [tagInput, setTagInput] = useState('');
  const tagInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
    if (!isOpen) {
      setTagScope([]); // reset tag scope when closed
    }
  }, [isOpen]);

  // --- Web Worker for search ---
  const workerRef = useRef<Worker | null>(null);
  const [workerReady, setWorkerReady] = useState(false);

  // Build the search index in the worker when notes change
  useEffect(() => {
    workerRef.current = new Worker(new URL('../workers/searchWorker.js', import.meta.url));
    workerRef.current.onmessage = (event) => {
      if (event.data.type === 'ready') setWorkerReady(true);
    };
    workerRef.current.postMessage({ type: 'build', notes });
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
      setWorkerReady(false);
    };
  }, [notes]);

  useEffect(() => {
    if (!query.trim() || query.trim().length < 3) {
      setResults([]);
      setSelectedIndex(0);
      return;
    }
    if (!workerReady || !workerRef.current) return;
    setIsSearching(true);
    const timeoutId = setTimeout(() => {
      workerRef.current!.onmessage = (event) => {
        if (event.data.type === 'results') {
          // Advanced: filter by tag scope if set
          let filtered = event.data.results;
          if (tagScope.length > 0) {
            filtered = filtered.filter((r: any) =>
              tagScope.every(tag => r.tags && r.tags.includes(tag))
            );
          }
          const results = searchNotes(query, filtered, searchMode);
          setResults(results);
          setSelectedIndex(0);
          setIsSearching(false);
        }
      };
      workerRef.current!.postMessage({ type: 'search', query, searchMode });
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [query, searchMode, workerReady, tagScope]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      handleSelectNote(results[selectedIndex].note.id);
    }
  };

  const handleSelectNote = (noteId: string) => {
    onSelectNote(noteId);
    onClose();
    setQuery('');
  };

  const highlightText = (text: string, query: string, maxLength: number = 150) => {
    if (!query.trim()) return text.slice(0, maxLength);

    const queryWords = query.toLowerCase().split(/\s+/).filter(Boolean);
    let highlightedText = text;
    
    // Find the best match position for context
    let bestMatchIndex = -1;
    let bestMatchScore = 0;
    
    queryWords.forEach(word => {
      const index = text.toLowerCase().indexOf(word);
      if (index !== -1 && word.length > bestMatchScore) {
        bestMatchIndex = index;
        bestMatchScore = word.length;
      }
    });

    // Extract context around the best match
    if (bestMatchIndex !== -1) {
      const start = Math.max(0, bestMatchIndex - 50);
      const end = Math.min(text.length, bestMatchIndex + maxLength);
      highlightedText = (start > 0 ? '...' : '') + text.slice(start, end) + (end < text.length ? '...' : '');
    } else {
      highlightedText = text.slice(0, maxLength) + (text.length > maxLength ? '...' : '');
    }

    // Find matches for query words in order, only allowing each match to appear after the previous
    const matches: { start: number; end: number; word: string }[] = [];
    let lastEnd = 0;
    for (let i = 0; i < queryWords.length; i++) {
      const word = queryWords[i];
      const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedWord, 'gi');
      let match;
      let found = false;
      while ((match = regex.exec(highlightedText)) !== null) {
        if (match.index >= lastEnd) {
          matches.push({
            start: match.index,
            end: match.index + match[0].length,
            word: match[0]
          });
          lastEnd = match.index + match[0].length;
          found = true;
          break; // Only take the first valid match for this word
        }
        // Prevent infinite loop for zero-length matches
        if (match.index === regex.lastIndex) {
          regex.lastIndex++;
        }
      }
      if (!found) {
        // If a word is not found in order, stop matching further
        break;
      }
    }

    // Sort matches by start position (descending) to avoid position shifts when inserting HTML
    matches.sort((a, b) => b.start - a.start);

    // Remove overlapping matches (keep the first one found) and filter out single characters
    const filteredMatches = matches.filter((match, index) => {
      // Remove overlapping matches
      return !matches.slice(0, index).some(prevMatch => 
        (match.start >= prevMatch.start && match.start < prevMatch.end) ||
        (match.end > prevMatch.start && match.end <= prevMatch.end)
      );
    });


    // Apply highlighting from right to left to avoid position shifts
    filteredMatches.forEach(match => {
      const before = highlightedText.slice(0, match.start);
      const highlighted = highlightedText.slice(match.start, match.end);
      const after = highlightedText.slice(match.end);
      highlightedText = before + 
        '<mark class="bg-yellow-200 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100 px-0.5 rounded">' + 
        highlighted + 
        '</mark>' + 
        after;
    });

    return highlightedText;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 pt-20 animate-fade-in">
      <div className="bg-white dark:bg-dark-800 rounded-xl w-full max-w-3xl mx-4 shadow-2xl border border-gray-200 dark:border-dark-700 animate-slide-in">
        {/* Search Header */}
        <div className="p-6 border-b border-gray-200 dark:border-dark-700">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 text-gray-400 dark:text-dark-500" size={20} />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search across all notes..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full pl-11 pr-4 py-3 text-lg border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-dark-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>
            <button
              onClick={onClose}
              className="p-3 text-gray-400 dark:text-dark-500 hover:text-gray-600 dark:hover:text-dark-300 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Search Filters */}
          <div className="flex items-center gap-2 mb-2">
            <Filter size={16} className="text-gray-500 dark:text-dark-400" />
            <div className="flex gap-2">
              {[
                { key: 'all', label: 'All', icon: Search },
                { key: 'title', label: 'Titles', icon: FileText },
                { key: 'content', label: 'Content', icon: FileText },
                { key: 'tags', label: 'Tags', icon: Tag }
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setSearchMode(key as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    searchMode === key
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'text-gray-600 dark:text-dark-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-700'
                  }`}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Tag Scope Combo Box */}
          <div className="mb-2">
            <div className="flex flex-wrap gap-2 mb-2">
              {tagScope.map(tag => (
                <span
                  key={tag}
                className="flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200 border border-blue-300 dark:border-blue-700"
                >
                  #{tag}
                  <button
                    className="ml-1 text-blue-400 hover:text-red-500"
                    onClick={() => setTagScope(scope => scope.filter(t => t !== tag))}
                    title={`Remove tag ${tag}`}
                  >
                    ×
                  </button>
                </span>
              ))}
              {tagScope.length > 0 && (
                <button
                  onClick={() => setTagScope([])}
                  className="ml-2 px-2 py-0.5 rounded-full text-xs border border-gray-300 dark:border-dark-600 text-gray-500 dark:text-dark-400 hover:bg-gray-200 dark:hover:bg-dark-600"
                  title="Clear tag filter"
                  disabled={tagScope.length === 0}
                >
                  Clear
                </button>
              )}
            </div>
            <div className="relative w-64">
              <input
                ref={tagInputRef}
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && tagInput.trim()) {
                    const match = allTags.find(t => t.toLowerCase() === tagInput.trim().toLowerCase());
                    if (match && !tagScope.includes(match)) {
                      setTagScope(scope => [...scope, match]);
                      setTagInput('');
                    }
                  } else if (e.key === 'Backspace' && !tagInput && tagScope.length > 0) {
                    setTagScope(scope => scope.slice(0, -1));
                  }
                }}
                placeholder="Filter by tag..."
                className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-dark-100 text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {/* Dropdown for tag suggestions */}
              {tagInput && (
                <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded shadow-lg z-10 max-h-40 overflow-y-auto">
                  {allTags.filter(tag =>
                    tag.toLowerCase().includes(tagInput.toLowerCase()) && !tagScope.includes(tag)
                  ).length === 0 ? (
                    <div className="px-3 py-2 text-xs text-gray-400">No tags found</div>
                  ) : (
                    allTags.filter(tag =>
                      tag.toLowerCase().includes(tagInput.toLowerCase()) && !tagScope.includes(tag)
                    ).map(tag => (
                      <button
                        key={tag}
                        onClick={() => {
                          setTagScope(scope => [...scope, tag]);
                          setTagInput('');
                          tagInputRef.current?.focus();
                        }}
                        className="block w-full text-left px-3 py-2 text-xs text-gray-900 dark:text-dark-100 hover:bg-blue-100 dark:hover:bg-dark-700"
                      >
                        #{tag}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search Results */}
        <div className="max-h-96 overflow-y-auto" ref={resultsRef}>
          {isSearching ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto mb-3"></div>
              <p className="text-gray-600 dark:text-dark-400">Searching...</p>
            </div>
          ) : query.trim() && results.length === 0 ? (
            <div className="p-8 text-center">
              <Search size={32} className="mx-auto mb-3 text-gray-400 dark:text-dark-500" />
              <p className="text-gray-600 dark:text-dark-400 mb-2">No results found</p>
              <p className="text-sm text-gray-500 dark:text-dark-500">Try different keywords or search filters</p>
            </div>
          ) : results.length > 0 ? (
            <div className="p-2">
              <div className="px-4 py-2 text-sm text-gray-600 dark:text-dark-400 border-b border-gray-100 dark:border-dark-700">
                {results.length} result{results.length !== 1 ? 's' : ''} found
              </div>
              {results.map((result, index) => (
                <button
                  key={result.note.id}
                  onClick={() => handleSelectNote(result.note.id)}
                  className={`w-full text-left p-4 border-b border-gray-100 dark:border-dark-700 last:border-b-0 transition-colors ${
                    index === selectedIndex
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                      : 'hover:bg-gray-50 dark:hover:bg-dark-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <FileText size={16} className="text-gray-500 dark:text-dark-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* Note Title */}
                      <h3 
                        className="font-semibold text-gray-900 dark:text-white mb-1"
                        dangerouslySetInnerHTML={{
                          __html: highlightText(result.note.title, query, 100)
                        }}
                      />
                      
                      {/* Content Preview */}
                      {result.matches.some(m => m.field === 'content') && (
                        <div 
                          className="text-sm text-gray-600 dark:text-dark-400 mb-2 leading-relaxed"
                          dangerouslySetInnerHTML={{
                            __html: highlightText(result.note.content, query, 200)
                          }}
                        />
                      )}
                      
                      {/* Tags */}
                      {result.note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {result.note.tags.slice(0, 4).map(tag => {
                            const isTagMatch = result.matches.some(m => m.field === 'tags' && m.text === tag);
                            return (
                              <span
                                key={tag}
                                className={`px-2 py-0.5 text-xs rounded-full ${
                                  isTagMatch
                                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 ring-1 ring-yellow-300 dark:ring-yellow-700'
                                    : 'bg-gray-100 dark:bg-dark-600 text-gray-700 dark:text-dark-300'
                                }`}
                              >
                                #{tag}
                              </span>
                            );
                          })}
                          {result.note.tags.length > 4 && (
                            <span className="text-xs text-gray-500 dark:text-dark-500">
                              +{result.note.tags.length - 4}
                            </span>
                          )}
                        </div>
                      )}
                      
                      {/* Metadata */}
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-dark-500">
                        <div className="flex items-center gap-1">
                          <Calendar size={12} />
                          <span>{toDateString(result.note.updatedAt)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock size={12} />
                          <span>{result.note.content.split(/\s+/).length} words</span>
                        </div>
                        {result.note.links.length > 0 && (
                          <div className="flex items-center gap-1">
                            <ArrowRight size={12} />
                            <span>{result.note.links.length} links</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <Search size={32} className="mx-auto mb-3 text-gray-400 dark:text-dark-500" />
              <p className="text-gray-600 dark:text-dark-400 mb-2">Start typing to search</p>
              <p className="text-sm text-gray-500 dark:text-dark-500">Search across titles, content, and tags</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {results.length > 0 && (
          <div className="px-6 py-3 bg-gray-50 dark:bg-dark-700 border-t border-gray-200 dark:border-dark-600 text-xs text-gray-600 dark:text-dark-400 flex items-center justify-between rounded-b-xl">
            <div>Use ↑↓ to navigate, Enter to select, Esc to close</div>
            <div>{selectedIndex + 1} of {results.length}</div>
          </div>
        )}
      </div>
    </div>
  );
};