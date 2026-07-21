"""Fail when a registered API operation changes without inventory review."""

import json
from pathlib import Path

from .api_inventory import build_api_inventory


INVENTORY_PATH = Path(__file__).with_name('api_operations.json')


def test_registered_api_operations_match_reviewed_inventory():
    reviewed_inventory = json.loads(INVENTORY_PATH.read_text(encoding='utf-8'))
    assert build_api_inventory() == reviewed_inventory


def test_every_api_operation_has_a_unique_named_route():
    inventory = build_api_inventory()
    assert all(item['route_name'] for item in inventory)
    operation_keys = {(item['method'], item['path']) for item in inventory}
    assert len(operation_keys) == len(inventory)
