import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ipcMain } from 'electron';

// Types
export interface AgentFile {
  name: string;
  description: string;
  content: string;
  filePath: string;
  isGlobal: boolean;  // true = root (~/.claude), false = project-specific
}

export interface AgentMetadata {
  name: string;
  description: string;
  filePath: string;
  isGlobal: boolean;
}

// Get Claude agents directory (root)
function getGlobalAgentsDir(): string {
  return path.join(os.homedir(), '.claude', 'agents');
}

// Parse agent info from markdown content
function parseAgentInfo(content: string, fileName: string): { name: string; description: string } {
  // Try to find # heading for name
  const headingMatch = content.match(/^#\s+(.+)$/m);
  const name = headingMatch ? headingMatch[1].trim() : fileName.replace('.md', '');

  // Try to find description from frontmatter or first paragraph
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
  const fmMatch = content.match(frontmatterRegex);

  let description = '';
  if (fmMatch) {
    const lines = fmMatch[1].split('\n');
    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.slice(0, colonIndex).trim().toLowerCase();
        if (key === 'description') {
          description = line.slice(colonIndex + 1).trim();
          break;
        }
      }
    }
  }

  // If no frontmatter description, try to get first paragraph
  if (!description) {
    const bodyContent = fmMatch ? content.slice(fmMatch[0].length) : content;
    const firstPara = bodyContent.split(/\n\n/)[0]?.replace(/^#+\s+.+\n?/, '').trim();
    if (firstPara && firstPara.length < 200) {
      description = firstPara;
    }
  }

  return { name, description };
}

// Read a specific agent file
export async function readAgentFile(filePath: string): Promise<AgentFile | null> {
  if (!fs.existsSync(filePath)) {
    console.error('[Agents] File not found:', filePath);
    return null;
  }

  try {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const fileName = path.basename(filePath);
    const { name, description } = parseAgentInfo(content, fileName);
    const globalDir = getGlobalAgentsDir();
    const isGlobal = filePath.startsWith(globalDir);

    return {
      name,
      description,
      content,
      filePath,
      isGlobal,
    };
  } catch (error) {
    console.error('[Agents] Error reading file:', error);
    return null;
  }
}

// Write/save an agent file
export async function writeAgentFile(filePath: string, content: string): Promise<{ success: boolean; error?: string }> {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }
    await fs.promises.writeFile(filePath, content, 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// Get all agents from a directory (recursively finds .md files)
async function getAgentsFromDir(dir: string, isGlobal: boolean): Promise<AgentMetadata[]> {
  const agents: AgentMetadata[] = [];

  if (!fs.existsSync(dir)) {
    return agents;
  }

  try {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Look for agent.md or AGENT.md inside directories
        const agentFile = ['agent.md', 'AGENT.md', 'Agent.md'].find(
          f => fs.existsSync(path.join(entryPath, f))
        );

        if (agentFile) {
          const filePath = path.join(entryPath, agentFile);
          try {
            const content = await fs.promises.readFile(filePath, 'utf-8');
            const { name, description } = parseAgentInfo(content, entry.name);
            agents.push({
              name: name || entry.name,
              description,
              filePath,
              isGlobal,
            });
          } catch (e) {
            console.error('[Agents] Error reading:', filePath, e);
          }
        }
      } else if (entry.name.toLowerCase().endsWith('.md') && entry.name.toLowerCase() !== 'readme.md') {
        // Direct .md files in agents directory
        try {
          const content = await fs.promises.readFile(entryPath, 'utf-8');
          const { name, description } = parseAgentInfo(content, entry.name);
          agents.push({
            name,
            description,
            filePath: entryPath,
            isGlobal,
          });
        } catch (e) {
          console.error('[Agents] Error reading:', entryPath, e);
        }
      }
    }
  } catch (error) {
    console.error('[Agents] Error scanning directory:', dir, error);
  }

  return agents;
}

// Get all agents (global + project-specific)
export async function getAllAgents(projectPath?: string): Promise<AgentMetadata[]> {
  const globalDir = getGlobalAgentsDir();
  console.log('[Agents] Loading global agents from:', globalDir);

  // Get global agents
  const globalAgents = await getAgentsFromDir(globalDir, true);
  console.log('[Agents] Found global agents:', globalAgents.length);

  // Get project-specific agents if projectPath provided
  let projectAgents: AgentMetadata[] = [];
  if (projectPath) {
    const projectAgentsDir = path.join(projectPath, '.claude', 'agents');
    console.log('[Agents] Loading project agents from:', projectAgentsDir);
    projectAgents = await getAgentsFromDir(projectAgentsDir, false);
    console.log('[Agents] Found project agents:', projectAgents.length);
  }

  // Combine and sort
  const allAgents = [...globalAgents, ...projectAgents];
  allAgents.sort((a, b) => {
    // Global first, then by name
    if (a.isGlobal !== b.isGlobal) {
      return a.isGlobal ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  console.log('[Agents] Total agents loaded:', allAgents.length);
  return allAgents;
}

// Create new agent
export async function createAgent(
  name: string,
  isGlobal: boolean,
  projectPath?: string
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  const baseDir = isGlobal
    ? getGlobalAgentsDir()
    : projectPath
      ? path.join(projectPath, '.claude', 'agents')
      : null;

  if (!baseDir) {
    return { success: false, error: 'No project path provided for project-specific agent' };
  }

  const agentDir = path.join(baseDir, name);
  const filePath = path.join(agentDir, 'AGENT.md');

  if (fs.existsSync(filePath)) {
    return { success: false, error: 'Agent already exists' };
  }

  const template = `# ${name}

Description of what this agent does.

## Capabilities

- Capability 1
- Capability 2

## Instructions

Instructions for the agent...
`;

  try {
    await fs.promises.mkdir(agentDir, { recursive: true });
    await fs.promises.writeFile(filePath, template, 'utf-8');
    return { success: true, filePath };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// Register IPC handlers
export function registerAgentHandlers(): void {
  ipcMain.handle('agents:getAll', async (_, projectPath?: string) => {
    return await getAllAgents(projectPath);
  });

  ipcMain.handle('agents:read', async (_, filePath: string) => {
    return await readAgentFile(filePath);
  });

  ipcMain.handle('agents:write', async (_, filePath: string, content: string) => {
    return await writeAgentFile(filePath, content);
  });

  ipcMain.handle('agents:create', async (_, name: string, isGlobal: boolean, projectPath?: string) => {
    return await createAgent(name, isGlobal, projectPath);
  });
}
