# CookAssistant

Личная коллекция рецептов: адаптивный сайт на React и TypeScript с API на FastAPI. На первом этапе подготовлены каркас приложения, проверка доступности API и CI.

## Требования

- Python 3.12 или новее
- Node.js 24 или новее
- pnpm 11

Установите pnpm, если его ещё нет:

```powershell
npm install --global pnpm@11
```

## Запуск для разработки

Откройте два терминала в корне проекта.

В первом создайте окружение Python и запустите API:

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -e ".[dev]"
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Во втором установите зависимости сайта и запустите Vite:

```powershell
cd frontend
pnpm install
pnpm dev
```

Откройте адрес, напечатанный Vite (обычно `http://localhost:5173`). Vite проксирует `/api` на FastAPI. Документация API доступна по адресу `http://localhost:8000/docs`, проверка здоровья — `http://localhost:8000/api/v1/health`.

Для остановки каждого сервера нажмите `Ctrl+C` в его терминале. В следующих этапах появятся рецепты, аккаунт и хранение данных.

## Проверки

Backend:

```powershell
cd backend
python -m ruff check .
python -m ruff format --check .
python -m pytest
```

Frontend:

```powershell
cd frontend
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

GitHub Actions запускает эти проверки при открытии или обновлении pull request и при push в `master`.

