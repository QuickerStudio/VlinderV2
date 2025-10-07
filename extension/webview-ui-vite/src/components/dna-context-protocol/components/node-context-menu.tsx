import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { EDGE_TYPES } from '../hooks/use-edge-manager';
import { NodeType } from '../types';

interface OutgoingEdge {
  id: string;
  rawLine: string;
}

interface NodeContextMenuProps {
  isOpen: boolean;
  x: number;
  y: number;
  nodeId?: string;
  nodeText?: string;
  nodeComment?: string;
  isEditMode: boolean;
  isEdgeEditMode?: boolean;
  outgoingEdges?: OutgoingEdge[];
  onClose: () => void;
  onDelete: (nodeId: string) => void;
  deleteEdge: (edgeId: string) => void;
  onAddNode: (nodeText: string, nodeType: NodeType, connectTo?: string) => void;
  onChangeNodeType: (nodeId: string, nodeType: NodeType) => void;
  onRenameNode: (nodeId: string, newName: string) => void;
  onRenameNodeId: (oldNodeId: string, newNodeId: string) => void;
  onApplyStyling: (nodeId: string, styling: string) => void;
  onAddComment: (nodeId: string, comment: string) => void;
  onChangeEdgeType?: (edgeId: string, newType: string) => void;
  onApplyEdgeColor?: (edgeId: string, colorStyle: string) => void;
  onAddImage?: (nodeId: string) => void;
  onRemoveImage?: (nodeId: string) => void;
  className?: string;
}

export function NodeContextMenu({
  isOpen,
  x,
  y,
  nodeId,
  nodeText,
  nodeComment,
  isEditMode,
  isEdgeEditMode,
  outgoingEdges,
  onClose,
  onDelete,
  deleteEdge,
  onAddNode,
  onChangeNodeType,
  onRenameNode,
  onRenameNodeId,
  onApplyStyling,
  onAddComment,
  onChangeEdgeType,
  onApplyEdgeColor,
  onAddImage,
  onRemoveImage,
  className,
}: NodeContextMenuProps) {
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeId, setNewNodeId] = useState('');
  const [comment, setComment] = useState('');
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [customLabel, setCustomLabel] = useState<string>('');
  const [showColorButtons, setShowColorButtons] = useState<boolean>(false);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const renameIdInputRef = useRef<HTMLInputElement>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);

  // Use unified connection line style options
  const edgeStyles = EDGE_TYPES;

  // Color and style options organized by color (columns) and width (rows)
  const colors = [
    '#ff6b6b',
    '#4ecdc4',
    '#45b7d1',
    '#96ceb4',
    '#feca57',
    '#ff9ff3',
  ];
  const widths = ['1px', '2px', '4px'];

  // Generate color grid: each row contains all colors for a specific width
  const colorGrid = widths.map((width) =>
    colors.map((color) => ({
      value: `stroke:${color},stroke-width:${width}`,
      label: `${color} ${width}`,
      color: color,
      width: width,
    }))
  );

  // Flatten the grid row by row to maintain proper order
  const colorOptions = [
    ...colorGrid.flat(),
    // Add special styles
    {
      value: 'stroke:#333,stroke-width:1px,stroke-dasharray:5,5',
      label: 'Dash',
      color: '#333',
      width: 'dash',
    },
    {
      value: 'stroke:#333,stroke-width:2px,stroke-dasharray:2,2',
      label: 'Dot',
      color: '#333',
      width: 'dot',
    },
  ];

  useEffect(() => {
    if (isOpen) {
      // Populate fields with the latest data from props
      setNewNodeId(nodeId || '');
      setNewNodeName(nodeText || '');
      setComment(nodeComment || '');

      // Focus the ID input for quick editing
      setTimeout(() => renameIdInputRef.current?.focus(), 0);
    } else {
      // Reset UI states when the menu is closed
      setSelectedEdgeId(null);
    }
  }, [isOpen, nodeId, nodeText, nodeComment]);

  // Handle selecting connection line
  const handleSelectEdge = (edgeId: string) => {
    setSelectedEdgeId(selectedEdgeId === edgeId ? null : edgeId);
  };

  // Handle changing connection line type
  const handleChangeEdgeType = (edgeId: string, newType: string) => {
    if (onChangeEdgeType) {
      onChangeEdgeType(edgeId, newType);
    }
    setSelectedEdgeId(null);
    onClose();
  };

  // Handle applying custom label
  const handleApplyCustomLabel = () => {
    if (selectedEdgeId && customLabel.trim() && onChangeEdgeType) {
      const customType = `-->|${customLabel.trim()}|`;
      onChangeEdgeType(selectedEdgeId, customType);
      setCustomLabel('');
      setSelectedEdgeId(null);
      onClose();
    }
  };

  // Toggle between style buttons and color buttons
  const toggleButtonMode = () => {
    setShowColorButtons(!showColorButtons);
  };

  // Handle applying color to edge using linkStyle
  const handleApplyColor = (colorStyle: string) => {
    if (selectedEdgeId && onApplyEdgeColor) {
      // The colorStyle is already in the correct format: "stroke:#color,stroke-width:2px"
      // Just pass it directly to the edge color function
      onApplyEdgeColor(selectedEdgeId, colorStyle);
      setSelectedEdgeId(null);
      onClose();
    }
  };

  const handleApplyStyling = (style: string) => {
    if (nodeId) {
      onApplyStyling(nodeId, style);
    }
    onClose();
  };

  if (!isOpen) return null;

  const handleDelete = () => {
    if (nodeId) {
      onDelete(nodeId);
    }
    onClose();
  };

  const handleAddNode = (nodeType: NodeType = 'rectangle') => {
    // Use the same logic as FigmaToolbar
    const nodeTypes = [
      { value: 'rectangle', label: 'Rectangle' },
      { value: 'rounded', label: 'Rounded' },
      { value: 'diamond', label: 'Diamond' },
      { value: 'circle', label: 'Circle' },
      { value: 'stadium', label: 'Stadium' },
      { value: 'subroutine', label: 'Subroutine' },
      { value: 'cylindrical', label: 'Database' },
      { value: 'hexagon', label: 'Hexagon' },
      { value: 'parallelogram', label: 'Parallel' },
      { value: 'trapezoid', label: 'Trapezoid' },
      { value: 'doubleCircle', label: 'Double Circle' },
      { value: 'image', label: 'Image' },
      { value: 'text', label: 'Text' },
      { value: 'button', label: 'Button' },
    ];
    const nodeConfig = nodeTypes.find((t) => t.value === nodeType);
    const defaultText = `New ${nodeConfig?.label || 'Node'}`;
    onAddNode(defaultText, nodeType, nodeId);
    onClose();
  };

  const handleAddComment = () => {
    if (nodeId) {
      // Allow empty comment to delete
      onAddComment(nodeId, comment.trim());
      onClose();
    }
  };

  const handleRename = () => {
    if (nodeId && newNodeName.trim()) {
      onRenameNode(nodeId, newNodeName.trim());
      onClose();
    }
  };

  const handleRenameId = () => {
    if (nodeId && newNodeId.trim()) {
      onRenameNodeId(nodeId, newNodeId.trim());
      setNewNodeId(''); // Reset input
      onClose();
    }
  };

  const handleChangeNodeType = (type: NodeType) => {
    if (nodeId) {
      onChangeNodeType(nodeId, type);
    }
    onClose();
  };

  const handleDeleteEdge = (edgeId: string) => {
    deleteEdge(edgeId);
    onClose();
  };

  // Handle adding image to node
  const handleAddImage = () => {
    if (nodeId && onAddImage) {
      onAddImage(nodeId);
      onClose();
    }
  };

  // Handle removing image from node
  const handleRemoveImage = () => {
    if (nodeId && onRemoveImage) {
      onRemoveImage(nodeId);
      onClose();
    }
  };

  // Check if current node is image or button type (both use images)
  const isImageNode =
    nodeId?.startsWith('Image') || nodeId?.startsWith('Button');

  return (
    <>
      {/* Background overlay */}
      <div className='fixed inset-0 z-40' onClick={onClose} />

      {/* Context menu */}
      <div
        className={cn(
          'absolute z-50 bg-background border border-border rounded-lg shadow-lg p-3 min-w-[450px]',
          className
        )}
        style={{
          left: Math.min(x, window.innerWidth - 470),
          top: Math.min(y, window.innerHeight - 500),
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {isEditMode && !isEdgeEditMode && (
          <div className='space-y-4'>
            {/* Input Fields Section */}
            <div className='space-y-3'>
              <div className='flex items-center gap-2'>
                <label className='text-xs font-medium text-muted-foreground w-16'>
                  ID:
                </label>
                <input
                  ref={renameIdInputRef}
                  type='text'
                  placeholder='Node ID'
                  value={newNodeId}
                  onChange={(e) => setNewNodeId(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameId();
                  }}
                  className='flex-1 bg-background border border-border rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary'
                />
                <button
                  onClick={handleRenameId}
                  className='px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90'
                >
                  Update
                </button>
              </div>

              <div className='flex items-center gap-2'>
                <label className='text-xs font-medium text-muted-foreground w-16'>
                  Text:
                </label>
                <input
                  ref={renameInputRef}
                  type='text'
                  placeholder='Node text'
                  value={newNodeName}
                  onChange={(e) => setNewNodeName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename();
                  }}
                  className='flex-1 bg-background border border-border rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary'
                />
                <button
                  onClick={handleRename}
                  className='px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90'
                >
                  Update
                </button>
              </div>

              <div className='flex items-center gap-2'>
                <label className='text-xs font-medium text-muted-foreground w-16'>
                  Note:
                </label>
                <input
                  ref={commentInputRef}
                  type='text'
                  placeholder='Add comment'
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddComment();
                  }}
                  className='flex-1 bg-background border border-border rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary'
                />
                <button
                  onClick={handleAddComment}
                  className='px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90'
                >
                  Save
                </button>
              </div>
            </div>

            {/* Node Actions */}
            <div>
              <div className='text-xs font-medium text-muted-foreground mb-2'>
                Actions
              </div>
              <div className='flex gap-2'>
                <button
                  onClick={() => handleAddNode()}
                  className='flex-1 px-3 py-2 text-sm bg-accent hover:bg-accent/80 rounded flex items-center justify-center gap-2'
                >
                  <span className='codicon codicon-add text-xs'></span>
                  Add Node
                </button>
                <button
                  onClick={handleDelete}
                  className='flex-1 px-3 py-2 text-sm bg-destructive/10 hover:bg-destructive/20 text-destructive rounded flex items-center justify-center gap-2'
                >
                  <span className='codicon codicon-trash text-xs'></span>
                  Delete
                </button>
                <button
                  onClick={onClose}
                  className='flex-1 px-3 py-2 text-sm bg-secondary hover:bg-secondary/80 rounded flex items-center justify-center gap-2'
                >
                  <span className='codicon codicon-close text-xs'></span>
                  Cancel
                </button>
              </div>
            </div>

            {/* Image Actions - Only show for Image and Button nodes */}
            {isImageNode && (
              <div>
                <div className='text-xs font-medium text-muted-foreground mb-2'>
                  Image Actions
                </div>
                <div className='flex gap-2'>
                  <button
                    onClick={handleAddImage}
                    className='flex-1 px-3 py-2 text-sm bg-blue-100 hover:bg-blue-200 text-blue-800 rounded flex items-center justify-center gap-2'
                  >
                    <span className='codicon codicon-file-media text-xs'></span>
                    Add Image
                  </button>
                  <button
                    onClick={handleRemoveImage}
                    className='flex-1 px-3 py-2 text-sm bg-orange-100 hover:bg-orange-200 text-orange-800 rounded flex items-center justify-center gap-2'
                  >
                    <span className='codicon codicon-close text-xs'></span>
                    Remove Image
                  </button>
                </div>
              </div>
            )}

            {/* Node Type Selection */}
            <div>
              <div className='text-xs font-medium text-muted-foreground mb-2'>
                Node Type
              </div>
              <div className='grid grid-cols-3 gap-2'>
                {/* Basic Shapes */}
                <button
                  onClick={() => handleChangeNodeType('rectangle')}
                  className='px-2 py-2 text-xs bg-accent hover:bg-accent/80 rounded'
                >
                  Rectangle
                </button>
                <button
                  onClick={() => handleChangeNodeType('rounded')}
                  className='px-2 py-2 text-xs bg-accent hover:bg-accent/80 rounded'
                >
                  Rounded
                </button>
                <button
                  onClick={() => handleChangeNodeType('diamond')}
                  className='px-2 py-2 text-xs bg-accent hover:bg-accent/80 rounded'
                >
                  Diamond
                </button>
                <button
                  onClick={() => handleChangeNodeType('circle')}
                  className='px-2 py-2 text-xs bg-accent hover:bg-accent/80 rounded'
                >
                  Circle
                </button>
                <button
                  onClick={() => handleChangeNodeType('stadium')}
                  className='px-2 py-2 text-xs bg-accent hover:bg-accent/80 rounded'
                >
                  Stadium
                </button>
                <button
                  onClick={() => handleChangeNodeType('hexagon')}
                  className='px-2 py-2 text-xs bg-accent hover:bg-accent/80 rounded'
                >
                  Hexagon
                </button>

                {/* Process Shapes */}
                <button
                  onClick={() => handleChangeNodeType('subroutine')}
                  className='px-2 py-2 text-xs bg-accent hover:bg-accent/80 rounded'
                >
                  Subroutine
                </button>
                <button
                  onClick={() => handleChangeNodeType('cylindrical')}
                  className='px-2 py-2 text-xs bg-accent hover:bg-accent/80 rounded'
                >
                  Database
                </button>
                <button
                  onClick={() => handleChangeNodeType('parallelogram')}
                  className='px-2 py-2 text-xs bg-accent hover:bg-accent/80 rounded'
                >
                  Parallel
                </button>
                <button
                  onClick={() => handleChangeNodeType('trapezoid')}
                  className='px-2 py-2 text-xs bg-accent hover:bg-accent/80 rounded'
                >
                  Trapezoid
                </button>
                <button
                  onClick={() => handleChangeNodeType('doubleCircle')}
                  className='px-2 py-2 text-xs bg-accent hover:bg-accent/80 rounded'
                >
                  Double Circle
                </button>

                {/* Special Types */}
                <button
                  onClick={() => handleChangeNodeType('text')}
                  className='px-2 py-2 text-xs bg-accent hover:bg-accent/80 rounded'
                >
                  Text
                </button>
                <button
                  onClick={() => handleChangeNodeType('button')}
                  className='px-2 py-2 text-xs bg-accent hover:bg-accent/80 rounded'
                >
                  Button
                </button>
                <button
                  onClick={() => handleChangeNodeType('image')}
                  className='px-2 py-2 text-xs bg-accent hover:bg-accent/80 rounded'
                >
                  Image
                </button>
              </div>
            </div>

            {/* Styling Options */}
            <div>
              <div className='text-xs font-medium text-muted-foreground mb-2'>
                Styling
              </div>
              <div className='grid grid-cols-2 gap-2'>
                <button
                  onClick={() =>
                    handleApplyStyling(
                      'fill:#fce4ec,stroke:#880e4f,stroke-width:2px'
                    )
                  }
                  className='px-2 py-2 text-xs bg-pink-100 hover:bg-pink-200 text-pink-800 rounded'
                >
                  Pink
                </button>
                <button
                  onClick={() =>
                    handleApplyStyling(
                      'fill:#e3f2fd,stroke:#0d47a1,stroke-width:2px'
                    )
                  }
                  className='px-2 py-2 text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 rounded'
                >
                  Blue
                </button>
                <button
                  onClick={() =>
                    handleApplyStyling(
                      'fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px'
                    )
                  }
                  className='px-2 py-2 text-xs bg-green-100 hover:bg-green-200 text-green-800 rounded'
                >
                  Green
                </button>
                <button
                  onClick={() =>
                    handleApplyStyling(
                      'fill:#fff3e0,stroke:#e65100,stroke-width:2px'
                    )
                  }
                  className='px-2 py-2 text-xs bg-orange-100 hover:bg-orange-200 text-orange-800 rounded'
                >
                  Orange
                </button>
              </div>
            </div>
          </div>
        )}
        {isEdgeEditMode && (
          <div className='flex gap-2'>
            {outgoingEdges && outgoingEdges.length > 0 ? (
              <>
                {/* Left side - Outgoing Connections */}
                <div className='flex-1 flex flex-col'>
                  <div className='flex items-center gap-2 px-1 py-1 text-xs font-medium text-muted-foreground'>
                    <button
                      onClick={() => {
                        if (selectedEdgeId && onChangeEdgeType) {
                          onChangeEdgeType(selectedEdgeId, '~~~');
                          setSelectedEdgeId(null);
                          onClose();
                        }
                      }}
                      disabled={!selectedEdgeId}
                      className='px-2 py-1 text-xs bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed rounded font-mono'
                      title='Apply invisible connection (~~~) - useful for layout'
                    >
                      ~~~
                    </button>
                    <span>Outgoing Connections</span>
                  </div>
                  <div className='flex flex-col gap-1 max-h-64 overflow-y-auto flex-1'>
                    {outgoingEdges.map((edge) => (
                      <div key={edge.id}>
                        <div
                          className={cn(
                            'flex items-center justify-between text-sm hover:bg-accent rounded-md pr-1 cursor-pointer',
                            selectedEdgeId === edge.id && 'bg-accent'
                          )}
                          onClick={() => handleSelectEdge(edge.id)}
                        >
                          <span
                            className='px-3 py-1 truncate'
                            title={edge.rawLine.trim()}
                          >
                            {edge.rawLine.trim()}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent selection when deleting
                              handleDeleteEdge(edge.id);
                            }}
                            className='p-1 text-destructive hover:bg-destructive/20 rounded-md'
                            title={`Delete edge: ${edge.id}`}
                          >
                            <span className='codicon codicon-trash text-xs'></span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Cancel button at bottom of left side */}
                  <div className='border-t mt-2 pt-2'>
                    <button
                      onClick={onClose}
                      className='w-full px-3 py-2 text-sm text-left hover:bg-accent transition-colors flex items-center gap-2 rounded-md'
                    >
                      <span className='codicon codicon-close text-xs'></span>
                      Cancel
                    </button>
                  </div>
                </div>

                {/* Right side - Change Connection Style and Custom Label */}
                {selectedEdgeId && (
                  <div className='flex-1 min-w-[300px]'>
                    {/* Header with title and custom label input */}
                    <div className='flex items-center justify-between px-1 py-1 mb-2'>
                      <button
                        onClick={toggleButtonMode}
                        className='text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer'
                      >
                        {showColorButtons ? 'wire color' : 'wire Style'}
                      </button>
                      <div className='flex items-center gap-1'>
                        <span className='text-xs font-mono text-foreground'>
                          |
                        </span>
                        <input
                          type='text'
                          value={customLabel}
                          onChange={(e) => setCustomLabel(e.target.value)}
                          placeholder='YES'
                          className='px-1 py-1 text-xs border rounded font-mono bg-background text-foreground'
                          style={{
                            width: `${Math.max(5, customLabel.length + 1)}ch`,
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleApplyCustomLabel();
                            }
                          }}
                        />
                        <span className='text-xs font-mono text-foreground'>
                          |
                        </span>
                        <button
                          onClick={handleApplyCustomLabel}
                          disabled={!customLabel.trim()}
                          className='px-2 py-1 text-xs bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-md ml-1'
                        >
                          Apply
                        </button>
                      </div>
                    </div>

                    {/* Dynamic buttons grid */}
                    <div
                      className={`grid gap-1 ${showColorButtons ? 'grid-cols-6' : 'grid-cols-3'}`}
                    >
                      {showColorButtons
                        ? // Color buttons organized in grid: 6 colors (columns) x widths (rows)
                          colorOptions.map((colorOption) => (
                            <button
                              key={colorOption.value}
                              onClick={() =>
                                handleApplyColor(colorOption.value)
                              }
                              className='p-1 text-xs text-center hover:bg-accent rounded-md flex flex-col items-center justify-center gap-1'
                              title={`Apply ${colorOption.width} ${colorOption.color} to connection line`}
                            >
                              <div
                                className='w-6 h-1 rounded'
                                style={{
                                  height:
                                    colorOption.width === '1px'
                                      ? '1px'
                                      : colorOption.width === '2px'
                                        ? '2px'
                                        : colorOption.width === '4px'
                                          ? '3px'
                                          : '2px',
                                  borderStyle:
                                    colorOption.width === 'dash'
                                      ? 'dashed'
                                      : colorOption.width === 'dot'
                                        ? 'dotted'
                                        : 'solid',
                                  borderWidth:
                                    colorOption.width === 'dash' ||
                                    colorOption.width === 'dot'
                                      ? '1px'
                                      : '0',
                                  borderColor: colorOption.color,
                                  backgroundColor:
                                    colorOption.width === 'dash' ||
                                    colorOption.width === 'dot'
                                      ? 'transparent'
                                      : colorOption.color,
                                }}
                              ></div>
                              <span className='text-xs leading-none'>
                                {colorOption.width}
                              </span>
                            </button>
                          ))
                        : // Style buttons for edge styling
                          edgeStyles
                            .slice()
                            .sort((a, b) => {
                              // Sort by length, then alphabetically
                              const lengthDiff =
                                a.label.length - b.label.length;
                              return lengthDiff !== 0
                                ? lengthDiff
                                : a.label.localeCompare(b.label);
                            })
                            .map((style) => (
                              <button
                                key={style.value}
                                onClick={() =>
                                  handleChangeEdgeType(
                                    selectedEdgeId,
                                    style.value
                                  )
                                }
                                className='p-1 text-xs text-center hover:bg-accent rounded-md font-mono'
                                title={style.description}
                              >
                                {style.label}
                              </button>
                            ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className='px-3 py-2 text-sm text-muted-foreground flex flex-col'>
                <span>No outgoing connections.</span>
                <div className='border-t mt-2 pt-2'>
                  <button
                    onClick={onClose}
                    className='w-full px-3 py-2 text-sm text-left hover:bg-accent transition-colors flex items-center gap-2 rounded-md'
                  >
                    <span className='codicon codicon-close text-xs'></span>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
