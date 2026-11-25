# MENTRA AI module (Python)

`matcher.py` is a real, dependency-free TF-IDF + cosine-similarity matcher. It is **optional**.

- Off by default (`AI_ENABLED=false`): the backend uses its built-in keyword/topic overlap engine.
- On (`AI_ENABLED=true`, needs Python 3.8+ on PATH, or set `PYTHON_BIN`): Node spawns `matcher.py`
  and uses its text similarity for the relevance part of the score. If Python fails or times out (5 s),
  the backend falls back automatically.
- Every API result carries `match.engine` (`keyword-overlap` or `python-tfidf`), so the UI never
  claims more than what actually ran.

Test it: `npm run ai:test`

## Contract (keep this stable when upgrading the model)
stdin  : `{"mentee": "text", "mentors": [{"id": "...", "text": "..."}]}`
stdout : `{"engine": "...", "scores": [{"id": "...", "similarity": 0..1}]}`

## Where to extend
Replace `score()` with sentence embeddings (e.g. sentence-transformers), a learned ranker trained on
accepted/declined requests and feedback ratings, or a long-running FastAPI service (then change
`runPython` in `server/services/matchService.js` to an HTTP call).
