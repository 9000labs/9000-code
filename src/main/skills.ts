import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ipcMain } from 'electron';

// Types
export interface SkillFile {
  name: string;
  command: string;
  description: string;
  content: string;
  filePath: string;
  license?: string;
}

export interface SkillMetadata {
  name: string;
  command: string;
  description: string;
  filePath: string;
}

// Get Claude skills directory
function getSkillsDir(): string {
  return path.join(os.homedir(), '.claude', 'skills');
}

// Parse YAML frontmatter from markdown
function parseFrontmatter(content: string): { frontmatter: Record<string, string>; body: string } {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const frontmatterLines = match[1].split('\n');
  const frontmatter: Record<string, string> = {};

  for (const line of frontmatterLines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();
      frontmatter[key] = value;
    }
  }

  return { frontmatter, body: match[2] };
}

// Find skill.md file in a skill directory (case-insensitive)
function findSkillFile(skillDir: string): string | null {
  try {
    const files = fs.readdirSync(skillDir);
    const skillFile = files.find(f => f.toLowerCase() === 'skill.md');
    return skillFile ? path.join(skillDir, skillFile) : null;
  } catch {
    return null;
  }
}

// Read a specific skill file
export async function readSkillFile(skillName: string): Promise<SkillFile | null> {
  const skillsDir = getSkillsDir();
  const skillDir = path.join(skillsDir, skillName);
  const skillFilePath = findSkillFile(skillDir);

  if (!skillFilePath || !fs.existsSync(skillFilePath)) {
    console.error('Skill file not found:', skillName);
    return null;
  }

  try {
    const content = await fs.promises.readFile(skillFilePath, 'utf-8');
    const { frontmatter, body } = parseFrontmatter(content);

    return {
      name: frontmatter.name || skillName,
      command: `/${skillName}`,
      description: frontmatter.description || '',
      content: content,
      filePath: skillFilePath,
      license: frontmatter.license,
    };
  } catch (error) {
    console.error('Error reading skill file:', error);
    return null;
  }
}

// Write/save a skill file
export async function writeSkillFile(skillName: string, content: string): Promise<{ success: boolean; error?: string }> {
  const skillsDir = getSkillsDir();
  const skillDir = path.join(skillsDir, skillName);
  let skillFilePath = findSkillFile(skillDir);

  // If skill file doesn't exist, create new one
  if (!skillFilePath) {
    skillFilePath = path.join(skillDir, 'SKILL.md');

    // Create directory if it doesn't exist
    if (!fs.existsSync(skillDir)) {
      await fs.promises.mkdir(skillDir, { recursive: true });
    }
  }

  try {
    await fs.promises.writeFile(skillFilePath, content, 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// Get all skills metadata
export async function getAllSkills(): Promise<SkillMetadata[]> {
  const skillsDir = getSkillsDir();
  const skills: SkillMetadata[] = [];

  console.log('[Skills] Loading from:', skillsDir);

  try {
    if (!fs.existsSync(skillsDir)) {
      console.log('[Skills] Directory does not exist:', skillsDir);
      return skills;
    }

    const entries = await fs.promises.readdir(skillsDir, { withFileTypes: true });
    console.log('[Skills] Found entries:', entries.length);

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const skillDir = path.join(skillsDir, entry.name);
      const skillFilePath = findSkillFile(skillDir);

      if (!skillFilePath) {
        console.log('[Skills] No SKILL.md in:', entry.name);
        continue;
      }

      console.log('[Skills] Found skill:', entry.name, skillFilePath);

      try {
        const content = await fs.promises.readFile(skillFilePath, 'utf-8');
        const { frontmatter } = parseFrontmatter(content);

        skills.push({
          name: frontmatter.name || entry.name,
          command: `/${entry.name}`,
          description: frontmatter.description || '',
          filePath: skillFilePath,
        });
      } catch (e) {
        // Skip files that can't be read
        console.error('Error reading skill:', entry.name, e);
      }
    }

    // Sort by name
    skills.sort((a, b) => a.name.localeCompare(b.name));

    console.log('[Skills] Total skills loaded:', skills.length);
    return skills;
  } catch (error) {
    console.error('[Skills] Error getting skills:', error);
    return skills;
  }
}

// Register IPC handlers
export function registerSkillHandlers(): void {
  ipcMain.handle('skills:getAll', async () => {
    return await getAllSkills();
  });

  ipcMain.handle('skills:read', async (_, skillName: string) => {
    return await readSkillFile(skillName);
  });

  ipcMain.handle('skills:write', async (_, skillName: string, content: string) => {
    return await writeSkillFile(skillName, content);
  });
}
