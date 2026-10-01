const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { spawnSync } = require("child_process");

const HTML_PATH = path.resolve(__dirname, "index.html");
const TAILWIND_CLI = path.resolve(__dirname, "..", "node_modules", "tailwindcss", "lib", "cli.js");

// Builds Tailwind from the current index.html with a known-good config, so the
// diagnostic checks grade your classes, not whether your watch command is running.
function buildFreshCss() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "tailwind-check-"));
  const input = path.join(tmp, "input.css");
  const config = path.join(tmp, "tailwind.config.js");
  const output = path.join(tmp, "output.css");
  fs.writeFileSync(input, "@tailwind base;\n@tailwind components;\n@tailwind utilities;\n");
  fs.writeFileSync(config, `module.exports = { content: [${JSON.stringify(HTML_PATH)}] };\n`);
  spawnSync(process.execPath, [TAILWIND_CLI, "-c", config, "-i", input, "-o", output], {
    cwd: tmp,
    stdio: "ignore",
    input: "",
  });
  const css = fs.existsSync(output) ? fs.readFileSync(output, "utf8") : "";
  fs.rmSync(tmp, { recursive: true, force: true });
  return css;
}

// WCAG contrast ratio between two "rgb(r, g, b)" strings
function contrastRatio(a, b) {
  const luminance = rgb => {
    const [r, g, bl] = rgb
      .match(/\d+(\.\d+)?/g)
      .slice(0, 3)
      .map(v => {
        const c = Number(v) / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

async function runTailwindTests() {
  const browser = await puppeteer.launch({ headless: "shell", args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1024, height: 800 });

  console.log("🕰️ TAILWIND CSS DIAGNOSTIC TESTS");
  console.log("=================================\n");

  let passedTests = 0;
  let totalTests = 13;

  const pass = msg => {
    console.log(`✅ ${msg}`);
    passedTests++;
  };
  const fail = msg => console.log(`❌ ${msg}`);

  console.log("SETUP\n");

  // Test 1: Tailwind config scans the HTML (issue #6)
  try {
    const configPath = path.resolve(__dirname, "tailwind.config.js");
    const configContent = fs.existsSync(configPath) ? fs.readFileSync(configPath, "utf8") : "";
    const configValid =
      configContent.includes("content:") && configContent.includes(".html") && !configContent.includes("content: []");

    if (configValid) {
      pass("Test 1: tailwind.config.js tells Tailwind to scan your HTML (issue #6)");
    } else {
      fail("Test 1: tailwind.config.js missing or its content array is empty (hint: setup step 4)");
    }
  } catch (error) {
    fail("Test 1: Error checking tailwind.config.js");
  }

  // Test 2: Input file has the three Tailwind directives
  try {
    const inputPath = path.resolve(__dirname, "src", "input.css");
    const inputContent = fs.existsSync(inputPath) ? fs.readFileSync(inputPath, "utf8") : "";
    const hasDirectives = ["base", "components", "utilities"].every(layer =>
      new RegExp(`@tailwind\\s+${layer}\\s*;`).test(inputContent)
    );

    if (hasDirectives) {
      pass("Test 2: src/input.css has the three @tailwind directives");
    } else {
      fail("Test 2: src/input.css missing or incomplete (hint: setup step 5)");
    }
  } catch (error) {
    fail("Test 2: Error checking src/input.css");
  }

  // Test 3: CSS output file exists and has content
  try {
    const cssPath = path.resolve(__dirname, "dist/output.css");
    const cssContent = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, "utf8") : "";

    if (cssContent.length > 10000 && cssContent.includes(".bg-amber")) {
      pass("Test 3: dist/output.css has been generated");
    } else {
      fail("Test 3: dist/output.css missing or empty (hint: run npm run build:css from lab/)");
    }
  } catch (error) {
    fail("Test 3: Error checking dist/output.css");
  }

  // Test 4: lab/package.json has the build:css script added during setup
  try {
    const packagePath = path.resolve(__dirname, "..", "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    const script = packageJson.scripts && packageJson.scripts["build:css"];

    if (script && script.includes("tailwindcss")) {
      pass("Test 4: lab/package.json has a build:css script");
    } else {
      fail("Test 4: No build:css script in lab/package.json (hint: setup step 7)");
    }
  } catch (error) {
    fail("Test 4: Error checking lab/package.json");
  }

  // Test 5: index.html loads the compiled CSS
  try {
    await page.goto(`file://${HTML_PATH}`);
    const headerBg = await page.evaluate(
      () => window.getComputedStyle(document.querySelector("header")).backgroundColor
    );

    if (headerBg === "rgb(120, 53, 15)") {
      pass("Test 5: index.html loads your compiled Tailwind CSS");
    } else {
      fail("Test 5: Tailwind styles aren't showing on the page (hint: setup steps 6 and 8, link dist/output.css)");
    }
  } catch (error) {
    fail("Test 5: Error checking the CSS link");
  }

  console.log("\nDIAGNOSTIC (graded against a fresh build of your index.html)\n");

  const freshCss = buildFreshCss();
  if (!freshCss) {
    fail("Could not build Tailwind CSS from index.html, so the diagnostic checks below can't run");
  }
  await page.goto(`file://${HTML_PATH}`);
  await page.evaluate(() => document.querySelectorAll('link[rel="stylesheet"]').forEach(link => link.remove()));
  await page.addStyleTag({ content: freshCss });

  const serviceCards = "#services .grid > div";

  // Test 6: Every service card has a resting shadow (issue #1)
  try {
    const allHaveShadow = await page.$$eval(serviceCards, cards =>
      cards.every(card => window.getComputedStyle(card).boxShadow !== "none")
    );

    if (allHaveShadow) {
      pass("Test 6: All service cards have a shadow (issue #1)");
    } else {
      fail("Test 6: A service card has no shadow (hint: is its shadow class one Tailwind actually has?)");
    }
  } catch (error) {
    fail("Test 6: Error checking card shadows");
  }

  // Test 7: Every service card gets a bigger shadow on hover (issue #2)
  try {
    const cards = await page.$$(serviceCards);
    let allChange = cards.length > 0;
    for (const card of cards) {
      const before = await card.evaluate(el => window.getComputedStyle(el).boxShadow);
      await card.hover();
      await new Promise(resolve => setTimeout(resolve, 300)); // let the shadow transition finish
      const after = await card.evaluate(el => window.getComputedStyle(el).boxShadow);
      if (after === "none" || after === before) allChange = false;
    }
    await page.mouse.move(0, 0);

    if (allChange) {
      pass("Test 7: All service cards change shadow on hover (issue #2)");
    } else {
      fail("Test 7: A service card doesn't change on hover (hint: check its hover: class name)");
    }
  } catch (error) {
    fail("Test 7: Error checking hover shadows");
  }

  // Test 8: Every bullet row is vertically centered (issue #3)
  try {
    const allCentered = await page.$$eval("#services li", items =>
      items.every(li => window.getComputedStyle(li).alignItems === "center")
    );

    if (allCentered) {
      pass("Test 8: All list bullets line up with their text (issue #3)");
    } else {
      fail("Test 8: A list bullet isn't vertically centered (hint: compare its classes with the rows that work)");
    }
  } catch (error) {
    fail("Test 8: Error checking list alignment");
  }

  // Test 9: Form buttons sit in a row at 640px and wider (issue #4)
  try {
    const direction = await page.$eval(
      'form button[type="submit"]',
      button => window.getComputedStyle(button.parentElement).flexDirection
    );

    if (direction === "row") {
      pass("Test 9: Form buttons sit side by side on wider screens (issue #4)");
    } else {
      fail("Test 9: Form buttons still stack on a wide screen (hint: how does Tailwind write a responsive prefix?)");
    }
  } catch (error) {
    fail("Test 9: Error checking the button row");
  }

  // Test 10: Nav links are readable against the header (issue #5)
  try {
    const colors = await page.evaluate(() => ({
      header: window.getComputedStyle(document.querySelector("header")).backgroundColor,
      links: [...document.querySelectorAll("header nav a")].map(a => window.getComputedStyle(a).color),
    }));
    const lowest = Math.min(...colors.links.map(color => contrastRatio(color, colors.header)));

    if (colors.links.length > 0 && lowest >= 4.5) {
      pass(`Test 10: Nav links are readable on the header (contrast ${lowest.toFixed(1)}:1) (issue #5)`);
    } else {
      fail(`Test 10: Nav link contrast is only ${lowest.toFixed(1)}:1, needs at least 4.5:1 (hint: lighter text)`);
    }
  } catch (error) {
    fail("Test 10: Error checking nav link contrast");
  }

  // Test 11: Every form field shows a focus ring (issue #7)
  try {
    const fields = await page.$$("form input, form select, form textarea");
    let allRing = fields.length > 0;
    for (const field of fields) {
      await field.focus();
      const shadow = await field.evaluate(el => window.getComputedStyle(el).boxShadow);
      if (shadow === "none") allRing = false;
    }

    if (allRing) {
      pass("Test 11: Every form field shows a focus ring (issue #7)");
    } else {
      fail("Test 11: A form field has no focus ring (hint: compare its classes with the fields that have one)");
    }
  } catch (error) {
    fail("Test 11: Error checking focus states");
  }

  // Test 12: Both form buttons use the same padding (issue #8)
  try {
    const paddings = await page.$$eval("form button", buttons =>
      buttons.map(button => {
        const s = window.getComputedStyle(button);
        return `${s.paddingTop} ${s.paddingRight} ${s.paddingBottom} ${s.paddingLeft}`;
      })
    );

    if (paddings.length === 2 && paddings[0] === paddings[1]) {
      pass("Test 12: The form buttons have matching padding (issue #8)");
    } else {
      fail("Test 12: The form buttons have different padding (hint: compare their py- and px- classes)");
    }
  } catch (error) {
    fail("Test 12: Error checking button padding");
  }

  // Test 13: Nav links fade their color on hover (issue #9)
  try {
    const allTransition = await page.$$eval("header nav a", links =>
      links.every(a => {
        const s = window.getComputedStyle(a);
        const animatesColor = s.transitionProperty.includes("color") || s.transitionProperty === "all";
        return animatesColor && parseFloat(s.transitionDuration) > 0;
      })
    );

    if (allTransition) {
      pass("Test 13: Nav links fade smoothly on hover (issue #9)");
    } else {
      fail("Test 13: Nav links snap to their hover color (hint: look at the classes on the page's buttons)");
    }
  } catch (error) {
    fail("Test 13: Error checking nav link transitions");
  }

  // Summary
  console.log("\n" + "=".repeat(40));
  console.log(`TAILWIND RESULTS: ${passedTests}/${totalTests} tests passing`);

  if (passedTests === totalTests) {
    console.log("🎉 Excellent! Tailwind is fully set up and all issues are fixed!");
    console.log("🕰️ The Clockwork Repairs website is ready for customers!");
  } else {
    console.log(`🔧 ${totalTests - passedTests} issues remaining. Keep debugging!`);
    if (passedTests < 5) {
      console.log("💡 Tip: Make sure you completed SETUP-INSTRUCTIONS.md first");
    }
  }

  await browser.close();
}

// Run the tests
runTailwindTests().catch(console.error);
