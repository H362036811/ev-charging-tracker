import { useState } from 'react';
import { useCharging } from '../hooks/useCharging';
import { useAuth } from '../hooks/useAuth';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';

export function VehicleManager() {
  const { vehicles, addVehicle, deleteVehicle, shares, shareVehicle, respondToShare } = useCharging();
  const { user, getAllUsers } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [shareUsername, setShareUsername] = useState('');
  const [shareVehicleId, setShareVehicleId] = useState('');
  const [message, setMessage] = useState('');

  const handleAdd = async () => {
    if (!name.trim()) return;
    await addVehicle(name.trim(), brand.trim(), model.trim());
    setName('');
    setBrand('');
    setModel('');
    setShowAdd(false);
  };

  const handleShare = async () => {
    if (!shareUsername.trim() || !shareVehicleId) return;
    const allUsers = getAllUsers();
    const targetUser = allUsers.find(u => u.username.toLowerCase() === shareUsername.trim().toLowerCase());
    if (!targetUser) {
      setMessage('未找到该用户');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    if (targetUser.id === user?.id) {
      setMessage('不能共享给自己');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    await shareVehicle(shareVehicleId, targetUser.id);
    setShareUsername('');
    setShareVehicleId('');
    setMessage('已发送共享请求，等待对方确认');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleRespond = async (shareId: string, response: 'confirmed' | 'rejected') => {
    await respondToShare(shareId, response);
  };

  // Pending shares for current user
  const pendingShares = shares.filter(s => s.shared_with_user_id === user?.id && s.status === 'pending');
  // Confirmed shares (both directions)
  const confirmedShares = shares.filter(s => s.status === 'confirmed');

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">我的车辆</h2>
        <Button onClick={() => setShowAdd(!showAdd)} size="sm">
          {showAdd ? '取消' : '添加'}
        </Button>
      </div>

      {/* Add Vehicle Form */}
      {showAdd && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <Input label="车辆名称" value={name} onChange={e => setName(e.target.value)} placeholder="如：小黑" />
            <Input label="品牌 (可选)" value={brand} onChange={e => setBrand(e.target.value)} placeholder="如：比亚迪" />
            <Input label="型号 (可选)" value={model} onChange={e => setModel(e.target.value)} placeholder="如：海豚" />
            <Button onClick={handleAdd} className="w-full">添加车辆</Button>
          </CardContent>
        </Card>
      )}

      {/* Vehicle List */}
      {vehicles.length === 0 ? (
        <div className="text-center py-10 text-slate-500">
          <p>还没有添加车辆</p>
          <Button variant="ghost" onClick={() => setShowAdd(true)} className="mt-2">添加第一辆车</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {vehicles.map(v => (
            <Card key={v.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white">{v.name}</h3>
                    {(v.brand || v.model) && (
                      <p className="text-sm text-slate-400">{v.brand} {v.model}</p>
                    )}
                    {v.owner_id === user?.id ? (
                      <span className="text-xs text-sky-400">我的车辆</span>
                    ) : (
                      <span className="text-xs text-green-400">共享车辆</span>
                    )}
                  </div>
                  {v.owner_id === user?.id && (
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setShareVehicleId(shareVehicleId === v.id ? '' : v.id)}>
                        共享
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => deleteVehicle(v.id)}>
                        删除
                      </Button>
                    </div>
                  )}
                </div>

                {/* Share form for this vehicle */}
                {shareVehicleId === v.id && (
                  <div className="mt-3 pt-3 border-t border-slate-700 space-y-2">
                    <p className="text-xs text-slate-400">输入用户名共享此车辆给对方</p>
                    <div className="flex gap-2">
                      <Input
                        value={shareUsername}
                        onChange={e => setShareUsername(e.target.value)}
                        placeholder="对方用户名"
                        className="flex-1"
                      />
                      <Button size="sm" onClick={handleShare}>确认共享</Button>
                    </div>
                    {message && <p className="text-xs text-green-400">{message}</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pending Share Requests */}
      {pendingShares.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-bold text-white mb-2">待确认的共享请求</h3>
          <div className="space-y-2">
            {pendingShares.map(s => {
              const allUsers = getAllUsers();
              const fromUser = allUsers.find(u => u.id === s.shared_by_user_id);
              const vehicle = vehicles.find(v => v.id === s.vehicle_id);
              return (
                <Card key={s.id}>
                  <CardContent className="p-3">
                    <p className="text-sm text-slate-300">
                      <span className="text-sky-400">{fromUser?.username}</span> 想与您共享车辆
                      <span className="text-white font-bold"> {vehicle?.name || '未知'}</span>
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" onClick={() => handleRespond(s.id, 'confirmed')}>接受</Button>
                      <Button variant="danger" size="sm" onClick={() => handleRespond(s.id, 'rejected')}>拒绝</Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Confirmed Shares */}
      {confirmedShares.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-bold text-white mb-2">已确认的共享</h3>
          <div className="space-y-1">
            {confirmedShares.map(s => {
              const allUsers = getAllUsers();
              const otherUser = allUsers.find(u => u.id === (s.shared_by_user_id === user?.id ? s.shared_with_user_id : s.shared_by_user_id));
              const vehicle = vehicles.find(v => v.id === s.vehicle_id);
              return (
                <div key={s.id} className="text-xs text-slate-400 py-1">
                  {vehicle?.name || '未知车辆'} — 与 <span className="text-sky-400">{otherUser?.username}</span> 共享
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
