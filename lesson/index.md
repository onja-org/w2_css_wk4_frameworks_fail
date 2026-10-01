# Debugging CSS across vanilla CSS, Tailwind and SASS

> **CSS · Week 4 · Day 5**
> Estimated reading time: 20 min

---

## What you're learning

When CSS breaks, the browser almost never tells you. A misspelled property, a missing unit or a class name that doesn't exist is silently ignored, and the page just looks wrong. The tools you've met this week add more places for things to go wrong: Tailwind only works if a build step generates the classes you use, and SASS only works if your code compiles to CSS. This lesson gives you a repeatable way to find the problem in all three: work out *which layer* is broken (the source, the build, or the browser), then check the usual suspects for that layer.

**You should already know:** CSS selectors, the box model, flexbox and grid, plus this week's SCSS variables, nesting, mixins and partials.

**By the end of the lab you'll be able to:**

- Find invalid properties, missing units and specificity conflicts with browser DevTools
- Set up a Tailwind CSS build from scratch and explain why each step is needed
- Read a SASS compile error and trace it to the line that caused it
- Say how vanilla CSS, utility-first CSS and a preprocessor each fail differently

---

## Core idea

Every styling approach ends the same way: the browser reads a plain `.css` file and applies it. Vanilla CSS *is* that file. Tailwind and SASS are tools that **generate** that file. So when a page looks wrong, ask three questions in order: Is the CSS file being loaded at all? Was it generated correctly? Does the browser accept each rule in it? Most bugs show up at the first question you answer "no" to.

---

## How it works

### Vanilla CSS: the browser drops what it doesn't understand

The browser skips any declaration it can't parse and keeps going. There's no error, just a missing style.

```css
.card {
  bg-color: #48bb78;   /* not a real property: ignored */
  padding: 20;         /* no unit: ignored (only 0 can drop its unit) */
  margin: 1rem;        /* fine */
}
```

Open DevTools (right-click → Inspect), select the element and look at the **Styles** panel. Ignored declarations are struck through with a ⚠️ warning icon. If a valid rule is struck through *without* a warning, another rule beat it: check **specificity** (an ID beats a class, a class beats an element) and order (the later of two equal rules wins).

### Tailwind: classes only exist if the build generates them

Tailwind is a list of utility classes like `bg-amber-900` or `sm:flex-row`. The browser has never heard of them. A command-line tool scans your HTML, finds the class names you used, and writes only those rules into an output CSS file. That needs four things to be in place:

```text
tailwind.config.js   content: ["./*.html"]          ← which files to scan
src/input.css        @tailwind base; ...             ← where to put the generated rules
build command        tailwindcss -i ... -o ... --watch
index.html           <link href="dist/output.css">  ← load the result
```

If any link in that chain is missing, *no* Tailwind styles appear. If the chain works but one class is wrong (a typo, a size that doesn't exist, a missing `:` in a responsive prefix), only that one style is missing. Tailwind won't warn you either way, because an unknown class name simply never gets generated.

### SASS: the compiler refuses bad code

SASS is the opposite of the browser: it is strict. If your `.scss` has a syntax error, the compiler stops and prints where it failed.

```text
Error: Undefined variable.
   ╷
48 │   color: $brand-colour;
   │          ^^^^^^^^^^^^^
   ╵
  scss/styles.scss 48:10  root stylesheet
```

Read it as: *file* `styles.scss`, *line* 48, *column* 10. Go to that line. The real mistake is often on that line or just above it (here, the variable was declared as `$brand-color`, so the name doesn't match). Fix the first error, recompile, and repeat: one mistake can hide the ones after it.

Many SASS compile errors come from using an at-rule in the wrong place:

- `@mixin name { ... }` *defines* a mixin. `@include name;` *uses* it.
- `@function name() { @return ...; }` defines something that returns a value. A mixin outputs declarations and can't `@return`.
- `@use` loads another file or a built-in module. Sass only allows it at the very top of a file, before any style rules.
- `@extend` copies a selector's styles. You extend a selector like `.button` or a **placeholder** like `%button-base`. A placeholder is a set of styles that only appears in the compiled CSS when something extends it, and its name always starts with `%`.

```scss
@use 'sass:color';          // modules first, before any rules

%rounded-box {              // placeholder: no CSS output on its own
  border-radius: 8px;
}

.alert {
  @extend %rounded-box;     // .alert gets border-radius: 8px
  background: color.adjust(#1e3a8a, $lightness: -10%); // darker shade from sass:color
}
```

### SASS: bugs that compile but still look wrong

Some mistakes are valid SASS, so the compiler doesn't complain. It writes exactly what you asked for, which isn't what you meant. To find these, open the compiled `.css` file and read the selector SASS actually produced.

**`&` means "the parent selector, exactly here".** What you put right after it changes the meaning completely:

```scss
.tab {
  &:hover { }    // .tab:hover        the tab, when hovered
  &.active { }   // .tab.active       one element with BOTH classes
  & .active { }  // .tab .active      an .active element INSIDE a .tab
  &-label { }    // .tab-label        a different class name
}
```

**Nesting raises specificity.** Each level of nesting adds a selector to the compiled rule, and a selector with more classes beats one with fewer:

```scss
.sidebar {
  .title { font-size: 2rem; }   // compiles to .sidebar .title  (2 classes)
}

@media (max-width: 600px) {
  .title { font-size: 1.5rem; } // .title (1 class): loses, even inside a media query
}
```

A media query doesn't add specificity, so the phone rule never wins. In DevTools it shows up crossed out. One fix is to nest the media query inside the rule it changes, which Sass allows. The compiled selector then matches automatically:

```scss
.sidebar {
  .title {
    font-size: 2rem;
    @media (max-width: 600px) { font-size: 1.5rem; } // compiles to .sidebar .title inside @media
  }
}
```

---

## Common mistakes

| Mistake | Why it happens | How to fix it |
|---------|---------------|---------------|
| A style silently doesn't apply | Misspelled property or missing unit; the browser ignores the line | Inspect the element and look for struck-through declarations with a ⚠️ icon |
| Correct rule is crossed out in DevTools | A more specific rule overrides it, or an equally specific rule comes later in the file | Compare the selectors' specificity first; if it's equal, the rule that appears last wins |
| No Tailwind styles at all | Build isn't running, `content` is empty, or the output CSS isn't linked | Check each link of the chain: config `content`, `input.css` directives, build running, `<link>` in the HTML |
| One Tailwind class does nothing | The class doesn't exist (typo, British spelling, wrong size name, `-` instead of `:`) | Look the class up in the Tailwind docs and copy its exact name |
| SASS changes don't show in the browser | The `.scss` wasn't recompiled, or the compile failed | Run `npm run build:sass` (or keep `npm run watch:sass` running) and read its output |
| Fixing one SASS error reveals another | The compiler stops at the first error it finds | Fix errors one at a time, top to bottom, recompiling after each |
| SASS compiles but a style doesn't apply | The nesting produced a different selector than you meant (`& .x` instead of `&.x`, `&-x` instead of `&:x`) | Read the selector in the compiled `.css` file and compare it with the HTML |
| A media query in SASS has no effect | The rule it overrides is nested, so it has higher specificity | Nest the media query inside that rule, or match its selector |

---

## Check your understanding

Answer these before moving to the lab. If you can't, re-read the relevant section.

1. In vanilla CSS, `width: 300` and `widht: 300px` both fail. How would each one look in the DevTools Styles panel, and why doesn't the browser show an error?
2. Your Tailwind page has *no* styles at all, not even the header background. Name three different things that could cause this, and which one you'd check first.
3. Why does a SASS mistake stop the whole stylesheet from compiling, when the same kind of mistake in plain CSS only breaks one line?
4. Inside `.menu { ... }`, what selectors do `&.open`, `& .open` and `&-open` compile to? Which one styles `<nav class="menu open">`?

---

## Reference

- [MDN: What went wrong? Troubleshooting CSS](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/Debugging_CSS)
- [Tailwind CSS v3: Installation (Tailwind CLI)](https://v3.tailwindcss.com/docs/installation)
- [Sass documentation: At-rules (`@use`, `@mixin`, `@function`, `@extend`)](https://sass-lang.com/documentation/at-rules/)
- [Sass documentation: Parent selector `&`](https://sass-lang.com/documentation/style-rules/parent-selector/)
- [MDN: Specificity](https://developer.mozilla.org/en-US/docs/Web/CSS/Specificity)

---

*Ready? Open the lab →*
