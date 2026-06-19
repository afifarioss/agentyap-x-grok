// lib/agent-brain.ts
import { loadMemory, recordPost, getStats } from './memory';
import { generateVibeCast } from './grok';

type Vibe = 'builder' | 'degen' | 'creator' | 'family';

const OPTIMAL_TIMES = [8, 12, 18, 21]; // 8am, 12pm, 6pm, 9pm (Malaysia time)

function shouldPostNow(): boolean {
  const now = new Date();
  const hour = now.getHours();
  return OPTIMAL_TIMES.includes(hour);
}

function chooseVibe(): Vibe {
  const rand = Math.random();
  if (rand < 0.35) return 'family';      // More family content
  if (rand < 0.6) return 'builder';
  if (rand < 0.8) return 'creator';
  return 'degen';
}

export async function heartbeat() {
  const stats = await getStats();
  
  // Safety checks
  if (stats.dailyCount >= 5) {
    console.log('Daily post limit reached. Skipping.');
    return { success: false, reason: 'daily_limit' };
  }

  if (!shouldPostNow()) {
    console.log('Not optimal posting time. Skipping.');
    return { success: false, reason: 'not_optimal_time' };
  }

  // Decide Human vs Agent (70% AgentYap)
  const isAgent = Math.random() < 0.7;

  const vibe = chooseVibe();
  const handle = 'afifarioss';
  const bio = 'Ipoh Dad building wealth on Base with family';

  try {
    const text = await generateVibeCast(vibe, handle, bio, '', isAgent);

    // TODO: Call your post-cast API here later
    console.log(`🟦 AgentYap would post (${isAgent ? 'Agent' : 'Human'} - ${vibe}):`, text);

    // Record to memory
    await recordPost(text, vibe, isAgent);

    return { 
      success: true, 
      vibe, 
      isAgent, 
      text 
    };
  } catch (error) {
    console.error('Heartbeat failed:', error);
    return { success: false, reason: 'generation_error' };
  }
}

// For manual trigger or testing
export async function manualPost(vibe: Vibe, isAgent: boolean = true) {
  const handle = 'afifarioss';
  const bio = 'Ipoh Dad building wealth on Base with family';
  
  const text = await generateVibeCast(vibe, handle, bio, '', isAgent);
  await recordPost(text, vibe, isAgent);
  
  return text;
}