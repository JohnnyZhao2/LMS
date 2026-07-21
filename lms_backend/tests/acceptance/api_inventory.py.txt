"""Build a deterministic inventory directly from Django URL registrations."""

from django.urls import URLPattern, URLResolver, get_resolver


HTTP_METHODS = ('get', 'post', 'put', 'patch', 'delete')


def build_api_inventory() -> list[dict[str, object]]:
    inventory: list[dict[str, str]] = []

    def walk(patterns, prefix=''):
        for entry in patterns:
            path = f'{prefix}{entry.pattern}'
            if isinstance(entry, URLResolver):
                walk(entry.url_patterns, path)
                continue
            if not isinstance(entry, URLPattern) or not path.startswith('api/'):
                continue

            view_class = getattr(entry.callback, 'view_class', None) or getattr(entry.callback, 'cls', None)
            if view_class is None:
                continue
            view_name = f'{view_class.__module__}.{view_class.__name__}'
            for method in HTTP_METHODS:
                if not hasattr(view_class, method):
                    continue
                inventory.append({
                    'method': method.upper(),
                    'path': f'/{path}',
                    'route_name': entry.name or '',
                    'view': view_name,
                })

    walk(get_resolver().url_patterns)
    return sorted(inventory, key=lambda item: (item['path'], item['method']))
