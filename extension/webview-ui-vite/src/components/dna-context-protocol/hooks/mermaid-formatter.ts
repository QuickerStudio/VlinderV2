/**
 * Mermaid代码智能格式化器
 *
 * 功能特点：
 * - 智能识别和合并分离的Mermaid语法元素
 * - 两轮处理机制确保完整的语法组合
 * - 支持多种图表类型和节点形状
 * - 统一的缩进和格式规则
 *
 * @author DNA Context Protocol Team
 */

/**
 * 获取节点形状匹配正则表达式
 */
function getShapePattern(): RegExp {
  return /^(\[.*?\]|\(.*?\)|\{.*?\}|\(\(.*?\)\)|\[\[.*?\]\]|\(\[.*?\]\)|\[\(.*?\)\]|\{\{.*?\}\}|\[\/.*?\/\]|\[\\.*?\\\]|\>\[.*?\]\]|\[\[.*?\]<)$/;
}

/**
 * 尝试构建完整的连接语句
 * @param lines 所有行
 * @param startIndex 开始索引
 * @returns 连接结果或null
 */
function tryBuildConnection(
  lines: string[],
  startIndex: number
): { statement: string; nextIndex: number } | null {
  let i = startIndex;
  const parts: string[] = [];

  // 检查是否是节点ID开始
  const nodeIdMatch = lines[i]?.match(/^([A-Za-z_][A-Za-z0-9_]*)$/);
  if (!nodeIdMatch) return null;

  const nodeId = nodeIdMatch[1];
  parts.push(nodeId);
  i++;

  // 检查是否有节点形状
  if (i < lines.length) {
    const shapeMatch = lines[i]?.match(getShapePattern());
    if (shapeMatch) {
      parts[0] += shapeMatch[1]; // 合并到节点ID
      i++;
    }
  }

  // 检查是否有连接符（包括序列图和类图的特殊连接符）
  if (i < lines.length) {
    const connectionMatch = lines[i]?.match(
      /^(-->|---|-\.-|==>|===|-.->|<-->|<--->|x--x|o--o|->>|-->>|-\)|-\(|<\|--|--\|>|\|\|--|\.\.\.|<\.\.|\.\.>)$/
    );
    if (connectionMatch) {
      parts.push(connectionMatch[1]);
      i++;

      // 检查是否有连接标签
      if (i < lines.length) {
        const labelMatch = lines[i]?.match(/^\|(.+?)\|$|^:(.+):$/);
        if (labelMatch) {
          parts.push(labelMatch[0]);
          i++;
        }
      }

      // 检查目标节点
      if (i < lines.length) {
        const targetNodeMatch = lines[i]?.match(/^([A-Za-z_][A-Za-z0-9_]*)$/);
        if (targetNodeMatch) {
          let targetPart = targetNodeMatch[1];
          i++;

          // 检查目标节点形状
          if (i < lines.length) {
            const targetShapeMatch = lines[i]?.match(getShapePattern());
            if (targetShapeMatch) {
              targetPart += targetShapeMatch[1];
              i++;
            }
          }

          parts.push(targetPart);

          // 如果成功构建了完整的连接语句
          if (parts.length >= 3) {
            return {
              statement: parts.join(' '),
              nextIndex: i,
            };
          }
        }
      }
    }
  }

  return null;
}

/**
 * 尝试构建简单的连接语句（从连接符开始）
 */
function tryBuildSimpleConnection(
  lines: string[],
  startIndex: number
): { statement: string; nextIndex: number } | null {
  let i = startIndex;
  const parts: string[] = [];

  // 检查是否是连接符开始
  const connectionMatch = lines[i]?.match(
    /^(-->|---|-\.-|==>|===|-.->|<-->|<--->|x--x|o--o|->>|-->>|-\)|-\(|<\|--|--\|>|\|\|--|\.\.\.|<\.\.|\.\.>)$/
  );
  if (!connectionMatch) return null;

  parts.push(connectionMatch[1]);
  i++;

  // 检查是否有连接标签
  if (i < lines.length) {
    const labelMatch = lines[i]?.match(/^\|(.+?)\|$|^:(.+):$/);
    if (labelMatch) {
      parts.push(labelMatch[0]);
      i++;
    }
  }

  // 检查目标节点
  if (i < lines.length) {
    const targetNodeMatch = lines[i]?.match(/^([A-Za-z_][A-Za-z0-9_]*)$/);
    if (targetNodeMatch) {
      let targetPart = targetNodeMatch[1];
      i++;

      // 检查目标节点形状
      if (i < lines.length) {
        const targetShapeMatch = lines[i]?.match(getShapePattern());
        if (targetShapeMatch) {
          targetPart += targetShapeMatch[1];
          i++;
        }
      }

      parts.push(targetPart);

      // 如果成功构建了连接语句
      if (parts.length >= 2) {
        return {
          statement: parts.join(' '),
          nextIndex: i,
        };
      }
    }
  }

  return null;
}

/**
 * 智能Mermaid代码格式化函数
 * @param code 原始Mermaid代码
 * @returns 格式化后的Mermaid代码
 */
export function formatMermaidCode(code: string): string {
  const lines = code
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) return '';

  // 预处理：将分离的元素组合成完整的语句
  const processedLines: string[] = [];
  let i = 0;

  // 首先处理所有可能的组合情况
  while (i < lines.length) {
    const line = lines[i];

    // 尝试构建完整的连接语句
    const connectionResult = tryBuildConnection(lines, i);
    if (connectionResult) {
      processedLines.push(connectionResult.statement);
      i = connectionResult.nextIndex;
      continue;
    }

    // 尝试构建简单的连接语句（从连接符开始）
    const simpleConnectionResult = tryBuildSimpleConnection(lines, i);
    if (simpleConnectionResult) {
      processedLines.push(simpleConnectionResult.statement);
      i = simpleConnectionResult.nextIndex;
      continue;
    }

    // 检查图表类型声明
    const graphTypeMatch = line.match(
      /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|stateDiagram-v2|erDiagram|journey|gitgraph|pie|quadrantChart|requirement|mindmap|timeline|zenuml|sankey|block-beta|gantt)$/i
    );

    if (graphTypeMatch) {
      const graphType = graphTypeMatch[1];

      // 检查下一行是否是方向或特殊指令
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (nextLine.match(/^(TD|TB|BT|RL|LR)$/i)) {
          processedLines.push(`${graphType} ${nextLine}`);
          i += 2;
        } else {
          processedLines.push(graphType);
          i++;
        }
      } else {
        processedLines.push(graphType);
        i++;
      }
      continue;
    }

    // 检查子图声明
    const subgraphMatch = line.match(/^subgraph$/i);
    if (subgraphMatch && i + 1 < lines.length) {
      const nextLine = lines[i + 1].trim();

      // 检查下一行是否是子图标识符
      const subgraphIdMatch = nextLine.match(/^([A-Za-z_][A-Za-z0-9_]*)$/);
      if (subgraphIdMatch && i + 2 < lines.length) {
        const subgraphId = subgraphIdMatch[1];
        const thirdLine = lines[i + 2].trim();

        // 检查第三行是否是子图标题
        const titleMatch = thirdLine.match(getShapePattern());
        if (titleMatch) {
          processedLines.push(`subgraph ${subgraphId}${titleMatch[1]}`);
          i += 3;
          continue;
        } else {
          processedLines.push(`subgraph ${subgraphId}`);
          i += 2;
          continue;
        }
      } else {
        processedLines.push(line);
        i++;
        continue;
      }
    }

    // 检查特殊关键字和指令
    const specialKeywordMatch = line.match(
      /^(participant|class|classDef|note|title|dateFormat|section|activate|deactivate)$/i
    );
    if (specialKeywordMatch && i + 1 < lines.length) {
      const keyword = specialKeywordMatch[1];
      const nextLine = lines[i + 1].trim();

      // 处理不同类型的特殊关键字
      if (keyword.toLowerCase() === 'participant' && i + 3 < lines.length) {
        // participant A as 别名
        const idLine = lines[i + 1].trim();
        const asLine = lines[i + 2].trim();
        const aliasLine = lines[i + 3].trim();

        if (asLine.toLowerCase() === 'as') {
          processedLines.push(`${keyword} ${idLine} ${asLine} ${aliasLine}`);
          i += 4;
          continue;
        }
      } else if (keyword.toLowerCase() === 'class' && i + 2 < lines.length) {
        // class A,B className
        const nodeList = lines[i + 1].trim();
        const className = lines[i + 2].trim();
        processedLines.push(`${keyword} ${nodeList} ${className}`);
        i += 3;
        continue;
      } else if (keyword.toLowerCase() === 'classdef' && i + 2 < lines.length) {
        // classDef className fill:#color
        const className = lines[i + 1].trim();
        const styleProps = lines[i + 2].trim();
        processedLines.push(`${keyword} ${className} ${styleProps}`);
        i += 3;
        continue;
      } else if (keyword.toLowerCase() === 'note') {
        // note for/over NodeA "text" 或 note for NodeA
        if (i + 3 < lines.length) {
          const forOver = lines[i + 1].trim();
          const nodeRef = lines[i + 2].trim();
          const noteText = lines[i + 3].trim();

          if (
            forOver.toLowerCase() === 'for' ||
            forOver.toLowerCase() === 'over'
          ) {
            processedLines.push(`${keyword} ${forOver} ${nodeRef} ${noteText}`);
            i += 4;
            continue;
          }
        }
      } else {
        // 其他特殊关键字，简单合并下一行
        processedLines.push(`${keyword} ${nextLine}`);
        i += 2;
        continue;
      }
    }

    // 检查是否是单独的节点ID（可能后面跟着形状定义）
    const nodeIdMatch = line.match(/^([A-Za-z_][A-Za-z0-9_]*)$/);
    if (nodeIdMatch && i + 1 < lines.length) {
      const nodeId = nodeIdMatch[1];
      const nextLine = lines[i + 1].trim();

      // 检查下一行是否是形状定义
      const shapeMatch = nextLine.match(getShapePattern());
      if (shapeMatch) {
        processedLines.push(`${nodeId}${shapeMatch[1]}`);
        i += 2;
        continue;
      }
    }

    // 跳过单独的标签行和连接符行，因为它们应该已经被tryBuildConnection处理
    const labelOnlyMatch = line.match(/^\|(.+?)\|$|^:(.+):$/);
    const connectionOnlyMatch = line.match(
      /^(-->|---|-\.-|==>|===|-.->|<-->|<--->|x--x|o--o|->>|-->>|-\)|-\(|<\|--|--\|>|\|\|--|\.\.\.|<\.\.|\.\.>)$/
    );
    const shapeOnlyMatch = line.match(getShapePattern());
    const specialKeywordOnlyMatch = line.match(
      /^(as|for|over|owns|implements|extends)$/i
    );

    if (
      labelOnlyMatch ||
      connectionOnlyMatch ||
      shapeOnlyMatch ||
      specialKeywordOnlyMatch
    ) {
      // 跳过这些单独的元素，因为它们应该已经被合并
      i++;
      continue;
    }

    // 其他情况直接添加
    processedLines.push(line);
    i++;
  }

  // 第二轮处理：处理已经组合的语句中可能遗漏的形状定义
  const finalProcessedLines: string[] = [];
  let j = 0;

  while (j < processedLines.length) {
    const line = processedLines[j];

    // 检查是否是连接语句，但目标节点没有形状定义
    const connectionMatch = line.match(
      /^(.+)\s+(-->|---|-\.-|==>|===|-.->|<-->|<--->|x--x|o--o)\s+([A-Za-z_][A-Za-z0-9_]*)$/
    );

    if (connectionMatch && j + 1 < processedLines.length) {
      const sourceWithShape = connectionMatch[1];
      const connector = connectionMatch[2];
      const targetNode = connectionMatch[3];
      const nextLine = processedLines[j + 1].trim();

      // 检查下一行是否是目标节点的形状定义
      const shapeMatch = nextLine.match(getShapePattern());

      if (shapeMatch) {
        finalProcessedLines.push(
          `${sourceWithShape} ${connector} ${targetNode}${shapeMatch[1]}`
        );
        j += 2;
        continue;
      }
    }

    finalProcessedLines.push(line);
    j++;
  }

  // 现在格式化处理后的行
  const formattedLines: string[] = [];
  let indentLevel = 0;

  for (const line of finalProcessedLines) {
    // 检查图表类型声明
    const graphTypeMatch = line.match(
      /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|stateDiagram-v2|erDiagram|journey|gitgraph|pie|quadrantChart|requirement|mindmap|timeline|zenuml|sankey|block-beta|gantt)(\s+(.+))?$/i
    );

    if (graphTypeMatch) {
      formattedLines.push(line);
      indentLevel = 1;
      continue;
    }

    // 检查子图和状态嵌套
    if (
      line.toLowerCase().startsWith('subgraph') ||
      line.toLowerCase().startsWith('state ')
    ) {
      formattedLines.push('  '.repeat(indentLevel) + line);
      indentLevel++;
      continue;
    }

    if (line.toLowerCase() === 'end') {
      indentLevel = Math.max(0, indentLevel - 1);
      formattedLines.push('  '.repeat(indentLevel) + line);
      continue;
    }

    // 检查特殊指令（不需要额外缩进）
    if (
      line.toLowerCase().startsWith('title') ||
      line.toLowerCase().startsWith('dateformat') ||
      line.toLowerCase().startsWith('section')
    ) {
      formattedLines.push('  '.repeat(Math.max(0, indentLevel - 1)) + line);
      continue;
    }

    // 检查样式定义和类应用
    if (
      line.toLowerCase().startsWith('classdef') ||
      line.toLowerCase().startsWith('style') ||
      line.toLowerCase().startsWith('class ')
    ) {
      const indent = '  '.repeat(Math.max(0, indentLevel - 1));
      formattedLines.push(`${indent}${line}`);
      continue;
    }

    // 检查注释和特殊元素
    if (
      line.toLowerCase().startsWith('note') ||
      line.toLowerCase().startsWith('click') ||
      line.toLowerCase().startsWith('participant')
    ) {
      const indent = '  '.repeat(Math.max(0, indentLevel - 1));
      formattedLines.push(`${indent}${line}`);
      continue;
    }

    // 其他所有情况（节点定义、连接等）
    const indent = '  '.repeat(indentLevel);
    formattedLines.push(`${indent}${line}`);
  }

  return formattedLines.join('\n').trim();
}
