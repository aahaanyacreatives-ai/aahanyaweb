declare module '@/lib/types/firebase-admin' {
  export interface DocumentData {
    [field: string]: any;
  }

  export interface QueryDocumentSnapshot<T = DocumentData> {
    id: string;
    data(): T;
    ref: any;
  }

  export interface DocumentSnapshot<T = DocumentData> {
    id: string;
    data(): T | undefined;
    exists: boolean;
    ref: any;
  }
}
