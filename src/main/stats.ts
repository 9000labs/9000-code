/**
 * Stats Module - Token usage data fetching
 *
 * This module reads token usage data from Claude Code's stats-cache.json file.
 * For live /usage data, users can click the button to send the command to the terminal.
 */

import { ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Stats cache file location
const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const STATS_CACHE_FILE = path.join(CLAUDE_DIR, 'stats-cache.json');

// Types matching the stats-cache.json structure
interface ModelUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
}

interface DailyModelTokens {
  [date: string]: {
    [model: string]: number;
  };
}

interface StatsCache {
  dailyActivity: { [date: string]: number };
  dailyModelTokens: DailyModelTokens;
  modelUsage: { [model: string]: ModelUsage };
}

// Processed stats for the renderer
export interface TokenStats {
  currentSession: {
    inputTokens: number;
    outputTokens: number;
    cacheRead: number;
    cacheWrite: number;
    totalTokens: number;
    cost: number;
  };
  currentWeekAllModels: {
    inputTokens: number;
    outputTokens: number;
    cacheRead: number;
    cacheWrite: number;
    totalTokens: number;
    cost: number;
  };
  currentWeekSonnetOnly: {
    inputTokens: number;
    outputTokens: number;
    cacheRead: number;
    cacheWrite: number;
    totalTokens: number;
    cost: number;
  };
  lastUpdated: string;
  source: 'file' | 'none';
}

/**
 * Get the start of the current week (Sunday)
 */
function getWeekStart(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek;
  const weekStart = new Date(now.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

/**
 * Check if a date string is within the current week
 */
function isInCurrentWeek(dateStr: string): boolean {
  const weekStart = getWeekStart();
  const date = new Date(dateStr);
  return date >= weekStart;
}

/**
 * Check if a model string contains 'sonnet'
 */
function isSonnetModel(model: string): boolean {
  return model.toLowerCase().includes('sonnet');
}

/**
 * Read stats from cache file
 */
export async function readStats(): Promise<TokenStats | null> {
  console.log('[Stats] Reading stats from file...');

  try {
    if (!fs.existsSync(STATS_CACHE_FILE)) {
      console.log('[Stats] stats-cache.json not found');
      return null;
    }

    const content = fs.readFileSync(STATS_CACHE_FILE, 'utf-8');
    const stats: StatsCache = JSON.parse(content);

    let sessionInput = 0;
    let sessionOutput = 0;
    let sessionCacheRead = 0;
    let sessionCacheWrite = 0;

    for (const [, usage] of Object.entries(stats.modelUsage || {})) {
      sessionInput += usage.inputTokens || 0;
      sessionOutput += usage.outputTokens || 0;
      sessionCacheRead += usage.cacheReadInputTokens || 0;
      sessionCacheWrite += usage.cacheCreationInputTokens || 0;
    }

    let weekAllModels = 0;
    let weekSonnetOnly = 0;

    const dailyModelTokens = stats.dailyModelTokens || {};
    for (const [dateStr, modelTokens] of Object.entries(dailyModelTokens)) {
      if (isInCurrentWeek(dateStr)) {
        for (const [model, tokens] of Object.entries(modelTokens)) {
          weekAllModels += tokens;
          if (isSonnetModel(model)) {
            weekSonnetOnly += tokens;
          }
        }
      }
    }

    console.log('[Stats] Stats loaded from file:', {
      sessionInput,
      sessionOutput,
      weekAllModels,
      weekSonnetOnly,
    });

    return {
      currentSession: {
        inputTokens: sessionInput,
        outputTokens: sessionOutput,
        cacheRead: sessionCacheRead,
        cacheWrite: sessionCacheWrite,
        totalTokens: sessionInput + sessionOutput,
        cost: 0,
      },
      currentWeekAllModels: {
        inputTokens: 0,
        outputTokens: 0,
        cacheRead: 0,
        cacheWrite: 0,
        totalTokens: weekAllModels,
        cost: 0,
      },
      currentWeekSonnetOnly: {
        inputTokens: 0,
        outputTokens: 0,
        cacheRead: 0,
        cacheWrite: 0,
        totalTokens: weekSonnetOnly,
        cost: 0,
      },
      lastUpdated: new Date().toISOString(),
      source: 'file',
    };
  } catch (error) {
    console.error('[Stats] Error reading stats-cache.json:', error);
    return null;
  }
}

/**
 * Register IPC handlers for stats
 */
export function registerStatsHandlers(): void {
  console.log('[Stats] Registering IPC handlers...');

  // Get current stats from file
  ipcMain.handle('stats:get', async () => {
    console.log('[Stats] stats:get called');
    const stats = await readStats();
    console.log('[Stats] stats:get returning:', stats ? 'data found' : 'null');
    return stats;
  });

  // Check if stats file exists
  ipcMain.handle('stats:exists', async () => {
    return fs.existsSync(STATS_CACHE_FILE);
  });

  console.log('[Stats] IPC handlers registered');
}
