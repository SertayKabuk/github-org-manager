#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const MAX_OUTPUT_CHARS = 4000;
const TEST_MODE = process.env.COPILOT_POST_TOOL_LINT_TEST_MODE;
const EDIT_TOOL_NAMES = new Set([
  'apply_patch',
  'create_file',
  'replace_string_in_file',
  'editFiles',
]);
const LINTABLE_EXTENSIONS = new Set([
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.ts',
  '.tsx',
  '.mts',
  '.cts',
]);

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';

    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      resolve(data);
    });
    process.stdin.on('error', (error) => {
      reject(error);
    });
  });
}

function trimOutput(output) {
  const normalized = output.trim();

  if (!normalized) {
    return '';
  }

  if (normalized.length <= MAX_OUTPUT_CHARS) {
    return normalized;
  }

  return `${normalized.slice(0, MAX_OUTPUT_CHARS)}\n…output truncated…`;
}

function writeLintOutput(output) {
  if (!output.trim()) {
    return;
  }

  process.stderr.write(`${output.trimEnd()}\n`);
}

function toAbsoluteFilePath(candidatePath, cwd) {
  if (typeof candidatePath !== 'string' || !candidatePath.trim()) {
    return null;
  }

  const trimmedPath = candidatePath.trim();

  if (trimmedPath.startsWith('file://')) {
    try {
      return path.normalize(fileURLToPath(trimmedPath));
    } catch {
      return null;
    }
  }

  return path.normalize(path.isAbsolute(trimmedPath) ? trimmedPath : path.resolve(cwd, trimmedPath));
}

function isWithinWorkspace(filePath, cwd) {
  const relativePath = path.relative(cwd, filePath);

  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

function isLintableFile(filePath) {
  return LINTABLE_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function parsePatchedFiles(patchText, cwd) {
  if (typeof patchText !== 'string' || !patchText.trim()) {
    return [];
  }

  const files = [];

  for (const line of patchText.split(/\r?\n/u)) {
    const match = line.match(/^\*\*\* (Add|Update|Delete) File: (.+)$/u);

    if (!match) {
      continue;
    }

    const [, action, rawPath] = match;

    if (action === 'Delete') {
      continue;
    }

    const normalizedPath = rawPath.split(' -> ')[0]?.trim();
    const resolvedPath = toAbsoluteFilePath(normalizedPath, cwd);

    if (resolvedPath) {
      files.push(resolvedPath);
    }
  }

  return files;
}

function collectPathsFromValue(value, cwd) {
  if (typeof value === 'string') {
    const filePath = toAbsoluteFilePath(value, cwd);
    return filePath ? [filePath] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectPathsFromValue(item, cwd));
  }

  return [];
}

function getChangedFiles(toolName, toolInput, cwd) {
  if (!EDIT_TOOL_NAMES.has(toolName) || !toolInput || typeof toolInput !== 'object') {
    return [];
  }

  const files = [
    ...collectPathsFromValue(toolInput.filePath, cwd),
    ...collectPathsFromValue(toolInput.filePaths, cwd),
    ...collectPathsFromValue(toolInput.files, cwd),
    ...collectPathsFromValue(toolInput.uri, cwd),
    ...collectPathsFromValue(toolInput.uris, cwd),
  ];

  if (toolName === 'apply_patch') {
    files.push(...parsePatchedFiles(toolInput.input, cwd));
  }

  return [...new Set(files)].filter(
    (filePath) => isWithinWorkspace(filePath, cwd) && isLintableFile(filePath)
  );
}

async function runLint(cwd, files) {
  if (TEST_MODE === 'pass') {
    return {
      ok: true,
      combinedOutput: 'Simulated changed-file lint success.',
    };
  }

  if (TEST_MODE === 'fail') {
    return {
      ok: false,
      exitCode: 1,
      combinedOutput: 'Simulated changed-file lint failure.',
    };
  }

  const eslintBinPath = path.join(cwd, 'node_modules', 'eslint', 'bin', 'eslint.js');

  try {
    await access(eslintBinPath);
  } catch {
    return {
      ok: false,
      exitCode: 1,
      combinedOutput: `Could not find the local ESLint binary at ${path.relative(cwd, eslintBinPath)}.`,
    };
  }

  return await new Promise((resolve) => {
    const child = spawn(process.execPath, [eslintBinPath, '--no-warn-ignored', ...files], {
      cwd,
      env: process.env,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');

    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });

    child.on('error', (error) => {
      resolve({
        ok: false,
        exitCode: 1,
        combinedOutput: `Failed to start changed-file ESLint: ${error.message}`,
      });
    });

    child.on('close', (code) => {
      resolve({
        ok: code === 0,
        exitCode: code ?? 1,
        combinedOutput: [stdout, stderr].filter(Boolean).join('\n').trim(),
      });
    });
  });
}

function createBlockResponse(reason, additionalContext) {
  return {
    decision: 'block',
    reason,
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext,
    },
  };
}

const payloadText = await readStdin();
let payload = {};

if (payloadText.trim()) {
  try {
    payload = JSON.parse(payloadText);
  } catch (error) {
    process.stderr.write(`Could not parse PostToolUse hook input JSON: ${error.message}\n`);
    process.exit(1);
  }
}

if (payload.hookEventName && payload.hookEventName !== 'PostToolUse') {
  process.exit(0);
}

const cwd = typeof payload.cwd === 'string' && payload.cwd ? payload.cwd : process.cwd();
const toolName = typeof payload.tool_name === 'string' ? payload.tool_name : '';
const toolInput = payload.tool_input;
const changedFiles = getChangedFiles(toolName, toolInput, cwd);

if (changedFiles.length === 0) {
  process.exit(0);
}

const lintResult = await runLint(cwd, changedFiles);

if (lintResult.ok) {
  process.exit(0);
}

writeLintOutput(lintResult.combinedOutput ?? '');

const relativeFiles = changedFiles.map((filePath) => path.relative(cwd, filePath) || filePath);
const trimmedOutput = trimOutput(lintResult.combinedOutput ?? '');
const reason = `Changed-file lint failed after ${toolName || 'a file edit'}. Fix the lint errors before continuing.`;
const additionalContext = trimmedOutput
  ? `The PostToolUse hook linted these changed files:\n- ${relativeFiles.join('\n- ')}\n\nLast lint output:\n${trimmedOutput}`
  : `The PostToolUse hook linted these changed files:\n- ${relativeFiles.join('\n- ')}`;

process.stdout.write(JSON.stringify(createBlockResponse(reason, additionalContext)));
