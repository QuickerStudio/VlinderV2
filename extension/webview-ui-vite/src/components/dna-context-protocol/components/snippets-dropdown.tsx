import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown, ChevronRight, Star, Copy, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SNIPPET_CATEGORIES, GRAPH_TYPES, type CustomSnippet } from './snippets-panel'

interface SnippetsDropdownProps {
  showSnippetsDropdown: boolean
  setShowSnippetsDropdown: (show: boolean) => void
  onInsertSnippet: (code: string) => void
}

export function SnippetsDropdown({
  showSnippetsDropdown,
  setShowSnippetsDropdown,
  onInsertSnippet
}: SnippetsDropdownProps) {
  const [openSections, setOpenSections] = useState<string[]>(['graphs', 'nodes', 'connections', 'arrows', 'custom'])
  const [customSnippet, setCustomSnippet] = useState('')
  const [customName, setCustomName] = useState('')
  const [customSnippets, setCustomSnippets] = useState<CustomSnippet[]>([])

  // Load custom snippets from localStorage on mount
  React.useEffect(() => {
    const saved = localStorage.getItem('mermaid-custom-snippets')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setCustomSnippets(parsed)
      } catch (err) {
        console.warn('Failed to load custom snippets:', err)
      }
    }
  }, [])

  // Save custom snippets to localStorage
  const saveCustomSnippets = (snippets: CustomSnippet[]) => {
    localStorage.setItem('mermaid-custom-snippets', JSON.stringify(snippets))
    setCustomSnippets(snippets)
  }

  const toggleSection = (sectionKey: string) => {
    setOpenSections(prev =>
      prev.includes(sectionKey)
        ? prev.filter(key => key !== sectionKey)
        : [...prev, sectionKey]
    )
  }

  const handleSnippetClick = (code: string) => {
    onInsertSnippet(code)
    setShowSnippetsDropdown(false) // Close dropdown after insertion
  }

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
    } catch (err) {
      console.warn('Failed to copy to clipboard:', err)
    }
  }

  const addCustomSnippet = () => {
    if (!customSnippet.trim() || !customName.trim()) return

    const newSnippet: CustomSnippet = {
      id: Date.now().toString(),
      name: customName.trim(),
      code: customSnippet.trim()
    }

    const updatedSnippets = [...customSnippets, newSnippet]
    saveCustomSnippets(updatedSnippets)
    setCustomSnippet('')
    setCustomName('')
  }

  const deleteCustomSnippet = (id: string) => {
    const updatedSnippets = customSnippets.filter(snippet => snippet.id !== id)
    saveCustomSnippets(updatedSnippets)
  }

  return (
    <div className="relative snippets-dropdown-container">
      <button
        onClick={() => setShowSnippetsDropdown(!showSnippetsDropdown)}
        className="p-1 hover:bg-accent rounded flex items-center gap-1"
        title="Code Snippets"
      >
        <span className="codicon codicon-symbol-snippet"></span>
        <span className="text-xs hidden lg:inline">Snippets</span>
        <span className={`codicon codicon-chevron-${showSnippetsDropdown ? 'up' : 'down'} hidden lg:inline`}></span>
      </button>
      
      {/* Snippets dropdown menu content */}
      {showSnippetsDropdown && (
        <div className="absolute top-full right-0 mt-1 w-[500px] bg-background border rounded-md shadow-lg z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="p-2 border-b bg-muted/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Code Snippets</span>
            </div>

            {/* Add custom snippet form in header */}
            <div className="flex items-center gap-2 text-xs">
              <input
                type="text"
                placeholder="Snippet name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-32 px-2 py-1 text-xs border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <input
                type="text"
                placeholder="Mermaid code"
                value={customSnippet}
                onChange={(e) => setCustomSnippet(e.target.value)}
                className="flex-1 px-2 py-1 text-xs border rounded bg-background font-mono focus:outline-none focus:ring-1 focus:ring-primary min-w-0"
              />
              <Button
                onClick={addCustomSnippet}
                size="sm"
                className="h-7 px-3 text-xs flex-shrink-0"
                disabled={!customSnippet.trim() || !customName.trim()}
              >
                <Plus className="w-3 h-3 mr-1" />
                Add
              </Button>
            </div>
          </div>
          
          {/* Content */}
          <div className="max-h-80 overflow-y-auto p-2 space-y-2">
            {/* Custom Snippets Section */}
            <Collapsible open={openSections.includes('custom')} onOpenChange={() => toggleSection('custom')}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start h-6 px-2 hover:bg-accent"
                >
                  {openSections.includes('custom') ? (
                    <ChevronDown className="w-3 h-3 mr-1" />
                  ) : (
                    <ChevronRight className="w-3 h-3 mr-1" />
                  )}
                  <Star className="w-3 h-3 mr-1" />
                  <span className="text-xs font-medium">Custom ({customSnippets.length})</span>
                </Button>
              </CollapsibleTrigger>

              <CollapsibleContent className="space-y-1 ml-1">
                {customSnippets.length === 0 ? (
                  <div className="text-xs text-muted-foreground px-2 py-1">
                    No custom snippets yet
                  </div>
                ) : (
                  customSnippets.map((snippet) => (
                    <div
                      key={snippet.id}
                      className="group flex items-center gap-2 py-1 px-2 rounded hover:bg-accent/50 transition-colors"
                    >
                      <span className="text-xs text-muted-foreground w-16 flex-shrink-0">
                        {snippet.name}
                      </span>
                      <div className="flex-1 overflow-hidden">
                        <button
                          onClick={() => handleSnippetClick(snippet.code)}
                          className="w-full text-left font-mono text-xs hover:text-primary transition-colors"
                          title={snippet.code}
                        >
                          <span className="truncate block">{snippet.code}</span>
                        </button>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0"
                          onClick={() => copyToClipboard(snippet.code)}
                          title="Copy to clipboard"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                          onClick={() => deleteCustomSnippet(snippet.id)}
                          title="Delete snippet"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* Graph Types Section */}
            <Collapsible open={openSections.includes('graphs')} onOpenChange={() => toggleSection('graphs')}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start h-6 px-2 hover:bg-accent"
                >
                  {openSections.includes('graphs') ? (
                    <ChevronDown className="w-3 h-3 mr-1" />
                  ) : (
                    <ChevronRight className="w-3 h-3 mr-1" />
                  )}
                  <span className="codicon codicon-graph w-3 h-3 mr-1"></span>
                  <span className="text-xs font-medium">Graph Types ({GRAPH_TYPES.length})</span>
                </Button>
              </CollapsibleTrigger>

              <CollapsibleContent className="space-y-1 ml-1">
                {GRAPH_TYPES.map((type, index) => (
                  <div
                    key={index}
                    className="group flex items-center gap-2 py-1 px-2 rounded hover:bg-accent/50 transition-colors"
                  >
                    <span className="text-xs text-muted-foreground w-16 flex-shrink-0">
                      {type.name}
                    </span>
                    <div className="flex-1 overflow-hidden">
                      <button
                        onClick={() => handleSnippetClick(type.code)}
                        className="w-full text-left font-mono text-xs hover:text-primary transition-colors"
                        title={type.code}
                      >
                        <span className="truncate block">{type.code}</span>
                      </button>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => copyToClipboard(type.code)}
                      title="Copy to clipboard"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>

            {/* Other Categories */}
            {Object.entries(SNIPPET_CATEGORIES).map(([key, category]) => (
              <Collapsible key={key} open={openSections.includes(key)} onOpenChange={() => toggleSection(key)}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-6 px-2 hover:bg-accent"
                  >
                    {openSections.includes(key) ? (
                      <ChevronDown className="w-3 h-3 mr-1" />
                    ) : (
                      <ChevronRight className="w-3 h-3 mr-1" />
                    )}
                    <category.icon className="w-3 h-3 mr-1" />
                    <span className="text-xs font-medium">{category.title} ({category.items.length})</span>
                  </Button>
                </CollapsibleTrigger>

                <CollapsibleContent className="space-y-1 ml-1">
                  {category.items.map((item, index) => (
                    <div
                      key={index}
                      className="group flex items-center gap-2 py-1 px-2 rounded hover:bg-accent/50 transition-colors"
                    >
                      <span className="text-xs text-muted-foreground w-16 flex-shrink-0">
                        {item.name}
                      </span>
                      <div className="flex-1 overflow-hidden">
                        <button
                          onClick={() => handleSnippetClick(item.code)}
                          className="w-full text-left font-mono text-xs hover:text-primary transition-colors"
                          title={item.code}
                        >
                          <span className="truncate block">{item.code}</span>
                        </button>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => copyToClipboard(item.code)}
                        title="Copy to clipboard"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
