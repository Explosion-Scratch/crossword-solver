let allEntries = [];
let filteredEntries = [];

const normalizeClue = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const loadWordList = async () => {
  const response = await fetch("./words.json");
  if (!response.ok) throw new Error("Failed to load word list.");
  const data = await response.json();
  return data.map(([word, clues]) => ({
    word,
    clues: Array.from(
      new Map(
        (clues ?? [])
          .filter((clue) => typeof clue === "string")
          .map((clue) => {
            const normalized = normalizeClue(clue);
            return [normalized, clue];
          }),
      ).values(),
    ),
  }));
};

const filterByMinClues = (entries, minClueCount) => {
  return entries.filter((entry) => entry.clues.length >= minClueCount);
};

const buildLengthMetadata = (entries) => {
  const lengthMap = new Map();
  entries.forEach((entry) => {
    const len = entry.word.length;
    lengthMap.set(len, (lengthMap.get(len) || 0) + 1);
  });
  return Array.from(lengthMap.entries())
    .map(([length, count]) => ({ length, count }))
    .sort((a, b) => a.length - b.length);
};

const getLongestClue = (clues) => {
  if (!clues || clues.length === 0) return "";
  return clues.reduce(
    (longest, current) => (current.length > longest.length ? current : longest),
    clues[0],
  );
};

self.onmessage = async (event) => {
  const { type, payload } = event.data ?? {};

  if (type === "init") {
    try {
      allEntries = await loadWordList();
      filteredEntries = allEntries;
      const lengthMetadata = buildLengthMetadata(filteredEntries);
      self.postMessage({
        type: "initialized",
        payload: { lengthMetadata },
      });
    } catch (error) {
      self.postMessage({
        type: "error",
        payload: { message: error.message ?? String(error) },
      });
    }
    return;
  }

  if (type === "filter") {
    const { minClueCount, requestId } = payload;
    filteredEntries = filterByMinClues(allEntries, minClueCount);
    const lengthMetadata = buildLengthMetadata(filteredEntries);
    self.postMessage({
      type: "filtered",
      payload: { lengthMetadata, requestId },
    });
    return;
  }

  if (type === "getWords") {
    const { lengths, requestId } = payload;
    const lengthSet = new Set(lengths);
    const words = {};
    const clueMap = {};
    filteredEntries.forEach((entry) => {
      if (lengthSet.has(entry.word.length)) {
        if (!words[entry.word.length]) {
          words[entry.word.length] = [];
        }
        words[entry.word.length].push(entry);
        clueMap[entry.word] = getLongestClue(entry.clues);
      }
    });
    self.postMessage({
      type: "wordsReady",
      payload: { words, clueMap, requestId },
    });
    return;
  }
};
