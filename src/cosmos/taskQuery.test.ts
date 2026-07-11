import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildTaskCountQuery, buildTaskListQuery } from './taskQuery.ts';

test('malicious input is bound as a parameter, never interpolated into SQL', () => {
  const evil = "'; DROP DATABASE TaskApp; --";
  const spec = buildTaskListQuery({ organizationId: evil, search: evil }, 1, 10);

  assert.ok(!spec.query.includes('DROP DATABASE'), 'query text must not contain the payload');
  assert.equal(spec.parameters.find((p) => p.name === '@organizationId')?.value, evil);
  assert.equal(spec.parameters.find((p) => p.name === '@search')?.value, evil);
});

test('pagination maps page/pageSize to the right OFFSET/LIMIT', () => {
  const spec = buildTaskListQuery({ organizationId: 'org-1' }, 3, 10);
  assert.equal(spec.parameters.find((p) => p.name === '@offset')?.value, 20);
  assert.equal(spec.parameters.find((p) => p.name === '@limit')?.value, 10);
  assert.match(spec.query, /OFFSET @offset LIMIT @limit/);
});

test('optional filters only add clauses/params when provided', () => {
  const bare = buildTaskListQuery({ organizationId: 'org-1' }, 1, 10);
  assert.ok(!bare.query.includes('c.status'));
  assert.ok(!bare.query.includes('c.priority'));

  const filtered = buildTaskListQuery(
    { organizationId: 'org-1', status: 'todo', priority: 'high' },
    1,
    10,
  );
  assert.ok(filtered.query.includes('c.status = @status'));
  assert.ok(filtered.query.includes('c.priority = @priority'));
});

test('count query filters identically but has no OFFSET/LIMIT', () => {
  const spec = buildTaskCountQuery({ organizationId: 'org-1', status: 'todo' });
  assert.match(spec.query, /SELECT VALUE COUNT\(1\)/);
  assert.ok(!spec.query.includes('OFFSET'));
  assert.equal(spec.parameters.find((p) => p.name === '@status')?.value, 'todo');
});
