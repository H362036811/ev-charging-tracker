import { useState } from 'react';
import { useCharging } from '../hooks/useCharging';
import { useAuth } from '../hooks/useAuth';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select } from './ui/select';
import { Card, CardContent } from './ui/card';

export function VehicleManager() {
  const { vehicles, addVehicle, deleteVehicle, shares, shareVehicle, revokeShare } = useCharging();
  const { user, getAllUsers } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [shareSelectedUserId, setShareSelectedUserId] = useState('');
  const [shareManualUsername, setShareManualUsername] = useState('');
  const [shareMode, setShareMode] = useState<'select' | 'manual'>('select');
  const [shareVehicleId, setShareVehicleId] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  const handleAdd = async () => {
    if (!name.trim()) return;
    await addVehicle(name.trim(), brand.trim(), model.trim());
    setName('');
    setBrand('');
    setModel('');
    setShowAdd(false);
  };

  const handleShare = async () => {
    const allUsers = getAllUsers();
    let targetUserId = '';
    if (shareMode === 'select') {
      if (!shareSelectedUserId) return;
      targetUserId = shareSelectedUserId;
    } else {
      const trimmed = shareManualUsername.trim();
      if (!trimmed) return;
      const found = allUsers.find(u => u.username.toLowerCase() === trimmed.toLowerCase());
      if (!found) {
        setMessage('未找到该用户');
        setMessageType('error');
        setTimeout(() => setMessage(''), 3000);
        return;
      }
      if (found.id === user?.id) {
        setMessage('不能共享给自己');
        setMessageType('error');
        setTimeout(() => setMessage(''), 3000);
        return;
      }
      targetUserId = found.id;
    }
    if (!shareVehicleId || !targetUserId) return;
    await shareVehicle(shareVehicleId, targetUserId);
    setShareSelectedUserId('');
    setShareManualUsername('');
    setShareVehicleId('');
    setMessage('已成功共享');
    setMessageType('success');
    setTimeout(() => setMessage(''), 3000);
  };

  // Confirmed shares visible to current user
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
                {shareVehicleId === v.id && (() => {
                  const allUsers = getAllUsers();
                  const confirmedSharesForVehicle = confirmedShares.filter(s => s.vehicle_id === v.id);
                  const sharedUserIds = confirmedSharesForVehicle.map(s => s.shared_with_user_id);
                  const availableUsers = allUsers.filter(u => u.id !== user?.id && !sharedUserIds.includes(u.id));
                  return (
                    <div className="mt-3 pt-3 border-t border-slate-700 space-y-2">
                      <p className="text-xs text-slate-400">共享此车辆给其他用户（直接生效）</p>
                      {/* 切换模式 */}
                      <div className="flex gap-2 text-xs">
                        <button
                          className={`px-2 py-1 rounded ${shareMode === 'select' ? 'bg-sky-600 text-white' : 'bg-slate-700 text-slate-400'}`}
                          onClick={() => setShareMode('select')}
                        >下拉选择</button>
                        <button
                          className={`px-2 py-1 rounded ${shareMode === 'manual' ? 'bg-sky-600 text-white' : 'bg-slate-700 text-slate-400'}`}
                          onClick={() => setShareMode('manual')}
                        >手填用户名</button>
                      </div>
                      {shareMode === 'select' ? (
                        availableUsers.length === 0 ? (
                          <p className="text-xs text-slate-500">暂无其他用户可共享（可切换为手填模式）</p>
                        ) : (
                          <div className="flex gap-2">
                            <Select
                              options={availableUsers.map(u => ({ value: u.id, label: u.username + (u.email ? ` (${u.email})` : '') }))}
                              value={shareSelectedUserId}
                              onChange={e => setShareSelectedUserId(e.target.value)}
                              className="flex-1"
                            />
                            <Button size="sm" onClick={handleShare} disabled={!shareSelectedUserId}>确认共享</Button>
                          </div>
                        )
                      ) : (
                        <div className="flex gap-2">
                          <Input
                            value={shareManualUsername}
                            onChange={e => setShareManualUsername(e.target.value)}
                            placeholder="输入对方用户名"
                            className="flex-1"
                          />
                          <Button size="sm" onClick={handleShare} disabled={!shareManualUsername.trim()}>确认共享</Button>
                        </div>
                      )}
                      {message && (
                        <p className={`text-xs ${messageType === 'success' ? 'text-green-400' : 'text-red-400'}`}>{message}</p>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Confirmed Shares */}
      {confirmedShares.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-bold text-white mb-2">已共享</h3>
          <div className="space-y-2">
            {confirmedShares.map(s => {
              const allUsers = getAllUsers();
              const otherUser = allUsers.find(u => u.id === (s.shared_by_user_id === user?.id ? s.shared_with_user_id : s.shared_by_user_id));
              const vehicle = vehicles.find(v => v.id === s.vehicle_id);
              const isOwner = s.shared_by_user_id === user?.id;
              return (
                <Card key={s.id}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="text-xs text-slate-300">
                      <span className="font-medium text-white">{vehicle?.name || '未知车辆'}</span>
                      {' — 与 '}
                      <span className="text-sky-400">{otherUser?.username || '未知用户'}</span>
                      {' 共享'}
                    </div>
                    {isOwner && (
                      <Button variant="danger" size="sm" onClick={() => revokeShare(s.id)}>
                        撤销
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
