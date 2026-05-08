#!/usr/bin/env node

import { spawn } from 'node:child_process';
import process from 'node:process';

const MAX_OUTPUT_CHARS = 4000;
const TEST_MODE = process.env.COPILOT_STOP_LINT_TEST_MODE;
const LINT_COMMAND_LABEL = 'pnpm lint';

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

async function runLint(cwd) {
  if (TEST_MODE === 'pass') {
    return {
      ok: true,
      combinedOutput: 'Simulated lint success.',
    };
  }

  if (TEST_MODE === 'fail') {
    return {
      ok: false,
      exitCode: 1,
      combinedOutput: 'Simulated lint failure.',
    };
  }

  const command = process.platform === 'win32' ? process.env.ComSpec || 'cmd.exe' : 'pnpm';
  const args = process.platform === 'win32' ? ['/d', '/s', '/c', LINT_COMMAND_LABEL] : ['lint'];

  return await new Promise((resolve) => {
    const child = spawn(command, args, {
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
        combinedOutput: `Failed to start ${LINT_COMMAND_LABEL}: ${error.message}`,
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

function createBlockResponse(reason) {
  return {
    hookSpecificOutput: {
      hookEventName: 'Stop',
      decision: 'block',
      reason,
    },
  };
}

function createWarningResponse(systemMessage) {
  return {
    systemMessage,
  };
}

const payloadText = await readStdin();
let payload = {};

if (payloadText.trim()) {
  try {
    payload = JSON.parse(payloadText);
  } catch (error) {
    process.stderr.write(`Could not parse Stop hook input JSON: ${error.message}\n`);
    process.exit(1);
  }
}

if (payload.hookEventName && payload.hookEventName !== 'Stop') {
  process.exit(0);
}

const cwd = typeof payload.cwd === 'string' && payload.cwd ? payload.cwd : process.cwd();
const lintResult = await runLint(cwd);

if (lintResult.ok) {
  process.exit(0);
}

writeLintOutput(lintResult.combinedOutput ?? '');

const trimmedOutput = trimOutput(lintResult.combinedOutput ?? '');

if (payload.stop_hook_active) {
  const message = trimmedOutput
    ? `Allowing stop because ${LINT_COMMAND_LABEL} is still failing and stop_hook_active is already true.\n\nLast lint output:\n${trimmedOutput}`
    : `Allowing stop because ${LINT_COMMAND_LABEL} is still failing and stop_hook_active is already true.`;

  process.stdout.write(JSON.stringify(createWarningResponse(message)));
  process.exit(0);
}

const reason = trimmedOutput
  ? `Run ${LINT_COMMAND_LABEL} and fix the lint errors before stopping.\n\nLast lint output:\n${trimmedOutput}`
  : `Run ${LINT_COMMAND_LABEL} and fix the lint errors before stopping.`;

process.stdout.write(JSON.stringify(createBlockResponse(reason)));
