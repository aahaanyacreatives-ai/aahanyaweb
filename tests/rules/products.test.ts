// tests/rules/products.test.ts
import { setup, teardown } from './setup';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import type { RulesTestContext, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { describe, expect, beforeAll, afterAll, it } from '@jest/globals';

describe('Firestore Security Rules', () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await setup();
  });

  afterAll(async () => {
    await teardown(testEnv);
  });

  describe('Products Collection', () => {
    it('allows anyone to read products', async () => {
      const db = testEnv.unauthenticatedContext().firestore();
      await expect(
        db.collection('products').doc('test-product').get()
      ).resolves.toBeDefined();
    });

    it('only allows admin to write products', async () => {
      const adminDb = testEnv
        .authenticatedContext('admin-uid', { role: 'admin' })
        .firestore();
      const userDb = testEnv
        .authenticatedContext('user-uid', { role: 'user' })
        .firestore();

      // Admin should be able to write
      await expect(
        adminDb
          .collection('products')
          .doc('test-product')
          .set({ name: 'Test Product' })
      ).resolves.toBeDefined();

      // Regular user should be denied
      await expect(
        userDb
          .collection('products')
          .doc('test-product')
          .set({ name: 'Test Product' })
      ).rejects.toThrow();
    });
  });

  describe('Cart Collection', () => {
    it('allows authenticated users to read their own cart', async () => {
      const userId = 'test-user';
      const db = testEnv
        .authenticatedContext(userId)
        .firestore();

      await expect(
        db.collection('cart')
          .where('userId', '==', userId)
          .get()
      ).resolves.toBeDefined();
    });

    it('prevents users from reading other users carts', async () => {
      const user1Db = testEnv
        .authenticatedContext('user1')
        .firestore();
      
      await expect(
        user1Db.collection('cart')
          .where('userId', '==', 'user2')
          .get()
      ).rejects.toThrow();
    });
  });
});
