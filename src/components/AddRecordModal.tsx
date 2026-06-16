import { useState, useEffect } from 'react';
import { useCharging } from '../hooks/useCharging';
import { ChargingRecord, ChargingRecordInput } from '../types';
import { getTodayStr } from '../lib/utils';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select } from './ui/select';

interface AddRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  editRecord?: ChargingRecord | null;
}

export function AddRecordModal({ isOpen, onClose, editRecord }: AddRecordModalProps) {
  const { vehicles, selectedVehicleId, addRecord, updateRecord, getLastRecord, getNextChargeNumber } = useCharging();
  const [form, setForm] = useState<ChargingRecordInput>({
    vehicle_id: '',
    charge_date: getTodayStr(),
    odometer_km: 0,
    charge_duration_hours: 0,
    charge_cost: 0,
    distance_since_last_km: 0,
    charge_number: 0,
    station: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [autoCalculated, setAutoCalculated] = useState(false);

  // Initialize form
  useEffect(() => {
    if (isOpen) {
      if (editRecord) {
        setForm({
          vehicle_id: editRecord.vehicle_id,
          charge_date: editRecord.charge_date,
          odometer_km: editRecord.odometer_km,
          charge_duration_hours: editRecord.charge_duration_hours,
          charge_cost: editRecord.charge_cost,
          distance_since_last_km: editRecord.distance_since_last_km,
          charge_number: editRecord.charge_number,
          station: editRecord.station,
          notes: editRecord.notes,
        });
      } else {
        const vehicleId = selectedVehicleId || (vehicles[0]?.id ?? '');
        const lastRecord = getLastRecord(vehicleId);
        const nextNum = getNextChargeNumber(vehicleId);
        setForm({
          vehicle_id: vehicleId,
          charge_date: getTodayStr(),
          odometer_km: 0,
          charge_duration_hours: lastRecord?.charge_duration_hours ?? 0,
          charge_cost: lastRecord?.charge_cost ?? 0,
          distance_since_last_km: 0,
          charge_number: nextNum,
          station: lastRecord?.station ?? '',
          notes: '',
        });
        setAutoCalculated(false);
      }
    }
  }, [isOpen, editRecord, selectedVehicleId, vehicles]);

  // Auto-calculate distance when odometer changes
  const handleOdometerChange = (value: number) => {
    const lastRecord = getLastRecord(form.vehicle_id);
    let distance = 0;
    if (lastRecord && lastRecord.odometer_km > 0) {
      distance = Math.max(0, value - lastRecord.odometer_km);
    }
    setForm(prev => ({ ...prev, odometer_km: value, distance_since_last_km: distance }));
    setAutoCalculated(true);
  };

  // When vehicle changes, update auto-fill
  const handleVehicleChange = (vehicleId: string) => {
    const lastRecord = getLastRecord(vehicleId);
    const nextNum = getNextChargeNumber(vehicleId);
    setForm(prev => ({
      ...prev,
      vehicle_id: vehicleId,
      charge_duration_hours: lastRecord?.charge_duration_hours ?? prev.charge_duration_hours,
      charge_cost: lastRecord?.charge_cost ?? prev.charge_cost,
      station: lastRecord?.station ?? prev.station,
      charge_number: nextNum,
      distance_since_last_km: 0,
      odometer_km: 0,
    }));
  };

  const handleSave = async () => {
    if (!form.vehicle_id) return;
    setSaving(true);
    try {
      if (editRecord) {
        await updateRecord(editRecord.id, form);
      } else {
        await addRecord(form);
      }
      onClose();
    } catch (err) {
      console.error('Save failed:', err);
    }
    setSaving(false);
  };

  if (!isOpen) return null;

  const vehicleOptions = vehicles.map(v => ({ value: v.id, label: v.name }));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-slate-800 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-slate-700 animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 bg-slate-800 flex items-center justify-between px-4 py-3 border-b border-slate-700 z-10">
          <h2 className="text-lg font-bold text-white">
            {editRecord ? '编辑充电记录' : '新增充电记录'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <div className="p-4 space-y-4">
          {/* Vehicle selector */}
          {vehicleOptions.length > 0 && (
            <Select label="选择车辆" options={vehicleOptions} value={form.vehicle_id} onChange={e => handleVehicleChange(e.target.value)} />
          )}

          {/* Date */}
          <Input label="充电日期" type="date" value={form.charge_date} onChange={e => setForm(prev => ({ ...prev, charge_date: e.target.value }))} />

          {/* Charge number */}
          <Input
            label="充电次数（自动编号，可修改）"
            type="number"
            value={form.charge_number}
            onChange={e => setForm(prev => ({ ...prev, charge_number: parseInt(e.target.value) || 0 }))}
            min={1}
          />

          {/* Odometer */}
          <Input
            label="当前里程数 (km)"
            type="number"
            value={form.odometer_km || ''}
            onChange={e => handleOdometerChange(parseFloat(e.target.value) || 0)}
            placeholder="填写本次充电时的里程数后可自动计算"
            step="0.1"
          />

          {/* Distance since last */}
          <Input
            label="上次充电后行驶里程 (km)"
            type="number"
            value={form.distance_since_last_km || ''}
            onChange={e => setForm(prev => ({ ...prev, distance_since_last_km: parseFloat(e.target.value) || 0 }))}
            step="0.1"
          />
          {autoCalculated && form.distance_since_last_km > 0 && (
            <p className="text-xs text-green-400 -mt-2">✓ 根据里程数自动计算</p>
          )}

          {/* Duration */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input
                label="充电时长"
                type="number"
                value={form.charge_duration_hours || ''}
                onChange={e => setForm(prev => ({ ...prev, charge_duration_hours: parseFloat(e.target.value) || 0 }))}
                step="0.1"
                min={0}
              />
            </div>
            <span className="text-slate-400 pb-2.5">小时</span>
          </div>

          {/* Cost */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input
                label="充电费用"
                type="number"
                value={form.charge_cost || ''}
                onChange={e => setForm(prev => ({ ...prev, charge_cost: parseFloat(e.target.value) || 0 }))}
                step="0.01"
                min={0}
              />
            </div>
            <span className="text-slate-400 pb-2.5">元</span>
          </div>

          {/* Station */}
          <Input
            label="充电站 (可选)"
            type="text"
            value={form.station}
            onChange={e => setForm(prev => ({ ...prev, station: e.target.value }))}
            placeholder="充电站名称"
          />

          {/* Notes */}
          <Textarea
            label="备注 (可选)"
            value={form.notes}
            onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="其他备注信息"
          />

          {/* Save */}
          <Button onClick={handleSave} className="w-full" size="lg" loading={saving}>
            保存充电记录
          </Button>
        </div>
      </div>
    </div>
  );
}
