import React from 'react';
import { Link, Tag, Calendar, FileText, ArrowRight, ArrowLeft } from 'lucide-react';
import { Note } from '../types';
import { getBacklinks } from '../utils/noteUtils';
import { toDateString } from '../utils/dateUtils';

interface MetadataPanelProps {
  note: Note | null;
  notes: Note[];
  onSelectNote: (noteId: string) => void;
}

export const MetadataPanel: React.FC<MetadataPanelProps> = ({
  note,
  notes,
  onSelectNote
}) => {
  if (!note) {
    return (
      <div className="w-72 bg-gray-50 dark:bg-dark-900 border-l border-gray-200 dark:border-dark-700 flex flex-col h-full transition-colors">
        <div className="p-4 border-b border-gray-200 dark:border-dark-700">
          <h2 className="font-semibold text-gray-900 dark:text-white">Note Details</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500 dark:text-dark-500">
            <FileText size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">Select a note to view details</p>
          </div>
        </div>
      </div>
    );
  }

  const backlinks = getBacklinks(note.id, notes);
  const linkedNotes = note.links.map(linkId => notes.find(n => n.id === linkId)).filter(Boolean) as Note[];

  return (
    <div className="w-72 bg-gray-50 dark:bg-dark-900 border-l border-gray-200 dark:border-dark-700 flex flex-col h-full transition-colors">
      <div className="p-4 border-b border-gray-200 dark:border-dark-700">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Note Details</h2>
        
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="text-center p-3 bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-100 dark:border-dark-700">
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{linkedNotes.length}</div>
            <div className="text-xs text-gray-600 dark:text-dark-400">Outgoing Links</div>
          </div>
          <div className="text-center p-3 bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-100 dark:border-dark-700">
            <div className="text-lg font-bold text-green-600 dark:text-green-400">{backlinks.length}</div>
            <div className="text-xs text-gray-600 dark:text-dark-400">Backlinks</div>
          </div>
        </div>

        {/* Creation info */}
        <div className="space-y-2 text-sm text-gray-600 dark:text-dark-400">
          <div className="flex items-center gap-2">
            <Calendar size={14} />
            <span>Created: {toDateString(note.createdAt)}</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText size={14} />
            <span>Words: {note.content.split(/\s+/).filter(Boolean).length}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Tags */}
        {note.tags.length > 0 && (
          <div className="p-4 border-b border-gray-200 dark:border-dark-700">
            <div className="flex items-center gap-2 mb-3">
              <Tag size={16} className="text-gray-600 dark:text-dark-400" />
              <h3 className="font-medium text-gray-900 dark:text-white">Tags</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {note.tags.map(tag => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-sm rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Outgoing links */}
        <div className="p-4 border-b border-gray-200 dark:border-dark-700">
          <div className="flex items-center gap-2 mb-3">
            <ArrowRight size={16} className="text-blue-600 dark:text-blue-400" />
            <h3 className="font-medium text-gray-900 dark:text-white">Links to ({linkedNotes.length})</h3>
          </div>
          {linkedNotes.length > 0 ? (
            <div className="space-y-2">
              {linkedNotes.map(linkedNote => (
                <button
                  key={linkedNote.id}
                  onClick={() => onSelectNote(linkedNote.id)}
                  className="w-full text-left p-3 text-sm bg-white dark:bg-dark-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-800 border border-gray-200 dark:border-dark-700 rounded-lg transition-all duration-200 group"
                >
                  <div className="font-medium text-gray-900 dark:text-white mb-1 group-hover:text-blue-700 dark:group-hover:text-blue-300">
                    {linkedNote.title}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-dark-500 line-clamp-2">
                    {linkedNote.content.slice(0, 80)}...
                  </div>
                  <div className="text-xs text-gray-400 dark:text-dark-600 mt-1">
                    {toDateString(linkedNote.updatedAt)}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500 dark:text-dark-500">
              <ArrowRight size={24} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No outgoing links</p>
              <p className="text-xs mt-1">Use [[Note Title]] to link notes</p>
            </div>
          )}
        </div>

        {/* Backlinks */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <ArrowLeft size={16} className="text-green-600 dark:text-green-400" />
            <h3 className="font-medium text-gray-900 dark:text-white">Backlinks ({backlinks.length})</h3>
          </div>
          {backlinks.length > 0 ? (
            <div className="space-y-2">
              {backlinks.map(backlink => (
                <button
                  key={backlink.id}
                  onClick={() => onSelectNote(backlink.id)}
                  className="w-full text-left p-3 text-sm bg-white dark:bg-dark-800 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-200 dark:hover:border-green-800 border border-gray-200 dark:border-dark-700 rounded-lg transition-all duration-200 group"
                >
                  <div className="font-medium text-gray-900 dark:text-white mb-1 group-hover:text-green-700 dark:group-hover:text-green-300">
                    {backlink.title}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-dark-500 line-clamp-2">
                    {backlink.content.slice(0, 80)}...
                  </div>
                  <div className="text-xs text-gray-400 dark:text-dark-600 mt-1">
                    {toDateString(backlink.updatedAt)}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500 dark:text-dark-500">
              <ArrowLeft size={24} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No backlinks</p>
              <p className="text-xs mt-1">Other notes don't link here yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};