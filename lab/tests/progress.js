// Runs the three section test scripts and adds up their results.
// Each section's total is fixed here, so a section that crashes scores 0
// instead of dropping out of the total. The last line ("SCORE: x/y") is read by ./submit.
const { spawnSync } = require("child_process");
const path = require("path");

const LAB_DIR = path.resolve(__dirname, "..");

const SECTIONS = [
  { name: "Vanilla CSS", script: "01-vanilla-css/test-diagnostic.js", total: 10 },
  { name: "Tailwind CSS", script: "02-tailwind/test-diagnostic.js", total: 13 },
  { name: "SASS", script: "03-sass/test-diagnostic.js", total: 11 },
];

let earned = 0;
let possible = 0;

for (const section of SECTIONS) {
  const result = spawnSync(process.execPath, [section.script], { cwd: LAB_DIR, encoding: "utf8" });
  const output = (result.stdout || "") + (result.stderr || "");
  process.stdout.write(output);

  const match = output.match(/RESULTS:\s*(\d+)\/(\d+)/);
  const passed = match ? Math.min(Number(match[1]), section.total) : 0;
  if (!match) {
    console.log(`❌ ${section.name}: tests did not finish, scoring 0/${section.total}`);
  }
  console.log();

  earned += passed;
  possible += section.total;
}

console.log(`SCORE: ${earned}/${possible}`);
