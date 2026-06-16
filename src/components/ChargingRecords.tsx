import { useState } from 'react';
import { useCharging } from '../hooks/useCharging';
import { useAuth } from '../hooks/useAuth';
import { ChargingRecord, DashboardStats } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';

interface ChargingRecordsProps {
  onAddRecord: () => void;
  onEditRecord: (record: ChargingRecord) => void;
}

export function ChargingRecords({ onAddRecord, onEditRecord }: ChargingRecordsProps) {
  const { records, vehicles, selectedVehicleId, setSelectedVehicleId, getStats, deleteRecord } = useCharging();
  const { user } = useAuth();
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'cost-high' | 'cost-low'>('newest');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const stats: DashboardStats = getStats();

  const sortedRecords = [...records].sort((a, b) => {
    switch (sortOrder) {
      case 'newest': return new Date(b.charge_date).getTime() - new Date(a.charge_date).getTime();
      case 'oldest': return new Date(a.charge_date).getTime() - new Date(b.charge_date).getTime();
      case 'cost-high': return b.charge_cost - a.charge_cost;
      case 'cost-low': return a.charge_cost - b.charge_cost;
      default: return 0;
    }
  });

  const handleDelete = async (id: string) => {
    await deleteRecord(id);
    setShowDeleteConfirm(null);
  };

  if (vehicles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
        <svg className="w-16 h-16 text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V5.625c0-.621.504-1.125 1.125-1.125h13.546c.44 0 .836.256 1.02.656l2.07 4.376a1.125 1.125 0 01.09.476v6.068a1.125 1.125 0 01-1.125 1.125H19.5m-1.5-6.75H16.5" />
        </svg>
        <p className="text-slate-400 text-lg">暂无充电记录</p>
        <p className="text-slate-500 text-sm mt-1">请先添加车辆</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-4">
      {/* Vehicle Selector */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        {vehicles.map(v => (
          <button
            key={v.id}
            onClick={() => setSelectedVehicleId(v.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
              selectedVehicleId === v.id
                ? 'bg-sky-500 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {v.name}
          </button>
        ))}
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-sky-900/50 to-slate-800 border-sky-700/30">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-sky-300">总充电费用</p>
            <p className="text-lg font-bold text-white mt-0.5">{formatCurrency(stats.totalCost)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-900/50 to-slate-800 border-green-700/30">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-green-300">充电次数</p>
            <p className="text-lg font-bold text-white mt-0.5">{stats.totalCount}次</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-900/50 to-slate-800 border-purple-700/30">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-purple-300">总充电时长</p>
            <p className="text-lg font-bold text-white mt-0.5">{stats.totalDuration.toFixed(1)}h</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-900/50 to-slate-800 border-amber-700/30">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-amber-300">总行驶里程</p>
            <p className="text-lg font-bold text-white mt-0.5">{stats.totalDistance.toFixed(0)}km</p>
          </CardContent>
        </Card>
      </div>

      {/* Add Record Button */}
      <Button onClick={onAddRecord} className="w-full" size="lg">
        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        记录充电
      </Button>

      {/* Sort Controls */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {([
          ['newest', '最新优先'],
          ['oldest', '最早优先'],
          ['cost-high', '费用最高'],
          ['cost-low', '费用最低'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSortOrder(key)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
              sortOrder === key
                ? 'bg-slate-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Records List */}
      {sortedRecords.length === 0 ? (
        <div className="text-center py-10 text-slate-500">
          <p>暂无充电记录</p>
          <p className="text-sm mt-1">点击上方按钮记录第一次充电</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedRecords.map(record => (
            <Card
              key={record.id}
              className="hover:border-slate-500 transition-colors cursor-pointer"
              onClick={() => onEditRecord(record)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-sky-500/20 text-sky-300 text-xs font-bold px-2 py-0.5 rounded">
                      第{record.charge_number}次
                    </span>
                    <span className="text-slate-300 text-sm">{formatDate(record.charge_date)}</span>
                  </div>
                  <span className="text-lg font-bold text-white">{formatCurrency(record.charge_cost)}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-slate-400">
                  <div>
                    <span className="text-slate-500">里程</span>
                    <p className="text-slate-300">{record.odometer_km}km</p>
                  </div>
                  <div>
                    <span className="text-slate-500">时长</span>
                    <p className="text-slate-300">{record.charge_duration_hours}h</p>
                  </div>
                  <div>
                    <span className="text-slate-500">行驶</span>
                    <p className="text-slate-300">{record.distance_since_last_km}km</p>
                  </div>
                </div>
                {record.station && (
                  <p className="text-xs text-slate-500 mt-1">📍 {record.station}</p>
                )}
                {/* Delete button */}
                {showDeleteConfirm === record.id ? (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-700" onClick={e => e.stopPropagation()}>
                    <span className="text-xs text-red-400">确认删除？</span>
                    <Button variant="danger" size="sm" onClick={() => handleDelete(record.id)}>删除</Button>
                    <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(null)}>取消</Button>
                  </div>
                ) : (
                  <button
                    className="text-xs text-slate-600 hover:text-red-400 mt-2 transition-colors"
                    onClick={e => { e.stopPropagation(); setShowDeleteConfirm(record.id); }}
                  >
                    删除
                  </button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
