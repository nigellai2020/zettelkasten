import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Play, Pause, Settings, ChevronDown, ChevronRight, Tag, FileText } from 'lucide-react';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import { Note } from '../types';

interface GraphNode {
  id: string;
  title: string;
  content: string;
  tags: string[];
  links: string[];
  color?: string;
  group?: number;
  val?: number; // Size of the node
  fx?: number; // Fixed position x
  fy?: number; // Fixed position y
  fz?: number; // Fixed position z
  x?: number; // Current position x
  y?: number; // Current position y
  z?: number; // Current position z
}

interface GraphLink {
  source: string;
  target: string;
  strength?: number;
  color?: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

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
  const fgRef = useRef<any>();
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [isAnimating, setIsAnimating] = useState(true);
  const [showTreeView, setShowTreeView] = useState(true);
  const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set());
  const [localSelectedNodeId, setLocalSelectedNodeId] = useState<string | null>(selectedNoteId);
  const [settings, setSettings] = useState({
    nodeRelSize: 6,
    linkWidth: 2,
    linkOpacity: 0.6,
    showLabels: true,
    enablePhysics: true,
    backgroundColor: '#0a0a0a',
    nodeColorScheme: 'category',
    labelMaxLength: 20
  });

  // Generate colors for different tag groups
  const getNodeColor = useCallback((node: GraphNode) => {
    const currentSelectedId = localSelectedNodeId || selectedNoteId;
    if (node.id === currentSelectedId) return '#ff6b6b';
    
    if (settings.nodeColorScheme === 'category') {
      const mainTag = node.tags[0];
      if (!mainTag) return '#74b9ff';
      
      // Generate color based on tag hash
      const hash = mainTag.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      
      const colors = ['#74b9ff', '#0984e3', '#6c5ce7', '#a29bfe', '#fd79a8', '#e84393', '#00b894', '#00cec9', '#fdcb6e', '#e17055'];
      return colors[Math.abs(hash) % colors.length];
    }
    
    return '#74b9ff';
  }, [localSelectedNodeId, selectedNoteId, settings.nodeColorScheme]);

  // Calculate node value based on connections and content
  const getNodeValue = useCallback((note: Note, allNotes: Note[]) => {
    const connections = note.links.length + allNotes.filter(n => n.links.includes(note.id)).length;
    const contentWeight = Math.min(note.content.length / 100, 5);
    const tagWeight = note.tags.length * 0.5;
    return Math.max(3, connections * 2 + contentWeight + tagWeight);
  }, []);

  // Calculate link strength based on relationship type
  const getLinkStrength = useCallback((sourceNote: Note, targetNote: Note) => {
    const commonTags = sourceNote.tags.filter(tag => targetNote.tags.includes(tag));
    const baseStrength = 1;
    const tagBonus = commonTags.length * 0.5;
    return baseStrength + tagBonus;
  }, []);

  // Get tag color (same as node color logic)
  const getTagColor = useCallback((tag: string) => {
    const hash = tag.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const colors = ['#74b9ff', '#0984e3', '#6c5ce7', '#a29bfe', '#fd79a8', '#e84393', '#00b894', '#00cec9', '#fdcb6e', '#e17055'];
    return colors[Math.abs(hash) % colors.length];
  }, []);

  // Organize notes by tags for tree view
  const organizeNotesByTags = useCallback(() => {
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

    // Sort tags by note count (descending)
    const sortedTags = Array.from(tagGroups.entries())
      .sort(([, notesA], [, notesB]) => notesB.length - notesA.length);

    return { sortedTags, untaggedNotes };
  }, [notes]);

  // Handle tree navigation
  const handleTreeNodeClick = useCallback((noteId: string) => {
    // Focus on the node in 3D space without calling onSelectNote (which closes the graph)
    if (fgRef.current) {
      const nodeObj = graphData.nodes.find((n: any) => n.id === noteId);
      if (nodeObj) {
        // Focus camera on the node
        const distance = 200;
        const distRatio = 1 + distance / Math.hypot(nodeObj.x || 0, nodeObj.y || 0, nodeObj.z || 0);
        
        fgRef.current.cameraPosition(
          { 
            x: (nodeObj.x || 0) * distRatio, 
            y: (nodeObj.y || 0) * distRatio, 
            z: (nodeObj.z || 0) * distRatio 
          },
          nodeObj,
          2000
        );
        
        // Update local selection state for highlighting (don't call onSelectNote)
        setLocalSelectedNodeId(noteId);
      }
    }
  }, [graphData.nodes]);

  // Toggle tag expansion
  const toggleTagExpansion = useCallback((tag: string) => {
    setExpandedTags(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tag)) {
        newSet.delete(tag);
      } else {
        newSet.add(tag);
      }
      return newSet;
    });
  }, []);

  // Sync local selection with external selection
  useEffect(() => {
    setLocalSelectedNodeId(selectedNoteId);
  }, [selectedNoteId]);

  useEffect(() => {
    // Create sophisticated graph data
    const nodes: GraphNode[] = notes.map(note => ({
      id: note.id,
      title: note.title,
      content: note.content,
      tags: note.tags,
      links: note.links,
      val: getNodeValue(note, notes),
      group: note.tags.length > 0 ? note.tags[0].length : 0,
      color: getNodeColor({
        id: note.id,
        title: note.title,
        content: note.content,
        tags: note.tags,
        links: note.links
      })
    }));

    const links: GraphLink[] = [];
    const processedPairs = new Set<string>();

    notes.forEach(note => {
      note.links.forEach(linkId => {
        const targetNote = notes.find(n => n.id === linkId);
        if (targetNote) {
          const pairKey = [note.id, linkId].sort().join('-');
          if (!processedPairs.has(pairKey)) {
            processedPairs.add(pairKey);
            links.push({
              source: note.id,
              target: linkId,
              strength: getLinkStrength(note, targetNote),
              color: `rgba(116, 185, 255, ${settings.linkOpacity})`
            });
          }
        }
      });
    });

    setGraphData({ nodes, links });
  }, [notes, getNodeValue, getNodeColor, getLinkStrength, settings.linkOpacity]);

  // Handle node click
  const handleNodeClick = useCallback((node: any) => {
    onSelectNote(node.id);
    
    // Animate camera to focus on node
    if (fgRef.current) {
      const distance = 200;
      const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);
      
      fgRef.current.cameraPosition(
        { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
        node,
        3000
      );
    }
  }, [onSelectNote]);

  // Handle node hover
  const handleNodeHover = useCallback((node: any) => {
    if (fgRef.current) {
      fgRef.current.renderer().domElement.style.cursor = node ? 'pointer' : null;
    }
  }, []);

  // Custom node rendering with labels for 3D
  const renderNode3D = useCallback((node: any) => {
    const currentSelectedId = localSelectedNodeId || selectedNoteId;
    const nodeGeometry = new THREE.SphereGeometry(node.val || 4, 16, 16);
    const nodeMaterial = new THREE.MeshLambertMaterial({ 
      color: node.color || '#74b9ff',
      transparent: true,
      opacity: node.id === currentSelectedId ? 1 : 0.8
    });
    const sphere = new THREE.Mesh(nodeGeometry, nodeMaterial);
    
    // Add selection ring for selected nodes
    if (node.id === currentSelectedId) {
      const ringGeometry = new THREE.RingGeometry((node.val || 4) + 1, (node.val || 4) + 3, 32);
      const ringMaterial = new THREE.MeshBasicMaterial({ 
        color: '#ffffff', 
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.lookAt(new THREE.Vector3(0, 0, 1));
      sphere.add(ring);
    }
    
    // Add text label if enabled
    if (settings.showLabels && node.title) {
      const truncatedLabel = node.title.length > settings.labelMaxLength 
        ? node.title.substring(0, settings.labelMaxLength) + '...' 
        : node.title;
        
      // Create canvas for text
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      const fontSize = 24;
      canvas.width = 256;
      canvas.height = 64;
      
      if (context) {
        context.fillStyle = 'rgba(0, 0, 0, 0.8)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        context.font = `${fontSize}px Arial`;
        context.fillStyle = node.id === currentSelectedId ? '#ffffff' : '#e5e5e5';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(truncatedLabel, canvas.width / 2, canvas.height / 2);
        
        // Create texture and material
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(20, 5, 1);
        sprite.position.set(0, (node.val || 4) + 8, 0);
        sphere.add(sprite);
      }
    }
    
    return sphere;
  }, [localSelectedNodeId, selectedNoteId, settings.showLabels, settings.labelMaxLength]);

  // Toggle animation
  const toggleAnimation = useCallback(() => {
    setIsAnimating(prev => {
      const newState = !prev;
      if (fgRef.current) {
        if (newState) {
          fgRef.current.resumeAnimation();
        } else {
          fgRef.current.pauseAnimation();
        }
      }
      return newState;
    });
  }, []);

  // Reset camera
  const resetCamera = useCallback(() => {
    if (fgRef.current) {
      fgRef.current.cameraPosition({ x: 0, y: 0, z: 300 }, { x: 0, y: 0, z: 0 }, 2000);
    }
  }, []);

  // Zoom functions
  const zoomIn = useCallback(() => {
    if (fgRef.current) {
      const camera = fgRef.current.camera();
      const currentPos = camera.position;
      const factor = 0.8;
      fgRef.current.cameraPosition({
        x: currentPos.x * factor,
        y: currentPos.y * factor,
        z: currentPos.z * factor
      }, undefined, 1000);
    }
  }, []);

  const zoomOut = useCallback(() => {
    if (fgRef.current) {
      const camera = fgRef.current.camera();
      const currentPos = camera.position;
      const factor = 1.25;
      fgRef.current.cameraPosition({
        x: currentPos.x * factor,
        y: currentPos.y * factor,
        z: currentPos.z * factor
      }, undefined, 1000);
    }
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg w-full h-full max-w-7xl max-h-[95vh] flex flex-col shadow-2xl border border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between bg-gray-800">
          <div>
            <h2 className="text-xl font-bold text-white">3D Knowledge Graph</h2>
            <p className="text-sm text-gray-400">
              {graphData.nodes.length} notes • {graphData.links.length} connections
              {settings.showLabels && (
                <span className="ml-2 px-2 py-1 bg-blue-600 bg-opacity-20 text-blue-300 rounded text-xs">
                  Labels: {settings.labelMaxLength} chars
                </span>
              )}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Animation Controls */}
            <button
              onClick={toggleAnimation}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              title={isAnimating ? "Pause animation" : "Resume animation"}
            >
              {isAnimating ? <Pause size={18} /> : <Play size={18} />}
            </button>
            
            {/* Zoom Controls */}
            <button
              onClick={zoomIn}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              title="Zoom in"
            >
              <ZoomIn size={18} />
            </button>
            <button
              onClick={zoomOut}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              title="Zoom out"
            >
              <ZoomOut size={18} />
            </button>
            <button
              onClick={resetCamera}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              title="Reset view"
            >
              <RotateCcw size={18} />
            </button>
            
            {/* Settings */}
            <div className="relative group">
              <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
                <Settings size={18} />
              </button>
              
              {/* Settings Panel */}
              <div className="absolute right-0 top-full mt-2 w-64 bg-gray-800 rounded-lg shadow-xl border border-gray-600 p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <h3 className="text-white font-semibold mb-3">Visualization Settings</h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Node Size</label>
                    <input
                      type="range"
                      min="2"
                      max="12"
                      value={settings.nodeRelSize}
                      onChange={(e) => setSettings(prev => ({ ...prev, nodeRelSize: parseInt(e.target.value) }))}
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Link Width</label>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="0.5"
                      value={settings.linkWidth}
                      onChange={(e) => setSettings(prev => ({ ...prev, linkWidth: parseFloat(e.target.value) }))}
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Link Opacity</label>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.1"
                      value={settings.linkOpacity}
                      onChange={(e) => setSettings(prev => ({ ...prev, linkOpacity: parseFloat(e.target.value) }))}
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <label className="flex items-center text-xs text-gray-400">
                      <input
                        type="checkbox"
                        checked={settings.showLabels}
                        onChange={(e) => setSettings(prev => ({ ...prev, showLabels: e.target.checked }))}
                        className="mr-2"
                      />
                      Show Node Labels
                    </label>
                  </div>
                  
                  {settings.showLabels && (
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Label Length</label>
                      <input
                        type="range"
                        min="10"
                        max="50"
                        value={settings.labelMaxLength}
                        onChange={(e) => setSettings(prev => ({ ...prev, labelMaxLength: parseInt(e.target.value) }))}
                        className="w-full"
                      />
                      <div className="text-xs text-gray-500 mt-1">{settings.labelMaxLength} chars</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 3D Graph */}
        <div className="flex-1 relative flex">
          {/* Tree View Sidebar */}
          {showTreeView && (
            <div className="w-80 bg-gray-850 border-r border-gray-700 flex flex-col h-full">
              <div className="p-3 border-b border-gray-700 bg-gray-800 flex-shrink-0">
                <h3 className="text-white font-semibold text-sm flex items-center">
                  <Tag size={16} className="mr-2" />
                  Navigation Tree
                </h3>
                <p className="text-xs text-gray-400 mt-1">Click notes to focus in 3D</p>
              </div>
              
              <div className="flex-1 overflow-y-auto overflow-x-hidden p-2" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                {(() => {
                  const { sortedTags, untaggedNotes } = organizeNotesByTags();
                  
                  return (
                    <div className="space-y-1">
                      {/* Tagged Notes */}
                      {sortedTags.map(([tag, tagNotes]) => (
                        <div key={tag} className="select-none">
                          <button
                            onClick={() => toggleTagExpansion(tag)}
                            className="w-full flex items-center p-2 rounded hover:bg-gray-700 text-left group transition-colors"
                          >
                            {expandedTags.has(tag) ? (
                              <ChevronDown size={14} className="mr-2 text-gray-400" />
                            ) : (
                              <ChevronRight size={14} className="mr-2 text-gray-400" />
                            )}
                            <div
                              className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                              style={{ backgroundColor: getTagColor(tag) }}
                            />
                            <span className="text-white text-sm font-medium truncate flex-1">
                              {tag}
                            </span>
                            <span className="text-xs text-gray-400 ml-2">
                              {tagNotes.length}
                            </span>
                          </button>
                          
                          {expandedTags.has(tag) && (
                            <div className="ml-8 mt-1 space-y-1">
                              {tagNotes.map(note => (
                                <button
                                  key={note.id}
                                  onClick={() => handleTreeNodeClick(note.id)}
                                  className={`w-full flex items-center p-2 rounded text-left transition-colors group ${
                                    note.id === (localSelectedNodeId || selectedNoteId)
                                      ? 'bg-blue-600 bg-opacity-20 border border-blue-500 border-opacity-30' 
                                      : 'hover:bg-gray-700'
                                  }`}
                                >
                                  <FileText size={14} className="mr-2 text-gray-400 flex-shrink-0" />
                                  <span className={`text-sm truncate flex-1 ${
                                    note.id === (localSelectedNodeId || selectedNoteId) ? 'text-blue-200' : 'text-gray-300'
                                  }`}>
                                    {note.title.length > 25 ? note.title.substring(0, 25) + '...' : note.title}
                                  </span>
                                  {note.links.length > 0 && (
                                    <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                                      {note.links.length}
                                    </span>
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {/* Untagged Notes */}
                      {untaggedNotes.length > 0 && (
                        <div className="select-none">
                          <button
                            onClick={() => toggleTagExpansion('__untagged__')}
                            className="w-full flex items-center p-2 rounded hover:bg-gray-700 text-left group transition-colors"
                          >
                            {expandedTags.has('__untagged__') ? (
                              <ChevronDown size={14} className="mr-2 text-gray-400" />
                            ) : (
                              <ChevronRight size={14} className="mr-2 text-gray-400" />
                            )}
                            <div className="w-3 h-3 rounded-full mr-2 flex-shrink-0 bg-gray-500" />
                            <span className="text-white text-sm font-medium truncate flex-1">
                              Untagged
                            </span>
                            <span className="text-xs text-gray-400 ml-2">
                              {untaggedNotes.length}
                            </span>
                          </button>
                          
                          {expandedTags.has('__untagged__') && (
                            <div className="ml-8 mt-1 space-y-1">
                              {untaggedNotes.map(note => (
                                <button
                                  key={note.id}
                                  onClick={() => handleTreeNodeClick(note.id)}
                                  className={`w-full flex items-center p-2 rounded text-left transition-colors group ${
                                    note.id === (localSelectedNodeId || selectedNoteId)
                                      ? 'bg-blue-600 bg-opacity-20 border border-blue-500 border-opacity-30' 
                                      : 'hover:bg-gray-700'
                                  }`}
                                >
                                  <FileText size={14} className="mr-2 text-gray-400 flex-shrink-0" />
                                  <span className={`text-sm truncate flex-1 ${
                                    note.id === (localSelectedNodeId || selectedNoteId) ? 'text-blue-200' : 'text-gray-300'
                                  }`}>
                                    {note.title.length > 25 ? note.title.substring(0, 25) + '...' : note.title}
                                  </span>
                                  {note.links.length > 0 && (
                                    <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                                      {note.links.length}
                                    </span>
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
          
          {/* 3D Graph Container */}
          <div className="flex-1 relative">
            <ForceGraph3D
              ref={fgRef}
              graphData={graphData}
              nodeLabel="title"
              nodeColor="color"
              nodeVal="val"
              nodeRelSize={settings.nodeRelSize}
              linkColor="color"
              linkWidth="strength"
              linkOpacity={settings.linkOpacity}
              onNodeClick={handleNodeClick}
              onNodeHover={handleNodeHover}
              enableNodeDrag={true}
              enableNavigationControls={true}
              showNavInfo={true}
              backgroundColor={settings.backgroundColor}
              nodeThreeObject={renderNode3D}
              warmupTicks={100}
              cooldownTicks={200}
              d3AlphaDecay={0.02}
              d3VelocityDecay={0.3}
              width={undefined}
              height={undefined}
            />
            
            {/* Tree View Toggle Button */}
            <button
              onClick={() => setShowTreeView(prev => !prev)}
              className="absolute top-4 left-4 p-2 bg-gray-800 bg-opacity-90 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors border border-gray-600"
              title={showTreeView ? "Hide navigation tree" : "Show navigation tree"}
            >
              <Tag size={18} />
            </button>
          
          {/* Instructions Overlay */}
          {/* <div className="absolute bottom-4 left-4 bg-gray-800 bg-opacity-90 p-4 rounded-lg text-sm text-gray-300 border border-gray-600 max-w-xs">
            <h4 className="text-white font-semibold mb-2">Controls</h4>
            <div className="space-y-1 text-xs">
              <div>• <strong>Click</strong> nodes to select</div>
              <div>• <strong>Drag</strong> to rotate view</div>
              <div>• <strong>Scroll</strong> to zoom</div>
              <div>• <strong>Right-click + drag</strong> to pan</div>
              <div>• <strong>Hover</strong> settings for label options</div>
            </div>
            {settings.showLabels && (
              <div className="mt-2 pt-2 border-t border-gray-600">
                <div className="text-xs text-gray-400">
                  Labels: {settings.labelMaxLength} chars max
                </div>
              </div>
            )}
          </div> */}
          
          {/* Selected Note Info */}
          {(localSelectedNodeId || selectedNoteId) && (
            <div className="absolute top-4 right-4 bg-gray-800 bg-opacity-95 p-4 rounded-lg border border-gray-600 max-w-sm">
              {(() => {
                const currentSelectedId = localSelectedNodeId || selectedNoteId;
                const selectedNote = notes.find(n => n.id === currentSelectedId);
                if (!selectedNote) return null;
                
                return (
                  <div>
                    <h4 className="text-white font-semibold mb-2">{selectedNote.title}</h4>
                    <div className="text-xs text-gray-400 space-y-1">
                      <div>Links: {selectedNote.links.length}</div>
                      <div>Tags: {selectedNote.tags.join(', ') || 'None'}</div>
                      <div>Content: {selectedNote.content.length} chars</div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
};
