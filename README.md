# CookAssistant

Личная коллекция рецептов: адаптивный сайт на React и TypeScript с API на FastAPI. В репозитории
подготовлены основа проекта, CI, локальная база и API личного аккаунта.

## Требования

- Python 3.12 или новее
- Node.js 24 или новее
- pnpm 11

Установите pnpm, если его ещё нет:

```powershell
npm install --global pnpm@11
```

## Запуск для разработки

Откройте два терминала в корне проекта. Один раз подготовьте окружение Python:

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -e ".[dev]"
cd ..
```

В первом терминале запускайте API одной командой:

```powershell
.\backend\run.ps1
```

API автоматически перезапускается после изменения Python-файлов в `backend`.

Во втором установите зависимости сайта и запустите Vite:

```powershell
cd frontend
pnpm install
pnpm dev
```

Откройте адрес, напечатанный Vite (обычно `http://localhost:5173`). Vite проксирует `/api` на FastAPI.
Документация API доступна по адресу `http://localhost:8000/docs`, проверка здоровья —
`http://localhost:8000/api/v1/health`.

Для остановки каждого сервера нажмите `Ctrl+C` в его терминале.

## Аккаунт и API

При первом запуске API применяет миграции SQLite. База и локальные настройки хранятся в каталоге
данных вне репозитория; путь можно задать через `COOKASSISTANT_DATA_DIR`.

Перед входом создайте единственный аккаунт владельца. Узнать, требуется ли настройка, можно запросом
`GET /api/v1/auth/status`. Для создания отправьте `POST /api/v1/auth/setup` с JSON:

```json
{
  "username": "owner",
  "password": "at-least-12-characters"
}
```

Установка аккаунта автоматически начинает сессию в браузере. После выхода используйте
`POST /api/v1/auth/login` с теми же полями; `POST /api/v1/auth/logout` завершает текущую сессию.
Повторно создать аккаунт через API нельзя. Запросы рецептов требуют активную сессию:

- `GET /api/v1/recipes` — список; параметр `q` ищет по названию и тегам.
- `POST /api/v1/recipes` — создать структурированный рецепт.
- `GET /api/v1/recipes/{id}` — открыть рецепт.
- `PATCH /api/v1/recipes/{id}` — изменить переданные поля.
- `DELETE /api/v1/recipes/{id}` — удалить рецепт.

Схемы запросов и ответов опубликованы в OpenAPI: `http://localhost:8000/docs`.

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

