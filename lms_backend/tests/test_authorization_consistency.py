from pathlib import Path
import re

from apps.authorization.constants import PERMISSION_CATALOG, REGISTERED_PERMISSION_CODES


REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND_SRC_ROOT = REPO_ROOT.parent / 'lms_frontend' / 'src'
PERMISSION_LITERAL = re.compile(r"['\"]([a-z_]+(?:\.[a-z_]+)+)['\"]")


def test_permission_catalog_codes_are_unique():
    catalog_codes = [item['code'] for item in PERMISSION_CATALOG]
    assert len(catalog_codes) == len(set(catalog_codes))
    assert set(catalog_codes) == set(REGISTERED_PERMISSION_CODES)


def test_frontend_permission_codes_are_registered():
    used_codes = set()
    for path in FRONTEND_SRC_ROOT.rglob('*.ts*'):
        used_codes.update(PERMISSION_LITERAL.findall(path.read_text(encoding='utf-8')))
    # 只校验与已注册权限同 app 前缀且含 Django codename 特征的字面量
    app_labels = {code.split('.', 1)[0] for code in REGISTERED_PERMISSION_CODES}
    candidate_codes = {
        code for code in used_codes
        if code.count('.') == 1 and code.split('.', 1)[0] in app_labels
    }
    assert candidate_codes - set(REGISTERED_PERMISSION_CODES) == set()
