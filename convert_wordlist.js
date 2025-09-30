#!/usr/bin/env bun

const letters = /^[a-z]+$/;

const normalizeClue = (value) =>
    value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

const parseCSV = (text) => {
    const rows = [];
    let current = [];
    let field = "";
    let inQuotes = false;
    for (let i = 0; i < text.length; i += 1) {
        const char = text[i];
        if (char === "\"") {
            const next = text[i + 1];
            if (inQuotes && next === "\"") {
                field += "\"";
                i += 1;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === "," && !inQuotes) {
            current.push(field);
            field = "";
        } else if ((char === "\n" || char === "\r") && !inQuotes) {
            if (field || current.length) {
                current.push(field);
                rows.push(current);
                current = [];
                field = "";
            }
        } else {
            field += char;
        }
    }
    if (field || current.length) {
        current.push(field);
        rows.push(current);
    }
    return rows;
};

const sanitize = (value) => value.replace(/[^a-z]/gi, "").toLowerCase();

const ensureMinClue = (value) => {
    const next = Number(value);
    if (!Number.isFinite(next) || next < 1) return 1;
    return Math.floor(next);
};

const main = async () => {
    const [, , minClueArg] = Bun.argv;
    const minClueCount = ensureMinClue(minClueArg ?? 1);
    const csv = await Bun.file("./valid.csv").text();
    const rows = parseCSV(csv);
    const entries = rows.slice(1);
    const map = new Map();
    for (const [id = "", clue = "", answer = ""] of entries) {
        void id;
        const word = sanitize(answer);
        if (!word || !letters.test(word)) continue;
        const trimmedClue = clue.trim();
        if (!map.has(word)) map.set(word, new Map());
        if (!trimmedClue) continue;
        const normalizedClue = normalizeClue(trimmedClue);
        if (!normalizedClue) continue;
        map.get(word).set(normalizedClue, trimmedClue);
    }
    const next = Array.from(map.entries())
        .map(([word, clues]) => {
            const list = Array.from(clues.values());
            return [word, list];
        })
        .filter(([, clues]) => clues.length >= minClueCount)
        .sort((a, b) => a[0].localeCompare(b[0]));
    await Bun.write("./web/words.json", `${JSON.stringify(next, null, 2)}\n`);
    console.log(`Wrote ${next.length} entries to ./web/words.json with min ${minClueCount} clue(s)`);
};

await main();

