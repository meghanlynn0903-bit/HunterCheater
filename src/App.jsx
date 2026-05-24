import React, { useMemo, useState } from "react";
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import "./index.css";

const SIZE = 4;
const DIRECTIONS = ["up", "left", "right", "down"];

const directionIcons = {
  up: ArrowUp,
  down: ArrowDown,
  left: ArrowLeft,
  right: ArrowRight,
};

function emptyGrid() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

function cloneGrid(grid) {
  return grid.map((row) => [...row]);
}

function gridsEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function compressLine(line) {
  const nums = line.filter((n) => n !== 0);
  const result = [];
  let gained = 0;

  for (let i = 0; i < nums.length; i++) {
    if (nums[i] === nums[i + 1]) {
      // Level-style merging:
      // 1 + 1 = 2, 2 + 2 = 3, 3 + 3 = 4, and so on.
      const merged = nums[i] + 1;
      result.push(merged);
      gained += merged;
      i++;
    } else {
      result.push(nums[i]);
    }
  }

  while (result.length < SIZE) result.push(0);
  return { line: result, gained };
}

function moveGrid(grid, direction) {
  const next = emptyGrid();
  let scoreGained = 0;

  for (let i = 0; i < SIZE; i++) {
    let line = [];

    for (let j = 0; j < SIZE; j++) {
      if (direction === "left") line.push(grid[i][j]);
      if (direction === "right") line.push(grid[i][SIZE - 1 - j]);
      if (direction === "up") line.push(grid[j][i]);
      if (direction === "down") line.push(grid[SIZE - 1 - j][i]);
    }

    const compressed = compressLine(line);
    scoreGained += compressed.gained;

    for (let j = 0; j < SIZE; j++) {
      const value = compressed.line[j];
      if (direction === "left") next[i][j] = value;
      if (direction === "right") next[i][SIZE - 1 - j] = value;
      if (direction === "up") next[j][i] = value;
      if (direction === "down") next[SIZE - 1 - j][i] = value;
    }
  }

  return {
    grid: next,
    moved: !gridsEqual(grid, next),
    scoreGained,
  };
}

function countEmpty(grid) {
  return grid.flat().filter((n) => n === 0).length;
}

function maxTile(grid) {
  return Math.max(...grid.flat());
}

function monotonicityScore(grid) {
  let score = 0;

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE - 1; c++) {
      if (grid[r][c] >= grid[r][c + 1]) score += 1;
    }
  }

  for (let c = 0; c < SIZE; c++) {
    for (let r = 0; r < SIZE - 1; r++) {
      if (grid[r][c] >= grid[r + 1][c]) score += 1;
    }
  }

  return score;
}

function mergePotential(grid) {
  let score = 0;

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const current = grid[r][c];
      if (!current) continue;
      if (c < SIZE - 1 && current === grid[r][c + 1]) score += current;
      if (r < SIZE - 1 && current === grid[r + 1][c]) score += current;
    }
  }

  return score;
}

function cornerScore(grid) {
  const max = maxTile(grid);
  const corners = [grid[0][0], grid[0][3], grid[3][0], grid[3][3]];
  return corners.includes(max) ? max * 2 : 0;
}

function smoothnessPenalty(grid) {
  let penalty = 0;

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const value = grid[r][c];
      if (!value) continue;
      const logValue = Math.log2(value);

      if (c < SIZE - 1 && grid[r][c + 1]) {
        penalty += Math.abs(logValue - Math.log2(grid[r][c + 1]));
      }
      if (r < SIZE - 1 && grid[r + 1][c]) {
        penalty += Math.abs(logValue - Math.log2(grid[r + 1][c]));
      }
    }
  }

  return penalty;
}

function snakeScore(grid) {
  const patterns = [
    [
      [65536, 32768, 16384, 8192],
      [512, 1024, 2048, 4096],
      [256, 128, 64, 32],
      [2, 4, 8, 16],
    ],
    [
      [8192, 16384, 32768, 65536],
      [4096, 2048, 1024, 512],
      [32, 64, 128, 256],
      [16, 8, 4, 2],
    ],
    [
      [2, 4, 8, 16],
      [256, 128, 64, 32],
      [512, 1024, 2048, 4096],
      [65536, 32768, 16384, 8192],
    ],
    [
      [16, 8, 4, 2],
      [32, 64, 128, 256],
      [4096, 2048, 1024, 512],
      [8192, 16384, 32768, 65536],
    ],
  ];

  return Math.max(
    ...patterns.map((pattern) =>
      grid.reduce(
        (sum, row, r) =>
          sum + row.reduce((rowSum, value, c) => rowSum + value * pattern[r][c], 0),
        0
      )
    )
  );
}

function availableMoves(grid) {
  return DIRECTIONS.map((direction) => ({ direction, ...moveGrid(grid, direction) })).filter((move) => move.moved);
}

function evaluateGrid(grid, scoreGained = 0) {
  return (
    countEmpty(grid) * 500 +
    scoreGained * 30 +
    mergePotential(grid) * 80 +
    cornerScore(grid) * 40 +
    monotonicityScore(grid) * 30 +
    snakeScore(grid) * 0.002 -
    smoothnessPenalty(grid) * 25
  );
}

function addSpawn(grid, r, c, value) {
  const next = cloneGrid(grid);
  next[r][c] = value;
  return next;
}

function possibleSpawns(grid) {
  const empty = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] === 0) empty.push([r, c]);
    }
  }

  return empty.flatMap(([r, c]) => [
    { grid: addSpawn(grid, r, c, 1), weight: 0.9 },
    { grid: addSpawn(grid, r, c, 2), weight: 0.1 },
  ]);
}

function lookAheadScore(grid, depth, isPlayerTurn) {
  if (depth <= 0) return evaluateGrid(grid);

  const moves = availableMoves(grid);
  if (moves.length === 0) return -10000000;

  if (isPlayerTurn) {
    return Math.max(...moves.map((move) => evaluateGrid(move.grid, move.scoreGained) + lookAheadScore(move.grid, depth - 1, false)));
  }

  const spawns = possibleSpawns(grid);
  if (spawns.length === 0) return lookAheadScore(grid, depth - 1, true);

  const sampled = spawns.length > 12 ? spawns.filter((_, index) => index % 2 === 0) : spawns;
  const totalWeight = sampled.reduce((sum, spawn) => sum + spawn.weight, 0);

  return sampled.reduce((sum, spawn) => sum + (spawn.weight / totalWeight) * lookAheadScore(spawn.grid, depth - 1, true), 0);
}

function analyzeMove(grid) {
  const LOOKAHEAD_DEPTH = 4;

  return DIRECTIONS.map((direction) => {
    const moved = moveGrid(grid, direction);
    const immediateScore = moved.moved ? evaluateGrid(moved.grid, moved.scoreGained) : -Infinity;
    const futureScore = moved.moved ? lookAheadScore(moved.grid, LOOKAHEAD_DEPTH, false) : -Infinity;
    const score = moved.moved ? immediateScore + futureScore : -Infinity;

    return {
      direction,
      ...moved,
      empty: countEmpty(moved.grid),
      maxTile: maxTile(moved.grid),
      mergePotential: mergePotential(moved.grid),
      rating: score,
    };
  }).sort((a, b) => b.rating - a.rating);
}

function parseCell(value) {
  const cleaned = String(value).trim();
  if (cleaned === "") return 0;
  const number = Number(cleaned);
  if (!Number.isFinite(number) || number < 0) return 0;
  return number;
}

function tileClass(value) {
  if (!value) return "tile empty";
  if (value <= 2) return "tile tile-low";
  if (value <= 4) return "tile tile-mid";
  if (value <= 6) return "tile tile-warm";
  if (value <= 8) return "tile tile-gold";
  return "tile tile-high";
}

function Button({ children, className = "", variant = "primary", ...props }) {
  return (
    <button className={`button ${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}

function Card({ children }) {
  return <div className="card">{children}</div>;
}

export default function App() {
  const [grid, setGrid] = useState(() => emptyGrid());

  const analysis = useMemo(() => analyzeMove(grid), [grid]);
  const best = analysis[0];

  function updateCell(r, c, value) {
    const next = cloneGrid(grid);
    next[r][c] = parseCell(value);
    setGrid(next);
  }

  function cycleCell(r, c) {
    const next = cloneGrid(grid);
    next[r][c] = next[r][c] >= 10 ? 0 : next[r][c] + 1;
    setGrid(next);
  }

  function applyMove(direction) {
    const moved = moveGrid(grid, direction);
    if (moved.moved) {
      setGrid(moved.grid);
    }
  }

  function loadExample() {
    setGrid([
      [2, 4, 8, 10],
      [0, 2, 4, 8],
      [0, 0, 2, 4],
      [0, 0, 0, 2],
    ]);
  }

  const BestIcon = best && directionIcons[best.direction];

  return (
    <main className="page">
      <section className="app-shell">
        <header className="header">
          <h1>2048 Move Helper</h1>
          <p>Click tiles to enter your board. Blank = empty. Right-click clears a tile.</p>
        </header>

        <div className="layout">
          <Card>
            <div className="board">
              {grid.map((row, r) =>
                row.map((value, c) => (
                  <button
                    key={`${r}-${c}`}
                    onClick={() => cycleCell(r, c)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      updateCell(r, c, 0);
                    }}
                    className={tileClass(value)}
                    title="Click to increase up to 10. Right-click to clear."
                  >
                    {value === 0 ? "" : value}
                  </button>
                ))
              )}
            </div>

            <div className="controls">
              <Button variant="secondary" onClick={loadExample}>Load Example</Button>
              <Button variant="outline" onClick={() => setGrid(emptyGrid())}>
                <RotateCcw size={14} /> Clear
              </Button>
            </div>

            <p className="note">
              Looks ahead and favors open spaces, safe merges, and a steady board shape.
            </p>
          </Card>

          <aside className="side">
            <Card>
              <h2>Best hint</h2>
              {best?.rating === -Infinity ? (
                <p className="blocked">No legal moves found.</p>
              ) : (
                <div className="best-box">
                  <div className="best-move">
                    {BestIcon && <BestIcon size={28} />}
                    <div>
                      <strong>Next: {best.direction}</strong>
                      <span>Rating: {Math.round(best.rating)}</span>
                    </div>
                  </div>
                  <Button className="full" onClick={() => applyMove(best.direction)}>
                    Make Move
                  </Button>
                </div>
              )}
            </Card>

            <Card>
              <h2>Move rankings</h2>
              <div className="rankings">
                {analysis.map((option) => {
                  const Icon = directionIcons[option.direction];
                  return (
                    <button
                      key={option.direction}
                      onClick={() => applyMove(option.direction)}
                      disabled={!option.moved}
                      className={`ranking ${option.moved ? "" : "disabled"}`}
                    >
                      <span className="rank-label">
                        <Icon size={16} />
                        {option.direction}
                      </span>
                      <span className="rank-score">
                        <span>{option.moved ? Math.round(option.rating) : "Blocked"}</span>
                        <small>+{option.scoreGained}</small>
                      </span>
                    </button>
                  );
                })}
              </div>
            </Card>
          </aside>
        </div>
      </section>
    </main>
  );
}
