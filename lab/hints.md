# Hints

Use these when you've been stuck on one issue for **5 minutes**. Each hint is a nudge, not the answer. Read only the one you need.

Before opening a hint, try the lesson's routine: Is the CSS loaded? Was it generated (or compiled) correctly? Does the browser accept the rule? DevTools answers the last question for you.

---

## Section 1 — Vanilla CSS

| Issue | Hint |
|---|---|
| #1 Header background | In DevTools, the declaration has a ⚠️ icon. The browser doesn't know that property name. What's the full name of the property that sets a background color? |
| #2 Navigation alignment | Flexbox and grid use different `justify-` properties. One of them does nothing on a flex container. Which one positions flex items along the row? |
| #3 Link click area | The clickable area of an `<a>` is its content plus its padding. |
| #4 Crop cards layout | `justify-content` and `gap` only work on a flex or grid container. Is the container one yet? |
| #5 Card spacing | Look at the number in `margin`. A length needs a unit; only `0` can go without one. |
| #6 Button background | Same kind of bug as #1, on a different element. |
| #7 Button hover | There are two `.harvest-btn:hover` rules. Equal specificity means the one that comes **last** wins. Which one do you want to keep? |
| #8 Text visibility | Compare the paragraph's `color` with the section's background color. They're almost the same. |
| #9 Fieldset border | The border has a width and a style, but look at its color. |
| #10 Button width | Block-level elements fill their container. A `<button>` doesn't, unless you give it a width. |

## Section 2 — Tailwind

| Issue | Hint |
|---|---|
| Setup | Run `pwd` and `ls` after every step. Most setup problems are a command run in the wrong folder or a file that wasn't saved. |
| #1 / #2 Card shadows | Tailwind's shadow sizes are abbreviations, like its text sizes. Search "box shadow" in the Tailwind docs and compare with the class names on this card. |
| #3 Bullet alignment | Tailwind uses American spelling in every class name. |
| #4 Button row | Responsive prefixes join the breakpoint and the class with a special character. Look at how `md:grid-cols-2` is written elsewhere on this page. |
| #5 Link contrast | In Tailwind's color scale, higher numbers are darker. The header is `amber-900`. The text needs to sit at the opposite end of the scale. |
| #7 Focus ring | Copy the focus classes from the input fields above the dropdown. |
| #8 Matching buttons | Compare the `py-` and `px-` classes on the two buttons. |
| #9 Smooth hover | Find the class that every button on this page has and the nav links don't. |

## Section 3 — SASS

| Issue | Hint |
|---|---|
| Compile errors in general | Run `npm run build:sass` and read the **first** error only: message, line, column. Fix it, compile again. |
| #1 Palette | Compare the first line of the palette with the four lines after it, character by character. |
| #2 Mixin | Sass reads the declaration on the error line as part of the line above it. Something is missing at the end of that line. |
| #3 Voyage cards | `@mixin` creates a mixin. Which at-rule puts one inside a rule? |
| #4 Header color | Scroll up to the palette. Which variable is the submarine blue? |
| #5 Nav hover | Compile, then search `css/styles.css` for `nav-link`. You'll find a selector ending in `-hover`. Hover is a pseudo-class, and pseudo-classes start with a `:`. |
| #6 Hero title | Nesting compiled the 3rem rule to `.hero-section .hero-title` (two classes). The phone rule is `.hero-title` (one class). The lesson shows how to nest a media query inside the rule it changes. |
| #7 Spacing helper | Mixins output declarations. The at-rule that can `@return` a value has a different name. |
| #8 Set Sail button | `& .primary` (with a space) compiles to `.cta-button .primary`: a `.primary` element *inside* a `.cta-button`. The button has both classes on the same element. |
| #9 Submarine outline | Placeholder names always start with the same character, both where they're defined and where they're extended. |
| #10 Forms partial | Sass requires every `@use` to come before any style rules. There's already one `@use` near the top of the file. |
