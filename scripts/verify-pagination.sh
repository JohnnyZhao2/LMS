#!/bin/bash
# 分页统一改造验证脚本

echo "========================================="
echo "分页统一改造验证"
echo "========================================="
echo ""

# 检查后端文件
echo "1. 检查后端分页类..."
if grep -q "code.*SUCCESS" lms_backend/core/pagination.py; then
    echo "   ✅ StandardResultsSetPagination 返回包裹格式"
else
    echo "   ❌ StandardResultsSetPagination 未返回包裹格式"
fi

if grep -q "SmallResultsSetPagination" lms_backend/core/pagination.py && grep -A 20 "class SmallResultsSetPagination" lms_backend/core/pagination.py | grep -q "code.*SUCCESS"; then
    echo "   ✅ SmallResultsSetPagination 返回包裹格式"
else
    echo "   ❌ SmallResultsSetPagination 未返回包裹格式"
fi

echo ""
echo "2. 检查后端响应工具..."
if grep -q "total_pages.*current_page.*page_size" lms_backend/core/responses.py; then
    echo "   ✅ paginated_response() 包含完整字段"
else
    echo "   ❌ paginated_response() 缺少字段"
fi

echo ""
echo "3. 检查前端类型定义..."
if grep -q "total_pages: number" lms_frontend/src/types/common.ts && ! grep -q "total_pages?: number" lms_frontend/src/types/common.ts; then
    echo "   ✅ PaginatedResponse 字段为必填"
else
    echo "   ❌ PaginatedResponse 字段为可选"
fi

echo ""
echo "4. 检查重复定义..."
duplicate_count=$(grep -r "interface PaginatedResponse\|type PaginatedResponse" lms_frontend/src --include="*.ts" --include="*.tsx" | grep -v "node_modules" | wc -l)
if [ "$duplicate_count" -eq 1 ]; then
    echo "   ✅ 无重复的 PaginatedResponse 定义"
else
    echo "   ⚠️  发现 $duplicate_count 个 PaginatedResponse 定义"
fi

echo ""
echo "5. 检查 View 层使用..."
views_with_pagination=$(grep -r "pagination_class.*StandardResultsSetPagination\|pagination_class.*SmallResultsSetPagination" lms_backend/apps --include="*.py" | wc -l)
echo "   ℹ️  找到 $views_with_pagination 个使用统一分页的 View"

echo ""
echo "========================================="
echo "验证完成"
echo "========================================="
echo ""
echo "建议的下一步："
echo "1. 运行后端测试：cd lms_backend && python -m pytest tests/ -v"
echo "2. 运行前端类型检查：cd lms_frontend && npm run build"
echo "3. 手动测试分页接口"
echo "4. 检查其他模块是否需要迁移"
