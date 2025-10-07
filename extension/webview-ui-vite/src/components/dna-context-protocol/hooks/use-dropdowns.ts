import { useState, useEffect } from 'react';

export function useDropdowns() {
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const [showSaveFilesDropdown, setShowSaveFilesDropdown] = useState(false);
  const [showSnippetsDropdown, setShowSnippetsDropdown] = useState(false);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (
        showTemplateDropdown &&
        !target.closest('.template-dropdown-container')
      ) {
        setShowTemplateDropdown(false);
      }
      if (
        showSaveFilesDropdown &&
        !target.closest('.save-files-dropdown-container')
      ) {
        setShowSaveFilesDropdown(false);
      }
      if (
        showSnippetsDropdown &&
        !target.closest('.snippets-dropdown-container')
      ) {
        setShowSnippetsDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTemplateDropdown, showSaveFilesDropdown, showSnippetsDropdown]);

  return {
    showTemplateDropdown,
    setShowTemplateDropdown,
    showSaveFilesDropdown,
    setShowSaveFilesDropdown,
    showSnippetsDropdown,
    setShowSnippetsDropdown,
  };
}
