#!/usr/bin/env bash
# End-to-end smoke test against a RUNNING API (and a running Cosmos emulator).
# Usage: BASE_URL=http://localhost:7071/api ORG=<uuid> bash scripts/smoke.sh
# Prints PASS/FAIL per check and exits non-zero if any check fails.
# It only touches data under $ORG and deletes everything it created at the end.
BASE_URL="${BASE_URL:-http://localhost:7071/api}"
ORG="${ORG:-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa}"
FAILS=0

# check <name> <expected http code> <curl args...>; leaves the body in $BODY
check() {
  local name="$1" expected="$2"; shift 2
  local out code
  out=$(curl -s -w $'\n%{http_code}' "$@")
  code="${out##*$'\n'}"; BODY="${out%$'\n'*}"
  if [ "$code" = "$expected" ]; then echo "PASS  $name ($code)"; else echo "FAIL  $name: expected $expected, got $code: $BODY"; FAILS=$((FAILS+1)); fi
}
has() { # has <name> <substring in $BODY>
  if [[ "$BODY" == *"$2"* ]]; then echo "PASS  $1"; else echo "FAIL  $1: '$2' not in $BODY"; FAILS=$((FAILS+1)); fi
}
J=(-H "Content-Type: application/json")
Q="organizationId=$ORG"

# ---- tasks ----
check "create task" 201 "${J[@]}" -X POST "$BASE_URL/tasks?$Q" -d '{"title":"Smoke alpha","description":"findme","priority":"high","tags":["x"],"customFields":{"f_demo":"hello"}}'
ID=$(echo "$BODY" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')
has "response has no cosmos system fields" '"createdAt"'
[[ "$BODY" != *"_etag"* ]] && echo "PASS  no _etag leaked" || { echo "FAIL  _etag leaked"; FAILS=$((FAILS+1)); }
check "get task" 200 "$BASE_URL/tasks/$ID?$Q"
check "list tasks" 200 "$BASE_URL/tasks?$Q"; has "list has total" '"total":'
check "search hit" 200 "$BASE_URL/tasks?$Q&search=FINDME"; has "search is case-insensitive" "Smoke alpha"
check "search miss" 200 "$BASE_URL/tasks?$Q&search=zzzznothing"; has "search miss is empty" '"items":[]'
check "status filter" 200 "$BASE_URL/tasks?$Q&status=todo"; has "status filter hit" "Smoke alpha"
check "create 2nd task" 201 "${J[@]}" -X POST "$BASE_URL/tasks?$Q" -d '{"title":"Smoke beta"}'
ID2=$(echo "$BODY" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')
check "pagination pageSize=1" 200 "$BASE_URL/tasks?$Q&pageSize=1&page=2"; has "pagination keeps total" '"pageSize":1'
check "patch status" 200 "${J[@]}" -X PATCH "$BASE_URL/tasks/$ID?$Q" -d '{"status":"completed"}'; has "status changed" '"status":"completed"'
check "patch with id is rejected" 400 "${J[@]}" -X PATCH "$BASE_URL/tasks/$ID?$Q" -d '{"id":"x"}'
check "patch empty body is rejected" 400 "${J[@]}" -X PATCH "$BASE_URL/tasks/$ID?$Q" -d '{}'
check "invalid JSON is rejected" 400 "${J[@]}" -X POST "$BASE_URL/tasks?$Q" -d '{oops'
check "missing title is rejected" 400 "${J[@]}" -X POST "$BASE_URL/tasks?$Q" -d '{}'
check "bad organizationId" 400 "$BASE_URL/tasks?organizationId=abc"
check "injection attempt blocked" 400 -G "$BASE_URL/tasks" --data-urlencode "organizationId=' OR 1=1 --"
check "unknown task is 404" 404 "$BASE_URL/tasks/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb?$Q"
check "bulk delete real + unknown" 200 "${J[@]}" -X POST "$BASE_URL/tasks/bulk-delete?$Q" -d "{\"ids\":[\"$ID2\",\"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb\"]}"
has "bulk deleted 1" "$ID2"; has "bulk reports notFound" "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
check "bulk delete empty list" 400 "${J[@]}" -X POST "$BASE_URL/tasks/bulk-delete?$Q" -d '{"ids":[]}'
check "delete task" 204 -X DELETE "$BASE_URL/tasks/$ID?$Q"
check "get after delete is 404" 404 "$BASE_URL/tasks/$ID?$Q"
check "delete again is 404" 404 -X DELETE "$BASE_URL/tasks/$ID?$Q"

# ---- form settings ----
check "form settings default" 200 "$BASE_URL/form-settings?$Q"; has "default has title" '"id":"title"'
DEFAULT_ROWS=$(echo "$BODY" | sed -n 's/.*"rows":\(\[.*\]\),"updatedAt".*/\1/p')
check "save default + custom field" 200 "${J[@]}" -X PUT "$BASE_URL/form-settings?$Q" -d "{\"rows\":${DEFAULT_ROWS%]},{\"id\":\"r-custom\",\"fields\":[{\"id\":\"f_demo\",\"label\":\"Reviewer Email\",\"type\":\"email\"}]}]}"
check "form settings persisted" 200 "$BASE_URL/form-settings?$Q"; has "custom field persisted" "Reviewer Email"
check "save without title rejected" 400 "${J[@]}" -X PUT "$BASE_URL/form-settings?$Q" -d '{"rows":[{"id":"r","fields":[{"id":"f_a","label":"A","type":"text"}]}]}'
check "3 fields in a row rejected" 400 "${J[@]}" -X PUT "$BASE_URL/form-settings?$Q" -d "{\"rows\":[{\"id\":\"r\",\"fields\":[{\"id\":\"a\",\"label\":\"A\",\"type\":\"text\"},{\"id\":\"b\",\"label\":\"B\",\"type\":\"text\"},{\"id\":\"c\",\"label\":\"C\",\"type\":\"text\"}]}]}"

# ---- cleanup: remove everything under the test org ----
for t in $(curl -s "$BASE_URL/tasks?$Q&pageSize=100" | grep -o '"id":"[^"]*"' | cut -d'"' -f4); do curl -s -o /dev/null -X DELETE "$BASE_URL/tasks/$t?$Q"; done
echo "tasks of the test org deleted; run: node scripts/cleanup-org.mjs $ORG to also remove its form settings"

if [ "$FAILS" -eq 0 ]; then echo "ALL CHECKS PASSED"; else echo "$FAILS CHECK(S) FAILED"; exit 1; fi
