// app/admin/[...catchall]/page.tsx
import { notFound } from 'next/navigation';

export default function CatchAll() {
  notFound();
  return null; // never actually rendered
}
