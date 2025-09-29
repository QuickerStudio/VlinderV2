# Mermaid格式化器测试用例集

> **关联文档**: [复杂格式化器的测试方法论](./testing-methodology-for-complex-formatters.md)  
> **项目**: DNA Context Protocol - Mermaid格式化器  
> **用途**: 记录完整的测试用例集，供回归测试和功能验证使用

## 📋 测试用例分类

### 1. 基础语法测试

#### 1.1 图表类型声明
```javascript
// 测试用例：分离的图表类型和方向
const graphTypeTest = {
  input: `graph
TD
    A[节点]`,
  expected: `graph TD
  A[节点]`,
  description: "合并分离的图表类型和方向声明"
};
```

#### 1.2 节点形状测试
```javascript
// 测试用例：各种节点形状
const nodeShapesTest = {
  input: `graph TD
    A[矩形]
    B(圆角矩形)
    C{菱形}
    D((圆形))
    E[[子程序]]
    F[/平行四边形/]
    G[\反向平行四边形\]
    H{{六边形}}`,
  expected: `graph TD
  A[矩形]
  B(圆角矩形)
  C{菱形}
  D((圆形))
  E[[子程序]]
  F[/平行四边形/]
  G[\反向平行四边形\]
  H{{六边形}}`,
  description: "支持所有Mermaid节点形状"
};
```

### 2. 连接和标签测试

#### 2.1 带标签的连接
```javascript
// 测试用例：分离的连接标签
const labeledConnectionTest = {
  input: `flowchart LR
    A[开始]
-->
|是|
B{判断}
    B
-->
|否|
C[结束]`,
  expected: `flowchart LR
  A[开始] --> |是| B{判断}
  B --> |否| C[结束]`,
  description: "正确合并分离的连接标签"
};
```

#### 2.2 多种连接符
```javascript
// 测试用例：不同类型的连接符
const connectionTypesTest = {
  input: `graph TD
    A --> B
    B --- C
    C -.-> D
    D ==> E`,
  expected: `graph TD
  A --> B
  B --- C
  C -.-> D
  D ==> E`,
  description: "支持各种连接符类型"
};
```

### 3. 子图和嵌套结构测试

#### 3.1 子图处理
```javascript
// 测试用例：分离的子图声明
const subgraphTest = {
  input: `graph TD
    subgraph
API
[API层]
        A1[接口]
-->
A2[逻辑]
    end`,
  expected: `graph TD
  subgraph API[API层]
    A1[接口] --> A2[逻辑]
  end`,
  description: "正确处理分离的子图声明"
};
```

### 4. 复杂综合测试

#### 4.1 企业级流程图
```javascript
// 测试用例：复杂业务流程
const complexFlowchartTest = {
  input: `flowchart TD
    subgraph Auth[认证系统]
        A1[用户登录] --> A2{验证凭据}
        A2 -->|成功| A3((生成Token))
        A2 -->|失败| A4[/错误提示/]
    end
    
    subgraph API[API网关]
        B1[[路由分发]] --> B2{权限检查}
        B2 -->|有权限| B3[业务处理]
        B2 -->|无权限| B4[\拒绝访问\]
    end
    
    A3 --> B1
    A4 --> End1(结束)
    B3 --> End2{{处理完成}}
    B4 --> End1
    
    classDef success fill:#d4edda
    classDef error fill:#f8d7da
    class A3,B3,End2 success
    class A4,B4 error`,
  description: "包含子图、多种节点形状、样式定义的复杂流程图"
};
```

#### 4.2 序列图测试
```javascript
// 测试用例：复杂序列图
const sequenceDiagramTest = {
  input: `sequenceDiagram
    participant U as 用户
    participant F as 前端应用
    participant G as API网关
    
    U->>F: 发起请求
    activate F
    F->>G: 转发请求
    activate G
    G-->>F: 响应数据
    deactivate G
    F-->>U: 显示结果
    deactivate F
    
    Note over U,F: 用户交互层`,
  description: "包含参与者别名、激活序列、注释的序列图"
};
```

## 🔧 测试工具函数

### 通用测试框架
```javascript
/**
 * 通用测试执行器
 * @param {Function} formatter - 格式化函数
 * @param {Array} testCases - 测试用例数组
 */
function runTestSuite(formatter, testCases) {
  console.log(`🧪 开始执行 ${testCases.length} 个测试用例\n`);
  
  let passed = 0;
  let failed = 0;
  
  testCases.forEach((testCase, index) => {
    console.log(`📋 测试 ${index + 1}: ${testCase.description}`);
    
    try {
      const result = formatter(testCase.input);
      const success = result.trim() === testCase.expected.trim();
      
      if (success) {
        console.log('✅ 通过');
        passed++;
      } else {
        console.log('❌ 失败');
        console.log('期望输出:');
        console.log(testCase.expected);
        console.log('实际输出:');
        console.log(result);
        failed++;
      }
    } catch (error) {
      console.log('💥 异常:', error.message);
      failed++;
    }
    
    console.log('');
  });
  
  console.log(`📊 测试结果: ${passed} 通过, ${failed} 失败`);
  return { passed, failed };
}
```

### 性能测试工具
```javascript
/**
 * 性能测试工具
 * @param {Function} formatter - 格式化函数
 * @param {string} input - 测试输入
 * @param {number} iterations - 迭代次数
 */
function performanceTest(formatter, input, iterations = 1000) {
  console.log(`⚡ 性能测试: ${iterations} 次迭代`);
  
  const startTime = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    formatter(input);
  }
  
  const endTime = performance.now();
  const totalTime = endTime - startTime;
  const avgTime = totalTime / iterations;
  
  console.log(`总时间: ${totalTime.toFixed(2)}ms`);
  console.log(`平均时间: ${avgTime.toFixed(4)}ms`);
  console.log(`吞吐量: ${(1000 / avgTime).toFixed(0)} ops/sec`);
}
```

### 差异分析工具
```javascript
/**
 * 格式化差异分析
 * @param {string} original - 原始代码
 * @param {string} formatted - 格式化后代码
 */
function analyzeDifferences(original, formatted) {
  const originalLines = original.split('\n').map(line => line.trim()).filter(line => line);
  const formattedLines = formatted.split('\n').map(line => line.trim()).filter(line => line);
  
  console.log('📊 格式化分析:');
  console.log(`原始行数: ${originalLines.length}`);
  console.log(`格式化行数: ${formattedLines.length}`);
  console.log(`行数变化: ${formattedLines.length - originalLines.length}`);
  
  // 分析主要变化
  const changes = [];
  if (formattedLines.length < originalLines.length) {
    changes.push('合并了分离的语法元素');
  }
  if (formatted.includes('  ')) {
    changes.push('添加了统一缩进');
  }
  
  console.log('主要变化:', changes.join(', '));
}
```

## 📈 回归测试套件

### 核心功能回归测试
```javascript
const regressionTestSuite = [
  // 基础功能
  {
    name: "基础节点定义",
    input: "graph TD\n    A[节点]",
    expected: "graph TD\n  A[节点]"
  },
  
  // 连接功能
  {
    name: "简单连接",
    input: "graph TD\n    A --> B",
    expected: "graph TD\n  A --> B"
  },
  
  // 标签功能
  {
    name: "带标签连接",
    input: "graph TD\n    A -->|标签| B",
    expected: "graph TD\n  A -->|标签| B"
  },
  
  // 子图功能
  {
    name: "简单子图",
    input: "graph TD\n    subgraph S\n        A\n    end",
    expected: "graph TD\n  subgraph S\n    A\n  end"
  }
];
```

### 边界情况测试
```javascript
const edgeCaseTests = [
  {
    name: "空输入",
    input: "",
    expected: ""
  },
  {
    name: "只有空白行",
    input: "\n\n   \n\n",
    expected: ""
  },
  {
    name: "单行图表声明",
    input: "graph TD",
    expected: "graph TD"
  },
  {
    name: "不完整的连接",
    input: "graph TD\n    A -->",
    expected: "graph TD\n  A -->"
  }
];
```

## 🎯 使用示例

### 完整测试执行
```javascript
// 导入格式化器
import { formatMermaidCode } from '../src/hooks/mermaid-formatter';

// 执行回归测试
console.log('🔄 执行回归测试');
runTestSuite(formatMermaidCode, regressionTestSuite);

// 执行边界情况测试
console.log('🔍 执行边界情况测试');
runTestSuite(formatMermaidCode, edgeCaseTests);

// 性能测试
console.log('⚡ 执行性能测试');
const complexInput = `/* 复杂的Mermaid代码 */`;
performanceTest(formatMermaidCode, complexInput);
```

### 新功能验证
```javascript
// 验证新功能
const newFeatureTest = {
  name: "新功能测试",
  input: "/* 新语法示例 */",
  expected: "/* 期望输出 */",
  description: "测试新增的语法特性"
};

console.log('🆕 验证新功能');
runTestSuite(formatMermaidCode, [newFeatureTest]);
```

---

*这份测试用例集记录了Mermaid格式化器开发过程中的所有重要测试场景，可用于功能验证、回归测试和性能评估。*
