#!/bin/bash

# Timer Center 测试运行脚本
# 运行所有 Timer 相关的测试

echo "========================================="
echo "Timer Center 测试套件"
echo "========================================="
echo ""

# 设置颜色
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试计数器
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 运行单个测试文件
run_test() {
    local test_file=$1
    local test_name=$2
    
    echo -e "${YELLOW}运行测试: ${test_name}${NC}"
    
    if npx jest "$test_file" --verbose; then
        echo -e "${GREEN}✓ ${test_name} 通过${NC}"
        ((PASSED_TESTS++))
    else
        echo -e "${RED}✗ ${test_name} 失败${NC}"
        ((FAILED_TESTS++))
    fi
    
    ((TOTAL_TESTS++))
    echo ""
}

# 切换到项目根目录
cd "$(dirname "$0")/../../../../../../.."

echo "开始运行 Timer Center 测试..."
echo ""

# 运行管理器测试
echo "========================================="
echo "1. 管理器层测试"
echo "========================================="
run_test "test/extension/agent/v1/tools/runners/timer-center/timer-context.test.ts" "TimerContext 测试"
run_test "test/extension/agent/v1/tools/runners/timer-center/timer-manager.test.ts" "TimerManager 测试"

# 运行工具测试
echo "========================================="
echo "2. 工具层测试"
echo "========================================="
run_test "test/extension/agent/v1/tools/runners/timer-center/timer.tool.test.ts" "Timer 工具测试"
run_test "test/extension/agent/v1/tools/runners/timer-center/read-timer.tool.test.ts" "Read Timer 工具测试"
run_test "test/extension/agent/v1/tools/runners/timer-center/stop-timer.tool.test.ts" "Stop Timer 工具测试"
run_test "test/extension/agent/v1/tools/runners/timer-center/cancel-timer.tool.test.ts" "Cancel Timer 工具测试"
run_test "test/extension/agent/v1/tools/runners/timer-center/pause-timer.tool.test.ts" "Pause Timer 工具测试"
run_test "test/extension/agent/v1/tools/runners/timer-center/resume-timer.tool.test.ts" "Resume Timer 工具测试"

# 运行集成测试
echo "========================================="
echo "3. 集成测试"
echo "========================================="
run_test "test/extension/agent/v1/tools/runners/timer-center/integration.test.ts" "Timer 集成测试"

# 显示测试结果摘要
echo "========================================="
echo "测试结果摘要"
echo "========================================="
echo -e "总测试数: ${TOTAL_TESTS}"
echo -e "${GREEN}通过: ${PASSED_TESTS}${NC}"
echo -e "${RED}失败: ${FAILED_TESTS}${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}所有测试通过！ ✓${NC}"
    exit 0
else
    echo -e "${RED}有 ${FAILED_TESTS} 个测试失败 ✗${NC}"
    exit 1
fi

