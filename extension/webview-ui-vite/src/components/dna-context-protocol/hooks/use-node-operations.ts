import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import type { NodeType } from "../types";

interface NodeOperation {
  type: "add" | "delete" | "move";
  nodeId?: string;
  newNodeId?: string;
  newNodeText?: string;
  targetPosition?: { x: number; y: number };
  connectTo?: string;
}

interface OutgoingEdge {
  id: string;
  rawLine: string;
}

interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  nodeId?: string;
  nodeText?: string;
  nodeComment?: string;
  outgoingEdges?: OutgoingEdge[];
  isEdgeContext?: boolean;
}

interface NodeOperationsOptions {
  mermaidCode: string;
  onCodeUpdate: (newCode: string) => void;
  onStatusMessage: (message: string) => void;
  isEnabled?: boolean;
  isEditMode?: boolean; // New: Receive edit mode state from useDiagramEditor
  isEdgeEditMode?: boolean;
  edgeMap: Map<string, { lineNumber: number; rawLine: string }>;
  deleteEdge: (edgeId: string) => void;
}

export function useNodeOperations({
  mermaidCode,
  onCodeUpdate,
  onStatusMessage,
  isEnabled = false,
  isEditMode = false, // Receive edit mode state
  isEdgeEditMode = false,
  edgeMap,
  deleteEdge,
}: NodeOperationsOptions) {
  const [isOperationMode, setIsOperationMode] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    nodeId: undefined,
    nodeText: undefined,
    nodeComment: undefined,
  });
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [dragStartPos, setDragStartPos] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Optimized: Pre-compiled regex patterns (avoid recreating on each call)
  const nodePatterns = useMemo(() => [
    // Node definitions with various brackets
    /(\w+)\s*\[([^\]]*)\]/g,        // Rectangle: node[text]
    /(\w+)\s*\(([^)]*)\)/g,         // Rounded: node(text)
    /(\w+)\s*\{([^}]*)\}/g,         // Diamond: node{text}
    /(\w+)\s*\(\(([^)]*)\)\)/g,     // Circle: node((text))
    /(\w+)\s*\[\[([^\]]*)\]\]/g,    // Subroutine: node[[text]]
    /(\w+)\s*\[\/([^\/\\]*)[\/\\]\]/g, // Parallelogram: node[/text/] or node[/text\]
    /(\w+)\s*\[\(([^)]*)\)\]/g,     // Stadium: node[(text)]
    /(\w+)\s*\{\{([^}]*)\}\}/g,     // Hexagon: node{{text}}
    /(\w+)\s*\(\(\(([^)]*)\)\)\)/g, // Double circle: node(((text)))

    // Connection patterns - extract both source and target
    /(\w+)\s*(?:-->|-.->|==>|-\.\\.->|<-->|<-.->|<===>|--o|-.->o|--x|-.->x|----->|------>)/g, // Source nodes
    /(?:-->|-.->|==>|-\.\\.->|<-->|<-.->|<===>|--o|-.->o|--x|-.->x|----->|------>) *(\w+)/g, // Target nodes

    // Styled nodes
    /(\w+)\s*:::/g,                 // Styled nodes: node:::class

    // Subgraph definitions
    /subgraph\s+(\w+)/g,            // Subgraph: subgraph nodeId
  ], []);

  // Optimized: Cache existing node IDs to avoid repeated parsing
  const existingNodeIds = useMemo(() => {
    const existingIds = new Set<string>();
    const lines = mermaidCode.split("\n");

    // Extract all existing node IDs from the code
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('%%') || trimmedLine.startsWith('graph') || trimmedLine.startsWith('flowchart')) {
        continue; // Skip comments and graph declarations
      }

      for (const pattern of nodePatterns) {
        let match;
        // Reset regex lastIndex before each use
        pattern.lastIndex = 0;

        while ((match = pattern.exec(trimmedLine)) !== null) {
          if (match[1] && match[1].trim()) {
            const nodeId = match[1].trim();
            // Only add valid node IDs (alphanumeric + underscore)
            if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(nodeId)) {
              existingIds.add(nodeId);
            }
          }
        }
      }
    }

    return existingIds;
  }, [mermaidCode, nodePatterns]);

  // Optimized: Node type to prefix mapping
  const nodeTypePrefixMap = useMemo(() => new Map<NodeType | string, string>([
    ["button", "btn"],
    ["image", "img"],
    ["text", "txt"],
    ["rectangle", "rect"],
    ["rounded", "round"],
    ["diamond", "diamond"],
    ["circle", "circle"],
    ["stadium", "stadium"],
    ["subroutine", "sub"],
    ["cylindrical", "cyl"],
    ["hexagon", "hex"],
    ["parallelogram", "para"],
    ["trapezoid", "trap"],
    ["doubleCircle", "dbl"],
  ]), []);

  // Generate unique node ID (Optimized version)
  const generateNodeId = useCallback((nodeType?: NodeType): string => {
    // Use cached existing IDs instead of re-parsing
    const prefix = nodeTypePrefixMap.get(nodeType || "default") || "node";

    // Generate unique ID with better collision avoidance
    let counter = 1;
    let newId = `${prefix}${counter}`;

    // Keep incrementing until we find a unique ID
    while (existingNodeIds.has(newId)) {
      counter++;
      newId = `${prefix}${counter}`;

      // Safety check to prevent infinite loops
      if (counter > 10000) {
        // Fallback to timestamp-based ID if we somehow hit this limit
        const timestamp = Date.now().toString().slice(-6);
        newId = `${prefix}_${timestamp}`;
        break;
      }
    }

    return newId;
  }, [existingNodeIds, nodeTypePrefixMap]);

  // Advanced: Smart node ID suggestion based on text content
  const generateSmartNodeId = useCallback((nodeText: string, nodeType?: NodeType): string => {
    // Extract meaningful words from node text for smarter ID generation
    const cleanText = nodeText
      .replace(/[^\w\s]/g, '') // Remove special characters
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2) // Only words longer than 2 chars
      .slice(0, 2); // Take first 2 meaningful words

    const prefix = nodeTypePrefixMap.get(nodeType || "default") || "node";

    if (cleanText.length > 0) {
      // Try semantic ID first (e.g., "startProcess", "userLogin")
      const semanticId = prefix + cleanText.map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join('');

      if (!existingNodeIds.has(semanticId)) {
        return semanticId;
      }

      // If semantic ID exists, try with numbers
      let counter = 1;
      let smartId = `${semanticId}${counter}`;
      while (existingNodeIds.has(smartId) && counter < 100) {
        counter++;
        smartId = `${semanticId}${counter}`;
      }

      if (counter < 100) {
        return smartId;
      }
    }

    // Fallback to original method
    return generateNodeId(nodeType);
  }, [existingNodeIds, nodeTypePrefixMap, generateNodeId]);

  // Debug function to test node ID extraction (Optimized - uses cached data)
  const debugExtractedIds = useCallback(() => {
    console.log('🔍 Extracted Node IDs:', Array.from(existingNodeIds).sort());
    console.log('� Total unique node IDs found:', existingNodeIds.size);

    // Show prefix distribution
    const prefixCount = new Map<string, number>();
    existingNodeIds.forEach(id => {
      const prefix = id.replace(/\d+$/, '').replace(/_.*$/, '');
      prefixCount.set(prefix, (prefixCount.get(prefix) || 0) + 1);
    });
    console.log('📈 Prefix distribution:', Object.fromEntries(prefixCount));

    return existingNodeIds;
  }, [existingNodeIds]);

  // Parse node information
  const parseNodes = useCallback(() => {
    const nodes = new Map<string, { text: string; type: string }>();
    const lines = mermaidCode.split("\n");

    for (const line of lines) {
      // Match different types of node definitions
      const patterns = [
        /(\w+)\[([^\]]+)\]/, // Rectangle node
        /(\w+)\(([^)]+)\)/, // Rounded rectangle
        /(\w+)\{([^}]+)\}/, // Diamond
        /(\w+)\(\(([^)]+)\)\)/, // Circle
        /(\w+)\(\[([^\]]+)\]\)/, // Stadium
        /(\w+)\[\[([^\]]+)\]\]/, // Subroutine
        /(\w+)\[\(([^)]+)\)\]/, // Cylindrical
        /(\w+)\{\{([^}]+)\}\}/, // Hexagon
        /(\w+)\[\/([^\/]+)\/\]/, // Parallelogram
        /(\w+)\[\/([^\\]+)\\\]/, // Trapezoid
        /(\w+)\(\(\(([^)]+)\)\)\)/, // Double Circle
        /(\w+)>([^>]+)>/, // Label shape
      ];

      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
          const [, id, text] = match;
          let type = "rectangle";

          // More specific pattern matching
          if (line.includes("(((") && line.includes(")))")) type = "doubleCircle";
          else if (line.includes("([") && line.includes("])")) type = "stadium";
          else if (line.includes("[[") && line.includes("]]")) type = "subroutine";
          else if (line.includes("[(") && line.includes(")]")) type = "cylindrical";
          else if (line.includes("{{") && line.includes("}}")) type = "hexagon";
          else if (line.includes("[/") && line.includes("/]")) type = "parallelogram";
          else if (line.includes("[/") && line.includes("\\]")) type = "trapezoid";
          else if (line.includes("((") && line.includes("))")) type = "circle";
          else if (line.includes("(") && line.includes(")")) type = "rounded";
          else if (line.includes("{") && line.includes("}")) type = "diamond";
          else if (line.includes(">") && line.includes(">")) type = "label";

          nodes.set(id, { text: text || id, type });
          break;
        }
      }
    }
    return nodes;
  }, [mermaidCode]);

  // Add node (Optimized with smart ID generation)
  const addNode = useCallback(
    (
      nodeText: string,
      nodeType: NodeType = "rectangle",
      connectTo?: string,
      useSmartId: boolean = true
    ) => {
      // Use smart ID generation if enabled and text is meaningful
      const newNodeId = useSmartId && nodeText.trim().length > 0
        ? generateSmartNodeId(nodeText, nodeType)
        : generateNodeId(nodeType);
      let nodeDefinition = "";

      switch (nodeType) {
        case "rectangle":
          nodeDefinition = `${newNodeId}[${nodeText}]`;
          break;
        case "rounded":
          nodeDefinition = `${newNodeId}(${nodeText})`;
          break;
        case "diamond":
          nodeDefinition = `${newNodeId}{${nodeText}}`;
          break;
        case "circle":
          nodeDefinition = `${newNodeId}((${nodeText}))`;
          break;
        case "stadium":
          nodeDefinition = `${newNodeId}([${nodeText}])`;
          break;
        case "subroutine":
          nodeDefinition = `${newNodeId}[[${nodeText}]]`;
          break;
        case "cylindrical":
          nodeDefinition = `${newNodeId}[(${nodeText})]`;
          break;
        case "hexagon":
          nodeDefinition = `${newNodeId}{{${nodeText}}}`;
          break;
        case "parallelogram":
          nodeDefinition = `${newNodeId}[/${nodeText}/]`;
          break;
        case "trapezoid":
          nodeDefinition = `${newNodeId}[/${nodeText}\\]`;
          break;
        case "doubleCircle":
          nodeDefinition = `${newNodeId}(((${nodeText})))`;
          break;
        case "image":
          // Image node uses special Mermaid syntax
          nodeDefinition = `${newNodeId}["📷 ${nodeText}"]`;
          break;
        case "text":
          // Text node uses rectangle style but adds text identifier
          nodeDefinition = `${newNodeId}["📝 ${nodeText}"]`;
          break;
        case "button":
          // Button node uses double circle style
          nodeDefinition = `${newNodeId}(((🔘 ${nodeText})))`;
          break;
      }

      // Check if code is empty or contains only whitespace
      const trimmedCode = mermaidCode.trim();
      let updatedCode = "";

      if (!trimmedCode) {
        // If code is empty, create new diagram
        updatedCode = `graph TD\n    ${nodeDefinition}`;
      } else {
        const lines = mermaidCode.split("\n");
        const newLines = [...lines];

        // Check if graph declaration already exists
        const hasGraphDeclaration = lines.some(
          (line) =>
            line.trim().startsWith("graph") ||
            line.trim().startsWith("flowchart") ||
            line.trim().startsWith("gitGraph") ||
            line.trim().startsWith("sequenceDiagram")
        );

        if (!hasGraphDeclaration) {
          // If no graph declaration exists, add one
          newLines.unshift("graph TD");
        }

        // Find appropriate position to insert node definition
        let insertIndex = -1;
        for (let i = 0; i < newLines.length; i++) {
          if (
            newLines[i].trim() &&
            !newLines[i].includes("-->") &&
            !newLines[i].includes("graph") &&
            !newLines[i].includes("flowchart")
          ) {
            // Insert after other node definitions
            insertIndex = i + 1;
          }
        }

        if (insertIndex === -1) {
          // If no suitable position found, insert after graph declaration
          const graphLineIndex = newLines.findIndex(
            (line) =>
              line.trim().startsWith("graph") ||
              line.trim().startsWith("flowchart")
          );
          insertIndex = graphLineIndex >= 0 ? graphLineIndex + 1 : 1;
        }

        newLines.splice(insertIndex, 0, `    ${nodeDefinition}`);

        // If connection target is specified, add connection line
        if (connectTo) {
          newLines.push(`    ${connectTo} --> ${newNodeId}`);
        }

        updatedCode = newLines.join("\n");
      }

      onCodeUpdate(updatedCode);
      onStatusMessage(`✅ Node added: ${newNodeId}`);

      return newNodeId;
    },
    [mermaidCode, generateNodeId, onCodeUpdate, onStatusMessage]
  );

  // Edit node text
  const editNodeText = useCallback(
    (nodeId: string, newText: string) => {
      if (!newText.trim()) return;

      const lines = mermaidCode.split("\n");

      // Define replacement patterns for each node type with proper regex
      // IMPORTANT: Order matters! More specific patterns must come before less specific ones
      // This order must match the order in getNodeDetails function
      const nodeReplacements = [
        // Rectangle with quotes pattern (most specific rectangle)
        {
          pattern: new RegExp(`(\\s*${nodeId}\\s*)\\["([^"]*)"\\]`),
          replacement: `$1["${newText}"]`
        },

        // Rounded with quotes pattern (most specific rounded)
        {
          pattern: new RegExp(`(\\s*${nodeId}\\s*)\\("([^"]*)"\\)`),
          replacement: `$1("${newText}")`
        },

        // Double Circle pattern (must come before Circle and Rounded)
        {
          pattern: new RegExp(`(\\s*${nodeId}\\s*)\\(\\(\\(([^)]*)\\)\\)\\)`),
          replacement: `$1(((${newText})))`
        },

        // Circle pattern (must come before Rounded)
        {
          pattern: new RegExp(`(\\s*${nodeId}\\s*)\\(\\(([^)]*)\\)\\)`),
          replacement: `$1((${newText}))`
        },

        // Stadium pattern (must come before Rounded)
        {
          pattern: new RegExp(`(\\s*${nodeId}\\s*)\\(\\[([^\\\\]]*)\\]\\)`),
          replacement: `$1([${newText}])`
        },

        // Cylindrical pattern (must come before Rectangle)
        {
          pattern: new RegExp(`(\\s*${nodeId}\\s*)\\[\\(([^)]*)\\)\\]`),
          replacement: `$1[(${newText})]`
        },

        // Subroutine pattern (must come before Rectangle)
        {
          pattern: new RegExp(`(\\s*${nodeId}\\s*)\\[\\[([^\\\\]]*)\\]\\]`),
          replacement: `$1[[${newText}]]`
        },

        // Parallelogram pattern (must come before Rectangle)
        {
          pattern: new RegExp(`(\\s*${nodeId}\\s*)\\[\\/([^\\/]*)\\/\\]`),
          replacement: `$1[/${newText}/]`
        },

        // Trapezoid pattern (must come before Rectangle)
        {
          pattern: new RegExp(`(\\s*${nodeId}\\s*)\\[\\/([^\\\\]*)\\\\\\]`),
          replacement: `$1[/${newText}\\]`
        },

        // Rectangle pattern (basic, comes after all specific rectangle patterns)
        {
          pattern: new RegExp(`(\\s*${nodeId}\\s*)\\[([^\\\\]]*)\\]`),
          replacement: `$1[${newText}]`
        },

        // Rounded pattern (basic, comes after all other parentheses patterns)
        {
          pattern: new RegExp(`(\\s*${nodeId}\\s*)\\(([^)]*)\\)`),
          replacement: `$1(${newText})`
        },

        // Hexagon pattern (must come before Diamond)
        {
          pattern: new RegExp(`(\\s*${nodeId}\\s*)\\{\\{([^}]*)\\}\\}`),
          replacement: `$1{{${newText}}}`
        },

        // Diamond pattern (comes after Hexagon)
        {
          pattern: new RegExp(`(\\s*${nodeId}\\s*)\\{([^}]*)\\}`),
          replacement: `$1{${newText}}`
        },

        // Label pattern
        {
          pattern: new RegExp(`(\\s*${nodeId}\\s*)>([^>]+)>`),
          replacement: `$1>${newText}>`
        }
      ];

      // Try to find and replace the node text
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        for (const { pattern, replacement } of nodeReplacements) {
          if (pattern.test(line)) {
            const newLine = line.replace(pattern, replacement);
            if (newLine !== line) {
              lines[i] = newLine;
              const newCode = lines.join("\n");
              onCodeUpdate(newCode);
              onStatusMessage(`✅ Node text updated: ${nodeId}`);
              return;
            }
          }
        }
      }

      // If no specific pattern matched, log for debugging
      console.warn(`Could not update text for node ${nodeId}. No matching pattern found.`);
    },
    [mermaidCode, onCodeUpdate, onStatusMessage]
  );

  // Delete node
  const deleteNode = useCallback(
    (nodeId: string) => {
      const lines = mermaidCode.split("\n");
      const newLines = lines.filter((line) => {
        // Remove node definition line
        const nodeDefPattern = new RegExp(`\\b${nodeId}[\\[\\(\\{]`);
        if (nodeDefPattern.test(line)) return false;

        // Remove connection lines containing this node
        const connectionPattern = new RegExp(`\\b${nodeId}\\b`);
        if (connectionPattern.test(line) && line.includes("-->")) return false;

        return true;
      });

      const updatedCode = newLines.join("\n");
      onCodeUpdate(updatedCode);
      onStatusMessage(`✅ Node deleted: ${nodeId}`);
    },
    [mermaidCode, onCodeUpdate, onStatusMessage]
  );

  // Get node ID from SVG element
  const getNodeIdFromElement = useCallback(
    (element: SVGElement): string | null => {
      // Traverse up the DOM tree to find node container
      let currentElement: Element | null = element;

      while (currentElement) {
        // Check current element's ID
        const id = currentElement.getAttribute("id");
        if (id && id.includes("flowchart-")) {
          // Extract actual node ID (remove prefix)
          return id.replace(/^flowchart-/, "").replace(/-\d+$/, "");
        }

        // Check other possible attributes
        const dataId = currentElement.getAttribute("data-id");
        if (dataId && dataId.includes("flowchart-")) {
          return dataId.replace(/^flowchart-/, "").replace(/-\d+$/, "");
        }

        // Check if class contains node information
        const className = currentElement.getAttribute("class") || "";
        if (className.includes("node") && currentElement.getAttribute("id")) {
          const nodeId = currentElement.getAttribute("id");
          if (nodeId && nodeId.includes("flowchart-")) {
            return nodeId.replace(/^flowchart-/, "").replace(/-\d+$/, "");
          }
        }

        // Search up to parent element
        currentElement = currentElement.parentElement;

        // If reached SVG root element, stop searching
        if (currentElement && currentElement.tagName === "svg") {
          break;
        }
      }

      return null;
    },
    []
  );

  const getNodeDetails = useCallback(
    (nodeId: string) => {
      const lines = mermaidCode.split("\n");
      let nodeText = "";
      let nodeComment = "";
      let nodeLineIndex = -1;

      // Comprehensive regex to capture node ID and its text from all node type definitions
      // IMPORTANT: Order matters! More specific patterns must come before less specific ones
      // e.g., (((text))) before ((text)) before (text), {{text}} before {text}, [/text/] before [text]
      const nodeContentRegex = new RegExp(
        `^\\s*${nodeId}\\s*(?:` +
        `(?:\\["([^"]*)\"\])|` +                    // Rectangle with quotes: [\"text\"]
        `(?:\\("([^"]*)"\\))|` +                    // Rounded with quotes: (\"text\")
        `(?:\\(\\(\\(([^)]+)\\)\\)\\))|` +          // Double Circle: (((text))) - Must come before Circle and Rounded
        `(?:\\(\\(([^)]*)\\)\\))|` +                // Circle: ((text)) - Must come before Rounded
        `(?:\\(\\[([^\\]]*)\\]\\))|` +               // Stadium: ([text]) - Must come before Rounded - Fixed: use * to allow empty content
        `(?:\\[\\(([^)]+)\\)\\])|` +                // Cylindrical: [(text)] - Must come before Rectangle
        `(?:\\[\\[([^\\]]*)\\]\\])|` +               // Subroutine: [[text]] - Must come before Rectangle - Fixed: use * to allow empty content
        `(?:\\[\\/([^\\/]+)\\/\\])|` +              // Parallelogram: [/text/] - Must come before Rectangle
        `(?:\\[\\/([^\\\\]+)\\\\\\])|` +            // Trapezoid: [/text\] - Must come before Rectangle
        `(?:\\[([^\\]]*)\])|` +                      // Rectangle: [text] - Must come after all other bracket patterns - Fixed: proper escaping for ]
        `(?:\\(([^)]*)\\))|` +                      // Rounded: (text) - Must come after all other parentheses patterns
        `(?:\\{\\{([^}]*)\\}\\})|` +                // Hexagon: {{text}} - Must come before Diamond
        `(?:\\{([^}]*)\\})|` +                      // Diamond: {text}
        `(?:>([^>]+)>)` +                           // Label: >text>
        `)`
      );

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(nodeContentRegex);

        if (match) {
          nodeLineIndex = i;
          // Extract text from any of the matching groups
          // Updated indices to match the reordered regex patterns
          const extractedText = (
            match[1] ||  // Rectangle with quotes
            match[2] ||  // Rounded with quotes
            match[3] ||  // Double Circle
            match[4] ||  // Circle
            match[5] ||  // Stadium
            match[6] ||  // Cylindrical
            match[7] ||  // Subroutine
            match[8] ||  // Parallelogram
            match[9] ||  // Trapezoid
            match[10] || // Rectangle
            match[11] || // Rounded
            match[12] || // Hexagon
            match[13] || // Diamond
            match[14] || // Label
            ""
          ).trim();

          // If extracted text is empty, use nodeId as fallback
          nodeText = extractedText || nodeId;
          // Remove potential icon prefixes from text, image, or button nodes
          nodeText = nodeText.replace(/^(📷|📝|🔘)\s*/, "");
          break;
        }
      }

      // If node found, check the next line for a comment
      if (nodeLineIndex !== -1 && nodeLineIndex + 1 < lines.length) {
        const nextLine = lines[nodeLineIndex + 1].trim();
        const commentMatch = nextLine.match(/^%%(.*)%%$/);
        if (commentMatch) {
          nodeComment = commentMatch[1].trim();
        }
      }

      return { nodeText, nodeComment };
    },
    [mermaidCode]
  );

  // Check if element is an operable node
  const isOperableNode = useCallback((element: SVGElement): boolean => {
    // Traverse up the DOM tree to find node container
    let currentElement: Element | null = element;

    while (currentElement) {
      // Check if it's a direct node element
      const isDirectNodeElement =
        currentElement.tagName === "rect" ||
        currentElement.tagName === "circle" ||
        currentElement.tagName === "path" ||
        currentElement.tagName === "polygon";

      // Check if it's a node group
      const isNodeGroup =
        currentElement.tagName === "g" &&
        (!!currentElement.querySelector("rect, circle, path, polygon") ||
          currentElement.classList.contains("node") ||
          currentElement.getAttribute("class")?.includes("node"));

      // Check if it's a text element (node label)
      const isNodeText =
        currentElement.tagName === "text" || currentElement.tagName === "tspan";

      // Check if ID contains node information
      const hasNodeId =
        currentElement.getAttribute("id")?.includes("flowchart-") ||
        currentElement.getAttribute("data-id")?.includes("flowchart-");

      if (isDirectNodeElement || isNodeGroup || (isNodeText && hasNodeId)) {
        return true;
      }

      // Search up to parent element
      currentElement = currentElement.parentElement;

      // If reached SVG root element, stop searching
      if (currentElement && currentElement.tagName === "svg") {
        break;
      }
    }

    return false;
  }, []);

  // Handle context menu - now shows delete and add node options in edit mode
  const handleContextMenu = useCallback(
    (e: MouseEvent) => {
      // Allow context menu in node edit mode OR edge edit mode
      if (!isEnabled || (!isEditMode && !isOperationMode && !isEdgeEditMode))
        return;

      const target = e.target as SVGElement;
      if (!target || !isOperableNode(target)) return;

      e.preventDefault();
      e.stopPropagation();

      const nodeId = getNodeIdFromElement(target);
      if (!nodeId) return;

      const { nodeText, nodeComment } = getNodeDetails(nodeId);

      const outgoingEdges: OutgoingEdge[] = [];
      if (isEdgeEditMode) {
        for (const [edgeId, edgeData] of edgeMap.entries()) {
          if (edgeId.startsWith(`${nodeId}-`)) {
            outgoingEdges.push({ id: edgeId, rawLine: edgeData.rawLine });
          }
        }
      }

      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      setContextMenu({
        isOpen: true,
        x: e.clientX - containerRect.x,
        y: e.clientY - containerRect.y,
        nodeId,
        nodeText,
        nodeComment,
        outgoingEdges,
        isEdgeContext: isEdgeEditMode,
      });
    },
    [
      isEnabled,
      isEditMode,
      isOperationMode,
      isEdgeEditMode,
      getNodeIdFromElement,
      isOperableNode,
      getNodeDetails,
      edgeMap,
    ]
  );

  // Handle mouse down event (only for drag start)
  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      // Only handle mousedown events in edit mode
      if (!isEnabled || !isEditMode) return;

      // Prevent right-click dragging
      if (e.button !== 0) return;

      const target = e.target as SVGElement;
      if (!target || !isOperableNode(target)) return;

      const nodeId = getNodeIdFromElement(target);
      if (!nodeId) return;

      // Prepare for dragging
      setDraggedNode(nodeId);
      setDragStartPos({ x: e.clientX, y: e.clientY });
      onStatusMessage(`🎯 Started dragging node: ${nodeId}`);
    },
    [
      isEnabled,
      isEditMode,
      getNodeIdFromElement,
      isOperableNode,
      onStatusMessage,
    ]
  );

  // Handle drag move
  const handleDragMove = useCallback(
    (_e: MouseEvent) => {
      if (!draggedNode || !dragStartPos) return;

      // Visual feedback can be added here, such as showing drag outline
      // Actual node reordering will be handled when drag ends
    },
    [draggedNode, dragStartPos]
  );

  // Handle drag end
  const handleDragEnd = useCallback(
    (e: MouseEvent) => {
      if (!draggedNode || !dragStartPos) return;

      const target = e.target as SVGElement;
      const targetNodeId = getNodeIdFromElement(target);

      const dragDistance = Math.sqrt(
        Math.pow(e.clientX - dragStartPos.x, 2) +
          Math.pow(e.clientY - dragStartPos.y, 2)
      );

      // Only execute operation when there's significant drag distance
      if (dragDistance > 10) {
        // 10px threshold
        if (targetNodeId && targetNodeId !== draggedNode) {
          // Dragged to another node: swap positions
          swapNodes(draggedNode, targetNodeId);
        } else {
          // Dragged to empty area: adjust relative position
          reorderNode(
            draggedNode,
            e.clientX - dragStartPos.x,
            e.clientY - dragStartPos.y
          );
        }
      }

      setDraggedNode(null);
      setDragStartPos(null);
      onStatusMessage(`📍 Drag ended`);
    },
    [draggedNode, dragStartPos, getNodeIdFromElement, onStatusMessage]
  );

  // Reorder nodes to affect layout
  const reorderNode = useCallback(
    (nodeId: string, deltaX: number, deltaY: number) => {
      const lines = mermaidCode.split("\n");
      const nodeDefinitions: { id: string; line: string }[] = [];
      const connectionLines: string[] = [];
      const otherLines: string[] = [];

      // Separate node definitions, connections, and other lines
      lines.forEach((line) => {
        const trimmedLine = line.trim();
        const match = trimmedLine.match(
          /^(\w+)(?:\s*\[.*]|\s*\(.*\)|\s*\{.*\})/
        );
        if (match) {
          nodeDefinitions.push({ id: match[1], line });
        } else if (trimmedLine.includes("-->")) {
          connectionLines.push(line);
        } else {
          otherLines.push(line);
        }
      });

      const draggedNodeIndex = nodeDefinitions.findIndex(
        (def) => def.id === nodeId
      );
      if (draggedNodeIndex === -1) return;

      const draggedNodeDef = nodeDefinitions.splice(draggedNodeIndex, 1)[0];

      // Determine insertion position based on primary drag direction
      let targetIndex = draggedNodeIndex;
      const threshold = 10;

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal direction primary
        if (deltaX > threshold && draggedNodeIndex < nodeDefinitions.length) {
          targetIndex = draggedNodeIndex + 1; // Drag right, move down
        } else if (deltaX < -threshold && draggedNodeIndex > 0) {
          targetIndex = draggedNodeIndex - 1; // Drag left, move up
        }
      } else {
        // Vertical direction primary
        if (deltaY > threshold && draggedNodeIndex < nodeDefinitions.length) {
          targetIndex = draggedNodeIndex + 1; // Drag down, move down
        } else if (deltaY < -threshold && draggedNodeIndex > 0) {
          targetIndex = draggedNodeIndex - 1; // Drag up, move up
        }
      }

      nodeDefinitions.splice(targetIndex, 0, draggedNodeDef);

      const newCode = [
        ...otherLines,
        ...nodeDefinitions.map((def) => def.line),
        ...connectionLines,
      ].join("\n");

      onCodeUpdate(newCode);
      onStatusMessage(`🔄 Node ${nodeId} position adjusted`);
    },
    [mermaidCode, onCodeUpdate, onStatusMessage]
  );

  const swapNodes = useCallback(
    (nodeAId: string, nodeBId: string) => {
      const lines = mermaidCode.split("\n");
      const nodeADefinition = { index: -1, line: "" };
      const nodeBDefinition = { index: -1, line: "" };

      // Find the definitions of both nodes
      lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        const match = trimmedLine.match(
          /^(\w+)(?:\s*\[.*]|\s*\(.*\)|\s*\{.*\})/
        );
        if (match) {
          if (match[1] === nodeAId) {
            nodeADefinition.index = index;
            nodeADefinition.line = line;
          } else if (match[1] === nodeBId) {
            nodeBDefinition.index = index;
            nodeBDefinition.line = line;
          }
        }
      });

      if (nodeADefinition.index !== -1 && nodeBDefinition.index !== -1) {
        // Swap the lines in the array
        const newLines = [...lines];
        newLines[nodeADefinition.index] = nodeBDefinition.line;
        newLines[nodeBDefinition.index] = nodeADefinition.line;

        const newCode = newLines.join("\n");
        onCodeUpdate(newCode);
        onStatusMessage(`🔄 Swapped nodes ${nodeAId} and ${nodeBId}`);
      }
    },
    [mermaidCode, onCodeUpdate, onStatusMessage]
  );

  // Change node type
  const changeNodeType = useCallback(
    (nodeId: string, newType: NodeType) => {
      const lines = mermaidCode.split("\n");
      const newLines = [...lines];

      // Regex to capture node ID and its text from various definitions
      const nodeContentRegex =
        /(\w+)\s*(?:(?:\["([^"]*)"\])|(?:\[([^\]]*)\])|(?:\("([^"]*)"\))|(?:\(\(([^)]*)\)\))|(?:\(([^)]*)\))|(?:\{([^}]*)\}))/;

      for (let i = 0; i < newLines.length; i++) {
        const line = newLines[i].trim();
        const match = line.match(nodeContentRegex);

        if (match && match[1] === nodeId) {
          // Extract text from any of the matching groups
          let text = (
            match[2] ||
            match[3] ||
            match[4] ||
            match[5] ||
            match[6] ||
            match[7] ||
            nodeId
          ).trim();

          // Remove potential icon prefixes from text, image, or button nodes
          text = text.replace(/^(📷|📝|🔘)\s*/, "");

          let newNodeDef = "";
          switch (newType) {
            case "rectangle":
              newNodeDef = `${nodeId}[${text}]`;
              break;
            case "rounded":
              newNodeDef = `${nodeId}(${text})`;
              break;
            case "diamond":
              newNodeDef = `${nodeId}{${text}}`;
              break;
            case "circle":
              newNodeDef = `${nodeId}((${text}))`;
              break;
            case "stadium":
              newNodeDef = `${nodeId}([${text}])`;
              break;
            case "subroutine":
              newNodeDef = `${nodeId}[[${text}]]`;
              break;
            case "cylindrical":
              newNodeDef = `${nodeId}[(${text})]`;
              break;
            case "hexagon":
              newNodeDef = `${nodeId}{{${text}}}`;
              break;
            case "parallelogram":
              newNodeDef = `${nodeId}[/${text}/]`;
              break;
            case "trapezoid":
              newNodeDef = `${nodeId}[/${text}\\]`;
              break;
            case "doubleCircle":
              newNodeDef = `${nodeId}(((${text})))`;
              break;
            case "image":
              newNodeDef = `${nodeId}["📷 ${text}"]`;
              break;
            case "text":
              newNodeDef = `${nodeId}["📝 ${text}"]`;
              break;
            case "button":
              newNodeDef = `${nodeId}(((🔘 ${text})))`;
              break;
          }
          const indentation = lines[i].match(/^\s*/)?.[0] || "";
          newLines[i] = indentation + newNodeDef;

          const updatedCode = newLines.join("\n");
          onCodeUpdate(updatedCode);
          onStatusMessage(`✅ Node ${nodeId} type changed`);
          return;
        }
      }
    },
    [mermaidCode, onCodeUpdate, onStatusMessage]
  );

  const renameNodeId = useCallback(
    (oldNodeId: string, newNodeId: string) => {
      // Sanitize the new node ID by replacing spaces with underscores
      const sanitizedNodeId = newNodeId.trim().replace(/\s+/g, "_");

      if (!sanitizedNodeId || sanitizedNodeId === oldNodeId) return;

      const lines = mermaidCode.split("\n");
      const existingIds = new Set<string>();
      for (const line of lines) {
        // A more robust regex to find node IDs at the beginning of a line, handling spaces
        const matches = line.trim().match(/^(\w+)/);
        if (matches && matches[1]) {
          existingIds.add(matches[1]);
        }
      }

      // Check if the sanitized ID already exists
      if (existingIds.has(sanitizedNodeId)) {
        onStatusMessage(`❌ Node ID "${sanitizedNodeId}" already exists`);
        return;
      }

      // Use word boundaries to avoid replacing parts of other words
      const regex = new RegExp(`\\b${oldNodeId}\\b`, "g");
      const updatedCode = mermaidCode.replace(regex, sanitizedNodeId);

      onCodeUpdate(updatedCode);
      onStatusMessage(`✅ Node ID updated from ${oldNodeId} to ${sanitizedNodeId}`);
    },
    [mermaidCode, onCodeUpdate, onStatusMessage]
  );

  const applyStyling = useCallback(
    (nodeId: string, styling: string) => {
      const lines = mermaidCode.split("\n");
      const styleRegex = new RegExp(`^\\s*style ${nodeId} `);
      let styleExists = false;

      const newLines = lines.map((line) => {
        if (styleRegex.test(line)) {
          styleExists = true;
          // Preserve indentation
          const indentation = line.match(/^\s*/)?.[0] || "";
          return `${indentation}style ${nodeId} ${styling}`;
        }
        return line;
      });

      if (!styleExists) {
        // Find a good place to insert the new style, e.g., after the graph definition
        const graphDefIndex = newLines.findIndex((l) =>
          l.trim().startsWith("graph")
        );
        const insertIndex =
          graphDefIndex !== -1 ? graphDefIndex + 1 : newLines.length;
        newLines.splice(insertIndex, 0, `    style ${nodeId} ${styling}`);
      }

      const updatedCode = newLines.join("\n");
      onCodeUpdate(updatedCode);
      onStatusMessage(`✅ Style applied to node ${nodeId}`);
    },
    [mermaidCode, onCodeUpdate, onStatusMessage]
  );

  const addComment = useCallback(
    (nodeId: string, comment: string) => {
      const lines = mermaidCode.split("\n");
      let nodeLineIndex = -1;

      // More robust regex to find the node definition line, ignoring connections
      const nodeDefRegex = new RegExp(
        `^\\s*${nodeId}(?:\\s*\\[.*\]|\\s*\\(.*\\)|\\s*\\{.*\\})`
      );

      for (let i = 0; i < lines.length; i++) {
        if (nodeDefRegex.test(lines[i].trim())) {
          nodeLineIndex = i;
          break;
        }
      }

      if (nodeLineIndex === -1) {
        onStatusMessage(`❌ Node definition not found: ${nodeId}`);
        return;
      }

      const commentLineIndex = nodeLineIndex + 1;
      const hasCommentLine =
        commentLineIndex < lines.length &&
        lines[commentLineIndex].trim().startsWith("%%");

      // If the new comment is empty, remove the existing comment line
      if (!comment.trim()) {
        if (hasCommentLine) {
          lines.splice(commentLineIndex, 1);
        }
      } else {
        const indentation = lines[nodeLineIndex].match(/^\s*/)?.[0] || "    ";
        const newCommentLine = `${indentation}%% ${comment.trim()} %%`;
        if (hasCommentLine) {
          lines[commentLineIndex] = newCommentLine;
        } else {
          lines.splice(commentLineIndex, 0, newCommentLine);
        }
      }

      onCodeUpdate(lines.join("\n"));
      onStatusMessage(`✅ Node comment updated: ${nodeId}`);
    },
    [mermaidCode, onCodeUpdate, onStatusMessage]
  );

  // Close context menu
  const closeContextMenu = useCallback(() => {
    setContextMenu({ isOpen: false, x: 0, y: 0 });
  }, []);

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isEnabled || !isOperationMode) return;

      if (e.key === "Delete" && contextMenu.nodeId) {
        e.preventDefault();
        deleteNode(contextMenu.nodeId);
        closeContextMenu();
      } else if (e.key === "Escape") {
        closeContextMenu();
      }
    },
    [
      isEnabled,
      isOperationMode,
      contextMenu.nodeId,
      deleteNode,
      closeContextMenu,
    ]
  );

  // Bind event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isEnabled) return;

    container.addEventListener("contextmenu", handleContextMenu);
    container.addEventListener("mousedown", handleMouseDown);

    document.addEventListener("mousemove", handleDragMove);
    document.addEventListener("mouseup", handleDragEnd);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("click", closeContextMenu);

    return () => {
      container.removeEventListener("contextmenu", handleContextMenu);
      container.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mousemove", handleDragMove);
      document.removeEventListener("mouseup", handleDragEnd);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("click", closeContextMenu);
    };
  }, [
    handleContextMenu,
    handleMouseDown,
    handleDragMove,
    handleDragEnd,
    handleKeyDown,
    closeContextMenu,
    isEnabled,
  ]);

  // Toggle node operation mode
  const toggleOperationMode = useCallback(() => {
    setIsOperationMode((prev) => {
      const newMode = !prev;
      if (!newMode) {
        // Clean up state when exiting operation mode
        setContextMenu({ isOpen: false, x: 0, y: 0 });
        setDraggedNode(null);
        setDragStartPos(null);
      }
      onStatusMessage(
        newMode
          ? "🛠️ Node operation mode enabled, right-click nodes to see options"
          : "👁️ Node operation mode disabled"
      );
      return newMode;
    });
  }, [onStatusMessage]);

  return {
    containerRef,
    isOperationMode,
    contextMenu,
    draggedNode,
    // Operation methods
    addNode,
    deleteNode,
    editNodeText,
    toggleOperationMode,
    closeContextMenu,
    changeNodeType,
    renameNodeId,
    // Utility methods
    parseNodes,
    generateNodeId,
    generateSmartNodeId, // Smart ID generation based on text content
    debugExtractedIds, // Debug function for testing node ID extraction
    // Status queries
    isOperating: !!draggedNode || contextMenu.isOpen,
    applyStyling,
    addComment,
  };
}
