import { afterEach, expect, it, vi } from "vitest";
import { resetPageScroll } from "@/lib/reset-page-scroll";
afterEach(()=>vi.restoreAllMocks());
it("starts a newly mounted page at the top without a competing smooth animation",()=>{
  const to=vi.spyOn(window,"scrollTo").mockImplementation(()=>undefined);
  resetPageScroll();
  expect(to).toHaveBeenCalledWith({top:0,left:0,behavior:"instant"});
});
