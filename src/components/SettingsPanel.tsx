import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharging } from '../hooks/useCharging';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { isSupabaseConfigured } from '../lib/supabase';

export function SettingsPanel() {
  const { user, logout } = useAuth();
  const { exportData, importData, syncFromCloud } = useCharging();
  const [message, setMessage] = useState('');

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ev-charging-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage('数据已导出');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      const success = importData(text);
      setMessage(success ? '数据导入成功' : '导入失败，文件格式错误');
      setTimeout(() => setMessage(''), 3000);
    };
    input.click();
  };

  const handleSync = async () => {
    if (!isSupabaseConfigured) {
      setMessage('未配置云同步，请设置 Supabase');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    await syncFromCloud();
    setMessage('同步完成');
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <h2 className="text-lg font-bold text-white">设置</h2>

      {/* Current User */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-500/20 rounded-full flex items-center justify-center">
              <span className="text-sky-300 font-bold">{user?.username?.[0]?.toUpperCase()}</span>
            </div>
            <div>
              <p className="font-medium text-white">{user?.username}</p>
              <p className="text-xs text-slate-400">{user?.email || '无邮箱'}</p>
              <p className="text-xs text-amber-400">{user?.role === 'admin' ? '管理员' : '普通用户'}</p>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">同一账号在不同设备登录，数据自动同步</p>
        </CardContent>
      </Card>

      {/* Cloud Sync */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h3 className="font-medium text-white">☁️ 云自动同步</h3>
          <div className="text-sm text-slate-400">
            <p>同步状态：{isSupabaseConfigured ? '已配置' : '未配置'}</p>
          </div>
          <Button onClick={handleSync} className="w-full" variant={isSupabaseConfigured ? 'primary' : 'secondary'}>
            {isSupabaseConfigured ? '立即同步' : '未配置云同步'}
          </Button>
          {!isSupabaseConfigured && (
            <p className="text-xs text-slate-500">需配置 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY 环境变量</p>
          )}
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h3 className="font-medium text-white">数据管理</h3>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={handleExport} className="w-full">导出数据</Button>
            <Button variant="secondary" onClick={handleImport} className="w-full">导入数据</Button>
          </div>
          <p className="text-xs text-slate-500">导出所有车辆和充电记录为 JSON 文件</p>
        </CardContent>
      </Card>

      {/* File Transfer Sync */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h3 className="font-medium text-white">多设备同步</h3>
          <p className="text-xs text-slate-400">
            📱 文件传输同步（100%可靠）<br />
            无需网络、无需注册、通过微信/QQ/邮件发送文件即可跨设备同步数据
          </p>
          <ol className="text-xs text-slate-400 space-y-1 list-decimal list-inside">
            <li>点「导出数据」→ 自动下载 .json 文件</li>
            <li>通过微信/QQ/邮件发送给其他手机或平板</li>
            <li>对方打开本应用 → 点「导入数据」→ 选择收到的文件</li>
            <li>✓ 数据自动合并，两设备数据互通！</li>
          </ol>
        </CardContent>
      </Card>

      {message && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-sm text-green-400">
          {message}
        </div>
      )}

      {/* Logout */}
      <Button variant="danger" onClick={logout} className="w-full">退出登录</Button>

      {/* About */}
      <div className="text-center text-xs text-slate-600 pt-4 pb-8">
        <p>电车充电记录 v1.0</p>
        <p>支持多车辆、多用户、多终端数据同步</p>
      </div>
    </div>
  );
}
