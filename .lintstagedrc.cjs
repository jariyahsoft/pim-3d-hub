module.exports = {
  '*.{js,cjs,mjs,ts,tsx,json,md,yml,yaml}': 'prettier --write --ignore-unknown',
  '*.{js,cjs,mjs,ts,tsx}': 'eslint --fix --max-warnings=0',
}
