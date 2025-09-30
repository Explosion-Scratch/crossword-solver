const normalizeClue = (value) =>
    value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

let entries = [];

const dedupeEntries = (list) =>
    list.map(({ word, clues }) => {
        const map = new Map();
        for (const clue of clues ?? []) {
            if (!clue) continue;
            const normalized = normalizeClue(clue);
            if (!normalized) continue;
            if (!map.has(normalized)) map.set(normalized, clue.trim());
        }
        return { word, clues: Array.from(map.values()) };
    });

const filterEntries = (minClueCount) =>
    entries.filter((entry) => entry.clues.length >= minClueCount);

const handlers = {
    init(payload) {
        entries = dedupeEntries(payload.entries ?? []);
        self.postMessage({
            type: "initialized",
            payload: { entries },
        });
    },
    filter(payload) {
        const minClueCount = payload.minClueCount ?? 1;
        const requestId = payload.requestId ?? 0;
        const filtered = filterEntries(minClueCount);
        self.postMessage({
            type: "filtered",
            payload: { entries: filtered, minClueCount, requestId },
        });
    },
};

self.onmessage = (event) => {
    const message = event.data ?? {};
    const handler = handlers[message.type];
    if (!handler) return;
    handler(message.payload ?? {});
};

