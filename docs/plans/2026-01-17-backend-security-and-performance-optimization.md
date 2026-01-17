# Backend Security and Performance Optimization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve backend security by moving secrets to environment variables, add API rate limiting, and implement Redis caching for performance optimization.

**Architecture:** This plan implements three critical improvements: (1) Environment-based configuration management using python-dotenv to eliminate hardcoded secrets, (2) DRF throttling for API protection against abuse, and (3) Redis caching layer for frequently accessed data (roles, departments, tags) to reduce database load.

**Tech Stack:** Django 4.2, Django REST Framework 3.14, python-dotenv, django-redis, Redis

---

## Task 1: Environment Variables Setup

**Files:**
- Create: `lms_backend/.env.example`
- Create: `lms_backend/.env` (local only, gitignored)
- Modify: `lms_backend/.gitignore`
- Modify: `lms_backend/config/settings/base.py`
- Modify: `lms_backend/config/settings/development.py`
- Modify: `requirements/base.txt`

**Step 1: Add python-dotenv to requirements**

File: `requirements/base.txt`

Add line:
```
python-dotenv==1.0.0
```

**Step 2: Update .gitignore**

File: `lms_backend/.gitignore`

Add lines:
```
# Environment variables
.env
.env.local
```

**Step 3: Create .env.example template**

File: `lms_backend/.env.example`

```bash
# Database Configuration
DB_NAME=lms_db
DB_USER=root
DB_PASSWORD=your_password_here
DB_HOST=localhost
DB_PORT=3306

# Django Secret Key
SECRET_KEY=your-secret-key-here

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
```

**Step 4: Create local .env file**

Run: `cp lms_backend/.env.example lms_backend/.env`

Then manually edit `lms_backend/.env` with actual values from `config/settings/development.py`

**Step 5: Update base settings to load environment variables**

File: `lms_backend/config/settings/base.py`

Add at the top (after imports):
```python
from pathlib import Path
import os
from dotenv import load_dotenv

# Build paths inside the project
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Load environment variables
load_dotenv(os.path.join(BASE_DIR, '.env'))
```

Update SECRET_KEY:
```python
SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-fallback-key-for-development')
```

**Step 6: Update development settings to use environment variables**

File: `lms_backend/config/settings/development.py`

Replace the DATABASES configuration:
```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': os.getenv('DB_NAME', 'lms_db'),
        'USER': os.getenv('DB_USER', 'root'),
        'PASSWORD': os.getenv('DB_PASSWORD'),
        'HOST': os.getenv('DB_HOST', 'localhost'),
        'PORT': os.getenv('DB_PORT', '3306'),
        'OPTIONS': {
            'charset': 'utf8mb4',
            'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
        }
    }
}
```

**Step 7: Install dependencies and test**

Run:
```bash
cd lms_backend
pip install -r requirements/base.txt
python manage.py check
```

Expected: No errors, system check passes

**Step 8: Commit**

```bash
git add requirements/base.txt lms_backend/.gitignore lms_backend/.env.example lms_backend/config/settings/base.py lms_backend/config/settings/development.py
git commit -m "security: move database credentials to environment variables

- Add python-dotenv for environment variable management
- Create .env.example template
- Update settings to load from environment variables
- Add .env to .gitignore to prevent credential leaks"
```

---

## Task 2: Redis Caching Setup

**Files:**
- Modify: `requirements/base.txt`
- Modify: `lms_backend/config/settings/base.py`
- Create: `lms_backend/core/cache.py`
- Modify: `lms_backend/apps/users/repositories.py`

**Step 1: Add Redis dependencies**

File: `requirements/base.txt`

Add lines:
```
redis==5.0.1
django-redis==5.4.0
```

**Step 2: Configure Redis cache in settings**

File: `lms_backend/config/settings/base.py`

Add cache configuration:
```python
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': f"redis://{os.getenv('REDIS_HOST', 'localhost')}:{os.getenv('REDIS_PORT', '6379')}/{os.getenv('REDIS_DB', '0')}",
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'PARSER_CLASS': 'redis.connection.HiredisParser',
            'CONNECTION_POOL_KWARGS': {'max_connections': 50},
            'SOCKET_CONNECT_TIMEOUT': 5,
            'SOCKET_TIMEOUT': 5,
        },
        'KEY_PREFIX': 'lms',
        'TIMEOUT': 300,  # 5 minutes default
    }
}
```

**Step 3: Create cache utility module**

File: `lms_backend/core/cache.py`

```python
"""Cache utilities for LMS backend."""
from django.core.cache import cache
from typing import Optional, Callable, Any
import hashlib
import json


def generate_cache_key(prefix: str, *args, **kwargs) -> str:
    """Generate a consistent cache key from arguments."""
    key_parts = [prefix]

    # Add positional arguments
    for arg in args:
        key_parts.append(str(arg))

    # Add keyword arguments (sorted for consistency)
    for k, v in sorted(kwargs.items()):
        key_parts.append(f"{k}:{v}")

    key_string = ":".join(key_parts)

    # Hash if too long
    if len(key_string) > 200:
        key_hash = hashlib.md5(key_string.encode()).hexdigest()
        return f"{prefix}:{key_hash}"

    return key_string


def cached_query(cache_key: str, timeout: int = 300):
    """Decorator for caching query results."""
    def decorator(func: Callable) -> Callable:
        def wrapper(*args, **kwargs) -> Any:
            # Try to get from cache
            result = cache.get(cache_key)
            if result is not None:
                return result

            # Execute query
            result = func(*args, **kwargs)

            # Store in cache
            cache.set(cache_key, result, timeout)

            return result
        return wrapper
    return decorator


def invalidate_cache(pattern: str) -> int:
    """Invalidate cache keys matching pattern."""
    from django_redis import get_redis_connection

    conn = get_redis_connection("default")
    keys = conn.keys(f"lms:{pattern}*")

    if keys:
        return conn.delete(*keys)
    return 0
```

**Step 4: Write test for cache utilities**

File: `lms_backend/core/tests/test_cache.py`

```python
"""Tests for cache utilities."""
import pytest
from django.core.cache import cache
from core.cache import generate_cache_key, cached_query, invalidate_cache


@pytest.fixture(autouse=True)
def clear_cache():
    """Clear cache before each test."""
    cache.clear()
    yield
    cache.clear()


class TestGenerateCacheKey:
    """Tests for generate_cache_key function."""

    def test_simple_key(self):
        """Test simple cache key generation."""
        key = generate_cache_key("user", 123)
        assert key == "user:123"

    def test_with_kwargs(self):
        """Test cache key with keyword arguments."""
        key = generate_cache_key("user", role="admin", dept=5)
        assert "user" in key
        assert "role:admin" in key
        assert "dept:5" in key

    def test_long_key_hashing(self):
        """Test that long keys are hashed."""
        long_string = "x" * 250
        key = generate_cache_key("prefix", long_string)
        assert len(key) < 250
        assert key.startswith("prefix:")


class TestCachedQuery:
    """Tests for cached_query decorator."""

    def test_caches_result(self):
        """Test that results are cached."""
        call_count = 0

        @cached_query("test:query", timeout=60)
        def expensive_query():
            nonlocal call_count
            call_count += 1
            return {"data": "result"}

        # First call
        result1 = expensive_query()
        assert call_count == 1
        assert result1 == {"data": "result"}

        # Second call should use cache
        result2 = expensive_query()
        assert call_count == 1  # Not called again
        assert result2 == {"data": "result"}

    def test_cache_expiration(self):
        """Test that cache expires after timeout."""
        import time

        @cached_query("test:expire", timeout=1)
        def query():
            return {"timestamp": time.time()}

        result1 = query()
        time.sleep(1.1)
        result2 = query()

        # Results should be different after expiration
        assert result1["timestamp"] != result2["timestamp"]


class TestInvalidateCache:
    """Tests for invalidate_cache function."""

    def test_invalidates_matching_keys(self):
        """Test that matching keys are invalidated."""
        cache.set("lms:user:1", "data1")
        cache.set("lms:user:2", "data2")
        cache.set("lms:role:1", "data3")

        # Invalidate user keys
        count = invalidate_cache("user:")
        assert count == 2

        # User keys should be gone
        assert cache.get("lms:user:1") is None
        assert cache.get("lms:user:2") is None

        # Role key should remain
        assert cache.get("lms:role:1") == "data3"
```

**Step 5: Run cache tests**

Run: `pytest lms_backend/core/tests/test_cache.py -v`

Expected: All tests pass

**Step 6: Add caching to Role repository**

File: `lms_backend/apps/users/repositories.py`

Add import:
```python
from core.cache import generate_cache_key, invalidate_cache
from django.core.cache import cache
```

Update `RoleRepository` class:
```python
class RoleRepository(BaseRepository):
    """Repository for Role model."""

    model = Role

    CACHE_TIMEOUT = 3600  # 1 hour

    def get_all_roles(self):
        """Get all roles with caching."""
        cache_key = generate_cache_key("roles", "all")

        # Try cache first
        roles = cache.get(cache_key)
        if roles is not None:
            return roles

        # Query database
        roles = list(self.model.objects.all().order_by('priority'))

        # Cache result
        cache.set(cache_key, roles, self.CACHE_TIMEOUT)

        return roles

    def get_by_code(self, code: str):
        """Get role by code with caching."""
        cache_key = generate_cache_key("role", "code", code)

        # Try cache first
        role = cache.get(cache_key)
        if role is not None:
            return role

        # Query database
        role = self.model.objects.filter(code=code).first()

        # Cache result
        if role:
            cache.set(cache_key, role, self.CACHE_TIMEOUT)

        return role

    def invalidate_role_cache(self):
        """Invalidate all role caches."""
        invalidate_cache("role")
```

**Step 7: Install Redis and test**

Run:
```bash
# Install Redis (macOS)
brew install redis
brew services start redis

# Install Python dependencies
pip install -r requirements/base.txt

# Test cache connection
python manage.py shell -c "from django.core.cache import cache; cache.set('test', 'value'); print(cache.get('test'))"
```

Expected: Prints "value"

**Step 8: Run tests**

Run: `pytest lms_backend/core/tests/test_cache.py lms_backend/apps/users/tests/ -v`

Expected: All tests pass

**Step 9: Commit**

```bash
git add requirements/base.txt lms_backend/config/settings/base.py lms_backend/core/cache.py lms_backend/core/tests/test_cache.py lms_backend/apps/users/repositories.py
git commit -m "perf: add Redis caching layer for frequently accessed data

- Configure django-redis for caching
- Create cache utility module with key generation and invalidation
- Add comprehensive tests for cache utilities
- Implement caching in RoleRepository for roles lookup
- Cache timeout: 1 hour for roles, 5 minutes default"
```

---

## Task 3: API Rate Limiting

**Files:**
- Modify: `lms_backend/config/settings/base.py`
- Create: `lms_backend/core/throttles.py`
- Create: `lms_backend/core/tests/test_throttles.py`
- Modify: `lms_backend/apps/auth/views.py`

**Step 1: Configure DRF throttling in settings**

File: `lms_backend/config/settings/base.py`

Add to REST_FRAMEWORK configuration:
```python
REST_FRAMEWORK = {
    # ... existing config ...

    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',      # Anonymous users: 100 requests per hour
        'user': '1000/hour',     # Authenticated users: 1000 requests per hour
        'auth': '10/minute',     # Authentication endpoints: 10 per minute
        'submission': '30/hour', # Submission endpoints: 30 per hour
    }
}
```

**Step 2: Create custom throttle classes**

File: `lms_backend/core/throttles.py`

```python
"""Custom throttle classes for API rate limiting."""
from rest_framework.throttling import UserRateThrottle, AnonRateThrottle


class AuthThrottle(AnonRateThrottle):
    """Throttle for authentication endpoints."""

    rate = 'auth'

    def get_cache_key(self, request, view):
        """Generate cache key based on IP address."""
        if request.user and request.user.is_authenticated:
            ident = request.user.pk
        else:
            ident = self.get_ident(request)

        return self.cache_format % {
            'scope': self.scope,
            'ident': ident
        }


class SubmissionThrottle(UserRateThrottle):
    """Throttle for submission endpoints to prevent spam."""

    rate = 'submission'

    def allow_request(self, request, view):
        """Only throttle POST requests (submissions)."""
        if request.method != 'POST':
            return True

        return super().allow_request(request, view)


class BurstRateThrottle(UserRateThrottle):
    """Throttle for burst protection (short time window)."""

    rate = '30/minute'
    scope = 'burst'
```

**Step 3: Write tests for throttles**

File: `lms_backend/core/tests/test_throttles.py`

```python
"""Tests for custom throttle classes."""
import pytest
from django.test import RequestFactory
from django.contrib.auth import get_user_model
from rest_framework.views import APIView
from rest_framework.response import Response
from core.throttles import AuthThrottle, SubmissionThrottle, BurstRateThrottle

User = get_user_model()


@pytest.fixture
def request_factory():
    """Request factory fixture."""
    return RequestFactory()


@pytest.fixture
def user(db):
    """Create test user."""
    return User.objects.create_user(
        employee_id='TEST001',
        name='Test User',
        password='testpass123'
    )


class TestAuthThrottle:
    """Tests for AuthThrottle."""

    def test_throttle_anonymous_requests(self, request_factory):
        """Test that anonymous requests are throttled."""
        throttle = AuthThrottle()
        request = request_factory.post('/api/auth/login/')
        request.user = None

        view = APIView()

        # Should allow first request
        assert throttle.allow_request(request, view) is True

    def test_throttle_uses_ip_for_anonymous(self, request_factory):
        """Test that IP address is used for anonymous users."""
        throttle = AuthThrottle()
        request = request_factory.post('/api/auth/login/')
        request.user = None
        request.META['REMOTE_ADDR'] = '192.168.1.1'

        view = APIView()

        cache_key = throttle.get_cache_key(request, view)
        assert '192.168.1.1' in cache_key


class TestSubmissionThrottle:
    """Tests for SubmissionThrottle."""

    def test_only_throttles_post_requests(self, request_factory, user):
        """Test that only POST requests are throttled."""
        throttle = SubmissionThrottle()
        view = APIView()

        # GET request should not be throttled
        get_request = request_factory.get('/api/submissions/')
        get_request.user = user
        assert throttle.allow_request(get_request, view) is True

        # POST request should be throttled
        post_request = request_factory.post('/api/submissions/')
        post_request.user = user
        # First POST should be allowed
        assert throttle.allow_request(post_request, view) is True


class TestBurstRateThrottle:
    """Tests for BurstRateThrottle."""

    def test_burst_rate_limit(self, request_factory, user):
        """Test burst rate limiting."""
        throttle = BurstRateThrottle()
        view = APIView()

        request = request_factory.post('/api/tasks/')
        request.user = user

        # Should allow first request
        assert throttle.allow_request(request, view) is True
```

**Step 4: Run throttle tests**

Run: `pytest lms_backend/core/tests/test_throttles.py -v`

Expected: All tests pass

**Step 5: Apply throttling to authentication views**

File: `lms_backend/apps/auth/views.py`

Add import:
```python
from core.throttles import AuthThrottle
```

Update login view:
```python
class LoginView(APIView):
    """User login view."""

    permission_classes = [AllowAny]
    throttle_classes = [AuthThrottle]  # Add this line

    # ... rest of the view ...
```

Update token refresh view:
```python
class TokenRefreshView(APIView):
    """Token refresh view."""

    permission_classes = [AllowAny]
    throttle_classes = [AuthThrottle]  # Add this line

    # ... rest of the view ...
```

**Step 6: Test rate limiting manually**

Run:
```bash
# Start development server
python manage.py runserver

# In another terminal, test rate limiting
for i in {1..15}; do
  curl -X POST http://localhost:8000/api/auth/login/ \
    -H "Content-Type: application/json" \
    -d '{"employee_id":"test","password":"wrong"}' \
    -w "\nStatus: %{http_code}\n"
done
```

Expected: First 10 requests return 400/401, requests 11-15 return 429 (Too Many Requests)

**Step 7: Commit**

```bash
git add lms_backend/config/settings/base.py lms_backend/core/throttles.py lms_backend/core/tests/test_throttles.py lms_backend/apps/auth/views.py
git commit -m "security: add API rate limiting to prevent abuse

- Configure DRF throttling with different rates for different endpoints
- Create custom throttle classes for auth and submission endpoints
- Add comprehensive tests for throttle behavior
- Apply AuthThrottle to login and token refresh endpoints
- Rates: 100/hour (anon), 1000/hour (user), 10/min (auth), 30/hour (submission)"
```

---

## Task 4: Documentation and Deployment Guide

**Files:**
- Create: `docs/deployment/environment-setup.md`
- Modify: `README.md`

**Step 1: Create environment setup documentation**

File: `docs/deployment/environment-setup.md`

```markdown
# Environment Setup Guide

## Prerequisites

- Python 3.9+
- MySQL 8.0+
- Redis 6.0+

## Environment Variables

Copy the example environment file:

```bash
cp lms_backend/.env.example lms_backend/.env
```

Configure the following variables in `.env`:

### Database Configuration

```bash
DB_NAME=lms_db
DB_USER=root
DB_PASSWORD=your_secure_password
DB_HOST=localhost
DB_PORT=3306
```

### Django Configuration

```bash
SECRET_KEY=your-secret-key-here
```

Generate a secure secret key:

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### Redis Configuration

```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
```

## Redis Setup

### macOS

```bash
brew install redis
brew services start redis
```

### Ubuntu/Debian

```bash
sudo apt-get update
sudo apt-get install redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

### Verify Redis

```bash
redis-cli ping
# Should return: PONG
```

## Installation

1. Install Python dependencies:

```bash
pip install -r requirements/base.txt
```

2. Run migrations:

```bash
python manage.py migrate
```

3. Test cache connection:

```bash
python manage.py shell -c "from django.core.cache import cache; cache.set('test', 'ok'); print(cache.get('test'))"
```

4. Start development server:

```bash
python manage.py runserver
```

## API Rate Limits

The following rate limits are enforced:

- **Anonymous users**: 100 requests/hour
- **Authenticated users**: 1000 requests/hour
- **Authentication endpoints**: 10 requests/minute
- **Submission endpoints**: 30 requests/hour

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1234567890
```

## Caching Strategy

The following data is cached:

- **Roles**: 1 hour TTL
- **Departments**: 1 hour TTL (future)
- **Tags**: 30 minutes TTL (future)

Cache keys use the prefix `lms:` to avoid conflicts.

## Security Checklist

- [ ] `.env` file is in `.gitignore`
- [ ] Database password is strong (16+ characters)
- [ ] SECRET_KEY is randomly generated
- [ ] Redis is not exposed to public internet
- [ ] Rate limiting is enabled in production
- [ ] HTTPS is configured in production
```

**Step 2: Update main README**

File: `README.md`

Add section after installation instructions:

```markdown
## Environment Configuration

This project uses environment variables for sensitive configuration. See [Environment Setup Guide](docs/deployment/environment-setup.md) for detailed instructions.

Quick start:

1. Copy environment template: `cp lms_backend/.env.example lms_backend/.env`
2. Edit `.env` with your configuration
3. Install Redis: `brew install redis` (macOS) or `apt-get install redis-server` (Ubuntu)
4. Start Redis: `brew services start redis` or `systemctl start redis`

## Performance Features

- **Redis Caching**: Frequently accessed data (roles, departments) is cached to reduce database load
- **API Rate Limiting**: Protects against abuse with configurable rate limits per endpoint
- **Query Optimization**: Uses select_related/prefetch_related for efficient database queries
```

**Step 3: Commit documentation**

```bash
git add docs/deployment/environment-setup.md README.md
git commit -m "docs: add environment setup and deployment guide

- Document environment variable configuration
- Add Redis setup instructions for different platforms
- Document API rate limiting behavior
- Add security checklist for deployment"
```

---

## Testing Checklist

After completing all tasks, verify:

- [ ] All tests pass: `pytest lms_backend/ -v`
- [ ] Database connection works with environment variables
- [ ] Redis connection is successful
- [ ] Cache is working (check Redis with `redis-cli keys "lms:*"`)
- [ ] Rate limiting is enforced (test with curl loop)
- [ ] No secrets in git history: `git log -p | grep -i password`
- [ ] `.env` is gitignored: `git check-ignore lms_backend/.env`
- [ ] Development server starts without errors

## Rollback Plan

If issues occur:

1. **Environment variables not loading**: Check `.env` file location and syntax
2. **Redis connection fails**: Verify Redis is running with `redis-cli ping`
3. **Rate limiting too strict**: Adjust rates in `config/settings/base.py`
4. **Cache issues**: Clear cache with `python manage.py shell -c "from django.core.cache import cache; cache.clear()"`

## Next Steps (Future Phases)

After this phase is complete and stable:

1. **Phase 2**: Complete Domain Layer implementation for all modules
2. **Phase 3**: Enable timezone support (`USE_TZ = True`)
3. **Phase 4**: Add API versioning (`/api/v1/`)
4. **Phase 5**: Query optimization with django-debug-toolbar
5. **Phase 6**: Structured logging and APM integration

---

**Estimated Completion**: 4 tasks, each task contains 5-9 steps
**Testing**: Comprehensive unit tests included for all new functionality
**Risk Level**: Low (non-breaking changes, backward compatible)
