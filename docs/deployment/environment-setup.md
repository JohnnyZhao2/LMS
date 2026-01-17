# Environment Setup Guide

## Prerequisites

- Python 3.9+
- MySQL 8.0+

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

## Installation

1. Install Python dependencies:

```bash
pip install -r lms_backend/requirements.txt
```

2. Run migrations:

```bash
cd lms_backend
python manage.py migrate
```

3. Start development server:

```bash
python manage.py runserver
```

## API Rate Limits

The following rate limits are enforced:

- **Anonymous users**: 100 requests/hour
- **Authenticated users**: 1000 requests/hour
- **Authentication endpoints**: 10 requests/minute
- **Submission endpoints**: 30 requests/hour

When rate limited, the API returns HTTP 429 (Too Many Requests).

## Security Checklist

- [ ] `.env` file is in `.gitignore`
- [ ] Database password is strong (16+ characters)
- [ ] SECRET_KEY is randomly generated
- [ ] Rate limiting is enabled in production
- [ ] HTTPS is configured in production
