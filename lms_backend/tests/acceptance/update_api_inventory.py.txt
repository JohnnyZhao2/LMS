"""Regenerate the reviewed Django API operation inventory after deliberate review."""

import json
import os
import sys
from pathlib import Path

import django


backend_dir = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(backend_dir))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.test')
django.setup()

from tests.acceptance.api_inventory import build_api_inventory  # noqa: E402


inventory_path = Path(__file__).with_name('api_operations.json')
inventory_path.write_text(
    json.dumps(build_api_inventory(), ensure_ascii=False, indent=2) + '\n',
    encoding='utf-8',
)
print(f'updated {inventory_path}')
