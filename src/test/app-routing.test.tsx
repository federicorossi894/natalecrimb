import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";
import { ornamentAnchor, treeHeight } from '@/lib/tree-layout';

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  it("matches a page for / instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });
});

describe('Shared tree layout',()=>{
  it('grows from real demo counts with a bounded height',()=>{
    expect(treeHeight(4)).toBeLessThan(treeHeight(100));
    expect(treeHeight(1000)).toBe(treeHeight(100));
  });
  it('keeps each ornament anchor deterministic as the tree grows',()=>{
    const o={id:'stable-demo-id',kind:'cuore' as const,x:50,y:50};
    expect(ornamentAnchor(o,treeHeight(4))).toEqual(ornamentAnchor(o,treeHeight(4)));
    const small=ornamentAnchor(o,2),large=ornamentAnchor(o,4);
    expect(small[1]/2).toBeCloseTo(large[1]/4);
  });
});
