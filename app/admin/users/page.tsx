'use client';
import { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

interface User {
  _id: string;
  name?: string;
  email: string;
  role: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch('/api/user');
        if (!res.ok) throw new Error(`Error: ${res.status}`);
        const data = await res.json();
        setUsers(data.data || data);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  const updateRole = async (userId: string, newRole: string) => {
    try {
      const res = await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });
      if (res.ok) {
        const updated = await res.json();
        setUsers((prev) =>
          prev.map((u) => (u._id === userId ? { ...u, role: updated.data.role } : u))
        );
      }
    } catch (err: unknown) {
      console.error('Update error:', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/user?userId=${userId}`, { method: 'DELETE' });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u._id !== userId));
      }
    } catch (err: unknown) {
      console.error('Delete error:', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  if (loading) return <div>Loading users...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="grid gap-6">
      <h1 className="text-3xl font-bold">Users Management</h1>
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user._id}>
                <TableCell>{user.name || user.email}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.role}</TableCell>
                <TableCell className="text-center">
                  <Button onClick={() => updateRole(user._id, user.role === 'admin' ? 'user' : 'admin')}>
                    Toggle Role
                  </Button>
                  <Button variant="destructive" onClick={() => deleteUser(user._id)}>
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
