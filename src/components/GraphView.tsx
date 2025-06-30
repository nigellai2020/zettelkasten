import React, { useEffect, useRef, useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Note, GraphNode, GraphLink } from '../types';

interface GraphViewProps {
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (noteId: string) => void;
  onClose: () => void;
}

export const GraphView: React.FC<GraphViewProps> = ({
  notes,
  selectedNoteId,
  onSelectNote,
  onClose
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);

  useEffect(() => {
    // Create nodes and links from notes
    const graphNodes: GraphNode[] = notes.map((note, index) => ({
      id: note.id,
      title: note.title,
      x: Math.cos(index * 2 * Math.PI / notes.length) * 200 + 400,
      y: Math.sin(index * 2 * Math.PI / notes.length) * 200 + 300
    }));

    const graphLinks: GraphLink[] = [];
    notes.forEach(note => {
      note.links.forEach(linkId => {
        if (notes.find(n => n.id === linkId)) {
          graphLinks.push({
            source: note.id,
            target: linkId
          });
        }
      });
    });

    setNodes(graphNodes);
    setLinks(graphLinks);
  }, [notes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Clear canvas with dark mode support
    const isDark = document.documentElement.classList.contains('dark');
    ctx.fillStyle = isDark ? '#0f172a' : '#ffffff';
    ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

    // Apply transformations
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw links
    ctx.strokeStyle = isDark ? '#475569' : '#d1d5db';
    ctx.lineWidth = 1;
    links.forEach(link => {
      const sourceNode = nodes.find(n => n.id === link.source);
      const targetNode = nodes.find(n => n.id === link.target);
      
      if (sourceNode && targetNode && sourceNode.x !== undefined && sourceNode.y !== undefined && targetNode.x !== undefined && targetNode.y !== undefined) {
        ctx.beginPath();
        ctx.moveTo(sourceNode.x, sourceNode.y);
        ctx.lineTo(targetNode.x, targetNode.y);
        ctx.stroke();
      }
    });

    // Draw nodes
    nodes.forEach(node => {
      if (node.x === undefined || node.y === undefined) return;

      const isSelected = node.id === selectedNoteId;
      const radius = isSelected ? 8 : 6;
      
      // Node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = isSelected ? '#2563eb' : (isDark ? '#94a3b8' : '#6b7280');
      ctx.fill();
      ctx.strokeStyle = isDark ? '#0f172a' : '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Node label
      ctx.fillStyle = isDark ? '#f1f5f9' : '#374151';
      ctx.font = '12px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        node.title.length > 20 ? node.title.slice(0, 20) + '...' : node.title,
        node.x,
        node.y + radius + 16
      );
    });

    ctx.restore();
  }, [nodes, links, selectedNoteId, zoom, pan]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Transform coordinates to canvas space
    const canvasX = (x - pan.x) / zoom;
    const canvasY = (y - pan.y) / zoom;

    // Check if clicking on a node
    const clickedNode = nodes.find(node => {
      if (node.x === undefined || node.y === undefined) return false;
      const distance = Math.sqrt(Math.pow(canvasX - node.x, 2) + Math.pow(canvasY - node.y, 2));
      return distance <= 12;
    });

    if (clickedNode) {
      onSelectNote(clickedNode.id);
    } else {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.1, Math.min(3, prev * delta)));
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white dark:bg-dark-800 rounded-lg w-full h-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 dark:border-dark-700 transition-colors animate-slide-in">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-dark-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Knowledge Graph</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoom(prev => Math.min(3, prev * 1.2))}
              className="p-2 text-gray-600 dark:text-dark-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
              title="Zoom in"
            >
              <ZoomIn size={18} />
            </button>
            <button
              onClick={() => setZoom(prev => Math.max(0.1, prev * 0.8))}
              className="p-2 text-gray-600 dark:text-dark-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
              title="Zoom out"
            >
              <ZoomOut size={18} />
            </button>
            <button
              onClick={resetView}
              className="p-2 text-gray-600 dark:text-dark-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
              title="Reset view"
            >
              <RotateCcw size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 dark:text-dark-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative overflow-hidden">
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          />
          
          {/* Instructions */}
          <div className="absolute bottom-4 left-4 bg-white dark:bg-dark-800 bg-opacity-90 dark:bg-opacity-90 p-3 rounded-lg text-sm text-gray-600 dark:text-dark-400 border border-gray-200 dark:border-dark-700 shadow-lg">
            <div>Click nodes to select • Drag to pan • Scroll to zoom</div>
            <div className="text-xs mt-1">{nodes.length} notes, {links.length} connections</div>
          </div>
        </div>
      </div>
    </div>
  );
};