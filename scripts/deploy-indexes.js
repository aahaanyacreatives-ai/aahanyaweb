// scripts/deploy-indexes.js
const { spawn } = require('child_process');

// Ensure Firebase CLI is installed
console.log('Checking Firebase CLI installation...');

const deployIndexes = () => {
  console.log('Deploying Firestore indexes...');
  
  const process = spawn('firebase', ['deploy', '--only', 'firestore:indexes'], {
    stdio: 'inherit',
    shell: true
  });

  process.on('error', (err) => {
    console.error('Failed to deploy indexes:', err);
    process.exit(1);
  });

  process.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Firestore indexes deployed successfully');
    } else {
      console.error(`❌ Failed to deploy indexes (exit code: ${code})`);
      process.exit(code);
    }
  });
};

deployIndexes();
