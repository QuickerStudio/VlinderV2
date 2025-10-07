import {
  templateCategories,
  type MermaidTemplate,
} from '../hooks/mermaid-templates';

interface TemplateDropdownProps {
  showTemplateDropdown: boolean;
  setShowTemplateDropdown: (show: boolean) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  filteredTemplates: MermaidTemplate[];
  applyTemplate: (template: MermaidTemplate) => void;
}

export function TemplateDropdown({
  showTemplateDropdown,
  setShowTemplateDropdown,
  selectedCategory,
  setSelectedCategory,
  filteredTemplates,
  applyTemplate,
}: TemplateDropdownProps) {
  return (
    <div className='relative template-dropdown-container'>
      <button
        onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
        className='p-1 hover:bg-accent rounded flex items-center gap-1'
        title='Select Template'
      >
        <span className='codicon codicon-file-code'></span>
        <span className='text-xs hidden lg:inline'>Template</span>
        <span
          className={`codicon codicon-chevron-${showTemplateDropdown ? 'up' : 'down'} hidden lg:inline`}
        ></span>
      </button>

      {/* Template dropdown menu content */}
      {showTemplateDropdown && (
        <div className='absolute top-full right-0 mt-1 w-80 bg-background border rounded-md shadow-lg z-50 max-h-96 overflow-hidden'>
          {/* Category selection */}
          <div className='p-2 border-b bg-muted/30'>
            <div className='flex flex-wrap gap-1'>
              {templateCategories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-2 py-1 text-xs rounded ${
                    selectedCategory === category
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Template list */}
          <div className='max-h-64 overflow-y-auto'>
            {filteredTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => applyTemplate(template)}
                className='w-full p-3 text-left hover:bg-muted/50 border-b last:border-b-0'
              >
                <div className='font-medium text-sm'>{template.name}</div>
                <div className='text-xs text-muted-foreground mt-1'>
                  {template.description}
                </div>
                <div className='text-xs text-primary mt-1'>
                  {template.category}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
