import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from './ui/button';
import { Input } from './ui/input';

export function LoginPage() {
  const { login, register, isLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 注册表单
  const [showRegister, setShowRegister] = useState(false);
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regError, setRegError] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(username, password);
      if (!result.success) {
        setError(result.error || '登录失败');
      }
    } catch {
      setError('登录出错，请重试');
    }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    if (!regUsername.trim()) {
      setRegError('请输入用户名');
      return;
    }
    if (regPassword.length < 4) {
      setRegError('密码至少4位');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setRegError('两次密码不一致');
      return;
    }
    setRegLoading(true);
    try {
      const result = await register(regUsername.trim(), '', regPassword);
      if (result.success) {
        // 注册成功，自动登录
        const loginResult = await login(regUsername.trim(), regPassword);
        if (!loginResult.success) {
          setRegError('注册成功，请手动登录');
          setShowRegister(false);
          setUsername(regUsername.trim());
        }
      } else {
        setRegError(result.error || '注册失败');
      }
    } catch {
      setRegError('注册出错，请重试');
    }
    setRegLoading(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-400 border-t-transparent mx-auto" />
          <p className="mt-4 text-slate-400">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-sm animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-sky-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">车辆管理系统</h1>
          <p className="text-slate-400 mt-1">电车充电 · 汽车油耗</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-4">
          <div>
            <Input
              label="用户名 / 邮箱"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="输入用户名或邮箱"
              required
              autoComplete="username"
            />
          </div>
          <div>
            <Input
              label="密码"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="输入密码"
              required
              autoComplete="current-password"
            />
          </div>
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">
              {error}
            </div>
          )}
          <Button type="submit" className="w-full" loading={loading} size="lg">
            登录
          </Button>
        </form>

        {/* 注册入口 */}
        <button
          type="button"
          className="w-full text-sm text-sky-400 hover:text-sky-300 mt-3 py-2 transition-colors"
          onClick={() => { setShowRegister(!showRegister); setRegError(''); }}
        >
          {showRegister ? '收起注册' : '没有帐号？注册新账号'}
        </button>

        {/* 注册表单（折叠展开） */}
        {showRegister && (
          <form onSubmit={handleRegister} className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-4 mt-2">
            <h3 className="text-base font-bold text-white">注册新帐号</h3>
            <Input
              label="用户名"
              type="text"
              value={regUsername}
              onChange={e => setRegUsername(e.target.value)}
              placeholder="设置用户名"
              required
            />
            <Input
              label="密码（至少4位）"
              type="password"
              value={regPassword}
              onChange={e => setRegPassword(e.target.value)}
              placeholder="设置密码"
              required
            />
            <Input
              label="确认密码"
              type="password"
              value={regConfirmPassword}
              onChange={e => setRegConfirmPassword(e.target.value)}
              placeholder="再次输入密码"
              required
            />
            {regError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">
                {regError}
              </div>
            )}
            <Button type="submit" className="w-full" loading={regLoading} size="lg">
              注册
            </Button>
          </form>
        )}

        {/* 管理员账号提示 */}
        <div className="mt-6 bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
          <p className="text-xs text-slate-400 text-center mb-2">管理员帐号</p>
          <div className="space-y-1 text-xs text-slate-500">
            <p>管理员：htl / 362036811@qq.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}
