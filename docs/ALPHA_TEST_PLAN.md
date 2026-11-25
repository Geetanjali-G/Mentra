# MENTRA internal alpha test: matching accuracy

## Goal
Find out whether the mentors MENTRA ranks highly are the ones real students and mentors consider a good fit, and
learn what to change before a wider release.

## Who
- 6 to 10 students and 3 to 5 mentors (friends, classmates, seniors, faculty volunteers). More is better, but even a small group shows clear patterns.
- Mix of departments and years so the matching has something to separate.
- Everyone must create their **own real profile** (real interests and goals). Do not create fake testers, the results would be meaningless.
- Tell participants that their names and ratings are visible to the test organiser.

## Setup (organiser)
1. Run MENTRA somewhere testers can reach (a deployed link, or the same Wi-Fi with your laptop's IP).
2. Put your email in `ALPHA_ADMIN_EMAILS` in `.env`, restart the server. An **Alpha Report** item appears in your sidebar after you log in.
3. Run `npm run smoke` once to confirm the whole flow works.
4. Optional: run the test twice, once with `AI_ENABLED=false` and once with `AI_ENABLED=true`, and compare "by engine" in the report.

## Tasks (15 to 20 minutes each)
**Students:** register, complete the profile (specific interests and learning goals), open *Discover Mentors*, look at the top 5 to 8 results, and press 👍 or 👎 on each one ("Would I actually want to talk to this mentor about my goals?"). On a 👎 write one line why. Send at least one request. Add one learning goal.
**Mentors:** register, complete the profile, wait for or receive requests, and press 👍 or 👎 on each incoming request ("Is this student a good fit for me?"). Accept one request, schedule a session, and add one entry in the *Knowledge Base*.
Everyone: use the Knowledge Base search at least once and note whether you found what you looked for.

## What we measure (from the Alpha Report)
| Metric | Meaning | Target for alpha |
|---|---|---|
| Matches rated good (precision) | Share of shown matches people agreed with | 70% or more |
| Good-rate by score bucket | Low < Medium < High should rise | Clearly increasing |
| Avg score of good vs not good | Good matches should score higher | Gap of 15 points or more |
| False positives | High score, rated not relevant | Read every comment |
| False negatives | Low score, rated relevant | Read every comment |

With a small group these are signals, not statistics. Read the comments first, numbers second.

## Short survey (after the session, 5-point scale unless noted)
1. The top mentors shown to me were relevant to my goals.
2. The "shared topics" explanation made the match easier to trust.
3. I found it easy to complete my profile.
4. I found a useful solution in the Knowledge Base.
5. What was the single most confusing or annoying thing? (open)
6. Which mentor or student did the system miss that it should have shown? (open)

## After the test: how to act on results
- Many false positives on generic words: extend the stop-word list in `server/services/matchService.js` and `ai/matcher.py`.
- Many false negatives where wording differs ("ML" vs "machine learning"): add a small synonym map, or move the text part to embeddings in `ai/matcher.py`.
- Score does not separate good from bad: change the weights (topic 45%, text relevance 35%, experience 10%, rating 10%) and compare again with the same exported CSV.
- Record every change and re-run a second, shorter round with the same testers.

## Issue log
| # | Tester | What happened | Severity | Fixed? |
|---|---|---|---|---|
