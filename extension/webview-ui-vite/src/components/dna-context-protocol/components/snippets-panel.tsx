import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import './snippets-panel.css';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ChevronDown,
  ChevronRight,
  Code,
  Shapes,
  Palette,
  Copy,
  Plus,
  Trash2,
  Star,
  ArrowRight,
} from 'lucide-react';

interface SnippetsPanelProps {
  onInsertSnippet: (snippet: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

// Graph types for quick start
export const GRAPH_TYPES = [
  { name: 'Top-Down', code: 'graph TD' },
  { name: 'Left-Right', code: 'graph LR' },
  { name: 'Bottom-Top', code: 'graph BT' },
  { name: 'Right-Left', code: 'graph RL' },
];

// Simplified snippet categories
export const SNIPPET_CATEGORIES = {
  nodes: {
    title: 'Nodes',
    icon: Shapes,
    items: [
      { name: 'Rectangle', code: 'A[Rectangle]' },
      { name: 'Rounded', code: 'A(Rounded Rectangle)' },
      { name: 'Diamond', code: 'A{Diamond}' },
      { name: 'Circle', code: 'A((Circle))' },
      { name: 'Stadium', code: 'A([Stadium])' },
      { name: 'Subroutine', code: 'A[[Subroutine]]' },
      { name: 'Database', code: 'A[(Database)]' },
      { name: 'Hexagon', code: 'A{{Hexagon}}' },
      { name: 'Parallelogram', code: 'A[/Parallelogram/]' },
      { name: 'Trapezoid', code: 'A[/Trapezoid\\]' },
    ],
  },
  connections: {
    title: 'Connections',
    icon: Code,
    items: [
      // Basic arrows
      { name: 'Right Arrow', code: 'A --> B' },
      { name: 'Left Arrow', code: 'A <-- B' },
      { name: 'Bidirectional', code: 'A <--> B' },
      { name: 'No Arrow', code: 'A --- B' },

      // Dotted arrows
      { name: 'Dotted Right', code: 'A -.-> B' },
      { name: 'Dotted Left', code: 'A <-.- B' },
      { name: 'Dotted Both', code: 'A <-.-> B' },
      { name: 'Dotted Line', code: 'A -.- B' },

      // Thick arrows
      { name: 'Thick Right', code: 'A ==> B' },
      { name: 'Thick Left', code: 'A <== B' },
      { name: 'Thick Both', code: 'A <==> B' },
      { name: 'Thick Line', code: 'A === B' },

      // Special arrows
      { name: 'Cross Link', code: 'A x--x B' },
      { name: 'Circle Link', code: 'A o--o B' },
      { name: 'Multi Arrow', code: 'A -->|text| B' },
      { name: 'Long Arrow', code: 'A -----> B' },
      { name: 'Long Dotted', code: 'A -....-> B' },
      { name: 'Long Thick', code: 'A =====> B' },

      // Labeled arrows
      { name: 'Text Arrow', code: 'A -->|"label"| B' },
      { name: 'Text Dotted', code: 'A -.->|"label"| B' },
      { name: 'Text Thick', code: 'A ==>|"label"| B' },
      { name: 'Text Both', code: 'A <-->|"label"| B' },

      // Chain arrows
      { name: 'Chain 3', code: 'A --> B --> C' },
      { name: 'Chain Mixed', code: 'A --> B -.-> C' },
      { name: 'Chain Thick', code: 'A ==> B ==> C' },
      { name: 'Multi Chain', code: 'A --> B & C --> D' },
    ],
  },
  arrows: {
    title: 'Arrows',
    icon: ArrowRight,
    items: [
      // Basic arrow connectors
      { name: 'Right', code: '-->' },
      { name: 'Left', code: '<--' },
      { name: 'Both', code: '<-->' },
      { name: 'Line', code: '---' },

      // Dotted arrows
      { name: 'Dotted Right', code: '-.->' },
      { name: 'Dotted Left', code: '<-.-' },
      { name: 'Dotted Both', code: '<-.->' },
      { name: 'Dotted Line', code: '-.-' },

      // Thick arrows
      { name: 'Thick Right', code: '==>' },
      { name: 'Thick Left', code: '<==' },
      { name: 'Thick Both', code: '<==>' },
      { name: 'Thick Line', code: '===' },

      // Special connectors
      { name: 'Cross', code: 'x--x' },
      { name: 'Circle', code: 'o--o' },

      // Long arrows
      { name: 'Long Right', code: '----->' },
      { name: 'Long Left', code: '<-----' },
      { name: 'Long Dotted', code: '-....->' },
      { name: 'Long Thick', code: '=====>' },
    ],
  },
  styling: {
    title: 'Styling',
    icon: Palette,
    items: [
      { name: 'Fill', code: 'style A fill:#f9f,stroke:#333' },
      { name: 'Class', code: 'classDef className fill:#f9f' },
      { name: 'Apply', code: 'class A,B className' },
      { name: 'Link', code: 'linkStyle 0 stroke:#ff3' },
      { name: 'Subgraph', code: 'subgraph Title\n    A --> B\nend' },
    ],
  },
};

export interface CustomSnippet {
  id: string;
  name: string;
  code: string;
  timestamp?: number;
}

export function SnippetsPanel({
  onInsertSnippet,
  className,
  style,
}: SnippetsPanelProps) {
  const [openSections, setOpenSections] = useState<string[]>([
    'graphs',
    'nodes',
    'connections',
    'arrows',
    'custom',
  ]);
  const [customSnippet, setCustomSnippet] = useState('');
  const [customName, setCustomName] = useState('');
  const [customSnippets, setCustomSnippets] = useState<CustomSnippet[]>([]);

  // Load custom snippets from localStorage on mount
  React.useEffect(() => {
    const saved = localStorage.getItem('mermaid-custom-snippets');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCustomSnippets(parsed);
      } catch (err) {
        console.warn('Failed to load custom snippets:', err);
      }
    }
  }, []);

  // Save custom snippets to localStorage
  const saveCustomSnippets = (snippets: CustomSnippet[]) => {
    localStorage.setItem('mermaid-custom-snippets', JSON.stringify(snippets));
    setCustomSnippets(snippets);
  };

  const toggleSection = (sectionKey: string) => {
    setOpenSections((prev) =>
      prev.includes(sectionKey)
        ? prev.filter((key) => key !== sectionKey)
        : [...prev, sectionKey]
    );
  };

  const handleSnippetClick = (code: string) => {
    onInsertSnippet(code);
  };

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch (err) {
      console.warn('Failed to copy to clipboard:', err);
    }
  };

  const handleAddCustomSnippet = () => {
    const name = customName.trim();
    const code = customSnippet.trim();

    if (name && code) {
      const newSnippet: CustomSnippet = {
        id: Date.now().toString(),
        name,
        code,
        timestamp: Date.now(),
      };

      const updatedSnippets = [newSnippet, ...customSnippets];
      saveCustomSnippets(updatedSnippets);

      setCustomName('');
      setCustomSnippet('');
    }
  };

  const handleDeleteCustomSnippet = (id: string) => {
    const updatedSnippets = customSnippets.filter(
      (snippet) => snippet.id !== id
    );
    saveCustomSnippets(updatedSnippets);
  };

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-background border-l border-border',
        className
      )}
      style={style}
    >
      {/* Header with Graph Types and Custom Input */}
      <div className='p-2 border-b border-border bg-background/50'>
        <div className='flex items-center gap-2 mb-2'>
          <Shapes className='w-4 h-4' />
          <span className='font-medium text-sm'>Snippets</span>
        </div>

        {/* Custom Snippet Input */}
        <div className='space-y-1'>
          <Input
            placeholder='Name...'
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            className='h-6 text-xs'
          />
          <div className='flex gap-1'>
            <Input
              placeholder='Code...'
              value={customSnippet}
              onChange={(e) => setCustomSnippet(e.target.value)}
              onKeyDown={(e) => {
                if (
                  e.key === 'Enter' &&
                  customName.trim() &&
                  customSnippet.trim()
                ) {
                  handleAddCustomSnippet();
                }
              }}
              className='h-6 text-xs flex-1'
            />
            <Button
              variant='outline'
              size='sm'
              className='h-6 px-2'
              onClick={handleAddCustomSnippet}
              disabled={!customName.trim() || !customSnippet.trim()}
            >
              <Plus className='w-3 h-3' />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className='flex-1 overflow-y-auto p-2 space-y-2'>
        {/* Custom Snippets Section */}
        <Collapsible
          open={openSections.includes('custom')}
          onOpenChange={() => toggleSection('custom')}
        >
          <CollapsibleTrigger asChild>
            <Button
              variant='ghost'
              className='w-full justify-start h-6 px-2 hover:bg-accent'
            >
              {openSections.includes('custom') ? (
                <ChevronDown className='w-3 h-3 mr-1' />
              ) : (
                <ChevronRight className='w-3 h-3 mr-1' />
              )}
              <Star className='w-3 h-3 mr-1' />
              <span className='text-xs font-medium'>
                Custom ({customSnippets.length})
              </span>
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className='space-y-1 ml-1'>
            {customSnippets.length === 0 ? (
              <div className='text-xs text-muted-foreground px-2 py-1'>
                No custom snippets yet
              </div>
            ) : (
              customSnippets.map((snippet) => (
                <div
                  key={snippet.id}
                  className='group flex items-center gap-2 py-1 px-2 rounded hover:bg-accent/50 transition-colors'
                >
                  <span className='text-xs text-muted-foreground w-16 flex-shrink-0'>
                    {snippet.name}
                  </span>
                  <div className='flex-1 overflow-hidden'>
                    <button
                      onClick={() => handleSnippetClick(snippet.code)}
                      className='w-full text-left font-mono text-xs hover:text-primary transition-colors relative'
                      title={snippet.code}
                    >
                      <div className='snippet-scroll-container'>
                        <span
                          className={cn(
                            'snippet-text',
                            snippet.code.length > 25 && 'long-text'
                          )}
                        >
                          {snippet.code}
                        </span>
                      </div>
                    </button>
                  </div>
                  <Button
                    variant='ghost'
                    size='sm'
                    className='h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0'
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(snippet.code);
                    }}
                    title='Copy to clipboard'
                  >
                    <Copy className='w-3 h-3' />
                  </Button>
                  <Button
                    variant='ghost'
                    size='sm'
                    className='h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0'
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCustomSnippet(snippet.id);
                    }}
                    title='Delete snippet'
                  >
                    <Trash2 className='w-3 h-3 text-destructive' />
                  </Button>
                </div>
              ))
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Graph Types Section */}
        <Collapsible
          open={openSections.includes('graphs')}
          onOpenChange={() => toggleSection('graphs')}
        >
          <CollapsibleTrigger asChild>
            <Button
              variant='ghost'
              className='w-full justify-start h-6 px-2 hover:bg-accent'
            >
              {openSections.includes('graphs') ? (
                <ChevronDown className='w-3 h-3 mr-1' />
              ) : (
                <ChevronRight className='w-3 h-3 mr-1' />
              )}
              <Code className='w-3 h-3 mr-1' />
              <span className='text-xs font-medium'>Graph Types</span>
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className='space-y-1 ml-1'>
            {GRAPH_TYPES.map((type, index) => (
              <div
                key={index}
                className='group flex items-center gap-2 py-1 px-2 rounded hover:bg-accent/50 transition-colors'
              >
                <span className='text-xs text-muted-foreground w-16 flex-shrink-0'>
                  {type.name}
                </span>
                <div className='flex-1 overflow-hidden'>
                  <button
                    onClick={() => handleSnippetClick(type.code)}
                    className='w-full text-left font-mono text-xs hover:text-primary transition-colors relative'
                    title={type.code}
                  >
                    <div className='snippet-scroll-container'>
                      <span
                        className={cn(
                          'snippet-text',
                          type.code.length > 25 && 'long-text'
                        )}
                      >
                        {type.code}
                      </span>
                    </div>
                  </button>
                </div>
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0'
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(type.code);
                  }}
                  title='Copy to clipboard'
                >
                  <Copy className='w-3 h-3' />
                </Button>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Built-in Categories */}
        {Object.entries(SNIPPET_CATEGORIES).map(([key, category]) => {
          const IconComponent = category.icon;
          const isOpen = openSections.includes(key);

          return (
            <Collapsible
              key={key}
              open={isOpen}
              onOpenChange={() => toggleSection(key)}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant='ghost'
                  className='w-full justify-start h-6 px-2 hover:bg-accent'
                >
                  {isOpen ? (
                    <ChevronDown className='w-3 h-3 mr-1' />
                  ) : (
                    <ChevronRight className='w-3 h-3 mr-1' />
                  )}
                  <IconComponent className='w-3 h-3 mr-1' />
                  <span className='text-xs font-medium'>{category.title}</span>
                </Button>
              </CollapsibleTrigger>

              <CollapsibleContent className='space-y-1 ml-1'>
                {category.items.map((item, index) => (
                  <div
                    key={index}
                    className='group flex items-center gap-2 py-1 px-2 rounded hover:bg-accent/50 transition-colors'
                  >
                    <span className='text-xs text-muted-foreground w-16 flex-shrink-0'>
                      {item.name}
                    </span>
                    <div className='flex-1 overflow-hidden'>
                      <button
                        onClick={() => handleSnippetClick(item.code)}
                        className='w-full text-left font-mono text-xs hover:text-primary transition-colors relative'
                        title={item.code}
                      >
                        <div className='snippet-scroll-container'>
                          <span
                            className={cn(
                              'snippet-text',
                              item.code.length > 25 && 'long-text'
                            )}
                          >
                            {item.code}
                          </span>
                        </div>
                      </button>
                    </div>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0'
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(item.code);
                      }}
                      title='Copy to clipboard'
                    >
                      <Copy className='w-3 h-3' />
                    </Button>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}
