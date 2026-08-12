#!/usr/bin/env node
// Boots the real server over MCP stdio (via the SDK client) and exercises the
// protocol end-to-end for BOTH generators: list tools, list generators, and a
// preview generate for javascript and python. Fails loudly on any mismatch.
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
      JSON.stringify(['generate_project', 'get_generator_schema', 'list_generators', 'list_presets', 'plan_upgrade']),
    `exposes the 5 protocol tools (${names.join(', ')})`,
  );

  const gens = textOf(await client.callTool({ name: 'list_generators', arguments: {} }));
  assert(gens.includes('"javascript"') && gens.includes('"python"'), 'list_generators returns javascript + python');

  const pyPresets = textOf(await client.callTool({ name: 'list_presets', arguments: { generator: 'python' } }));
  assert(pyPresets.includes('py-cli') && pyPresets.includes('py-lib'), 'python list_presets returns py-lib/py-cli');

  const pySchema = textOf(await client.callTool({ name: 'get_generator_schema', arguments: { generator: 'python' } }));
  assert(pySchema.includes('pythonVersion'), 'python get_generator_schema returns options');

  const py = textOf(await client.callTool({ name: 'generate_project', arguments: { generator: 'python', name: 'demo-py', preset: 'py-cli' } }));
  assert(py.includes('pyproject.toml') && py.includes('deploymentContract'), 'python generate_project previews files + contract');

  const js = textOf(await client.callTool({ name: 'generate_project', arguments: { generator: 'javascript', name: 'demo-js', preset: 'ts-lib' } }));
  assert(js.includes('package.json') && js.includes('Preview'), 'javascript generate_project previews files');

  console.log('\nsmoke: PASS');
} finally {
  await client.close();
}
