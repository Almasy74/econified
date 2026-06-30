# Econified — AdSense Readiness Audit

_Audited against the live repository on 2026-06-30. This is scored against the **actual** site state, not a generic checklist._

## Overall verdict

The site is **much closer to AdSense-ready than a generic "low-value content" template would suggest.** It already has 24 calculators with deep per-tool content, 8 guides, a full set of trust pages, schema markup, a tier/ad-gating system, and disciplined sitemap/noindex hygiene. The remaining work is **narrow and mostly about E-E-A-T signals and two thin pages** — not a structural rebuild.

**Recommended action:** clear the P0 + P1 items below (roughly 1–2 focused sessions), then reapply. Do **not** wait to write 25 brand-new articles — the existing content depth already exceeds what most approved tool sites carry.

---

## Scorecard

| Area | Status | Notes |
|------|--------|-------|
| Original, useful tools | ✅ Strong | 24 calculators, each genuinely functional |
| Per-tool explainer content | ✅ Strong | Every tool has method, assumptions, 2–3 insights, 6–10 FAQs, worked examples (richContent) — enforced by a strict build-time validator |
| Trust pages | ✅ Present | about, contact, privacy, terms, cookies, disclaimer, how-it-works |
| Navigation / structure | ✅ Good | Clean header + mobile menu, 5 topical hubs, tools & guides indexes |
| Technical SEO | ✅ Good | canonical, viewport, meta description, JSON-LD (SoftwareApplication, Breadcrumb, FAQ), robots.txt, split sitemaps, thin programmatic pages noindexed |
| ads.txt | ✅ Fixed this session | Was **missing**; added `public/ads.txt` for pub-6293439009227714 |
| Long-form guides | 🟡 Mixed | 5 deep guides (1,000–1,780 words) + 2 **thin** guides (~515–526 words) |
| E-E-A-T / authorship | 🔴 Weak | About page names **no real person or credentials**; guides have **no author byline or review date** |
| Social/Open Graph | 🟡 Minor | No `og:`/Twitter card tags (not blocking, but a trust/CTR signal) |

---

## P0 — Do before reapplying (blocking-risk)

1. **ads.txt — DONE this session.** `public/ads.txt` now contains
   `google.com, pub-6293439009227714, DIRECT, f08c47fec0942fa0`.
   Verify it serves at `https://econified.com/ads.txt` after deploy. AdSense flags a missing ads.txt as "earnings at risk."

2. **Add a named, credentialed author to the About page.** Currently `src/pages/about.astro` is generic ("Helping you make sense of work and pay") with no person behind it. YMYL/financial reviewers weight this heavily. Add: who runs Econified, relevant background (economics/finance/career), and why the math can be trusted. A real name + photo + one paragraph of genuine experience is enough.

3. **Expand the 2 thin guides to 1,000+ words** so no indexed editorial page sits at ~500 words:
   - `src/pages/guides/compare-job-offers-correctly.astro` (526 words)
   - `src/pages/guides/contractor-vs-employee-pay.astro` (515 words)
   Add a worked example, a short FAQ, and a link to the matching calculator in each. (You declined this in scope this session — flagged here so it isn't lost.)

## P1 — Strongly recommended

4. **Add an author byline + "Last reviewed" date to each guide.** Tool pages already show a "Last Updated" signal; guides do not. A simple `By <name> · Reviewed <date>` line adds an E-E-A-T signal cheaply.

5. **Confirm content/ad balance per page.** AdSense rejects pages where ads dominate thin content. Your tool pages are content-rich, so this is fine — but when you place ad units, keep them **below the calculator and interleaved with the explainer**, never above the fold on a thin variant. The `noAds` + `noindex` gating already exists in `Layout.astro`; keep programmatic corridor/equivalency pages `noAds`.

6. **Add Open Graph + Twitter card tags** to `Layout.astro` (title, description, a default share image). Minor for approval, real for trust and click-through once live.

## P2 — Nice to have / post-approval

7. **Grow guide count toward ~15–20** by pairing one evergreen guide to each major tool cluster (you have 8; the 3 new calculators added this session are natural candidates: raise-vs-inflation, geo-arbitrage, commute-vs-hybrid-vs-remote). Not required for approval given tool-page depth, but strengthens topical authority.

8. **Internal linking pass:** ensure each new tool links to a guide and vice-versa (the decision-graph `nextDecision`/`upstreamDecision` fields are set for the 3 new tools — extend this coverage across older tools).

---

## What is already handled (don't redo)

- ✅ Per-tool "How it works", assumptions, FAQs, worked examples — the generic prompt's "Section 2.3" is effectively complete and **build-enforced** (`scripts/validate-definitions.ts` requires exactly 3 use-cases, 2–3 insights, 6–10 FAQs).
- ✅ Privacy framing ("runs locally in your browser, no inputs stored") is already on every tool page.
- ✅ Thin programmatic pages (salary corridors, equivalency, most destinations) are already `noindex` and excluded from the sitemap, with a passing `sitemap-audit`.
- ✅ Mobile-friendly layout, fast static Astro build, clean nav.

---

## Suggested timeline

- **Week 1:** P0 items (ads.txt verified live, About author, 2 thin guides expanded). → reapply.
- **Weeks 2–4 (parallel / post-submit):** P1 bylines, OG tags, ad-unit placement.
- **Ongoing:** P2 guide growth + internal linking.

This is closer to a **1–2 week** runway than the generic "4–8 weeks," because the heavy lifting (tools, structure, trust pages, technical SEO) is already done.
