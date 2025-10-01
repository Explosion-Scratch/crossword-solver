# Crossword Composer

A web-based crossword puzzle solver that runs entirely in the browser using MiniZinc WebAssembly.

## Features

- **Interactive Grid Design**: Click or drag to create crossword grids
- **Real-time Solving**: Instant puzzle solving with constraint programming
- **Word Bank Management**: Filter words by length and clue count
- **Visual Feedback**: Hover effects and clue highlighting
- **No Server Required**: Everything runs client-side

## How to Use

1. **Design Your Grid**: 
   - Set grid dimensions (3x18 maximum)
   - Click cells to toggle between open and blocked
   - Use the fill buttons to quickly clear or block the entire grid

2. **Configure Word Bank**:
   - Select word lengths you want to use
   - Adjust minimum clue count for better quality words
   - View available word counts for each length

3. **Solve the Puzzle**:
   - Click "Solve Crossword" to find solutions
   - View across and down clues with word suggestions
   - Hover over clues to highlight corresponding grid cells

## Technical Details

- **Solver**: MiniZinc with Gecode constraint solver
- **Frontend**: Vue.js 3 with Tailwind CSS
- **Runtime**: WebAssembly for client-side execution
- **Word Database**: Curated list with clues

## Development

### Building Word Database

To update the word database from a CSV source:

```bash
bun run convert_wordlist.js [min-clue-count]
```

Example:
```bash
bun run convert_wordlist.js 2  # Only include words with at least 2 clues
```

### Running Locally

Serve the `web/` directory with any static web server:

```bash
# Using Python
python -m http.server 8000 -d web

# Using Node.js
npx serve web/

# Using Bun
bun run --watch web/index.html
```

## File Structure

```
crossword-solver/
├── web/                    # Frontend application
│   ├── index.html         # Main application
│   ├── crosswords.mzn     # MiniZinc model
│   ├── all_words.dzn      # Word database
│   ├── words.json         # Word list with clues
│   └── clueWorker.js      # Web Worker for filtering
├── convert_wordlist.js    # Build script for word database
├── valid.csv             # Source word data (not included in repo)
└── README.md             # This file
```

## Browser Compatibility

Requires modern browsers with WebAssembly support:
- Chrome 89+
- Firefox 90+
- Safari 14+
- Edge 89+

## License

This project uses MiniZinc, which is available under the Mozilla Public License 2.0.