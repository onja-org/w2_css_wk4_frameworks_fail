const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");
const sass = require("sass");

const SCSS_PATH = path.resolve(__dirname, "scss/styles.scss");
const HTML_PATH = path.resolve(__dirname, "index.html");

// Removes // and /* */ comments so checks only look at real code
function stripComments(scss) {
  return scss.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

async function runSassTests() {
  const browser = await puppeteer.launch({ headless: "shell", args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  const page = await browser.newPage();

  console.log("🟡 SASS DIAGNOSTIC TESTS");
  console.log("========================\n");

  let passedTests = 0;
  let totalTests = 11;

  const pass = msg => {
    console.log(`✅ ${msg}`);
    passedTests++;
  };
  const fail = msg => console.log(`❌ ${msg}`);

  const code = stripComments(fs.readFileSync(SCSS_PATH, "utf8"));

  // Test 1: The SCSS compiles (issues #1-#4, #7, #9 and #10 all stop the compiler)
  let compiledCss = null;
  try {
    compiledCss = sass.compile(SCSS_PATH, { logger: sass.Logger.silent }).css;
    pass("Test 1: scss/styles.scss compiles without errors");
  } catch (error) {
    const firstLine = String(error.message).split("\n")[0];
    const where = error.span && error.span.start ? ` (line ${error.span.start.line + 1})` : "";
    fail(`Test 1: scss/styles.scss doesn't compile yet: ${firstLine}${where}`);
  }

  // Load your compiled CSS into index.html for the rendered checks below
  const renderReady = compiledCss !== null;
  if (renderReady) {
    await page.setViewport({ width: 1200, height: 800 });
    await page.goto(`file://${HTML_PATH}`);
    await page.evaluate(() => document.querySelectorAll('link[rel="stylesheet"]').forEach(link => link.remove()));
    await page.addStyleTag({ content: compiledCss });
  }
  // Once the file compiles, checks that the fixed line actually styles the page
  // (deleting a broken line makes the error go away, but it isn't a fix)
  const styled = (selector, check) =>
    renderReady ? page.$eval(selector, check).catch(() => false) : Promise.resolve(true);

  // Source checks for the issues that stop the compiler. Each one looks only for
  // the specific mistake, so reorganizing your code in the qualitative section is fine.

  // Test 2: Variable syntax (issue #1)
  if (/^\s*-[a-z][\w-]*\s*:/im.test(code)) {
    fail("Test 2: A palette color isn't declared as a Sass variable (issue #1)");
  } else {
    pass("Test 2: Palette variables are declared correctly (issue #1)");
  }

  // Test 3: Missing semicolon in the card-style mixin (issue #2)
  if (/border-radius:\s*8px\s*\n\s*box-shadow/.test(code)) {
    fail("Test 3: A declaration in the card-style mixin isn't finished (issue #2)");
  } else {
    pass("Test 3: The card-style mixin's declarations are complete (issue #2)");
  }

  // Test 4: Mixin usage (issue #3)
  if (/@mixin\s+[\w-]+\s*(\([^)]*\))?\s*;/.test(code)) {
    fail("Test 4: A mixin is being used with the wrong at-rule (issue #3)");
  } else if (!(await styled(".voyage-card", el => window.getComputedStyle(el).boxShadow !== "none"))) {
    fail("Test 4: The voyage cards have no card styles (issue #3: fix the line, don't delete it)");
  } else {
    pass("Test 4: Mixins are used with the right at-rule (issue #3)");
  }

  // Test 5: Undefined variable (issue #4)
  const hasBackground = el => {
    const s = window.getComputedStyle(el);
    return (
      (s.backgroundColor !== "rgba(0, 0, 0, 0)" && s.backgroundColor !== "transparent") || s.backgroundImage !== "none"
    );
  };
  if (/\$underfined-color|\$undefined-color/.test(code)) {
    fail("Test 5: The header still uses a variable that was never declared (issue #4)");
  } else if (!(await styled(".main-header", hasBackground))) {
    fail("Test 5: The header has no background (issue #4: fix the line, don't delete it)");
  } else {
    pass("Test 5: The header uses a declared variable (issue #4)");
  }

  // Test 6: Function syntax (issue #7)
  if (/@mixin[^{;]*\{[^}]*@return/.test(code)) {
    fail("Test 6: Something that returns a value is defined with the wrong at-rule (issue #7)");
  } else {
    pass("Test 6: Value-returning helpers use the right at-rule (issue #7)");
  }

  // Test 7: @extend target (issue #9)
  if (/@extend\s+[a-z]/i.test(code)) {
    fail("Test 7: An @extend points at something that isn't a selector or placeholder (issue #9)");
  } else if (!(await styled(".submarine-body", el => parseFloat(window.getComputedStyle(el).borderTopWidth) > 0))) {
    fail("Test 7: The submarine body has no outline (issue #9: fix the line, don't delete it)");
  } else {
    pass("Test 7: @extend points at a real placeholder or selector (issue #9)");
  }

  // Test 8: Module loading (issue #10)
  const firstRule = code.indexOf("{");
  const lastUse = code.lastIndexOf("@use");
  if (/@import\b/.test(code) || (lastUse !== -1 && firstRule !== -1 && lastUse > firstRule)) {
    fail("Test 8: A module is loaded in a place Sass doesn't allow (issue #10)");
  } else {
    pass("Test 8: Modules are loaded with @use before any rules (issue #10)");
  }

  // Rendered checks for the issues that compile but look wrong. They load your
  // compiled CSS into index.html, so they need Test 1 to pass first.
  const needsCompile = test => fail(`${test} can't be checked until the SCSS compiles (see Test 1)`);

  // Test 9: Nav link hover (issue #5)
  if (!renderReady) {
    needsCompile("Test 9: Nav link hover (issue #5)");
  } else {
    try {
      await page.setViewport({ width: 1200, height: 800 });
      const link = await page.$(".main-nav .nav-link");
      const bgOf = () => link.evaluate(el => window.getComputedStyle(el).backgroundColor);
      const before = await bgOf();
      await link.hover();
      await new Promise(resolve => setTimeout(resolve, 300));
      const after = await bgOf();
      await page.mouse.move(0, 0);

      if (after !== before) {
        pass("Test 9: Nav links highlight on hover (issue #5)");
      } else {
        fail("Test 9: Hovering a nav link changes nothing (hint: compare the compiled selector with the HTML)");
      }
    } catch (error) {
      fail("Test 9: Error checking nav link hover");
    }
  }

  // Test 10: Hero title shrinks on phones (issue #6)
  if (!renderReady) {
    needsCompile("Test 10: Hero title on phones (issue #6)");
  } else {
    try {
      const titleSize = async width => {
        await page.setViewport({ width, height: 800 });
        return page.$eval(".hero-title", el => parseFloat(window.getComputedStyle(el).fontSize));
      };
      const desktop = await titleSize(1200);
      const phone = await titleSize(375);

      if (phone < desktop) {
        pass(`Test 10: The hero title shrinks on phones (${desktop}px → ${phone}px) (issue #6)`);
      } else {
        fail(`Test 10: The hero title is ${phone}px on a phone, same as desktop (hint: which rule wins, and why?)`);
      }
    } catch (error) {
      fail("Test 10: Error checking the hero title size");
    }
  }

  // Test 11: "Set Sail Today" button has its background (issue #8)
  if (!renderReady) {
    needsCompile('Test 11: "Set Sail Today" button (issue #8)');
  } else {
    try {
      await page.setViewport({ width: 1200, height: 800 });
      // Compare the button with a copy of itself that doesn't have the "primary" class
      const backgrounds = await page.$eval(".cta-button.primary", el => {
        const plain = el.cloneNode(true);
        plain.classList.remove("primary");
        el.parentElement.appendChild(plain);
        const result = [window.getComputedStyle(el).backgroundColor, window.getComputedStyle(plain).backgroundColor];
        plain.remove();
        return result;
      });

      if (backgrounds[0] !== backgrounds[1]) {
        pass('Test 11: The "Set Sail Today" button gets its primary styles (issue #8)');
      } else {
        fail(
          'Test 11: The "Set Sail Today" button ignores its primary styles (hint: does the compiled selector match one element with both classes?)'
        );
      }
    } catch (error) {
      fail('Test 11: Error checking the "Set Sail Today" button');
    }
  }

  // Summary
  console.log("\n" + "=".repeat(40));
  console.log(`SASS RESULTS: ${passedTests}/${totalTests} tests passing`);

  if (passedTests === totalTests) {
    console.log("🎉 Excellent! All SASS issues are fixed!");
    console.log("🟡 The Yellow Submarine website is ready to dive!");
    console.log("💡 Run npm run build:sass so index.html shows your latest changes in the browser.");
  } else {
    console.log(`🔧 ${totalTests - passedTests} issues remaining. Keep debugging!`);
    console.log("💡 Fix compile errors one at a time: npm run build:sass shows the first one.");
  }

  await browser.close();
}

// Run the tests
runSassTests().catch(console.error);
