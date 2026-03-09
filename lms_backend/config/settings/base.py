"""
Django base settings for LMS project.
"""
import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Load only the current environment file: .env.<env>
SETTINGS_MODULE = os.getenv('DJANGO_SETTINGS_MODULE', '')
DEFAULT_DJANGO_ENV = 'development'
if SETTINGS_MODULE.endswith('.production'):
    DEFAULT_DJANGO_ENV = 'production'

DJANGO_ENV = os.getenv('DJANGO_ENV', DEFAULT_DJANGO_ENV).strip().lower()
if DJANGO_ENV not in {'development', 'production'}:
    raise ValueError(
        f'Unsupported DJANGO_ENV "{DJANGO_ENV}". Use "development" or "production".'
    )
load_dotenv(BASE_DIR / f'.env.{DJANGO_ENV}', override=True)

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-fallback-key-for-development')
# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third party apps
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'drf_spectacular',
    # Local apps
    'apps.users',
    'apps.auth',
    'apps.knowledge',
    'apps.questions',
    'apps.quizzes',
    'apps.tasks',
    'apps.grading',
    'apps.submissions',
    'apps.spot_checks',
    'apps.dashboard',
    'apps.activity_logs',
]
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]
ROOT_URLCONF = 'config.urls'
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]
WSGI_APPLICATION = 'config.wsgi.application'
# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]
# Internationalization
LANGUAGE_CODE = 'zh-hans'
TIME_ZONE = 'Asia/Shanghai'
USE_I18N = True
# 启用时区支持，数据库存储 UTC 时间
# API 返回带时区的 ISO 8601 格式（如 2026-01-27T13:30:00+08:00）
# 前端使用 dayjs 解析时会自动转换为本地时间
USE_TZ = True
# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
# Media files
MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'
# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
# Custom user model
AUTH_USER_MODEL = 'users.User'
# Django REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'apps.users.authentication.RoleAwareJWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'core.pagination.StandardResultsSetPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'EXCEPTION_HANDLER': 'core.exceptions.custom_exception_handler',
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour',
        'auth': '10/minute',
        'submission': '30/hour',
        'burst': '60/minute',
    },
}
# Simple JWT settings
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=2),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
}
# drf-spectacular settings
SPECTACULAR_SETTINGS = {
    'TITLE': 'LMS API',
    'DESCRIPTION': '''
# 学习管理系统 (LMS) API 文档
企业级学习管理系统后端 API，实现"学、练、考、评"的能力闭环。
## 核心功能模块
- **用户认证** - JWT 认证、角色切换
- **用户管理** - 用户 CRUD、角色分配、师徒关系
- **知识文档** - 知识库管理、分类管理
- **题库管理** - 题目 CRUD、批量导入
- **试卷管理** - 试卷 CRUD、题目关联
- **任务管理** - 学习/练习/考试任务
- **答题评分** - 答题提交、自动评分、人工评分
- **抽查管理** - 线下抽查记录
- **统计分析** - 仪表盘、数据看板
- **通知服务** - 任务通知、截止提醒
## 角色权限
- **学员 (STUDENT)** - 执行任务、查看知识
- **导师 (MENTOR)** - 管理名下学员、创建任务
- **室经理 (DEPT_MANAGER)** - 管理本室人员
- **管理员 (ADMIN)** - 全平台管理
- **团队经理 (TEAM_MANAGER)** - 只读数据分析
''',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    # Schema configuration
    'SCHEMA_PATH_PREFIX': r'/api/',
    'COMPONENT_SPLIT_REQUEST': True,
    'SORT_OPERATIONS': True,
    'SORT_OPERATION_PARAMETERS': True,
    # Tags configuration
    'TAGS': [
        # 认证与用户
        {'name': '认证', 'description': '用户登录、登出、角色切换'},
        {'name': '用户管理', 'description': '用户 CRUD、角色分配、师徒关系'},
        # 内容管理
        {'name': '知识管理', 'description': '知识库管理、分类管理'},
        {'name': '题库管理', 'description': '题目管理、批量导入'},
        {'name': '试卷管理', 'description': '试卷管理、题目关联'},
        # 任务管理
        {'name': '任务管理', 'description': '学习/练习/考试任务创建与管理'},
        {'name': '学员任务执行', 'description': '学员查看和执行分配的任务'},
        # 答题与评分
        {'name': '练习答题', 'description': '练习任务答题提交'},
        {'name': '考试答题', 'description': '考试任务答题提交'},
        {'name': '评分管理', 'description': '待评分列表、主观题评分'},
        # 抽查
        {'name': '抽查管理', 'description': '线下抽查记录管理'},
        # 学员端
        {'name': '学员仪表盘', 'description': '学员首页待办任务和最新知识'},
        {'name': '学员知识中心', 'description': '学员浏览知识文档'},
        {'name': '学员任务中心', 'description': '学员任务列表和筛选'},
        {'name': '学员个人中心', 'description': '个人信息、历史成绩、错题本'},
        # 管理端
        {'name': '导师/室经理仪表盘', 'description': '导师和室经理的统计数据'},
        {'name': '团队经理数据看板', 'description': '团队经理只读数据分析'},
        # 通知
        {'name': '通知', 'description': '通知列表、已读标记'},
    ],
    # Security configuration
    'SECURITY': [{'Bearer': []}],
    'APPEND_COMPONENTS': {
        'securitySchemes': {
            'Bearer': {
                'type': 'http',
                'scheme': 'bearer',
                'bearerFormat': 'JWT',
                'description': 'JWT 认证，格式: Bearer <token>',
            }
        }
    },
    # Response configuration
    'POSTPROCESSING_HOOKS': [],
    'PREPROCESSING_HOOKS': [],
}
# Cache settings (using Django's default in-memory cache for rate limiting)
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'lms-cache',
    }
}

# CORS settings
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = []
