import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, FileText, Tag, Hash, Calendar, ArrowRight, TreePine } from 'lucide-react';
import { Note } from '../types';
import { toDateString } from '../utils/dateUtils';

interface TreeViewProps {
  notes: Note[];
  onSelectNote: (noteId: string) => void;
}

interface TreeNode {
  id: string;
  type: 'tag' | 'note' | 'date';
  title: string;
  children: TreeNode[];
  note?: Note;
  count?: number;
}

export const TreeView: React.FC<TreeViewProps> = ({ notes, onSelectNote }) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['tags', 'recent']));
  const [selectedGrouping, setSelectedGrouping] = useState<'tags' | 'dates' | 'connections'>('tags');

  const treeData = useMemo(() => {
    const root: TreeNode[] = [];

    if (selectedGrouping === 'tags') {
      // Group by tags
      const tagGroups = new Map<string, Note[]>();
      const untaggedNotes: Note[] = [];

      notes.forEach(note => {
        if (note.tags.length === 0) {
          untaggedNotes.push(note);
        } else {
          note.tags.forEach(tag => {
            if (!tagGroups.has(tag)) {
              tagGroups.set(tag, []);
            }
            tagGroups.get(tag)!.push(note);
          });
        }
      });

      // Create tag nodes
      const tagNodes: TreeNode[] = Array.from(tagGroups.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([tag, tagNotes]) => ({
          id: `tag-${tag}`,
          type: 'tag',
          title: tag,
          count: tagNotes.length,
          children: tagNotes
            .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
            .map(note => ({
              id: `note-${note.id}`,
              type: 'note',
              title: note.title,
              children: [],
              note
            }))
        }));

      if (tagNodes.length > 0) {
        root.push({
          id: 'tags',
          type: 'tag',
          title: 'Tagged Notes',
          count: tagGroups.size,
          children: tagNodes
        });
      }

      // Add untagged notes
      if (untaggedNotes.length > 0) {
        root.push({
          id: 'untagged',
          type: 'tag',
          title: 'Untagged Notes',
          count: untaggedNotes.length,
          children: untaggedNotes
            .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
            .map(note => ({
              id: `note-${note.id}`,
              type: 'note',
              title: note.title,
              children: [],
              note
            }))
        });
      }
    } else if (selectedGrouping === 'dates') {
      // Group by creation date
      const dateGroups = new Map<string, Note[]>();

      notes.forEach(note => {
        const dateKey = note.createdAt.toDateString();
        if (!dateGroups.has(dateKey)) {
          dateGroups.set(dateKey, []);
        }
        dateGroups.get(dateKey)!.push(note);
      });

      const dateNodes: TreeNode[] = Array.from(dateGroups.entries())
        .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
        .map(([date, dateNotes]) => ({
          id: `date-${date}`,
          type: 'date',
          title: toDateString(date),
          count: dateNotes.length,
          children: dateNotes
            .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
            .map(note => ({
              id: `note-${note.id}`,
              type: 'note',
              title: note.title,
              children: [],
              note
            }))
        }));

      root.push({
        id: 'dates',
        type: 'date',
        title: 'By Creation Date',
        count: dateGroups.size,
        children: dateNodes
      });
    } else if (selectedGrouping === 'connections') {
      // Group by connection count
      const connectionGroups = new Map<string, Note[]>();
      
      notes.forEach(note => {
        const connectionCount = note.links.length;
        const backlinks = notes.filter(n => n.links.includes(note.id)).length;
        const totalConnections = connectionCount + backlinks;
        
        let group = 'Isolated (0 connections)';
        if (totalConnections >= 5) group = 'Highly Connected (5+ connections)';
        else if (totalConnections >= 3) group = 'Well Connected (3-4 connections)';
        else if (totalConnections >= 1) group = 'Connected (1-2 connections)';
        
        if (!connectionGroups.has(group)) {
          connectionGroups.set(group, []);
        }
        connectionGroups.get(group)!.push(note);
      });

      const connectionOrder = [
        'Highly Connected (5+ connections)',
        'Well Connected (3-4 connections)', 
        'Connected (1-2 connections)',
        'Isolated (0 connections)'
      ];

      const connectionNodes: TreeNode[] = connectionOrder
        .filter(group => connectionGroups.has(group))
        .map(group => ({
          id: `connection-${group}`,
          type: 'tag',
          title: group,
          count: connectionGroups.get(group)!.length,
          children: connectionGroups.get(group)!
            .sort((a, b) => {
              const aConnections = a.links.length + notes.filter(n => n.links.includes(a.id)).length;
              const bConnections = b.links.length + notes.filter(n => n.links.includes(b.id)).length;
              return bConnections - aConnections;
            })
            .map(note => ({
              id: `note-${note.id}`,
              type: 'note',
              title: note.title,
              children: [],
              note
            }))
        }));

      root.push({
        id: 'connections',
        type: 'tag',
        title: 'By Connections',
        count: connectionGroups.size,
        children: connectionNodes
      });
    }

    return root;
  }, [notes, selectedGrouping]);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const renderNode = (node: TreeNode, depth: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;
    const paddingLeft = depth * 24;

    return (
      <div key={node.id} className="select-none">
        <div
          className={`flex items-center gap-2 py-2 px-3 hover:bg-gray-50 dark:hover:bg-dark-700 rounded-lg cursor-pointer transition-colors ${
            node.type === 'note' ? 'hover:bg-blue-50 dark:hover:bg-blue-900/20' : ''
          }`}
          style={{ paddingLeft: `${paddingLeft + 12}px` }}
          onClick={() => {
            if (node.type === 'note' && node.note) {
              onSelectNote(node.note.id);
            } else if (hasChildren) {
              toggleNode(node.id);
            }
          }}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node.id);
              }}
              className="p-0.5 hover:bg-gray-200 dark:hover:bg-dark-600 rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronDown size={16} className="text-gray-600 dark:text-dark-400" />
              ) : (
                <ChevronRight size={16} className="text-gray-600 dark:text-dark-400" />
              )}
            </button>
          )}
          
          {!hasChildren && <div className="w-5" />}
          
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {node.type === 'tag' && <Tag size={16} className="text-green-600 dark:text-green-400 flex-shrink-0" />}
            {node.type === 'date' && <Calendar size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />}
            {node.type === 'note' && <FileText size={16} className="text-gray-600 dark:text-dark-400 flex-shrink-0" />}
            
            <span className={`truncate ${
              node.type === 'note' 
                ? 'text-gray-900 dark:text-white font-medium' 
                : 'text-gray-700 dark:text-dark-300 font-semibold'
            }`}>
              {node.type === 'tag' && selectedGrouping === 'tags' ? `#${node.title}` : node.title}
            </span>
            
            {node.count !== undefined && (
              <span className="text-xs text-gray-500 dark:text-dark-500 bg-gray-100 dark:bg-dark-600 px-2 py-0.5 rounded-full flex-shrink-0">
                {node.count}
              </span>
            )}
          </div>

          {node.type === 'note' && node.note && (
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-dark-500">
              {node.note.links.length > 0 && (
                <div className="flex items-center gap-1">
                  <ArrowRight size={12} />
                  <span>{node.note.links.length}</span>
                </div>
              )}
              <span>{toDateString(node.note.updatedAt)}</span>
            </div>
          )}
        </div>
        
        {isExpanded && hasChildren && (
          <div className="ml-2">
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 bg-gray-50 dark:bg-dark-900 flex flex-col h-full transition-colors">
      {/* Header */}
      <div className="bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-dark-700 p-6 transition-colors">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Semantic Tree</h2>
            <p className="text-gray-600 dark:text-dark-400 mt-1">Explore your knowledge structure</p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedGrouping('tags')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedGrouping === 'tags'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  : 'text-gray-600 dark:text-dark-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-700'
              }`}
            >
              <Hash size={16} className="inline mr-2" />
              By Tags
            </button>
            <button
              onClick={() => setSelectedGrouping('dates')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedGrouping === 'dates'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-dark-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-700'
              }`}
            >
              <Calendar size={16} className="inline mr-2" />
              By Date
            </button>
            <button
              onClick={() => setSelectedGrouping('connections')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedGrouping === 'connections'
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                  : 'text-gray-600 dark:text-dark-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-700'
              }`}
            >
              <ArrowRight size={16} className="inline mr-2" />
              By Connections
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-dark-400">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Categories</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>Groups</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-gray-500 dark:bg-dark-500 rounded-full"></div>
            <span>Notes</span>
          </div>
        </div>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-700 p-4 transition-colors">
          {treeData.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-dark-500">
              <TreePine size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No notes to display</p>
              <p className="text-sm">Create some notes to see the semantic tree</p>
            </div>
          ) : (
            <div className="space-y-1">
              {treeData.map(node => renderNode(node))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};