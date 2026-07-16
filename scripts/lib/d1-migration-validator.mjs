const ALLOWED_TABLE = "round_award_participant_processing";
const ALLOWED_INDEX = "round_award_participant_pending_idx";

const EXPECTED_TABLE = `
CREATE TABLE round_award_participant_processing (
  round_id TEXT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL CHECK (job_type IN ('close','cancel')),
  processed_at INTEGER NOT NULL,
  PRIMARY KEY (round_id, user_id, job_type)
)
`;

const EXPECTED_INDEX = `
CREATE INDEX round_award_participant_pending_idx
  ON round_award_participant_processing(round_id, job_type, processed_at)
`;

function validationError(command, line, reason, filename) {
  return new Error(`${filename}: command ${command} detected at line ${line}: ${reason}`);
}

function readStatements(sql, filename) {
  const statements = [];
  let output = "";
  let line = 1;
  let statementLine = 1;
  let quote = null;
  let lineComment = false;
  let blockComment = false;

  const pushStatement = () => {
    const text = output.trim();
    if (text) statements.push({ text, line: statementLine });
    output = "";
    statementLine = line;
  };

  for (let index = 0; index < sql.length; index += 1) {
    const current = sql[index];
    const next = sql[index + 1];

    if (lineComment) {
      if (current === "\n") {
        lineComment = false;
        output += "\n";
        line += 1;
        if (!output.trim()) statementLine = line;
      }
      continue;
    }
    if (blockComment) {
      if (current === "*" && next === "/") {
        blockComment = false;
        index += 1;
      } else if (current === "\n") {
        output += "\n";
        line += 1;
        if (!output.trim()) statementLine = line;
      }
      continue;
    }
    if (!quote && current === "-" && next === "-") {
      lineComment = true;
      index += 1;
      continue;
    }
    if (!quote && current === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }
    if (quote) {
      output += current;
      if (current === quote) {
        if (next === quote) {
          output += next;
          index += 1;
        } else {
          quote = null;
        }
      }
      if (current === "\n") line += 1;
      continue;
    }
    if (current === "'" || current === '"' || current === "`") {
      quote = current;
      output += current;
      continue;
    }
    if (current === ";") {
      pushStatement();
      continue;
    }
    output += current;
    if (current === "\n") {
      line += 1;
      if (!output.trim()) statementLine = line;
    }
  }

  if (quote) throw validationError("UNTERMINATED_STRING", line, "quoted value was not closed", filename);
  if (blockComment) throw validationError("UNTERMINATED_COMMENT", line, "block comment was not closed", filename);
  pushStatement();
  return statements;
}

function canonicalize(sql) {
  return sql
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\s*([(),])\s*/g, "$1")
    .toUpperCase();
}

function commandFor(statement) {
  const match = statement.match(/^\s*([A-Za-z]+)(?:\s+([A-Za-z]+))?/);
  return match ? `${match[1]}${match[2] ? ` ${match[2]}` : ""}`.toUpperCase() : "UNKNOWN";
}

export function validateMigration0021(sql, filename = "0021_award_job_checkpoints.sql") {
  const statements = readStatements(sql, filename);
  if (statements.length !== 2) {
    const extra = statements[2] || statements[statements.length - 1] || { text: "UNKNOWN", line: 1 };
    throw validationError(
      commandFor(extra.text),
      extra.line,
      `exactly two allowlisted DDL statements are required; found ${statements.length}`,
      filename,
    );
  }

  const [tableStatement, indexStatement] = statements;
  const tableMatch = tableStatement.text.match(/^\s*CREATE\s+TABLE\s+([A-Za-z_][A-Za-z0-9_]*)/i);
  if (!tableMatch) {
    throw validationError(
      commandFor(tableStatement.text),
      tableStatement.line,
      `only CREATE TABLE ${ALLOWED_TABLE} is allowed as the first statement`,
      filename,
    );
  }
  if (tableMatch[1] !== ALLOWED_TABLE) {
    throw validationError(
      `CREATE TABLE ${tableMatch[1]}`,
      tableStatement.line,
      `table is outside the allowlist; expected ${ALLOWED_TABLE}`,
      filename,
    );
  }
  if (canonicalize(tableStatement.text) !== canonicalize(EXPECTED_TABLE)) {
    throw validationError(
      `CREATE TABLE ${ALLOWED_TABLE}`,
      tableStatement.line,
      "table definition differs from the exact allowlisted checkpoint schema",
      filename,
    );
  }

  const indexMatch = indexStatement.text.match(/^\s*CREATE\s+INDEX\s+([A-Za-z_][A-Za-z0-9_]*)/i);
  if (!indexMatch) {
    throw validationError(
      commandFor(indexStatement.text),
      indexStatement.line,
      `only CREATE INDEX ${ALLOWED_INDEX} is allowed as the second statement`,
      filename,
    );
  }
  if (indexMatch[1] !== ALLOWED_INDEX) {
    throw validationError(
      `CREATE INDEX ${indexMatch[1]}`,
      indexStatement.line,
      `index is outside the allowlist; expected ${ALLOWED_INDEX}`,
      filename,
    );
  }
  if (canonicalize(indexStatement.text) !== canonicalize(EXPECTED_INDEX)) {
    throw validationError(
      `CREATE INDEX ${ALLOWED_INDEX}`,
      indexStatement.line,
      `index definition must target ${ALLOWED_TABLE}(round_id, job_type, processed_at)`,
      filename,
    );
  }

  return { table: ALLOWED_TABLE, index: ALLOWED_INDEX, statements: 2 };
}
