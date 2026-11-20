#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
repo_dir="$PWD"
python_bin="${MNEMOS_PYTHON:-$repo_dir/python_backend/.venv/bin/python}"
postgres_container=
redis_container=
api_pid=
log_file="$(mktemp)"

cleanup() {
  local result=$?
  if [[ $result != 0 ]]; then tail -80 "$log_file" >&2; fi
  if [[ -n $api_pid ]]; then kill "$api_pid" 2>/dev/null || true; fi
  if [[ -n $redis_container ]]; then docker stop "$redis_container" >/dev/null 2>&1 || true; fi
  if [[ -n $postgres_container ]]; then docker stop "$postgres_container" >/dev/null 2>&1 || true; fi
  rm -f "$log_file"
}
trap cleanup EXIT

postgres_container="$(docker run -d --rm -p 127.0.0.1::5432 \
  -e POSTGRES_PASSWORD=mnemos_test -e POSTGRES_DB=mnemos_test postgres:15)"
redis_container="$(docker run -d --rm -p 127.0.0.1::6379 redis:7-alpine)"
postgres_address="$(docker port "$postgres_container" 5432/tcp)"
redis_address="$(docker port "$redis_container" 6379/tcp)"

read -r api_port frontend_port <<< "$("$python_bin" - <<'PY'
import socket

with socket.socket() as api, socket.socket() as frontend:
    for listener in (api, frontend):
        listener.bind(("127.0.0.1", 0))
    print(api.getsockname()[1], frontend.getsockname()[1])
PY
)"

export DB_HOST=127.0.0.1 DB_PORT="${postgres_address##*:}" DB_NAME=mnemos_test
export DB_USER=postgres DB_PASSWORD=mnemos_test
export REDIS_HOST=127.0.0.1 REDIS_PORT="${redis_address##*:}" REDIS_DB=0
export CELERY_BROKER_URL="redis://127.0.0.1:$REDIS_PORT/0"
export CELERY_RESULT_BACKEND="$CELERY_BROKER_URL"
export MNEMOS_TEST_API_URL="http://127.0.0.1:$api_port"
export MNEMOS_TEST_FRONTEND_PORT="$frontend_port" CORS_ORIGIN="http://127.0.0.1:$frontend_port"
export NODE_ENV=test PYTHONDONTWRITEBYTECODE=1
export WORKSPACE_USER_ID=eb66c1a9-42b0-4dda-83fb-b549c6c9f952
unset MNEMOS_TEST_FRONTEND_URL

for attempt in {1..30}; do
  if docker exec "$postgres_container" pg_isready -h 127.0.0.1 -U postgres -d mnemos_test >/dev/null; then break; fi
  sleep 1
done

(
  cd python_backend
  "$python_bin" -m alembic upgrade head
)
docker exec "$postgres_container" createdb -U postgres mnemos_legacy
(
  cd python_backend
  DB_NAME=mnemos_legacy "$python_bin" -m alembic upgrade 24ad4412ca2d
  docker exec -i "$postgres_container" psql -X -U postgres -d mnemos_legacy -v ON_ERROR_STOP=1 <<'SQL'
INSERT INTO users (id, username, email, password_hash, role)
VALUES ('3e356a1d-21aa-417e-bb6c-bc8c3c4b074f', '旧版本地资料', 'legacy@example.test', '!', 'user');
INSERT INTO user_learning_languages (id, user_id, language, current_level, is_primary, is_active, created_at, updated_at)
VALUES ('3ab1e1bc-bafc-4a03-90bd-fa1f73c40219', '3e356a1d-21aa-417e-bb6c-bc8c3c4b074f', 'ja', 'B2', true, true, now(), now());
SQL
  DB_NAME=mnemos_legacy "$python_bin" -m alembic upgrade head
  docker exec -i "$postgres_container" psql -X -U postgres -d mnemos_legacy -v ON_ERROR_STOP=1 <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM workspace_settings
    JOIN user_learning_languages USING (user_id)
    WHERE workspace_settings.id = 1
      AND user_id = '3e356a1d-21aa-417e-bb6c-bc8c3c4b074f'
      AND language = 'ja' AND current_level = 'B2'
  ) THEN
    RAISE EXCEPTION 'Existing profile or learning data was not preserved';
  END IF;
END $$;
SQL
)

docker exec -i "$postgres_container" psql -X -U postgres -d mnemos_test -v ON_ERROR_STOP=1 <<'SQL'
INSERT INTO async_tasks (id, user_id, task_type, status, created_at, updated_at, completed_at)
SELECT seed.id, workspace_settings.user_id, seed.task_type, seed.status, seed.finished, seed.finished, seed.finished
FROM workspace_settings CROSS JOIN (VALUES
  ('d1b2060f-d88f-4168-b44e-1a88d0d84811'::uuid, 'old-completed', 'completed', now() - interval '10 days'),
  ('d04d7158-4f5f-479c-888b-6ef87df28f02'::uuid, 'recent-completed', 'completed', now() - interval '1 day'),
  ('29c6457f-0613-43d9-b080-039b579de900'::uuid, 'old-failed', 'failed', now() - interval '10 days')
) AS seed(id, task_type, status, finished);
SQL
(
  cd python_backend
  exec "$python_bin" -m uvicorn app.main:app --host 127.0.0.1 --port "$api_port"
) >"$log_file" 2>&1 &
api_pid=$!

for attempt in {1..30}; do
  if curl -fsS "$MNEMOS_TEST_API_URL/health" 2>/dev/null | "$python_bin" -c 'import json, sys; sys.exit(json.load(sys.stdin)["status"] != "healthy")' 2>/dev/null; then
    npx playwright test tests/workspace-live.spec.ts --project=chromium --workers=1 --retries=0 "$@"
    exit
  fi
  sleep 1
done
echo "测试工作台未能启动。" >&2
exit 1
