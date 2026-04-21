from pathlib import Path
import re

from apps.authorization.constants import (
    PERMISSION_CATALOG,
    PERMISSION_SCOPE_RULES,
    ROLE_PERMISSION_DEFAULTS,
    ROLE_SYSTEM_PERMISSION_DEFAULTS,
    SYSTEM_MANAGED_PERMISSION_CODES,
)


REPO_ROOT = Path(__file__).resolve().parents[1]
BACKEND_APPS_ROOT = REPO_ROOT / 'apps'
FRONTEND_SRC_ROOT = REPO_ROOT.parent / 'lms_frontend' / 'src'
FRONTEND_PRESENTATION_FILE = (
    FRONTEND_SRC_ROOT / 'entities' / 'authorization' / 'constants' / 'permission-presentation.ts'
)

BACKEND_PERMISSION_PATTERNS = [
    re.compile(r"\b(?:enforce|can)\(\s*['\"]([a-z_]+(?:\.[a-z_]+)+)['\"]"),
    re.compile(r"permission_code\s*=\s*['\"]([a-z_]+(?:\.[a-z_]+)+)['\"]"),
]
FRONTEND_PERMISSION_LITERAL_PATTERN = re.compile(r"['\"]([a-z_]+(?:\.[a-z_]+)+)['\"]")
TS_OBJECT_BLOCK_PATTERN = r"(?:export\s+)?const {name}:[^=]*=\s*\{{(.*?)\n\}};"


def _catalog_codes():
    return [item['code'] for item in PERMISSION_CATALOG]


def _catalog_modules():
    return {item['module'] for item in PERMISSION_CATALOG}


def _extract_object_body(source_text: str, const_name: str) -> str:
    pattern = re.compile(TS_OBJECT_BLOCK_PATTERN.format(name=const_name), re.S)
    match = pattern.search(source_text)
    return match.group(1) if match else ''


def _extract_module_presentation_codes():
    source_text = FRONTEND_PRESENTATION_FILE.read_text(encoding='utf-8')
    module_block = _extract_object_body(source_text, 'MODULE_PRESENTATION')
    return set(re.findall(r'^\s*([a-z_]+):\s*\{', module_block, re.MULTILINE))


def _iter_backend_source_files():
    for path in BACKEND_APPS_ROOT.rglob('*.py'):
        if 'migrations' in path.parts:
            continue
        yield path


def _iter_frontend_source_files():
    for pattern in ('*.ts', '*.tsx', '*.js', '*.jsx'):
        yield from FRONTEND_SRC_ROOT.rglob(pattern)


def _extract_used_backend_permission_codes():
    codes = set()
    for path in _iter_backend_source_files():
        source_text = path.read_text(encoding='utf-8')
        for pattern in BACKEND_PERMISSION_PATTERNS:
            codes.update(pattern.findall(source_text))
    return codes


def _extract_used_frontend_permission_codes():
    codes = set()
    for path in _iter_frontend_source_files():
        source_text = path.read_text(encoding='utf-8')
        codes.update(FRONTEND_PERMISSION_LITERAL_PATTERN.findall(source_text))
    return codes


def validate_authorization_consistency():
    errors = []
    catalog_codes = _catalog_codes()
    declared_codes = set(catalog_codes) | set(SYSTEM_MANAGED_PERMISSION_CODES)
    declared_modules = _catalog_modules()

    if len(catalog_codes) != len(set(catalog_codes)):
        duplicates = sorted({code for code in catalog_codes if catalog_codes.count(code) > 1})
        errors.append(f'PERMISSION_CATALOG 存在重复权限编码: {duplicates}')

    for role_code, permission_codes in ROLE_PERMISSION_DEFAULTS.items():
        invalid_codes = sorted(set(permission_codes) - declared_codes)
        if invalid_codes:
            errors.append(f'角色 {role_code} 的默认权限引用了未声明权限: {invalid_codes}')

    for role_code, permission_codes in ROLE_SYSTEM_PERMISSION_DEFAULTS.items():
        invalid_codes = sorted(set(permission_codes) - declared_codes)
        if invalid_codes:
            errors.append(f'角色 {role_code} 的系统权限引用了未声明权限: {invalid_codes}')

    scope_rule_permission_codes = {rule.permission_code for rule in PERMISSION_SCOPE_RULES}
    unknown_scope_rule_permissions = sorted(scope_rule_permission_codes - declared_codes)
    if unknown_scope_rule_permissions:
        errors.append(f'范围规则声明了未登记权限: {unknown_scope_rule_permissions}')

    used_codes = _extract_used_backend_permission_codes() | _extract_used_frontend_permission_codes()
    unknown_used_codes = sorted(code for code in used_codes if code not in declared_codes)
    if unknown_used_codes:
        errors.append(f'前后端存在未登记到权限目录的权限码: {unknown_used_codes}')

    module_presentation_codes = _extract_module_presentation_codes()
    missing_module_codes = sorted(declared_modules - module_presentation_codes)
    if missing_module_codes:
        errors.append(f'前端模块说明缺失: {missing_module_codes}')

    return errors


def test_authorization_consistency_has_no_errors():
    assert validate_authorization_consistency() == []
