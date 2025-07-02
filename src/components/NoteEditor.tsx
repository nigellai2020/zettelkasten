import React, { useState, useEffect, useRef } from 'react';
import { Edit3, Eye, Trash2, Calendar, Hash, BookOpen } from 'lucide-react';
import { Note } from '../types';
import { renderMarkdown, processGitHubMarkdown, generateTableOfContents } from '../utils/markdownUtils';

interface NoteEditorProps {
  note: Note | null;
  notes: Note[];
  onUpdateNote: (id: string, updates: Partial<Note>) => void;
  onDeleteNote: (id: string) => void;
  onSelectNote: (noteId: string) => void;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({
  note,
  notes,
  onUpdateNote,
  onDeleteNote,
  onSelectNote
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [showToc, setShowToc] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const contentAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setIsEditing(false);
    }
  }, [note]);

  useEffect(() => {
    if (previewRef.current) {
      const handleLinkClick = (e: Event) => {
        const target = e.target as HTMLElement;
        
        // Handle note links
        if (target.closest('a[href^="note://"]')) {
          e.preventDefault();
          const link = target.closest('a') as HTMLAnchorElement;
          const noteId = link.href.replace('note://', '');
          if (noteId) {
            onSelectNote(noteId);
          }
        }
        
        // Handle heading anchor links
        if (target.classList.contains('heading-anchor')) {
          e.preventDefault();
          const href = target.getAttribute('href');
          if (href && href.startsWith('#')) {
            scrollToHeading(href.substring(1));
          }
        }
      };

      previewRef.current.addEventListener('click', handleLinkClick);
      return () => {
        previewRef.current?.removeEventListener('click', handleLinkClick);
      };
    }
  }, [onSelectNote, note]);

  const scrollToHeading = (headingId: string) => {
    if (!contentAreaRef.current) return;

    // Use a small delay to ensure the DOM is fully rendered
    setTimeout(() => {
      const element = document.getElementById(headingId);
      if (element && contentAreaRef.current) {
        // Get the bounding rectangles
        const containerRect = contentAreaRef.current.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        
        // Calculate the scroll position
        const currentScrollTop = contentAreaRef.current.scrollTop;
        const elementTop = elementRect.top - containerRect.top + currentScrollTop;
        const targetScrollTop = elementTop - 20; // 20px offset from top

        // Smooth scroll to the target position
        contentAreaRef.current.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior: 'smooth'
        });

        // Add highlight effect
        element.style.transition = 'background-color 0.3s ease';
        element.style.backgroundColor = 'rgb(254 240 138)'; // yellow-200
        element.style.borderRadius = '0.375rem';
        element.style.padding = '0.5rem';
        element.style.margin = '-0.5rem';

        // Remove highlight after 2 seconds
        setTimeout(() => {
          element.style.backgroundColor = '';
          element.style.borderRadius = '';
          element.style.padding = '';
          element.style.margin = '';
        }, 2000);
      }
    }, 50);
  };

  const handleTocClick = (headingId: string) => {
    scrollToHeading(headingId);
  };

  const handleSave = () => {
    if (note && (title !== note.title || content !== note.content)) {
      onUpdateNote(note.id, { title: title.trim(), content });
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'e') {
        e.preventDefault();
        setIsEditing(!isEditing);
      }
    }
  };

  const handleDelete = () => {
    if (note && window.confirm('Are you sure you want to delete this note?')) {
      onDeleteNote(note.id);
    }
  };

  if (!note) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-dark-900 transition-colors">
        <div className="text-center">
          <Edit3 className="mx-auto mb-4 text-gray-400 dark:text-dark-500" size={48} />
          <h2 className="text-xl font-semibold text-gray-600 dark:text-dark-400 mb-2">No note selected</h2>
          <p className="text-gray-500 dark:text-dark-500">Select a note from the sidebar or create a new one</p>
        </div>
      </div>
    );
  }

  const tableOfContents = generateTableOfContents(content);
  const [renderedContent, setRenderedContent] = useState('');

  useEffect(() => {
    let cancelled = false;
    const render = async () => {
      const html = await Promise.resolve(renderMarkdown(processGitHubMarkdown(content), notes));
      if (!cancelled) setRenderedContent(html);
    };
    render();
    return () => { cancelled = true; };
  }, [content, notes]);

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-dark-800 h-full transition-colors">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b border-gray-200 dark:border-dark-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`p-2 rounded-lg transition-colors ${
                isEditing 
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                  : 'text-gray-600 dark:text-dark-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-700'
              }`}
              title={isEditing ? 'Switch to preview' : 'Edit note'}
            >
              {isEditing ? <Eye size={18} /> : <Edit3 size={18} />}
            </button>
            
            {!isEditing && tableOfContents.length > 0 && (
              <button
                onClick={() => setShowToc(!showToc)}
                className={`p-2 rounded-lg transition-colors ${
                  showToc
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                    : 'text-gray-600 dark:text-dark-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-700'
                }`}
                title="Toggle table of contents"
              >
                <BookOpen size={18} />
              </button>
            )}
            
            <div className="text-sm text-gray-500 dark:text-dark-500 flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Calendar size={14} />
                <span>Updated {note.updatedAt.toLocaleDateString()}</span>
              </div>
              {note.tags.length > 0 && (
                <div className="flex items-center gap-1">
                  <Hash size={14} />
                  <span>{note.tags.length} tags</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={handleDelete}
            className="p-2 text-gray-600 dark:text-dark-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="Delete note"
          >
            <Trash2 size={18} />
          </button>
        </div>
        
        {isEditing ? (
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="text-2xl font-bold w-full bg-transparent border-none outline-none focus:ring-0 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-dark-400"
            placeholder="Note title..."
          />
        ) : (
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{note.title}</h1>
        )}
        
        {note.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {note.tags.map(tag => (
              <span
                key={tag}
                className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-sm rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Table of Contents Sidebar */}
        {!isEditing && showToc && tableOfContents.length > 0 && (
          <div className="w-64 bg-gray-50 dark:bg-dark-900 border-r border-gray-200 dark:border-dark-700 overflow-y-auto">
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <BookOpen size={16} />
                Table of Contents
              </h3>
              <nav className="space-y-1">
                {tableOfContents.map((heading, index) => (
                  <button
                    key={`${heading.id}-${index}`}
                    onClick={() => handleTocClick(heading.id)}
                    className={`toc-item block w-full text-left py-2 px-3 text-sm text-gray-600 dark:text-dark-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-700 rounded transition-all duration-200 ${
                      heading.level === 1 ? 'font-semibold' : ''
                    }`}
                    style={{ 
                      paddingLeft: `${12 + (heading.level - 1) * 16}px`,
                      fontSize: heading.level === 1 ? '0.875rem' : heading.level === 2 ? '0.8125rem' : '0.75rem'
                    }}
                    title={heading.text}
                  >
                    <span className="truncate block">{heading.text}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>
        )}

        {/* Main Content */}
        {isEditing ? (
          /* Edit Mode - Textarea fills remaining space */
          <div className="flex-1 flex flex-col">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              className="flex-1 w-full p-6 resize-none border-none outline-none focus:ring-0 text-gray-900 dark:text-gray-100 bg-white dark:bg-dark-800 leading-relaxed placeholder-gray-500 dark:placeholder-dark-400 font-mono"
              placeholder="Start writing your note in Markdown..."
            />
          </div>
        ) : (
          /* View Mode - Markdown rendered content */
          <div 
            ref={contentAreaRef}
            className="flex-1 overflow-y-auto scroll-smooth"
          >
            <div className="p-6">
              <div
                ref={previewRef}
                className="prose prose-lg max-w-none markdown-content"
                dangerouslySetInnerHTML={{
                  __html: renderedContent
                }}
                style={{
                  // Custom CSS for better markdown rendering
                  lineHeight: '1.7',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Help text - Fixed at bottom */}
      {isEditing && (
        <div className="flex-shrink-0 px-6 py-3 bg-gray-50 dark:bg-dark-700 border-t border-gray-200 dark:border-dark-600 text-sm text-gray-600 dark:text-dark-400 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span>**bold** • *italic* • `code` • # heading</span>
              <span>[[Note Title]] for links • #tag for tags</span>
            </div>
            <div>
              Ctrl+Enter to save • Ctrl+E to toggle edit
            </div>
          </div>
        </div>
      )}
    </div>
  );
};