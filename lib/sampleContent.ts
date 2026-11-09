// The site shipped with sample testimonials, blog posts and fee amounts so it
// rendered something before the school added real content. Those samples are
// kept in the repo (see defaultTestimonials(), defaultBlogPosts() and
// FEE_BRACKETS[].defaultAmountKobo) but are hidden from the public site
// unless SHOW_SAMPLE_CONTENT=true is set, e.g. for local demos.
export function showSampleContent(): boolean {
  return process.env.SHOW_SAMPLE_CONTENT === "true";
}

// Items created by the original seed (createdBy: "seed") are samples too.
export function withoutSamples<T extends { createdBy?: string }>(items: T[]): T[] {
  return showSampleContent() ? items : items.filter((item) => item.createdBy !== "seed");
}
