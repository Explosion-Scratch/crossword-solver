#!/usr/bin/env bun

const letters = /^[a-z]+$/;

const normalizeClue = (value) =>
    value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

const sanitize = (value) => value.replace(/[^a-z]/gi, "").toLowerCase();

const ensureMinClue = (value) => {
    const next = Number(value);
    if (!Number.isFinite(next) || next < 1) return 1;
    return Math.floor(next);
};

const parseCSVLine = (line) => {
    const fields = [];
    let field = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
        const char = line[i];
        if (char === "\"") {
            const next = line[i + 1];
            if (inQuotes && next === "\"") {
                field += "\"";
                i += 1;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === "," && !inQuotes) {
            fields.push(field);
            field = "";
        } else {
            field += char;
        }
    }
    fields.push(field);
    return fields;
};

const main = async () => {
    const [, , inputPath, minClueArg] = Bun.argv;

    if (!inputPath) {
        console.error("Usage: bun convert_wordlist.js <input-csv-path> [min-clue-count]");
        process.exit(1);
    }

    const minClueCount = ensureMinClue(minClueArg ?? 1);

    console.log(`Reading from: ${inputPath}`);
    console.log(`Minimum clue count: ${minClueCount}`);

    const file = Bun.file(inputPath);
    const text = await file.text();

    const map = new Map();
    let processedLines = 0;
    let lastProgress = Date.now();

    const lines = text.split(/\r?\n/);
    const totalLines = lines.length;

    console.log(`Processing ${totalLines} lines...`);

    for (let i = 1; i < lines.length; i += 1) {
        const line = lines[i];
        if (!line) continue;

        const [id = "", clue = "", answer = ""] = parseCSVLine(line);
        void id;

        const word = sanitize(answer);
        if (!word || !letters.test(word)) continue;

        const trimmedClue = clue.trim();
        if (!map.has(word)) map.set(word, new Map());
        if (!trimmedClue) continue;

        const normalizedClue = normalizeClue(trimmedClue);
        if (!normalizedClue) continue;

        map.get(word).set(normalizedClue, trimmedClue);

        processedLines += 1;

        const now = Date.now();
        if (now - lastProgress > 500) {
            const percentage = ((i / totalLines) * 100).toFixed(1);
            process.stdout.write(`\rProcessed ${processedLines} entries (${percentage}%)...`);
            lastProgress = now;
        }
    }

    console.log(`\nFiltering and sorting ${map.size} unique words...`);

    const next = Array.from(map.entries())
        .map(([word, clues]) => {
            const list = Array.from(clues.values());
            return [word, list];
        })
        .filter(([, clues]) => clues.length >= minClueCount)
        .sort((a, b) => a[0].localeCompare(b[0]));

    console.log(`Writing ${next.length} words to ./web/words.json...`);
    await Bun.write("./web/words.json", `${JSON.stringify(next, null, 2)}\n`);
    console.log(`✓ Done! Wrote ${next.length} entries with min ${minClueCount} clue(s)`);
};

await main();

