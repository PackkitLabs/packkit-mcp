#!/usr/bin/env node
// Packkit MCP server — fronts EVERY Packkit generator (JavaScript + Python) through
// the @packkit/core PackkitGenerator protocol, so an agent (Claude Desktop, Cursor,
// …) scaffolds and upgrades projects in any supported language through one tool set.
//
// The server knows nothing language-specific: it registers generators and drives
// them purely through the protocol (listPresets / getSchema / createProject /
// exportDefinition / upgradeProject). Adding a language later = registering one more
// generator here; no tool changes.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, relative, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { createGeneratorRegistry } from '@packkit/core';
import { writeGeneratedProject } from '@packkit/core/node';
import { packkitGenerator } from 'create-packkit/embedded';
import { pythonGenerator } from 'create-packkit-py';

const VERSION = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'package.json'), 'utf8'),
).version;

// --- generator registry -----------------------------------------------------

const registry = createGeneratorRegistry();
registry.register(packkitGenerator); // id: "javascript"
registry.register(pythonGenerator); // id: "python"

function getGenerator(id) {
  if (!id) throw new Error('A "generator" id is required. Call list_generators for the available ids.');
  const g = registry.get(id);
  if (!g) {
    const ids = registry.list().map((x) => x.id).join(', ');
    throw new Error(`Unknown generator "${id}". Available: ${ids}.`);
  }
  return g;
}

// Experimental presets are hidden by default so an agent doesn't reach for a
// half-baked one; opt in with includeExperimental.
const visiblePresets = (g, includeExperimental) =>
  g.listPresets().filter((p) => includeExperimental || p.maturity !== 'experimental');

// --- helpers ----------------------------------------------------------------

const text = (t) => ({ content: [{ type: 'text', text: t }] });
const fail = (t) => ({ content: [{ type: 'text', text: t }], isError: true });
const json = (o) => text(JSON.stringify(o, null, 2));

const fileTree = (files) => Object.keys(files).sort().map((p) => `  ${p}`).join('\n');

// Read an existing project directory into a { relativePath: contents } map, the
// shape upgradeProject expects as `currentFiles`. Skips VCS/dependency/build dirs.
const IGNORE_DIRS = new Set(['.git', 'node_modules', '.venv', 'venv', 'dist', 'build', '__pycache__', '.pytest_cache', '.mypy_cache', '.ruff_cache']);
function readTree(dir) {
  const root = resolve(dir);
  const out = {};
  const walk = (abs) => {
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!IGNORE_DIRS.has(entry.name)) walk(join(abs, entry.name));
      } else if (entry.isFile()) {
        const full = join(abs, entry.name);
        out[relative(root, full).split(sep).join('/')] = readFileSync(full, 'utf8');
      }
    }
  };
  walk(root);
  return out;
}

// --- tools ------------------------------------------------------------------

const TOOLS = [
  {
    name: 'list_generators',
    description:
      'START HERE. Lists every Packkit generator (a language target — e.g. javascript, python) with its ' +
      'maturity and protocol capabilities. Pick the generator whose language matches what the user wants, ' +
      'then call list_presets and get_generator_schema for it before generating.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_presets',
    description:
      'List the presets a generator offers (e.g. ts-lib, react-lib, node-service for javascript; py-lib, py-cli ' +
      'for python), each with a description and maturity. Experimental presets are hidden unless includeExperimental ' +
      'is true. Choose a preset that matches the shape the user wants instead of guessing.',
    inputSchema: {
      type: 'object',
      properties: {
        generator: { type: 'string', description: 'Generator id from list_generators (e.g. "javascript", "python")' },
        includeExperimental: { type: 'boolean', description: 'Include experimental presets (default false)' },
      },
      required: ['generator'],
    },
  },
  {
    name: 'get_generator_schema',
    description:
      'Return a generator\'s full option schema — every option, its choices and defaults — as JSON. Read this ' +
      'before passing a `config` to generate_project so the options you set are valid for that generator.',
    inputSchema: {
      type: 'object',
      properties: {
        generator: { type: 'string', description: 'Generator id from list_generators' },
      },
      required: ['generator'],
    },
  },
  {
    name: 'generate_project',
    description:
      'Generate a project with a generator. By default it PREVIEWS (returns the file tree, stack summary and ' +
      'deployment contract without touching disk); pass write: true to scaffold the files under <directory>/<name>. ' +
      'Existing files are never overwritten unless force is set. Call list_presets / get_generator_schema first.',
    inputSchema: {
      type: 'object',
      properties: {
        generator: { type: 'string', description: 'Generator id from list_generators' },
        name: { type: 'string', description: 'Project/package name (also the folder name when writing)' },
        preset: { type: 'string', description: 'A preset (or alias) from list_presets' },
        config: { type: 'object', description: 'Options from get_generator_schema (overrides the preset)' },
        write: { type: 'boolean', description: 'Write files to disk (default false = preview only)' },
        directory: { type: 'string', description: 'Parent directory to create <name>/ in when writing (default: cwd)' },
        force: { type: 'boolean', description: 'Overwrite colliding existing files when writing (default false)' },
      },
      required: ['generator', 'name'],
    },
  },
  {
    name: 'plan_upgrade',
    description:
      'Plan a re-scaffold of an existing project against the current templates: a three-way diff (baseline vs ' +
      'on-disk vs freshly generated) that separates template changes from the user\'s own edits, so nothing is ' +
      'clobbered. Reports the plan only — it writes nothing. Requires a generator that supports baseline-upgrade.',
    inputSchema: {
      type: 'object',
      properties: {
        generator: { type: 'string', description: 'Generator id from list_generators' },
        directory: { type: 'string', description: 'Path to the existing scaffolded project' },
        name: { type: 'string', description: 'Project name (as originally generated)' },
        preset: { type: 'string', description: 'The preset it was generated from (if any)' },
        config: { type: 'object', description: 'The options it was generated with' },
      },
      required: ['generator', 'directory', 'name'],
    },
  },
];

// --- server -----------------------------------------------------------------

const server = new Server({ name: 'packkit', version: VERSION }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params;
  try {
    if (name === 'list_generators') {
      return json(
        registry.list().map((g) => ({
          id: g.id,
          language: g.language,
          version: g.version,
          maturity: g.maturity,
          capabilities: g.protocol.capabilities,
        })),
      );
    }

    if (name === 'list_presets') {
      const g = getGenerator(args.generator);
      return json(visiblePresets(g, !!args.includeExperimental));
    }

    if (name === 'get_generator_schema') {
      return json(getGenerator(args.generator).getSchema());
    }

    if (name === 'generate_project') {
      const g = getGenerator(args.generator);
      if (!args.name) return fail('A "name" is required.');
      const project = g.createProject({ preset: args.preset, name: args.name, config: args.config });
      const summary = {
        generator: g.id,
        metadata: project.metadata,
        deploymentContract: project.deploymentContract,
        fileCount: Object.keys(project.files).length,
      };

      if (!args.write) {
        return text(`Preview — ${g.id}/${args.name} (${Object.keys(project.files).length} files, not written):\n${fileTree(project.files)}\n\n${JSON.stringify(summary, null, 2)}`);
      }

      const parent = args.directory ? resolve(args.directory) : process.cwd();
      const targetDir = join(parent, args.name);
      const { written, skipped } = writeGeneratedProject(targetDir, project.files, { force: !!args.force });
      return text(
        `Created ${args.name} (${g.id}) at ${targetDir}\n${written.length} files written` +
          (skipped.length ? `, ${skipped.length} kept (existing): ${skipped.join(', ')}` : '') +
          `\n\n${JSON.stringify(summary, null, 2)}`,
      );
    }

    if (name === 'plan_upgrade') {
      const g = getGenerator(args.generator);
      if (typeof g.upgradeProject !== 'function' || !g.protocol.capabilities.includes('baseline-upgrade')) {
        return fail(`Generator "${g.id}" does not support baseline-upgrade.`);
      }
      if (typeof g.exportDefinition !== 'function') {
        return fail(`Generator "${g.id}" cannot export a project definition, which plan_upgrade needs.`);
      }
      const target = resolve(args.directory);
      const currentFiles = readTree(target);
      // Rebuild the definition from the requested preset/config so the diff is against
      // the templates the project would regenerate to.
      const fresh = g.createProject({ preset: args.preset, name: args.name, config: args.config });
      const definition = g.exportDefinition(fresh);
      const plan = g.upgradeProject({ definition, currentFiles });
      return json(plan);
    }

    return fail(`Unknown tool: ${name}`);
  } catch (err) {
    return fail(`Error: ${err instanceof Error ? err.message : String(err)}`);
  }
});

await server.connect(new StdioServerTransport());
