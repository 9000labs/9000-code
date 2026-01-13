import { ipcMain, shell } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// File/Directory entry type
export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  isFile: boolean;
  size: number;
  modifiedTime: string;
  extension: string;
}

// Text file extensions that can be viewed internally
const TEXT_EXTENSIONS = new Set([
  // Code
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
  '.py', '.pyw', '.pyx',
  '.java', '.kt', '.kts', '.scala',
  '.c', '.h', '.cpp', '.hpp', '.cc', '.cxx',
  '.cs', '.fs', '.vb',
  '.go', '.rs', '.rb', '.php', '.swift', '.m', '.mm',
  '.lua', '.pl', '.pm', '.r', '.R', '.jl',
  '.sh', '.bash', '.zsh', '.fish', '.ps1', '.psm1', '.bat', '.cmd',
  '.sql', '.graphql', '.gql',

  // Web
  '.html', '.htm', '.xhtml',
  '.css', '.scss', '.sass', '.less', '.styl',
  '.vue', '.svelte', '.astro',

  // Data/Config
  '.json', '.jsonc', '.json5',
  '.yaml', '.yml',
  '.toml', '.ini', '.cfg', '.conf',
  '.xml', '.xsl', '.xslt', '.svg',
  '.env', '.env.local', '.env.development', '.env.production',

  // Documentation
  '.md', '.markdown', '.mdx',
  '.txt', '.text', '.log',
  '.rst', '.adoc', '.asciidoc',

  // Other
  '.gitignore', '.gitattributes', '.gitmodules',
  '.editorconfig', '.prettierrc', '.eslintrc',
  '.dockerignore', '.npmignore',
  '.htaccess', '.htpasswd',
  '.csv', '.tsv',
]);

// Files without extension that are typically text
const TEXT_FILENAMES = new Set([
  'Makefile', 'Dockerfile', 'Vagrantfile', 'Gemfile', 'Rakefile',
  'LICENSE', 'LICENCE', 'README', 'CHANGELOG', 'CONTRIBUTING',
  'AUTHORS', 'CODEOWNERS', 'OWNERS',
  '.gitignore', '.gitattributes', '.gitmodules',
  '.editorconfig', '.prettierrc', '.eslintrc', '.babelrc',
  '.nvmrc', '.node-version', '.ruby-version', '.python-version',
]);

// Check if file can be viewed internally
export function canViewInternally(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  const basename = path.basename(filePath);

  return TEXT_EXTENSIONS.has(ext) || TEXT_FILENAMES.has(basename);
}

// Read directory contents
async function readDirectory(dirPath: string): Promise<FileEntry[]> {
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    const results: FileEntry[] = [];

    for (const entry of entries) {
      // Skip hidden files (starting with .) except common config files
      if (entry.name.startsWith('.') && !TEXT_FILENAMES.has(entry.name)) {
        continue;
      }

      // Skip node_modules and other common ignored directories
      if (entry.isDirectory() && ['node_modules', '.git', '__pycache__', '.next', 'dist', 'build', '.cache'].includes(entry.name)) {
        continue;
      }

      const fullPath = path.join(dirPath, entry.name);

      try {
        const stats = await fs.promises.stat(fullPath);

        results.push({
          name: entry.name,
          path: fullPath,
          isDirectory: entry.isDirectory(),
          isFile: entry.isFile(),
          size: stats.size,
          modifiedTime: stats.mtime.toISOString(),
          extension: entry.isFile() ? path.extname(entry.name).toLowerCase() : '',
        });
      } catch {
        // Skip files we can't stat (permission issues, etc.)
        continue;
      }
    }

    // Sort: directories first, then by name
    results.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });

    return results;
  } catch (error) {
    console.error('[Files] Failed to read directory:', dirPath, error);
    throw error;
  }
}

// Read file content
async function readFileContent(filePath: string): Promise<{ content: string; encoding: string }> {
  try {
    // Check file size first (limit to 5MB for text viewing)
    const stats = await fs.promises.stat(filePath);
    if (stats.size > 5 * 1024 * 1024) {
      throw new Error('File too large to view (max 5MB)');
    }

    const content = await fs.promises.readFile(filePath, 'utf-8');
    return { content, encoding: 'utf-8' };
  } catch (error) {
    console.error('[Files] Failed to read file:', filePath, error);
    throw error;
  }
}

// Open file with system default application
async function openWithDefaultApp(filePath: string): Promise<string> {
  try {
    const result = await shell.openPath(filePath);
    if (result) {
      throw new Error(result);
    }
    return 'success';
  } catch (error) {
    console.error('[Files] Failed to open file:', filePath, error);
    throw error;
  }
}

// Open file location in file explorer
async function showInFolder(filePath: string): Promise<void> {
  try {
    shell.showItemInFolder(filePath);
  } catch (error) {
    console.error('[Files] Failed to show in folder:', filePath, error);
    throw error;
  }
}

// Get initial path (home directory or specific path)
function getInitialPath(): string {
  return os.homedir();
}

// Normalize Windows drive path (C: -> C:\)
function normalizeDrivePath(inputPath: string): string {
  // Check if it's a Windows drive letter without trailing slash (e.g., "C:" or "D:")
  if (/^[A-Za-z]:$/.test(inputPath)) {
    return inputPath + '\\';
  }
  return inputPath;
}

// Get list of available drives on Windows
async function getWindowsDrives(): Promise<FileEntry[]> {
  const drives: FileEntry[] = [];

  // Check common drive letters A-Z
  const driveLetters = 'CDEFGHIJKLMNOPQRSTUVWXYZAB'.split('');

  for (const letter of driveLetters) {
    const drivePath = `${letter}:\\`;
    try {
      await fs.promises.access(drivePath, fs.constants.R_OK);
      drives.push({
        name: `${letter}:`,
        path: drivePath,
        isDirectory: true,
        isFile: false,
        size: 0,
        modifiedTime: new Date().toISOString(),
        extension: '',
      });
    } catch {
      // Drive not accessible, skip
    }
  }

  return drives;
}

// Register IPC handlers for file operations
export function registerFileHandlers() {
  // Get initial/home path
  ipcMain.handle('files:getInitialPath', async () => {
    return getInitialPath();
  });

  // Read directory contents
  ipcMain.handle('files:readDirectory', async (_, dirPath: string) => {
    try {
      // Normalize Windows drive paths
      const normalizedPath = normalizeDrivePath(dirPath);
      const entries = await readDirectory(normalizedPath);
      return { success: true, entries };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Get Windows drives list
  ipcMain.handle('files:getDrives', async () => {
    try {
      if (process.platform === 'win32') {
        const drives = await getWindowsDrives();
        return { success: true, drives };
      }
      return { success: true, drives: [] };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Read file content
  ipcMain.handle('files:readFile', async (_, filePath: string) => {
    try {
      const result = await readFileContent(filePath);
      return { success: true, ...result };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Check if file can be viewed internally
  ipcMain.handle('files:canViewInternally', async (_, filePath: string) => {
    return canViewInternally(filePath);
  });

  // Open file with default application
  ipcMain.handle('files:openExternal', async (_, filePath: string) => {
    try {
      await openWithDefaultApp(filePath);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Show file in folder
  ipcMain.handle('files:showInFolder', async (_, filePath: string) => {
    try {
      await showInFolder(filePath);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Get parent directory
  ipcMain.handle('files:getParentPath', async (_, currentPath: string) => {
    const normalizedPath = normalizeDrivePath(currentPath);
    const parentPath = path.dirname(normalizedPath);

    // Check if we're at a drive root on Windows (e.g., C:\)
    const isWindowsDriveRoot = /^[A-Za-z]:\\?$/.test(normalizedPath);
    if (isWindowsDriveRoot) {
      // Return drives list instead of going up
      return { success: true, path: '', isRoot: true, showDrives: true };
    }

    // Prevent going above root
    if (parentPath === normalizedPath) {
      return { success: true, path: normalizedPath, isRoot: true };
    }

    return { success: true, path: parentPath, isRoot: false };
  });

  // Check if path exists and get type
  ipcMain.handle('files:getPathInfo', async (_, targetPath: string) => {
    try {
      const stats = await fs.promises.stat(targetPath);
      return {
        success: true,
        exists: true,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
        size: stats.size,
        modifiedTime: stats.mtime.toISOString(),
      };
    } catch {
      return { success: true, exists: false };
    }
  });

  console.log('[Files] IPC handlers registered');
}
