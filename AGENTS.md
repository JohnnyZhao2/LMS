# Repository Guidelines

## Project Structure & Module Organization
- `lms_backend/` contains the Django REST API. Key areas: `apps/` (domain modules like `users`, `knowledge`, `tasks`), `core/` (shared utilities), `config/` (settings and routing), and `tests/` (integration + property tests).
- `lms_frontend/` contains the React + Vite app. Source lives in `lms_frontend/src/` with `app/` for routing and app shell, `features/` for business modules, and `components/ui/` for shared UI.
- Repo-level docs (e.g., `NAMING_CONVENTIONS.md`, `project structure.md`) describe naming and architecture conventions.

## Build, Test, and Development Commands
Backend (run from `lms_backend/`):
- `pip install -r requirements.txt` — install API dependencies.
- `python manage.py runserver --settings=config.settings.development` — start the API locally.
- `python -m pytest tests/ -v` — run all backend tests.

Frontend (run from `lms_frontend/`):
- `npm install` — install UI dependencies.
- `npm run dev` — start Vite dev server.
- `npm run build` — type-check and build production assets.
- `npm run lint` — run ESLint.

## Coding Style & Naming Conventions
- Backend: PEP 8, `snake_case` for files/functions, `PascalCase` for classes; follow module naming like `services.py`, `repositories.py`.
- Frontend: `kebab-case` filenames (e.g., `task-list.tsx`), `PascalCase` components, `camelCase` variables; route paths use `kebab-case` and `ROUTES` constants.
- Prefer `@/` imports in frontend for `src/` modules.

## Testing Guidelines
- Backend uses `pytest`, `pytest-django`, `hypothesis`, and `factory-boy`.
- Tests live under `lms_backend/tests/` with names like `test_*.py` (including `tests/integration/` and `tests/properties/`).
- No frontend testing setup is documented; add tooling explicitly if needed.

## Commit & Pull Request Guidelines
- Commit messages in history are short, descriptive phrases (often Chinese), without a formal convention. Keep them concise and scoped.
- PRs should include: summary, testing notes (commands run), linked issue (if any), and screenshots for UI changes.

## Agent-Specific Instructions
- Avoid backward compatibility hacks; prefer clean refactors when touching legacy code.
- When changing DB fields, update Django models, serializers, services, and frontend types, and run a global search to update references.
- If modifying role-based UI, check shared behavior across roles (student, mentor, dept manager, admin, team manager).
