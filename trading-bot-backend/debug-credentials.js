// ========================================
// DEBUG: Check .env credential SHAPE only
// Never prints the actual key/secret - just length,
// whitespace, and which mode/URL they'll hit
// ========================================

require('dotenv').config();

const key = process.env.TRADING212_API_KEY;
const secret = process.env.TRADING212_API_SECRET;
const mode = process.env.TRADING212_MODE || 'demo';

console.log('\n========================================');
console.log('🔍 Credential shape check (no secrets shown)');
console.log('========================================\n');

function check(name, value) {
  if (!value) {
    console.log(`❌ ${name} is missing entirely`);
    return;
  }
  const trimmed = value.trim();
  const preview = value.length > 8
    ? `${value.slice(0, 4)}...${value.slice(-4)}`
    : '(too short to preview safely)';
  console.log(`${name}:`);
  console.log(`   Preview: ${preview}  <- compare this against what Trading212's UI shows you`);
  console.log(`   Length: ${value.length} chars`);
  console.log(`   Has leading/trailing whitespace: ${value !== trimmed ? '⚠️  YES - this is likely your bug' : 'no'}`);
  console.log(`   Starts with a quote character: ${/^['"]/.test(value) ? '⚠️  YES - remove quotes from .env' : 'no'}`);
  console.log(`   Contains a newline: ${/[\r\n]/.test(value) ? '⚠️  YES - this WILL break Basic Auth' : 'no'}`);
  console.log(`   Only expected characters (letters/numbers/-/_): ${/^[A-Za-z0-9\-_]+$/.test(value) ? 'yes' : '⚠️  NO - contains an unexpected character, possibly invisible'}`);
  console.log('');
}

check('TRADING212_API_KEY', key);
check('TRADING212_API_SECRET', secret);

console.log(`TRADING212_MODE: ${mode}`);
console.log(`This will call: https://${mode === 'live' ? 'live' : 'demo'}.trading212.com/api/v0`);
console.log('\n👉 Make sure your API key/secret were generated on the matching');
console.log(`   ${mode.toUpperCase()} account in Trading212 (Settings > API).`);
console.log('========================================\n');