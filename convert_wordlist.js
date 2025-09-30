#!/usr/bin/env bun

const letters = /^[a-z]+$/;

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

const main = async () => {
    const csv = await Bun.file("./valid.csv").text();
    const rows = parseCSV(csv);
    const entries = rows.slice(1);
    const map = new Map();
    for (const [id = "", clue = "", answer = ""] of entries) {
        void id;
        const word = sanitize(answer);
        if (!word || !letters.test(word)) continue;
        const trimmedClue = clue.trim();
        if (!map.has(word)) map.set(word, new Set());
        if (trimmedClue) map.get(word).add(trimmedClue);
    }
    const next = Array.from(map.entries())
        .map(([word, clues]) => [word, Array.from(clues)])
        .sort((a, b) => a[0].localeCompare(b[0]));
    await Bun.write("./web/words.json", `${JSON.stringify(next, null, 2)}\n`);
    console.log(`Wrote ${next.length} entries to ./web/words.json`);
};

await main();

