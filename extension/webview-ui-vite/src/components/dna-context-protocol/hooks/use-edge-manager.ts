import { useState, useCallback, useEffect } from 'react';

interface EdgeManagerOptions {
  mermaidCode: string;
  onCodeUpdate: (newCode: string) => void;
  onStatusMessage: (message: string) => void;
}

// Connection line style type definitions
export const EDGE_TYPES = [
  // 基础箭头样式
  { value: '-->', label: '-->', description: 'Standard arrow' },
  { value: '-.->', label: '-.->', description: 'Dashed arrow' },
  { value: '==>', label: '==>', description: 'Thick arrow' },
  { value: '-..->', label: '-..->', description: 'Dotted arrow' },

  // 无箭头连接线
  { value: '---', label: '---', description: 'Solid line' },
  { value: '-.-', label: '-.-', description: 'Dashed line' },
  { value: '===', label: '===', description: 'Thick line' },

  // 双向箭头
  { value: '<-->', label: '<-->', description: 'Bidirectional arrow' },
  { value: '<-.->', label: '<-.->', description: 'Bidirectional dashed' },
  { value: '<===>', label: '<===>', description: 'Bidirectional thick' },

  // 圆圈箭头
  { value: '--o', label: '--o', description: 'Circle arrow' },
  { value: '-.->o', label: '-.->o', description: 'Dashed circle arrow' },
  { value: 'o--o', label: 'o--o', description: 'Double circle' },

  // 叉号箭头
  { value: '--x', label: '--x', description: 'Cross arrow' },
  { value: '-.->x', label: '-.->x', description: 'Dashed cross arrow' },
  { value: 'x--x', label: 'x--x', description: 'Double cross' },

  // 不同长度连接线
  { value: '----', label: '----', description: 'Medium line' },
  { value: '-----', label: '-----', description: 'Long line' },
  { value: '------', label: '------', description: 'Extra long line' },
  { value: '----->', label: '----->', description: 'Long arrow' },
  { value: '------>', label: '------>', description: 'Extra long arrow' },

  // 特殊连接线
  { value: '~~~', label: '~~~', description: 'Invisible connection' },

  // 自连接
  {
    value: 'SELF_LOOP',
    label: 'Self Loop',
    description: 'Self connection loop',
  },
  {
    value: 'SELF_DOUBLE',
    label: 'Self Double',
    description: 'Self bidirectional',
  },

  // 带标签的常用分支
  { value: '-->|Yes|', label: '-->|Yes|', description: 'Yes branch' },
  { value: '-->|No|', label: '-->|No|', description: 'No branch' },
  { value: '-->|true|', label: '-->|true|', description: 'True branch' },
  { value: '-->|false|', label: '-->|false|', description: 'False branch' },
  {
    value: '-->|Success|',
    label: '-->|Success|',
    description: 'Success branch',
  },
  {
    value: '-->|Failure|',
    label: '-->|Failure|',
    description: 'Failure branch',
  },
] as const;

export function useEdgeManager({
  mermaidCode,
  onCodeUpdate,
  onStatusMessage,
}: EdgeManagerOptions) {
  const [edgeMap, setEdgeMap] = useState(
    new Map<string, { lineNumber: number; rawLine: string }>()
  );

  const parseAndIndexEdges = useCallback(() => {
    const newEdgeMap = new Map<
      string,
      { lineNumber: number; rawLine: string }
    >();
    const edgeCounters = new Map<string, number>();
    const lines = mermaidCode.split('\n');

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      const nodePattern = '\\w+(?:\\[[^\\]]*\\]|\\{[^}]*\\}|\\([^)]*\\))?';
      const captureNodePattern = `(${nodePattern})`;
      const labeledRegex = new RegExp(
        `^${captureNodePattern}\\s*(-->|-.->|==>|-\\.\\.->|<-->|<-.->|<===>|--o|-.->o|--x|-.->x|----->|------>)\\s*\\|([^|]+)\\|\\s*${captureNodePattern}`
      );
      // 新增：支持 A -- 标签 --> B 格式
      const dashLabelRegex = new RegExp(
        `^${captureNodePattern}\\s*--\\s*([^-]+)\\s*-->\\s*${captureNodePattern}`
      );
      const normalRegex = new RegExp(
        `^${captureNodePattern}\\s*(-->|-.->|==>|-\\.\\.->|---|===|-\\.-|<-->|<-.->|<===>|--o|-.->o|o--o|--x|-.->x|x--x|----|-----|------|----->|------>|~~~)\\s*${captureNodePattern}`
      );

      let sourceDef = null;
      let targetDef = null;

      // 首先尝试标准标签格式 A -->|标签| B
      const labeledMatch = trimmedLine.match(labeledRegex);
      if (labeledMatch) {
        sourceDef = labeledMatch[1];
        targetDef = labeledMatch[4];
      }
      // 然后尝试破折号标签格式 A -- 标签 --> B
      else {
        const dashLabelMatch = trimmedLine.match(dashLabelRegex);
        if (dashLabelMatch) {
          sourceDef = dashLabelMatch[1];
          targetDef = dashLabelMatch[3];
        } else {
          const normalMatch = trimmedLine.match(normalRegex);
          if (normalMatch) {
            sourceDef = normalMatch[1];
            targetDef = normalMatch[3];
          }
        }
      }

      if (sourceDef && targetDef) {
        const sourceIdMatch = sourceDef.match(/\w+/);
        const targetIdMatch = targetDef.match(/\w+/);

        if (sourceIdMatch && targetIdMatch) {
          const sourceId = sourceIdMatch[0];
          const targetId = targetIdMatch[0];
          const baseId = `${sourceId}-${targetId}`;
          const count = edgeCounters.get(baseId) || 0;
          const uniqueEdgeId = `${baseId}-${count}`;

          newEdgeMap.set(uniqueEdgeId, { lineNumber: index, rawLine: line });
          edgeCounters.set(baseId, count + 1);
        }
      }
    });

    setEdgeMap(newEdgeMap);
  }, [mermaidCode]);

  useEffect(() => {
    parseAndIndexEdges();
  }, [parseAndIndexEdges]);

  const deleteEdge = useCallback(
    (edgeId: string) => {
      const edgeToDelete = edgeMap.get(edgeId);
      if (!edgeToDelete) {
        onStatusMessage(`❌ Cannot find connection line: ${edgeId}`);
        return;
      }

      const lines = mermaidCode.split('\n');
      lines.splice(edgeToDelete.lineNumber, 1);
      const updatedCode = lines.join('\n');

      onCodeUpdate(updatedCode);
      onStatusMessage(`✅ Connection line deleted: ${edgeId}`);
    },
    [mermaidCode, onCodeUpdate, onStatusMessage, edgeMap]
  );

  const changeEdgeType = useCallback(
    (edgeId: string, newType: string) => {
      const edgeToChange = edgeMap.get(edgeId);
      if (!edgeToChange) {
        onStatusMessage(`❌ Cannot find connection line: ${edgeId}`);
        return;
      }

      const lines = mermaidCode.split('\n');
      const currentLine = lines[edgeToChange.lineNumber];

      const nodePattern = '\\w+(?:\\[[^\\]]*\\]|\\{[^}]*\\}|\\([^)]*\\))?';
      const captureNodePattern = `(${nodePattern})`;
      const labeledRegex = new RegExp(
        `^${captureNodePattern}\\s*(-->|-.->|==>|-\\.\\.->|<-->|<-.->|<===>|--o|-.->o|--x|-.->x|----->|------>)\\s*\\|([^|]+)\\|\\s*${captureNodePattern}`
      );
      // 新增：支持 A -- 标签 --> B 格式
      const dashLabelRegex = new RegExp(
        `^${captureNodePattern}\\s*--\\s*([^-]+)\\s*-->\\s*${captureNodePattern}`
      );
      const normalRegex = new RegExp(
        `^${captureNodePattern}\\s*(-->|-.->|==>|-\\.\\.->|---|===|-\\.-|<-->|<-.->|<===>|--o|-.->o|o--o|--x|-.->x|x--x|----|-----|------|----->|------>|~~~)\\s*${captureNodePattern}`
      );

      let sourceDef = null;
      let targetDef = null;

      // 首先尝试标准标签格式 A -->|标签| B
      const labeledMatch = currentLine.trim().match(labeledRegex);
      if (labeledMatch) {
        sourceDef = labeledMatch[1];
        targetDef = labeledMatch[4];
      }
      // 然后尝试破折号标签格式 A -- 标签 --> B
      else {
        const dashLabelMatch = currentLine.trim().match(dashLabelRegex);
        if (dashLabelMatch) {
          sourceDef = dashLabelMatch[1];
          targetDef = dashLabelMatch[3];
        } else {
          const normalMatch = currentLine.trim().match(normalRegex);
          if (normalMatch) {
            sourceDef = normalMatch[1];
            targetDef = normalMatch[3];
          }
        }
      }

      if (!sourceDef || !targetDef) {
        onStatusMessage(`❌ Cannot parse connection line format: ${edgeId}`);
        return;
      }

      // Build new connection line
      let newLine;
      if (newType === 'SELF_LOOP') {
        // Self loop: A --> A
        newLine = `    ${sourceDef} --> ${sourceDef}`;
      } else if (newType === 'SELF_DOUBLE') {
        // Self double: A <--> A
        newLine = `    ${sourceDef} <--> ${sourceDef}`;
      } else if (newType.includes('|')) {
        // Labeled connection line format: A -->|label| B
        newLine = `    ${sourceDef} ${newType} ${targetDef}`;
      } else {
        // Regular connection line format: A --> B
        newLine = `    ${sourceDef} ${newType} ${targetDef}`;
      }

      // Replace the line
      lines[edgeToChange.lineNumber] = newLine;

      // Special handling for ~~~ (invisible connection)
      if (newType === '~~~') {
        // Calculate the edge index to remove corresponding linkStyle
        let edgeIndex = 0;
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          const nodePattern = '\\w+(?:\\[[^\\]]*\\]|\\{[^}]*\\}|\\([^)]*\\))?';
          const captureNodePattern = `(${nodePattern})`;

          // 标准格式
          const edgeRegex = new RegExp(
            `^${captureNodePattern}\\s*(-->|-.->|==>|-\\.\\.->|---|===|-\\.-|<-->|<-.->|<===>|--o|-.->o|o--o|--x|-.->x|x--x|----|-----|------|----->|------>|~~~)\\s*(?:\\|[^|]*\\|\\s*)?${captureNodePattern}`
          );

          // 破折号标签格式 A -- 标签 --> B
          const dashLabelRegex = new RegExp(
            `^${captureNodePattern}\\s*--\\s*([^-]+)\\s*-->\\s*${captureNodePattern}`
          );

          if (edgeRegex.test(line) || dashLabelRegex.test(line)) {
            if (i === edgeToChange.lineNumber) {
              break;
            }
            edgeIndex++;
          }
        }

        // Remove corresponding linkStyle if exists
        const linkStyleRegex = new RegExp(`^\\s*linkStyle ${edgeIndex} `);
        for (let i = lines.length - 1; i >= 0; i--) {
          if (linkStyleRegex.test(lines[i])) {
            lines.splice(i, 1);
            break;
          }
        }
      }

      const updatedCode = lines.join('\n');
      onCodeUpdate(updatedCode);
      onStatusMessage(
        `✅ Connection line style changed: ${edgeId} -> ${newType}${newType === '~~~' ? ' (color removed for invisibility)' : ''}`
      );
    },
    [mermaidCode, onCodeUpdate, onStatusMessage, edgeMap]
  );

  const applyEdgeColor = useCallback(
    (edgeId: string, colorStyle: string) => {
      const edgeToColor = edgeMap.get(edgeId);
      if (!edgeToColor) {
        onStatusMessage(`❌ Cannot find connection line: ${edgeId}`);
        return;
      }

      const lines = mermaidCode.split('\n');

      // Check if the edge is invisible (~~~) - cannot apply color to invisible edges
      const currentLine = lines[edgeToColor.lineNumber];
      if (currentLine && currentLine.includes('~~~')) {
        onStatusMessage(
          `❌ Cannot apply color to invisible connection (~~~): ${edgeId}`
        );
        return;
      }

      // Calculate the edge index by counting actual connection lines in the code
      // (not by edgeMap order, but by appearance order in the code)
      let edgeIndex = 0;
      let foundTargetEdge = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const nodePattern = '\\w+(?:\\[[^\\]]*\\]|\\{[^}]*\\}|\\([^)]*\\))?';
        const captureNodePattern = `(${nodePattern})`;

        // 标准标签格式和普通格式
        const edgeRegex = new RegExp(
          `^${captureNodePattern}\\s*(-->|-.->|==>|-\\.\\.->|---|===|-\\.-|<-->|<-.->|<===>|--o|-.->o|o--o|--x|-.->x|x--x|----|-----|------|----->|------>|~~~)\\s*(?:\\|[^|]*\\|\\s*)?${captureNodePattern}`
        );

        // 破折号标签格式 A -- 标签 --> B
        const dashLabelRegex = new RegExp(
          `^${captureNodePattern}\\s*--\\s*([^-]+)\\s*-->\\s*${captureNodePattern}`
        );

        if (edgeRegex.test(line) || dashLabelRegex.test(line)) {
          // Check if this is our target edge by comparing with the stored line
          if (i === edgeToColor.lineNumber) {
            foundTargetEdge = true;
            break;
          }
          edgeIndex++;
        }
      }

      if (!foundTargetEdge) {
        onStatusMessage(`❌ Cannot locate connection line in code: ${edgeId}`);
        return;
      }

      // Check if linkStyle already exists for this edge
      const linkStyleRegex = new RegExp(`^\\s*linkStyle ${edgeIndex} `);
      let linkStyleExists = false;
      let linkStyleLineIndex = -1;

      for (let i = 0; i < lines.length; i++) {
        if (linkStyleRegex.test(lines[i])) {
          linkStyleExists = true;
          linkStyleLineIndex = i;
          break;
        }
      }

      if (linkStyleExists && linkStyleLineIndex !== -1) {
        // Update existing linkStyle
        const indentation = lines[linkStyleLineIndex].match(/^\s*/)?.[0] || '';
        lines[linkStyleLineIndex] =
          `${indentation}linkStyle ${edgeIndex} ${colorStyle}`;
      } else {
        // Add new linkStyle after all the edges but before any existing linkStyles
        let insertIndex = lines.length;

        // Find the last edge line
        for (let i = lines.length - 1; i >= 0; i--) {
          const line = lines[i].trim();
          const nodePattern = '\\w+(?:\\[[^\\]]*\\]|\\{[^}]*\\}|\\([^)]*\\))?';
          const captureNodePattern = `(${nodePattern})`;
          const edgeRegex = new RegExp(
            `^${captureNodePattern}\\s*(-->|-.->|==>|-\\.\\.->|---|===|-\\.-|<-->|<-.->|<===>|--o|-.->o|o--o|--x|-.->x|x--x|----|-----|------|----->|------>|~~~)\\s*(?:\\|[^|]*\\|\\s*)?${captureNodePattern}`
          );

          if (edgeRegex.test(line)) {
            insertIndex = i + 1;
            break;
          }
        }

        lines.splice(
          insertIndex,
          0,
          `    linkStyle ${edgeIndex} ${colorStyle}`
        );
      }

      const updatedCode = lines.join('\n');
      onCodeUpdate(updatedCode);
      onStatusMessage(
        `✅ Connection line color applied: ${edgeId} (index: ${edgeIndex})`
      );
    },
    [mermaidCode, onCodeUpdate, onStatusMessage, edgeMap]
  );

  return { edgeMap, deleteEdge, changeEdgeType, applyEdgeColor };
}
