import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select } from './ui/select';
import { Card, CardContent } from './ui/card';

export function AdminPanel() {
  const { user, getAllUsers, createUser, deleteUser } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('user');
  const [message, setMessage] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  if (user?.role !== 'admin') {
    return (
      <div className="text-center py-10 text-slate-500">
        <p>无权限访问</p>
      </div>
    );
  }

  const handleCreate = async () => {
    if (!username.trim() || !password.trim()) {
      setMessage('用户名和密码不能为空');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    const result = await createUser(username.trim(), email.trim(), password, role);
    if (result.success) {
      setUsername('');
      setEmail('');
      setPassword('');
      setMessage('用户创建成功');
    } else {
      setMessage(result.error || '创建失败');
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const handleDelete = (userId: string) => {
    if (userId === user?.id) return;
    deleteUser(userId);
    setShowDeleteConfirm(null);
  };

  const allUsers = getAllUsers();

  return (
    <div className="space-y-4 animate-fade-in">
      <h2 className="text-lg font-bold text-white">用户管理</h2>

      {/* Create User Form */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h3 className="font-medium text-white">新增用户</h3>
          <Input label="用户名" value={username} onChange={e => setUsername(e.target.value)} placeholder="用户名" />
          <Input label="邮箱 (可选)" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="邮箱" />
          <Input label="密码" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="密码" />
          <Select
            label="角色"
            options={[
              { value: 'user', label: '普通用户' },
              { value: 'admin', label: '管理员' },
            ]}
            value={role}
            onChange={e => setRole(e.target.value as UserRole)}
          />
          <Button onClick={handleCreate} className="w-full">创建用户</Button>
          {message && <p className={`text-sm ${message.includes('成功') ? 'text-green-400' : 'text-red-400'}`}>{message}</p>}
        </CardContent>
      </Card>

      {/* User List */}
      <div className="space-y-2">
        {allUsers.map(u => (
          <Card key={u.id}>
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-white">{u.username}</p>
                {u.email && <p className="text-xs text-slate-400">{u.email}</p>}
                <span className={`text-xs ${u.role === 'admin' ? 'text-amber-400' : 'text-slate-400'}`}>
                  {u.role === 'admin' ? '管理员' : '普通用户'}
                </span>
              </div>
              {u.id !== user?.id && (
                showDeleteConfirm === u.id ? (
                  <div className="flex gap-1">
                    <Button variant="danger" size="sm" onClick={() => handleDelete(u.id)}>确认</Button>
                    <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(null)}>取消</Button>
                  </div>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(u.id)}>删除</Button>
                )
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
