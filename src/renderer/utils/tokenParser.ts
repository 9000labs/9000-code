/**
 * Token Parser for Claude Code CLI Output
 *
 * Parses terminal output to extract token usage information.
 * Handles various formats that Claude Code CLI might output.
 */

export interface ParsedTokens {
  inputTokens?: number;
  outputTokens?: number;
  cacheRead?: number;
  cacheWrite?: number;
  totalTokens?: number;
  cost?: number;
  model?: string;
}

// Remove ANSI escape codes from terminal output
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '');
}

// Parse token count string like "15.2K", "1.5M", "1234"
function parseTokenCount(str: string): number {
  const cleaned = str.trim().toUpperCase();

  if (cleaned.endsWith('M')) {
    return parseFloat(cleaned.slice(0, -1)) * 1000000;
  }
  if (cleaned.endsWith('K')) {
    return parseFloat(cleaned.slice(0, -1)) * 1000;
  }

  // Handle comma-separated numbers like "1,234"
  const num = parseFloat(cleaned.replace(/,/g, ''));
  return isNaN(num) ? 0 : num;
}

// Parse cost string like "$0.12", "$1.50"
function parseCost(str: string): number {
  const cleaned = str.trim().replace('$', '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Main parser function - attempts to extract token info from terminal output
 */
export function parseTokensFromOutput(output: string): ParsedTokens | null {
  const cleaned = stripAnsi(output);
  const result: ParsedTokens = {};
  let found = false;

  // Pattern 1: "Tokens: 15.2K in, 3.1K out" or "tokens: 15200 input, 3100 output"
  const tokensPattern1 = /tokens?[:\s]+([0-9,.]+[KMkm]?)\s*(?:in|input)[,\s]+([0-9,.]+[KMkm]?)\s*(?:out|output)/i;
  const match1 = cleaned.match(tokensPattern1);
  if (match1) {
    result.inputTokens = parseTokenCount(match1[1]);
    result.outputTokens = parseTokenCount(match1[2]);
    result.totalTokens = result.inputTokens + result.outputTokens;
    found = true;
  }

  // Pattern 2: "Input: 15.2K | Output: 3.1K" format
  const tokensPattern2 = /input[:\s]+([0-9,.]+[KMkm]?).*?output[:\s]+([0-9,.]+[KMkm]?)/i;
  const match2 = cleaned.match(tokensPattern2);
  if (match2 && !found) {
    result.inputTokens = parseTokenCount(match2[1]);
    result.outputTokens = parseTokenCount(match2[2]);
    result.totalTokens = result.inputTokens + result.outputTokens;
    found = true;
  }

  // Pattern 3: Total tokens only "Session: 45K tokens" or "Total: 45000 tokens"
  const totalPattern = /(?:session|total)[:\s]+([0-9,.]+[KMkm]?)\s*tokens?/i;
  const matchTotal = cleaned.match(totalPattern);
  if (matchTotal && !result.totalTokens) {
    result.totalTokens = parseTokenCount(matchTotal[1]);
    found = true;
  }

  // Pattern 4: Cache information "cache read: 5K, cache write: 1K"
  const cacheReadPattern = /cache\s*read[:\s]+([0-9,.]+[KMkm]?)/i;
  const cacheWritePattern = /cache\s*write[:\s]+([0-9,.]+[KMkm]?)/i;

  const cacheReadMatch = cleaned.match(cacheReadPattern);
  const cacheWriteMatch = cleaned.match(cacheWritePattern);

  if (cacheReadMatch) {
    result.cacheRead = parseTokenCount(cacheReadMatch[1]);
    found = true;
  }
  if (cacheWriteMatch) {
    result.cacheWrite = parseTokenCount(cacheWriteMatch[1]);
    found = true;
  }

  // Pattern 5: Cost "Cost: $0.12" or "$0.12"
  const costPattern = /cost[:\s]*\$([0-9,.]+)/i;
  const costMatch = cleaned.match(costPattern);
  if (costMatch) {
    result.cost = parseCost(costMatch[1]);
    found = true;
  }

  // Pattern 6: Model information "Model: claude-3-sonnet" or "(sonnet)"
  const modelPatterns = [
    /model[:\s]*(claude[^\s,|]+)/i,
    /\((opus|sonnet|haiku)\)/i,
    /(claude-[0-9]+-(?:opus|sonnet|haiku)[^\s,|]*)/i,
  ];

  for (const pattern of modelPatterns) {
    const modelMatch = cleaned.match(pattern);
    if (modelMatch) {
      result.model = modelMatch[1].toLowerCase();
      found = true;
      break;
    }
  }

  // Pattern 7: Claude Code specific format with stats line
  // "› Cost: $0.0842 | Input: 28.5K | Output: 1.2K | Cache Read: 0 | Cache Write: 28.5K"
  const statsLinePattern = /cost[:\s]*\$([0-9,.]+).*?input[:\s]*([0-9,.]+[KMkm]?).*?output[:\s]*([0-9,.]+[KMkm]?)/i;
  const statsMatch = cleaned.match(statsLinePattern);
  if (statsMatch) {
    result.cost = parseCost(statsMatch[1]);
    result.inputTokens = parseTokenCount(statsMatch[2]);
    result.outputTokens = parseTokenCount(statsMatch[3]);
    result.totalTokens = result.inputTokens + result.outputTokens;
    found = true;
  }

  // Pattern 8: Compact token display "[45K tokens]" or "[in:30K out:15K]"
  const compactPattern1 = /\[([0-9,.]+[KMkm]?)\s*tokens?\]/i;
  const compactMatch1 = cleaned.match(compactPattern1);
  if (compactMatch1 && !result.totalTokens) {
    result.totalTokens = parseTokenCount(compactMatch1[1]);
    found = true;
  }

  const compactPattern2 = /\[in[:\s]*([0-9,.]+[KMkm]?)[,\s]+out[:\s]*([0-9,.]+[KMkm]?)\]/i;
  const compactMatch2 = cleaned.match(compactPattern2);
  if (compactMatch2) {
    result.inputTokens = parseTokenCount(compactMatch2[1]);
    result.outputTokens = parseTokenCount(compactMatch2[2]);
    result.totalTokens = result.inputTokens + result.outputTokens;
    found = true;
  }

  return found ? result : null;
}

/**
 * Accumulator class to track token usage over time
 */
export class TokenAccumulator {
  private sessionTokens: ParsedTokens = {
    inputTokens: 0,
    outputTokens: 0,
    cacheRead: 0,
    cacheWrite: 0,
    totalTokens: 0,
    cost: 0,
  };

  private lastParsedTokens: ParsedTokens | null = null;

  // Add new token data (incremental)
  addTokens(tokens: ParsedTokens): void {
    if (tokens.inputTokens !== undefined) {
      this.sessionTokens.inputTokens = (this.sessionTokens.inputTokens || 0) + tokens.inputTokens;
    }
    if (tokens.outputTokens !== undefined) {
      this.sessionTokens.outputTokens = (this.sessionTokens.outputTokens || 0) + tokens.outputTokens;
    }
    if (tokens.cacheRead !== undefined) {
      this.sessionTokens.cacheRead = (this.sessionTokens.cacheRead || 0) + tokens.cacheRead;
    }
    if (tokens.cacheWrite !== undefined) {
      this.sessionTokens.cacheWrite = (this.sessionTokens.cacheWrite || 0) + tokens.cacheWrite;
    }
    if (tokens.cost !== undefined) {
      this.sessionTokens.cost = (this.sessionTokens.cost || 0) + tokens.cost;
    }

    // Recalculate total
    this.sessionTokens.totalTokens =
      (this.sessionTokens.inputTokens || 0) +
      (this.sessionTokens.outputTokens || 0);

    this.lastParsedTokens = tokens;
  }

  // Set absolute values (for when CLI shows cumulative)
  setTokens(tokens: ParsedTokens): void {
    if (tokens.inputTokens !== undefined) {
      this.sessionTokens.inputTokens = tokens.inputTokens;
    }
    if (tokens.outputTokens !== undefined) {
      this.sessionTokens.outputTokens = tokens.outputTokens;
    }
    if (tokens.cacheRead !== undefined) {
      this.sessionTokens.cacheRead = tokens.cacheRead;
    }
    if (tokens.cacheWrite !== undefined) {
      this.sessionTokens.cacheWrite = tokens.cacheWrite;
    }
    if (tokens.totalTokens !== undefined) {
      this.sessionTokens.totalTokens = tokens.totalTokens;
    }
    if (tokens.cost !== undefined) {
      this.sessionTokens.cost = tokens.cost;
    }

    this.lastParsedTokens = tokens;
  }

  getSessionTokens(): ParsedTokens {
    return { ...this.sessionTokens };
  }

  getLastParsed(): ParsedTokens | null {
    return this.lastParsedTokens;
  }

  reset(): void {
    this.sessionTokens = {
      inputTokens: 0,
      outputTokens: 0,
      cacheRead: 0,
      cacheWrite: 0,
      totalTokens: 0,
      cost: 0,
    };
    this.lastParsedTokens = null;
  }
}

// Singleton accumulator for the current session
export const sessionTokenAccumulator = new TokenAccumulator();

/**
 * Parse /usage command output from Claude Code CLI
 *
 * Expected format examples:
 * "Session: 45.2K tokens ($0.08)"
 * "Today: 125K tokens ($0.25)"
 * "This week: 1.2M tokens ($2.40)"
 * "  - Sonnet: 980K tokens"
 * "  - Opus: 220K tokens"
 *
 * Or newer format:
 * "Total tokens: 45,230"
 * "Total cost: $0.08"
 */
export interface UsageData {
  session: {
    tokens: number;
    cost: number;
  };
  today: {
    tokens: number;
    cost: number;
  };
  thisWeek: {
    tokens: number;
    cost: number;
    byModel: {
      sonnet: number;
      opus: number;
      haiku: number;
    };
  };
}

export function parseUsageOutput(output: string): UsageData | null {
  const cleaned = stripAnsi(output);
  const lines = cleaned.split('\n');

  const result: UsageData = {
    session: { tokens: 0, cost: 0 },
    today: { tokens: 0, cost: 0 },
    thisWeek: {
      tokens: 0,
      cost: 0,
      byModel: { sonnet: 0, opus: 0, haiku: 0 },
    },
  };

  let foundAny = false;

  for (const line of lines) {
    // Session pattern: "Session: 45.2K tokens ($0.08)"
    const sessionMatch = line.match(/session[:\s]+([0-9,.]+[KMkm]?)\s*tokens?(?:\s*\(\$([0-9,.]+)\))?/i);
    if (sessionMatch) {
      result.session.tokens = parseTokenCount(sessionMatch[1]);
      result.session.cost = sessionMatch[2] ? parseCost(sessionMatch[2]) : 0;
      foundAny = true;
    }

    // Today pattern: "Today: 125K tokens ($0.25)"
    const todayMatch = line.match(/today[:\s]+([0-9,.]+[KMkm]?)\s*tokens?(?:\s*\(\$([0-9,.]+)\))?/i);
    if (todayMatch) {
      result.today.tokens = parseTokenCount(todayMatch[1]);
      result.today.cost = todayMatch[2] ? parseCost(todayMatch[2]) : 0;
      foundAny = true;
    }

    // This week pattern: "This week: 1.2M tokens ($2.40)"
    const weekMatch = line.match(/(?:this\s*)?week[:\s]+([0-9,.]+[KMkm]?)\s*tokens?(?:\s*\(\$([0-9,.]+)\))?/i);
    if (weekMatch) {
      result.thisWeek.tokens = parseTokenCount(weekMatch[1]);
      result.thisWeek.cost = weekMatch[2] ? parseCost(weekMatch[2]) : 0;
      foundAny = true;
    }

    // Model breakdown: "- Sonnet: 980K tokens" or "Sonnet: 980K"
    const sonnetMatch = line.match(/sonnet[:\s]+([0-9,.]+[KMkm]?)/i);
    if (sonnetMatch) {
      result.thisWeek.byModel.sonnet = parseTokenCount(sonnetMatch[1]);
      foundAny = true;
    }

    const opusMatch = line.match(/opus[:\s]+([0-9,.]+[KMkm]?)/i);
    if (opusMatch) {
      result.thisWeek.byModel.opus = parseTokenCount(opusMatch[1]);
      foundAny = true;
    }

    const haikuMatch = line.match(/haiku[:\s]+([0-9,.]+[KMkm]?)/i);
    if (haikuMatch) {
      result.thisWeek.byModel.haiku = parseTokenCount(haikuMatch[1]);
      foundAny = true;
    }

    // Alternative format: "Total tokens: 45,230" for session
    const totalTokensMatch = line.match(/total\s*tokens?[:\s]+([0-9,.]+[KMkm]?)/i);
    if (totalTokensMatch && result.session.tokens === 0) {
      result.session.tokens = parseTokenCount(totalTokensMatch[1]);
      foundAny = true;
    }

    // Alternative format: "Total cost: $0.08"
    const totalCostMatch = line.match(/total\s*cost[:\s]*\$([0-9,.]+)/i);
    if (totalCostMatch && result.session.cost === 0) {
      result.session.cost = parseCost(totalCostMatch[1]);
      foundAny = true;
    }

    // Note: Input/Output breakdown patterns are available but not currently used
    // as we track totals for simplicity
  }

  return foundAny ? result : null;
}
