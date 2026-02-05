// Quick verification script to check setup
const fs = require('fs');
const path = require('path');

console.log('Verifying setup...\n');

const checks = [
  {
    name: 'Node modules',
    check: () => fs.existsSync('node_modules'),
    fix: 'Run: npm install',
  },
  {
    name: 'Environment file',
    check: () => fs.existsSync('.env'),
    fix: 'Run: cp .env.example .env and add OPENAI_API_KEY',
  },
  {
    name: 'Data directory',
    check: () => fs.existsSync('data'),
    fix: 'Run: mkdir -p data',
  },
  {
    name: 'Uploads directory',
    check: () => fs.existsSync('uploads'),
    fix: 'Run: mkdir -p uploads',
  },
  {
    name: 'OpenAI API key configured',
    check: () => {
      if (!fs.existsSync('.env')) return false;
      const envContent = fs.readFileSync('.env', 'utf8');
      return envContent.includes('OPENAI_API_KEY=') && 
             !envContent.includes('your_openai_api_key_here');
    },
    fix: 'Edit .env and add your actual OPENAI_API_KEY',
  },
];

let allPassed = true;

checks.forEach(({ name, check, fix }) => {
  const passed = check();
  const status = passed ? '✓' : '✗';
  console.log(`${status} ${name}`);
  if (!passed) {
    console.log(`   Fix: ${fix}`);
    allPassed = false;
  }
});

console.log('\n' + (allPassed ? '✓ All checks passed! Ready to run.' : '✗ Some checks failed. Please fix the issues above.'));

if (allPassed) {
  console.log('\nTo start the dev server, run: npm run dev');
}

process.exit(allPassed ? 0 : 1);
