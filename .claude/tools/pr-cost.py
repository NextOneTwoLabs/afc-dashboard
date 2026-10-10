# Prints token usage and dollar cost per brief segment from the agent transcripts in a session folder.
# Usage per brief segment for each agent transcript. Prices $/MTok from the claude-api skill (cached 2026-10-06).
import json, sys, glob, os
P = {"claude-opus-5-5": (4.0, 20.0, 0.20), "claude-sonnet-5-5": (2.0, 10.0, 0.20)}
def cost(m, u):
    i, o, r = P.get(m, (0, 0, 0))
    cc = u.get("cache_creation") or {}
    w5 = cc.get("ephemeral_5m_input_tokens", u.get("cache_creation_input_tokens", 0) if not cc else 0)
    w1 = cc.get("ephemeral_1h_input_tokens", 0)
    return (u.get("input_tokens", 0)*i + w5*i*1.25 + w1*i*2 + u.get("cache_read_input_tokens", 0)*r + u.get("output_tokens", 0)*o) / 1e6
for f in sys.argv[1:]:
    segs = []; seen = {}
    for line in open(f):
        try: e = json.loads(line)
        except Exception: continue
        msg = e.get("message") or {}
        if e.get("type") == "user":
            c = msg.get("content"); t = c if isinstance(c, str) else next((x.get("text", "") for x in (c or []) if isinstance(x, dict) and x.get("type") == "text"), "")
            if t and (not segs or "coordinator sent a message" in t[:80]):
                segs.append({"ts": e.get("timestamp", ""), "brief": t.replace("The coordinator sent a message while you were working: ", "")[:90].replace("\n", " "), "msgs": {}})
            continue
        if e.get("type") == "assistant" and msg.get("usage") and segs:
            old = segs[-1]["msgs"].get(msg.get("id"), (None, {}))[1]
            u = dict(msg["usage"])
            vis = sum(len(json.dumps(x.get("input", ""))) + len(x.get("text", "")) + len(x.get("thinking", "")) for x in msg.get("content", []) if isinstance(x, dict))
            u["output_tokens"] = max(u.get("output_tokens", 0) or 0, (old.get("output_tokens", 0) or 0) + int(vis / 3.5))
            m2 = {k: max(u.get(k, 0) or 0, old.get(k, 0) or 0) for k in ("input_tokens","cache_creation_input_tokens","cache_read_input_tokens","output_tokens")}
            cc = u.get("cache_creation") or old.get("cache_creation") or {}
            m2["cache_creation"] = cc
            segs[-1]["msgs"][msg.get("id")] = (msg.get("model"), m2)
    print("==", os.path.basename(f))
    for s in segs:
        tok = {"in": 0, "w": 0, "r": 0, "out": 0}; c = 0; model = ""
        for mid, (m, u) in s["msgs"].items():
            model = m or model
            tok["in"] += u.get("input_tokens", 0); tok["w"] += u.get("cache_creation_input_tokens", 0)
            tok["r"] += u.get("cache_read_input_tokens", 0); tok["out"] += u.get("output_tokens", 0); c += cost(m, u)
        if s["msgs"]:
            tot = sum(tok.values())
            print(f'{s["ts"][:16]} {model[7:]:11} tot={tot/1e6:6.2f}M out={tok["out"]/1e3:5.0f}k ${c:6.2f} | {s["brief"]}')
