#!/usr/bin/env python3
"""MENTRA matching module (Python, standard library only).

Reads JSON on stdin:   {"mentee": "<text>", "mentors": [{"id": "...", "text": "..."}]}
Writes JSON to stdout: {"engine": "tfidf-cosine", "scores": [{"id": "...", "similarity": 0.0-1.0}]}

Method: TF-IDF vectors over the mentor corpus + the mentee text, scored by cosine similarity.
This is classical information retrieval, not a neural or LLM model. It is called by
server/services/matchService.js when AI_ENABLED=true; swap in embeddings or a classifier here later
without changing the Node API (keep the same stdin/stdout contract).
"""
import json
import math
import re
import sys
from collections import Counter

STOP = set((
    "a an and are as at be by for from has have i in is it its me my of on or our so that the their this to "
    "want wants was we will with you your about into more learn learning get help how what who why can like "
    "become better good very really also just not but if then than them they these those would should could"
).split())


def tokens(text):
    out = []
    for t in re.findall(r"[a-z0-9+#.]{2,}", (text or "").lower()):
        t = t.strip(".")
        if len(t) > 1 and t not in STOP:
            out.append(t)
    return out


def score(mentee_text, mentors):
    docs = [tokens(m.get("text", "")) for m in mentors]
    query = tokens(mentee_text)
    corpus = docs + [query]
    n = len(corpus)
    df = Counter()
    for d in corpus:
        df.update(set(d))
    idf = {t: math.log((1 + n) / (1 + c)) + 1 for t, c in df.items()}

    def vec(doc):
        tf = Counter(doc)
        v = {t: (1 + math.log(c)) * idf[t] for t, c in tf.items()}
        norm = math.sqrt(sum(x * x for x in v.values())) or 1.0
        return {t: x / norm for t, x in v.items()}

    qv = vec(query)
    results = []
    for m, d in zip(mentors, docs):
        dv = vec(d)
        sim = sum(w * dv.get(t, 0.0) for t, w in qv.items())
        results.append({"id": str(m.get("id")), "similarity": round(sim, 4)})
    return results


def selftest():
    mentors = [
        {"id": "web", "text": "Full stack engineer React Node.js MongoDB web development mentor"},
        {"id": "ml", "text": "Machine learning researcher Python deep learning data science NLP"},
    ]
    res = {r["id"]: r["similarity"] for r in score("I want to learn machine learning and Python data science", mentors)}
    assert res["ml"] > res["web"], res
    print("selftest ok", res)


if __name__ == "__main__":
    if "--selftest" in sys.argv:
        selftest()
    else:
        payload = json.loads(sys.stdin.read() or "{}")
        scores = score(payload.get("mentee", ""), payload.get("mentors", []))
        print(json.dumps({"engine": "tfidf-cosine", "scores": scores}))
