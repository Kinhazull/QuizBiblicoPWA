import test from "node:test";
import assert from "node:assert/strict";
import {
  createTestDatabase,
  seedOrganization,
  seedUser,
} from "../helpers/integration.mjs";
import {
  ELIGIBLE_CONTENT_IDS_PER_BATCH,
  listEligibleUniversalContent,
} from "../../functions/_lib/universal-eligible-content-catalog.ts";

function quizPayload(index) {
  return {
    prompt: `Pergunta biblica valida numero ${index}, qual e a resposta?`,
    choices: [
      { text: `Correta ${index}`, correct: true },
      { text: `Alternativa B ${index}`, correct: false },
      { text: `Alternativa C ${index}`, correct: false },
      { text: `Alternativa D ${index}`, correct: false },
    ],
    book: "Joao",
    theme: "Vida de Jesus",
    explanation: null,
  };
}

function fixture(t, count) {
  const ctx = createTestDatabase();
  t.after(ctx.close);
  seedOrganization(ctx);
  seedOrganization(ctx, { id: "org-2" });
  seedUser(ctx, { id: "admin-1", role: "admin" });
  seedUser(ctx, { id: "admin-2", organizationId: "org-2", role: "admin" });
  const insertContent = ctx.raw.prepare(`INSERT INTO content_items(
    id,organization_id,game_type,status,category,difficulty,biblical_reference,tags_json,payload_json,
    version,author_id,created_at,updated_at,source
  ) VALUES(?,?,'quiz-biblico','PUBLISHED','Evangelhos',?,'Joao 3:16','[]',?,1,?,1,1,'UNIVERSAL_CMS')`);
  const insertLibrary = ctx.raw.prepare(`INSERT INTO universal_content_library(
    organization_id,content_id,game_type,content_version,difficulty,themes_json,books_json,tags_json,
    priority,usage_count,first_published_at,availability_status,created_at,updated_at
  ) VALUES(?,?,'quiz-biblico',1,?,'[]','[]','[]',?,0,?,'AVAILABLE',1,1)`);
  for (let index = 0; index < count; index += 1) {
    const id = `quiz-batch-${String(index).padStart(3, "0")}`;
    const difficulty = index % 5 < 2 ? "EASY" : index % 5 < 4 ? "MEDIUM" : "HARD";
    const priority = count - index;
    insertContent.run(id, "org-1", difficulty, JSON.stringify(quizPayload(index)), "admin-1");
    insertLibrary.run("org-1", id, difficulty, priority, index + 1);
  }
  return ctx;
}

function withD1ParameterLimit(db, maxParameters = 100) {
  const contentQueries = [];
  return {
    contentQueries,
    DB: new Proxy(db, {
      get(target, property) {
        if (property === "prepare") return sql => {
          const prepared = target.prepare(sql);
          return new Proxy(prepared, {
            get(statement, method) {
              if (method === "bind") return (...values) => {
                if (/\bFROM content_items\b/i.test(sql)) {
                  contentQueries.push({ sql, values });
                  assert.ok(values.length <= maxParameters, `${values.length} exceeds D1 cap`);
                  for (const value of values.slice(1)) assert.equal(sql.includes(String(value)), false);
                }
                return statement.bind(...values);
              };
              const value = statement[method];
              return typeof value === "function" ? value.bind(statement) : value;
            },
          });
        };
        const value = target[property];
        return typeof value === "function" ? value.bind(target) : value;
      },
    }),
  };
}

for (const scenario of [
  { name: "zero items", count: 0, queries: 0 },
  { name: "less than one batch", count: 12, queries: 1 },
  { name: "exactly one batch", count: ELIGIBLE_CONTENT_IDS_PER_BATCH, queries: 1 },
  { name: "more than one batch", count: ELIGIBLE_CONTENT_IDS_PER_BATCH + 1, queries: 2 },
  { name: "two hundred candidates", count: 200, queries: 3 },
]) {
  test(`eligible catalog batches ${scenario.name} without changing order`, async t => {
    const ctx = fixture(t, scenario.count);
    const limited = withD1ParameterLimit(ctx.env.DB);
    const result = await listEligibleUniversalContent(
      { ...ctx.env, DB: limited.DB },
      { organizationId: "org-1", limit: 200 },
    );
    assert.equal(result.length, scenario.count);
    assert.equal(limited.contentQueries.length, scenario.queries);
    assert.equal(new Set(result.map(item => item.contentId)).size, result.length);
    assert.deepEqual(
      result.map(item => item.contentId),
      Array.from({ length: scenario.count }, (_, index) =>
        `quiz-batch-${String(index).padStart(3, "0")}`),
    );
  });
}

test("eligible catalog excludes absent, stale, cross-organization and invalid rows across batches", async t => {
  const ctx = fixture(t, 100);
  ctx.raw.prepare("UPDATE content_items SET status='DRAFT' WHERE id='quiz-batch-010'").run();
  ctx.raw.prepare("UPDATE content_items SET version=2 WHERE id='quiz-batch-091'").run();
  ctx.raw.prepare("UPDATE content_items SET payload_json='{}' WHERE id='quiz-batch-092'").run();
  ctx.raw.prepare(`INSERT INTO content_items(
    id,organization_id,game_type,status,category,difficulty,biblical_reference,tags_json,payload_json,
    version,author_id,created_at,updated_at,source
  ) VALUES('other-org','org-2','quiz-biblico','PUBLISHED','Evangelhos','EASY','Joao 3:16','[]',?,1,'admin-2',1,1,'UNIVERSAL_CMS')`)
    .run(JSON.stringify(quizPayload("other")));
  ctx.raw.prepare(`INSERT INTO universal_content_library(
    organization_id,content_id,game_type,content_version,difficulty,themes_json,books_json,tags_json,
    priority,usage_count,first_published_at,availability_status,created_at,updated_at
  ) VALUES('org-2','other-org','quiz-biblico',1,'EASY','[]','[]','[]',999,0,1,'AVAILABLE',1,1)`).run();
  const limited = withD1ParameterLimit(ctx.env.DB);
  const result = await listEligibleUniversalContent(
    { ...ctx.env, DB: limited.DB },
    { organizationId: "org-1", limit: 200 },
  );
  assert.equal(result.length, 97);
  for (const excluded of ["quiz-batch-010", "quiz-batch-091", "quiz-batch-092", "other-org"]) {
    assert.equal(result.some(item => item.contentId === excluded), false);
  }
  assert.ok(limited.contentQueries.every(query => query.values[0] === "org-1"));
});
