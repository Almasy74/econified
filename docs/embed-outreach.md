# Embed pilot outreach

Goal: 30 targeted outreaches → ≥3 conversations → ≥1 live pilot within 30 days.
If that fails, change segment or product before building admin/branding features.
Demo: https://econified.com/embed/

## Target list (build to 30)

Priority order, US-first (79% of our search audience is American):

1. **Contractor/IT staffing agencies (10-50 employees)** — they place 1099/C2C
   contractors daily; the calculator is a talking point in every rate negotiation.
   Search: "IT staffing agency" + city, "contract staffing" + niche (tech, healthcare,
   engineering). Look for firms with an active blog or "resources" page — they
   already believe in content.
2. **Independent career coaches serving tech workers** — LinkedIn search
   "career coach" + "tech" / "negotiation". Solo coaches with newsletters embed
   tools readily.
3. **Accounting firms marketing to freelancers/self-employed** — search
   "accountant for freelancers", "1099 accountant". The contractor calculator
   feeds their exact intake conversation.

Skip for now: large agencies (procurement friction), general-audience coaches,
non-US firms.

For each target record: firm name, contact person (owner/marketing lead), email,
why-them note (one line), date sent, response.

## Email draft (first touch)

Subject: A contractor-rate calculator your candidates would actually use

Hi {first name},

When a candidate asks "what hourly rate matches a $120k salary?", most agencies
answer with a rule of thumb. We built a calculator that answers it precisely —
payroll taxes, benefits, unbillable weeks, break-even rate — and we're opening it
up for embedding on recruiting and coaching sites.

Live demo (works as-is, free): https://econified.com/embed/

For a small group of early partners we're running a free 30-day pilot of the
branded version: your logo and colors, your default values, your call to action.
No signup for your visitors, nothing to install beyond an iframe.

Would a 15-minute call this week or next make sense?

{name}
Econified — financial decision tools for work, offers and independent careers

## Follow-up (day 5-7, one only)

Subject: Re: A contractor-rate calculator your candidates would actually use

Hi {first name} — quick nudge on the calculator pilot. If it's not relevant, a
one-line "not for us" helps me too. If it is: the free embed works today with no
call needed — https://econified.com/embed/

## Tracking

- Log every send + response in this file or a sheet.
- Plausible events to watch: `embed_pilot_requested`, `embed_snippet_copied`,
  and `tool_loaded` with surface=embed (shows partner iframes in the wild).
- Stop criterion (decided 2026-09-01): 30 sends → <3 conversations or 0 pilots
  ⇒ change segment (e.g. accountants only) or reposition before building more.
