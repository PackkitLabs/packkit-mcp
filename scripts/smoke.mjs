#!/usr/bin/env node
// Boots the real server over MCP stdio (via the SDK client) and exercises the
// protocol end-to-end for all three generators: list tools, list generators, and a
// preview generate for javascript, python, and go. Fails loudly on any mismatch.
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const assert = (cond, msg) => {
  if (!cond) {
    console.error(`✖ ${msg}`);
    process.exit(1);
  }
  console.log(`  ✓ ${msg}`);
};
const textOf = (res) => (res.content ?? []).map((c) => c.text ?? '').join('\n');

const transport = new StdioClientTransport({ command: process.execPath, args: [join(root, 'server.js')] });
const client = new Client({ name: 'packkit-mcp-smoke', version: '0' }, { capabilities: {} });

try {
  await client.connect(transport);
  console.log('connected to server');

  const { tools } = await client.listTools();
  const names = tools.map((t) => t.name).sort();
  assert(
    JSON.stringify(names) ===
      JSON.stringify(['compose_fullstack', 'generate_project', 'get_generator_schema', 'list_generators', 'list_presets', 'plan_upgrade']),
    `exposes the 6 protocol tools (${names.join(', ')})`,
  );

  const gens = textOf(await client.callTool({ name: 'list_generators', arguments: {} }));
  assert(
    gens.includes('"javascript"') && gens.includes('"python"') && gens.includes('"go"'),
    'list_generators returns javascript + python + go',
  );

  const pyPresets = textOf(await client.callTool({ name: 'list_presets', arguments: { generator: 'python' } }));
  assert(pyPresets.includes('py-cli') && pyPresets.includes('py-lib'), 'python list_presets returns py-lib/py-cli');

  const pySchema = textOf(await client.callTool({ name: 'get_generator_schema', arguments: { generator: 'python' } }));
  assert(pySchema.includes('pythonVersion'), 'python get_generator_schema returns options');

  const py = textOf(await client.callTool({ name: 'generate_project', arguments: { generator: 'python', name: 'demo-py', preset: 'py-cli' } }));
  assert(py.includes('pyproject.toml') && py.includes('deploymentContract'), 'python generate_project previews files + contract');

  const js = textOf(await client.callTool({ name: 'generate_project', arguments: { generator: 'javascript', name: 'demo-js', preset: 'ts-lib' } }));
  assert(js.includes('package.json') && js.includes('Preview'), 'javascript generate_project previews files');

  // Go is an experimental generator, so its presets are hidden until opted into — proof
  // the maturity gate works across languages.
  const goHidden = textOf(await client.callTool({ name: 'list_presets', arguments: { generator: 'go' } }));
  assert(!goHidden.includes('go-service'), 'go presets are hidden by default (experimental)');
  const goPresets = textOf(await client.callTool({ name: 'list_presets', arguments: { generator: 'go', includeExperimental: true } }));
  assert(goPresets.includes('go-lib') && goPresets.includes('go-service'), 'go list_presets (includeExperimental) returns go-lib/go-service');

  // A Go HTTP service previews go.mod + the language-neutral 'service' contract with a
  // Go runtime — the multi-generator server driving all three languages by id alone.
  const go = textOf(await client.callTool({ name: 'generate_project', arguments: { generator: 'go', name: 'demo-go', preset: 'go-service' } }));
  assert(go.includes('go.mod') && go.includes('"type": "service"') && go.includes('"runtime": "go-'), 'go generate_project previews files + service contract');

  // Cross-language composition: a JavaScript React SPA frontend + a Python FastAPI
  // backend stitched into one fullstack repo by id alone — the composer never learns
  // the languages, it just reads the static + service contracts.
  const fs = textOf(
    await client.callTool({
      name: 'compose_fullstack',
      arguments: {
        name: 'demo-fs',
        frontend: { generator: 'javascript', name: 'web', preset: 'react-app' },
        backend: { generator: 'python', name: 'api', preset: 'py-service' },
      },
    }),
  );
  assert(fs.includes('apps/web/') && fs.includes('apps/server/'), 'compose_fullstack merges apps/web + apps/server');
  assert(fs.includes('docker-compose.yml'), 'compose_fullstack emits a docker-compose');
  assert(fs.includes('"type": "fullstack"') && fs.includes('"backend"') && fs.includes('"runtime": "python-'), 'compose_fullstack previews a fullstack contract with a python backend');

  console.log('\nsmoke: PASS');
} finally {
  await client.close();
}
