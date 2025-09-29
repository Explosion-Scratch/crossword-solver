import * as MiniZinc from "minizinc";
import { readFileSync } from "fs";

const r = (p) => readFileSync(p, "utf-8");

const model = new MiniZinc.Model();
model.addFile("crosswords.mzn", r("crosswords.mzn"), false);
model.addFile("all_words.dzn", r("all_words.dzn"), false);

const grid = `
_ _ _ _ #
_ _ # _ _
_ # _ _ _
`;

model.addFile("main.mzn", grid_to_puzzle(grid));

const solve = model.solve({
    options: {
        solver: "COIN-BC",
        "all-solutions": true,
    },
});

solve.on("solution", (solution) => {
    console.log(solution.output.json);
});

solve.then((result) => {
    console.log(result.status);
});

function grid_to_puzzle(gridStr) {
    function make_problem(grid) {
        let id = 1;
        let problem = "";
        const lines = grid.trim().split("\n");
        for (const line of lines) {
            const cells = line.trim().split(/\s+/);
            for (const cell of cells) {
                if (cell === "_" || cell === "__") {
                    problem += `${id}, `;
                    id++;
                } else {
                    problem += `0, `;
                }
            }
            problem += "\n";
        }
        return [problem, id - 1];
    }

    function get_segments(gridMap, rows, cols) {
        const segments = [];
        for (let r = 0; r < rows; r++) {
            let segment = [];
            for (let c = 0; c < cols; c++) {
                const v = gridMap[r]?.[c] || 0;
                if (v === 0) {
                    if (segment.length > 1) {
                        segments.push([...segment]);
                    }
                    segment = [];
                } else {
                    segment.push(v);
                }
            }
            if (segment.length > 1) {
                segments.push([...segment]);
            }
        }
        return segments;
    }

    // STEP 1: Clean input (remove comment lines)
    const grid = gridStr
        .split("\n")
        .filter((line) => !line.match(/^\s*[#%]/))
        .join("\n");

    // STEP 2: Build problem
    const [problem, max_letters] = make_problem(grid);

    const gridRows = problem
        .trim()
        .split("\n")
        .map((line) => {
            return line.trim().split(/\D+/).filter(Boolean).map(Number);
        });

    const rows = gridRows.length;
    const cols = gridRows[0].length;

    // STEP 3: Create grid maps
    const crossword = {};
    const crossword_transposed = {};

    for (let r = 0; r < rows; r++) {
        crossword[r] = {};
        for (let c = 0; c < cols; c++) {
            const val = gridRows[r][c];
            crossword[r][c] = val;
            if (!crossword_transposed[c]) crossword_transposed[c] = {};
            crossword_transposed[c][r] = val;
        }
    }

    // STEP 4: Find segments (horizontally and vertically)
    const segments = [
        ...get_segments(crossword, rows, cols),
        ...get_segments(crossword_transposed, cols, rows),
    ];

    // STEP 5: Build tables and segments_str
    const tables = [];
    let segments_str = "";
    for (const segment of segments) {
        const len = segment.length;
        const s = segment.map((i) => `L[${i}]`).join(", ");
        tables.push(`table([${s}], words${len})`);
        segments_str +=
            segment.join(",") +
            "," +
            "0,".repeat(cols - segment.length).slice(0, -1) +
            ",\n";
    }

    const table_str = tables.join(" \n/\\ ");
    const num_segments = segments.length;

    const grid_presentation = grid
        .split("\n")
        .map((line) => `%   ${line}`)
        .join("\n");
    const date = new Date().toString();

    // STEP 6: Return MiniZinc string
    return `%
% Random crossword problem in MiniZinc.
%
% (generated ${date} by grid_to_puzzle).
%
%
% This MiniZinc model was created by Hakan Kjellerstrand, hakank@bonetmail.com
% See also his MiniZinc page: http://www.hakank.org/minizinc
%

%
% Problem to solve:
%
${grid_presentation}

include "crosswords.mzn";

problem_name = "crossword";


% number of letters to assign
N = ${max_letters};


% distinct words
require_distinct_words = 1;

constraint
  ${table_str}
;

% The segments (words)
% (0 for fill outs)
int: max_length = ${cols};
int: num_segments = ${num_segments};
array[1..num_segments, 1..max_length] of int: segments = array2d(1..num_segments, 1..max_length,
[
${segments_str}
]);

% Problem where each cell is assigned a unique index.
% (0 means blocked cell)
int: rows = ${rows};
int: cols = ${cols};
array[1..rows, 1..cols] of int: problem = array2d(1..rows, 1..cols,
[
${problem}
]);
`;
}
