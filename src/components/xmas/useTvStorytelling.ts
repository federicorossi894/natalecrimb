import { useEffect, useRef, useState } from 'react';
import type { TreeOrnament } from '@/lib/data';
import { advanceStory, initialStory, storyContent, STORY_MS, STORY_RETURN_MS, type StoryPriority } from '@/lib/tv-storytelling';

export function useTvStorytelling(rows: TreeOrnament[], priority: StoryPriority, error: boolean, enabled: boolean, accelerated: boolean) {
  const tempo = accelerated ? 0.25 : 1;
  const [state, setState] = useState(() => initialStory(0));
  const [now, setNow] = useState(0);
  const inputs = useRef({ rows, priority, error });
  inputs.current = { rows, priority, error };
  useEffect(() => {
    setState(initialStory(performance.now(), 20261108, tempo));
    if (!enabled) return;
    const tick = () => {
      const time = performance.now();
      const i = inputs.current;
      setNow(time);
      setState(s => advanceStory(s, time, i.rows, i.priority, i.error, tempo));
    };
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [enabled, tempo]);
  // Synchronous priority/privacy gate: do not wait for the next timer to hide an interrupted story.
  const content = enabled && priority === 'editorial' ? storyContent(state.focus?.id, rows, error) : null;
  const elapsed = state.focus ? now - state.focus.start : 0;
  return { content, focusing: !!content && elapsed < STORY_MS - STORY_RETURN_MS, leaving: elapsed >= STORY_MS - STORY_RETURN_MS };
}