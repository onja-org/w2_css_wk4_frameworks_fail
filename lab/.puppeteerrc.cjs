// The checks run in headless mode, which only needs chrome-headless-shell.
// Skipping the full Chrome download roughly halves the first `npm install`.
module.exports = {
  chrome: { skipDownload: true },
};
