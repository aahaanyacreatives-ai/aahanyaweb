// tests/rules/setup.ts
import * as fs from 'fs';
import * as path from 'path';
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  RulesTestContext
} from '@firebase/rules-unit-testing';

const projectId = 'demo-' + Date.now();

export const setup = async (): Promise<RulesTestEnvironment> => {
  const rules = fs.readFileSync(
    path.resolve(__dirname, '../../firestore.rules'),
    'utf8'
  );

  const testEnv = await initializeTestEnvironment({
    projectId,
    firestore: { 
      rules,
      host: 'localhost',
      port: 8080
    }
  });

  return testEnv;
};

export const teardown = async (testEnv: RulesTestEnvironment): Promise<void> => {
  await testEnv.cleanup();
};

export type { RulesTestEnvironment, RulesTestContext };
