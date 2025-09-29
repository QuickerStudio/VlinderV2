import { useState, useEffect, useCallback } from 'react'
import { mermaidTemplates, type MermaidTemplate } from './mermaid-templates'

export function useTemplates() {
	const [selectedCategory, setSelectedCategory] = useState('All')
	const [filteredTemplates, setFilteredTemplates] = useState<MermaidTemplate[]>(mermaidTemplates)

	// Filter templates
	useEffect(() => {
		if (selectedCategory === 'All') {
			setFilteredTemplates(mermaidTemplates)
		} else {
			setFilteredTemplates(mermaidTemplates.filter(template => template.category === selectedCategory))
		}
	}, [selectedCategory])

	// Apply template
	const applyTemplate = useCallback((template: MermaidTemplate, setMermaidCode: (code: string) => void, setStatusMessage: (msg: string) => void) => {
		setMermaidCode(template.code)
		setStatusMessage(`Template applied: ${template.name}`)
		setTimeout(() => setStatusMessage(''), 2000)
	}, [])

	return {
		selectedCategory,
		setSelectedCategory,
		filteredTemplates,
		applyTemplate
	}
}
