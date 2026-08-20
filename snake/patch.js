// Patches the pristine generate-snake-animation bundle so the snake grows as it eats.
//
// The solver is left alone: it plans the route for its usual 4-cell snake, which is
// the only length that reliably finds a path through a 7-row contribution grid.
// The growth is done entirely in the SVG renderer:
//
//   * segments beyond the solved length simply lag behind the tail, tracing the
//     path the head already took;
//   * a segment that has not been "born" yet is pinned on top of the segment ahead
//     of it. Same colour, so it is invisible until its turn, then it emerges from
//     the tail and trails along — no jump, no pop.
//
// Usage: node patch.js <START_LEN> <VISUAL_LEN>

const fs = require("fs");
const path = require("path");

const START_LEN = Number(process.argv[2] ?? 2);
const VISUAL_LEN = Number(process.argv[3] ?? 7);

const dir = path.join(__dirname, "node_modules/generate-snake-animation");
const src = path.join(dir, "generateSnakeAnimation.js");
const pristine = path.join(__dirname, "generateSnakeAnimation.pristine.js");

if (!fs.existsSync(pristine)) fs.copyFileSync(src, pristine);
let s = fs.readFileSync(pristine, "utf8");

const anchor = `  const svgElements = snakeParts.map((_, i, { length }) => {`;
if (!s.includes(anchor)) throw new Error("svg snake renderer not found");

const growth = `  {
    const VISUAL = ${VISUAL_LEN};
    const START = ${START_LEN};
    const steps = snakeParts[0] ? snakeParts[0].length : 0;

    // segments past the solved length trail the tail, one step behind each other
    for (let i = snakeN; i < VISUAL; i++) {
      const lag = i - (snakeN - 1);
      snakeParts[i] = Array.from({ length: steps }, (_, t) =>
        snakeParts[snakeN - 1][Math.max(0, t - lag)]
      );
    }

    // grow: hide each unborn segment under the one ahead of it. Growth finishes
    // at 80% so the snake is at full length for the return-to-pose leg.
    const growUntil = Math.floor(steps * 0.8);
    for (let i = START; i < VISUAL; i++) {
      const birth = Math.floor(((i - START + 1) / (VISUAL - START + 1)) * growUntil);
      for (let t = 0; t < birth && t < steps; t++)
        snakeParts[i][t] = snakeParts[i - 1][t];
    }
  }
`;
s = s.replace(anchor, growth + anchor);

// taper the whole body rather than only the first 4 segments
s = s.replace("const iMax = Math.min(4, length);", "const iMax = Math.max(1, length - 1);");

fs.writeFileSync(src, s);
console.log(`patched: start=${START_LEN} visual=${VISUAL_LEN}`);
