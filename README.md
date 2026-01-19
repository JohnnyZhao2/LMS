# Learning Management System (LMS)

A full-stack Learning Management System built with Django REST Framework and React.

## Project Structure

- `lms_backend/` - Django REST Framework backend
- `lms_frontend/` - React frontend
- `docs/` - Documentation

## Quick Start

### Backend Setup

1. Install Python dependencies:

```bash
pip install -r lms_backend/requirements.txt
```

2. Set up environment variables:

```bash
cp lms_backend/.env.example lms_backend/.env
```

3. Run migrations:

```bash
cd lms_backend
python manage.py migrate
```

4. Start the development server:

```bash
python manage.py runserver
```

### Frontend Setup

1. Install dependencies:

```bash
cd lms_frontend
npm install
```

2. Start the development server:

```bash
npm run dev
```

## Environment Configuration

This project uses environment variables for sensitive configuration. See [Environment Setup Guide](docs/deployment/environment-setup.md) for detailed instructions.

Quick start:

1. Copy environment template: `cp lms_backend/.env.example lms_backend/.env`
2. Edit `.env` with your database credentials and a secure SECRET_KEY

## Security Features

- **API Rate Limiting**: Protects against abuse with configurable rate limits per endpoint
  - Anonymous: 100 req/hour
  - Authenticated: 1000 req/hour
  - Auth endpoints: 10 req/minute

## Documentation

- [Environment Setup Guide](docs/deployment/environment-setup.md)
