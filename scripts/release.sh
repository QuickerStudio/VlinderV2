#!/bin/bash

# Vlinder 扩展发布脚本
# 用法: ./scripts/release.sh [版本号] [类型]
# 示例: ./scripts/release.sh 3.7.22 release
#       ./scripts/release.sh 3.7.22 beta
#       ./scripts/release.sh 3.7.22 alpha

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}ℹ ${1}${NC}"
}

print_success() {
    echo -e "${GREEN}✓ ${1}${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ ${1}${NC}"
}

print_error() {
    echo -e "${RED}✗ ${1}${NC}"
}

# 检查参数
if [ -z "$1" ]; then
    print_error "请提供版本号"
    echo "用法: $0 <版本号> [类型]"
    echo "示例: $0 3.7.22 release"
    echo "      $0 3.7.22 beta"
    echo "      $0 3.7.22 alpha"
    exit 1
fi

VERSION=$1
RELEASE_TYPE=${2:-release}

# 验证版本号格式
if ! [[ $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    print_error "版本号格式错误，应为 X.Y.Z 格式"
    exit 1
fi

# 根据类型设置标签
case $RELEASE_TYPE in
    release)
        TAG="v${VERSION}"
        PUBLISH_TO_MARKETPLACE=true
        ;;
    beta)
        TAG="v${VERSION}-beta.1"
        PUBLISH_TO_MARKETPLACE=false
        ;;
    alpha)
        TAG="v${VERSION}-alpha.1"
        PUBLISH_TO_MARKETPLACE=false
        ;;
    *)
        print_error "未知的发布类型: $RELEASE_TYPE"
        echo "支持的类型: release, beta, alpha"
        exit 1
        ;;
esac

echo ""
print_info "========================================="
print_info "  Vlinder 扩展发布脚本"
print_info "========================================="
echo ""
print_info "版本号: ${VERSION}"
print_info "发布类型: ${RELEASE_TYPE}"
print_info "Git 标签: ${TAG}"
print_info "发布到 Marketplace: ${PUBLISH_TO_MARKETPLACE}"
echo ""

# 确认
read -p "$(echo -e ${YELLOW}是否继续？[y/N]: ${NC})" -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "已取消"
    exit 0
fi

# 检查是否在 git 仓库中
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    print_error "当前目录不是 Git 仓库"
    exit 1
fi

# 检查是否有未提交的更改
if ! git diff-index --quiet HEAD --; then
    print_error "存在未提交的更改，请先提交或暂存"
    git status --short
    exit 1
fi

# 检查当前分支
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
print_info "当前分支: ${CURRENT_BRANCH}"

# 更新 package.json 版本号
print_info "更新 package.json 版本号..."
PACKAGE_JSON="extension/package.json"

if [ ! -f "$PACKAGE_JSON" ]; then
    print_error "找不到 $PACKAGE_JSON"
    exit 1
fi

# 使用 node 更新版本号
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('$PACKAGE_JSON', 'utf8'));
pkg.version = '$VERSION';
fs.writeFileSync('$PACKAGE_JSON', JSON.stringify(pkg, null, '\t') + '\n');
"

print_success "版本号已更新为 ${VERSION}"

# 提交更改
print_info "提交更改..."
git add "$PACKAGE_JSON"
git commit -m "chore: bump version to ${VERSION}"
print_success "更改已提交"

# 创建标签
print_info "创建 Git 标签: ${TAG}..."
if git rev-parse "$TAG" >/dev/null 2>&1; then
    print_error "标签 ${TAG} 已存在"
    exit 1
fi

git tag -a "$TAG" -m "Release ${TAG}"
print_success "标签已创建"

# 推送到远程
print_info "推送到远程仓库..."
echo ""
print_warning "即将执行以下操作："
echo "  1. git push origin ${CURRENT_BRANCH}"
echo "  2. git push origin ${TAG}"
echo ""
read -p "$(echo -e ${YELLOW}确认推送？[y/N]: ${NC})" -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "已取消推送"
    print_info "你可以稍后手动推送："
    echo "  git push origin ${CURRENT_BRANCH}"
    echo "  git push origin ${TAG}"
    exit 0
fi

git push origin "$CURRENT_BRANCH"
git push origin "$TAG"

print_success "推送完成！"
echo ""
print_info "========================================="
print_success "发布流程已启动！"
print_info "========================================="
echo ""
print_info "接下来："
print_info "1. 访问 GitHub Actions 页面查看构建状态"
print_info "   https://github.com/QuickerStudio/Vlinder/actions"
echo ""
print_info "2. 构建完成后，在 Releases 页面查看发布"
print_info "   https://github.com/QuickerStudio/Vlinder/releases"
echo ""

if [ "$PUBLISH_TO_MARKETPLACE" = true ]; then
    print_info "3. 扩展将自动发布到："
    print_info "   - VS Code Marketplace"
    print_info "   - Open VSX Registry"
    echo ""
    print_warning "注意: 确保已配置 VSCE_TOKEN 和 OVSX_TOKEN"
else
    print_info "3. 这是一个 ${RELEASE_TYPE} 版本，不会发布到 Marketplace"
fi

echo ""
print_success "完成！🎉"

