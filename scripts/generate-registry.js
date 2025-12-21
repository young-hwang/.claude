#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const matter = require('gray-matter');

const REPO_ROOT = path.join(__dirname, '..');
const SUBAGENTS_DIR = path.join(REPO_ROOT, 'subagents');
const COMMANDS_DIR = path.join(REPO_ROOT, 'commands');
const OUTPUT_PATH = path.join(REPO_ROOT, 'web-ui', 'public', 'registry.json');

async function getSubagents() {
  const files = await fs.readdir(SUBAGENTS_DIR);
  const subagents = [];

  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    
    const filePath = path.join(SUBAGENTS_DIR, file);
    const content = await fs.readFile(filePath, 'utf-8');
    const { data } = matter(content);
    
    subagents.push({
      name: data.name || file.replace('.md', ''),
      category: data.category || 'uncategorized',
      description: data.description || '',
      version: '1.0.0',
      file: `subagents/${file}`,
      tools: data.tools || [],
      tags: data.tags || []
    });
  }

  return subagents.sort((a, b) => a.name.localeCompare(b.name));
}

async function getCommands() {
  const files = await fs.readdir(COMMANDS_DIR);
  const commands = [];

  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    
    const filePath = path.join(COMMANDS_DIR, file);
    const content = await fs.readFile(filePath, 'utf-8');
    const { data } = matter(content);
    
    commands.push({
      name: data.name || file.replace('.md', ''),
      category: data.category || 'uncategorized',
      description: data.description || '',
      version: '1.0.0',
      file: `commands/${file}`,
      prefix: data.prefix || '/',
      tags: data.tags || []
    });
  }

  return commands.sort((a, b) => a.name.localeCompare(b.name));
}

async function generateRegistry() {
  try {
    console.log('Generating registry.json...');
    
    const [subagents, commands] = await Promise.all([
      getSubagents(),
      getCommands()
    ]);

    const registry = {
      $schema: 'https://buildwithclaude.com/schema/registry.json',
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      subagents,
      commands
    };

    // Ensure the public directory exists
    await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
    
    // Write the registry file
    await fs.writeFile(OUTPUT_PATH, JSON.stringify(registry, null, 2));
    
    console.log(`✓ Registry generated successfully!`);
    console.log(`  - ${subagents.length} subagents`);
    console.log(`  - ${commands.length} commands`);
    console.log(`  - Output: ${OUTPUT_PATH}`);
  } catch (error) {
    console.error('Error generating registry:', error);
    process.exit(1);
  }
}

// Run the script
generateRegistry();