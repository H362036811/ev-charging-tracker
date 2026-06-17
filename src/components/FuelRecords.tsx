import { useState } from 'react';
import { useFuel } from '../hooks/useFuel';
import { useAuth } from '../hooks/useAuth';
import { FuelRecord, FUEL_TYPE_LABELS } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';

interface FuelRecordsProps {
  onAddRecord: (vehicleId: string) => void;
  onEditRecord: (record: FuelRecord) => void;
}

export function FuelRecords({ onAddRecord, onEditRecord }: FuelRecordsProps) {
  const { fuelRecords, vehicles, selectedVehicleId, setSelectedVehicleId, getFuelStats, deleteFuelRecord } = useFuel();
  const { user } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const stats = getFuelStats();

  const handleDelete = async (id: string) => {
    await deleteFuelRecord(id);
    setShowDeleteConfirm(null);
  };

  if (vehicles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
        <svg className="w-16 h-16 text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0h-9M3.75 6.75h16.5v10.5H3.75V6.75z" />
        </svg>
        <p className="text-slate-400 text-lg">暂无油耗记录</p>
        <p className="text-slate-500 text-sm mt-1">请先在「我的车辆」添加车辆</p>
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
                ? 'bg-orange-500 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {v.name}
          </button>
        ))}
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-orange-900/50 to-slate-800 border-orange-700/30">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-orange-300">总加油费用</p>
            <p className="text-lg font-bold text-white mt-0.5">{formatCurrency(stats.totalAmount)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-900/50 to-slate-800 border-green-700/30">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-green-300">加油次数</p>
            <p className="text-lg font-bold text-white mt-0.5">{stats.totalCount}次</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-cyan-900/50 to-slate-800 border-cyan-700/30">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-cyan-300">总加油升数</p>
            <p className="text-lg font-bold text-white mt-0.5">{stats.totalLiters.toFixed(1)}L</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-900/50 to-slate-800 border-amber-700/30">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-amber-300">平均油耗</p>
            <p className="text-lg font-bold text-white mt-0.5">
              {stats.avgConsumption > 0 ? `${stats.avgConsumption.toFixed(1)}L/100km` : '--'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Add Record Button */}
      <Button onClick={() => onAddRecord(selectedVehicleId)} className="w-full bg-orange-500 hover:bg-orange-600" size="lg">
        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        记录加油
      </Button>

      {/* Records List */}
      {fuelRecords.length === 0 ? (
        <div className="text-center py-10 text-slate-500">
          <p>暂无加油记录</p>
          <p className="text-sm mt-1">点击上方按钮记录第一次加油</p>
        </div>
      ) : (
        <div className="space-y-2">
          {fuelRecords.map(record => (
            <Card
              key={record.id}
              className="hover:border-slate-500 transition-colors cursor-pointer"
              onClick={() => onEditRecord(record)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-orange-500/20 text-orange-300 text-xs font-bold px-2 py-0.5 rounded">
                      {FUEL_TYPE_LABELS[record.fuel_type]}
                    </span>
                    <span className="text-slate-300 text-sm">{formatDate(record.fuel_date)}</span>
                  </div>
                  <span className="text-lg font-bold text-white">{formatCurrency(record.total_amount)}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-slate-400">
                  <div>
                    <span className="text-slate-500">升数</span>
                    <p className="text-slate-300">{record.liters > 0 ? `${record.liters}L` : '--'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">单价</span>
                    <p className="text-slate-300">{record.unit_price > 0 ? `${record.unit_price}元/L` : '--'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">行驶</span>
                    <p className="text-slate-300">{record.distance_since_last_km > 0 ? `${record.distance_since_last_km}km` : '--'}</p>
                  </div>
                </div>
                {record.odometer_km > 0 && (
                  <p className="text-xs text-slate-500 mt-1">📍 里程: {record.odometer_km}km {record.fuel_gauge > 0 ? `· 油格: ${record.fuel_gauge}/8` : ''}</p>
                )}
                {record.station && (
                  <p className="text-xs text-slate-500 mt-0.5">🏪 {record.station}</p>
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
