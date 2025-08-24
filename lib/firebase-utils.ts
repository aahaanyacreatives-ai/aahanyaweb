import { NextResponse } from 'next/server';
import { adminDB } from './firebaseAdmin';

// Define a type for Firebase-like errors
interface FirebaseErrorLike {
  code?: string;
  message?: string;
}

export type FirebaseErrorResponse = {
  error: string;
  details?: string;
  code?: string;
  status: number;
};

// Helper functions for error handling
const getErrorMessage = (code?: string): string => {
  switch (code) {
    case 'permission-denied':
      return 'Permission denied';
    case 'not-found':
      return 'Resource not found';
    case 'already-exists':
      return 'Resource already exists';
    case 'failed-precondition':
      return 'Operation failed';
    case 'resource-exhausted':
      return 'Rate limit exceeded';
    default:
      return 'Internal server error';
  }
};

const getErrorDetails = (error: FirebaseErrorLike): string | undefined => {
  if (!process.env.NODE_ENV || process.env.NODE_ENV === 'production') {
    return undefined;
  }

  switch (error.code) {
    case 'permission-denied':
      return 'You do not have permission to perform this action';
    case 'failed-precondition':
      return 'The operation failed due to a precondition';
    default:
      return error.message;
  }
};

export const handleFirebaseError = (error: unknown): NextResponse<FirebaseErrorResponse> => {
  console.error('Firebase operation failed:', error);
  
  // Type guard function
  const isFirebaseError = (err: unknown): err is FirebaseErrorLike => {
    return typeof err === 'object' && err !== null && 'code' in err;
  };

  if (isFirebaseError(error)) {
    const errorResponse = (status: number): FirebaseErrorResponse => ({
      error: getErrorMessage(error.code),
      details: getErrorDetails(error),
      code: error.code,
      status
    });

    switch (error.code) {
      case 'permission-denied':
        return NextResponse.json(errorResponse(403));
      
      case 'not-found':
        return NextResponse.json(errorResponse(404));
      
      case 'already-exists':
        return NextResponse.json(errorResponse(409));
      
      case 'failed-precondition':
        return NextResponse.json(errorResponse(412));
      
      case 'resource-exhausted':
        return NextResponse.json(errorResponse(429));
      
      default:
        return NextResponse.json(errorResponse(500));
    }
  }
  
  return NextResponse.json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? 'Unknown error occurred' : undefined,
    status: 500
  });
};

export const runTransaction = async <T>(
  operation: (transaction: FirebaseFirestore.Transaction) => Promise<T>
): Promise<T> => {
  try {
    return await adminDB.runTransaction(operation);
  } catch (error) {
    throw error;
  }
};

export const runBatch = async (
  operation: (batch: FirebaseFirestore.WriteBatch) => void
): Promise<void> => {
  const batch = adminDB.batch();
  try {
    await operation(batch);
    await batch.commit();
  } catch (error) {
    throw error;
  }
};

export const deleteCollection = async (
  collectionPath: string,
  batchSize: number = 100
): Promise<number> => {
  const collectionRef = adminDB.collection(collectionPath);
  const query = collectionRef.orderBy('__name__').limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(query, batchSize, resolve, reject, 0);
  });
};

async function deleteQueryBatch(
  query: FirebaseFirestore.Query,
  batchSize: number,
  resolve: (count: number) => void,
  reject: (error: Error) => void,
  count: number
): Promise<void> {
  try {
    const snapshot = await query.get();

    if (snapshot.size === 0) {
      resolve(count);
      return;
    }

    const batch = adminDB.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    const numDeleted = snapshot.size;
    if (numDeleted === 0) {
      resolve(count);
      return;
    }

    process.nextTick(() => {
      deleteQueryBatch(query, batchSize, resolve, reject, count + numDeleted);
    });
  } catch (error) {
    reject(error as Error);
  }
}
