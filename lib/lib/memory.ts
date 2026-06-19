// lib/memory.ts
import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), '.data');
const MEMORY_FILE = path.join(DATA_DIR, 'agent-memory.json');

interface AgentMemory {
  totalPosts: number;
  agentPosts: number;
  humanPosts: number;
  lastPostAt: string | null;
  dailyCount: number;
  lastResetDate: string;
  posts: Array<{
    id: string;
    timestamp: string;
    vibe: string;
    isAgent: boolean;
    text: string;
    hash?: string;
  }>;
}

async function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
}

export async function loadMemory(): Promise<AgentMemory> {
  await ensureDataDir();
  
  try {
    const data = await readFile(MEMORY_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    const initial: AgentMemory = {
      totalPosts: 0,
      agentPosts: 0,
      humanPosts: 0,
      lastPostAt: null,
      dailyCount: 0,
      lastResetDate: new Date().toISOString().split('T')[0],
      posts: []
    };
    await saveMemory(initial);
    return initial;
  }
}

export async function saveMemory(memory: AgentMemory) {
  await ensureDataDir();
  await writeFile(MEMORY_FILE, JSON.stringify(memory, null, 2));
}

export async function recordPost(text: string, vibe: string, isAgent: boolean, hash?: string) {
  const memory = await loadMemory();
  const today = new Date().toISOString().split('T')[0];

  // Reset daily count if new day
  if (memory.lastResetDate !== today) {
    memory.dailyCount = 0;
    memory.lastResetDate = today;
  }

  memory.totalPosts += 1;
  if (isAgent) memory.agentPosts += 1;
  else memory.humanPosts += 1;

  memory.lastPostAt = new Date().toISOString();
  memory.dailyCount += 1;

  memory.posts.unshift({
    id: Date.now().toString(),
    timestamp: memory.lastPostAt,
    vibe,
    isAgent,
    text: text.slice(0, 200),
    hash
  });

  // Keep only last 100 posts
  if (memory.posts.length > 100) memory.posts.pop();

  await saveMemory(memory);
  return memory;
}

export async function getStats() {
  const memory = await loadMemory();
  return {
    totalPosts: memory.totalPosts,
    agentRatio: memory.totalPosts > 0 ? Math.round((memory.agentPosts / memory.totalPosts) * 100) : 0,
    dailyCount: memory.dailyCount,
    lastPostAt: memory.lastPostAt,
    canPost: memory.dailyCount < 5
  };
}