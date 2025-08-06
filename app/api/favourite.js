// ✅ Server-side API route (pages/api/favorites.js)
import { connectToDatabase } from '../../lib/db/mongodb.ts'

export default async function handler(req, res) {
  const { db } = await connectToDatabase()
  // Database operations here
  res.json(data)
}

// ✅ Client component (components/favorites-provider.tsx)
'use client'
import { useEffect, useState } from 'react'

export function FavoritesProvider() {
  const [data, setData] = useState(null)
  
  useEffect(() => {
    // Fetch from API route, not directly from database
    fetch('/api/favorites')
      .then(res => res.json())
      .then(setData)
  }, [])
  
  return <div>{/* Component JSX */}</div>
}
