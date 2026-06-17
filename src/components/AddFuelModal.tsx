import { useState, useEffect } from 'react';
import { useFuel } from '../hooks/useFuel';
import { FuelRecord, FuelRecordInput, FuelType, FUEL_TYPE_LABELS } from '../types';
import { getTodayStr } from '../lib/utils';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select } from './ui/select';

interface AddFuelModalProps {
  isOpen: boolean;
  onClose: () => void;
  editRecord?: FuelRecord | null;
}

const DEFAULT_FORM: FuelRecordInput = {
  vehicle_id: '',
  fuel_date: '',
  odometer_km: 0,
  fuel_gauge: 4,
  fuel_type: 'gasoline_95',
  unit_price: 0,
  total_amount: 0,
  liters: 0,
  distance_since_last_km: 0,
  station: '',
  notes: '',
};

export function AddFuelModal({ isOpen, onClose, editRecord }: AddFuelModalProps) {
  const { vehicles, selectedVehicleId, addFuelRecord, updateFuelRecord, getLastFuelRecord } = useFuel();
  const [form, setForm] = useState<FuelRecordInput>({ ...DEFAULT_FORM, fuel_date: getTodayStr() });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Initialize form
  useEffect(() => {
    if (isOpen) {
      if (editRecord) {
        setForm({
          vehicle_id: editRecord.vehicle_id,
          fuel_date: editRecord.fuel_date,
          odometer_km: editRecord.odometer_km,
          fuel_gauge: editRecord.fuel_gauge,
          fuel_type: editRecord.fuel_type,
          unit_price: editRecord.unit_price,
          total_amount: editRecord.total_amount,
          liters: editRecord.liters,
          distance_since_last_km: editRecord.distance_since_last_km,
          station: editRecord.station,
          notes: editRecord.notes,
        });
      } else {
        const vehicleId = selectedVehicleId || (vehicles[0]?.id ?? '');
        const lastRecord = getLastFuelRecord(vehicleId);
        setForm({
          vehicle_id: vehicleId,
          fuel_date: getTodayStr(),
          odometer_km: 0,
          fuel_gauge: lastRecord?.fuel_gauge ?? 4,
          fuel_type: lastRecord?.fuel_type ?? 'gasoline_95',
          unit_price: lastRecord?.unit_price ?? 0,
          total_amount: 0,
          liters: 0,
          distance_since_last_km: 0,
          station: lastRecord?.station ?? '',
          notes: '',
        });
      }
      setSaveError('');
    }
  }, [isOpen, editRecord, selectedVehicleId, vehicles]);

  // When vehicle changes, update auto-fill
  const handleVehicleChange = (vehicleId: string) => {
    const lastRecord = getLastFuelRecord(vehicleId);
    setForm(prev => ({
      ...prev,
      vehicle_id: vehicleId,
      fuel_type: lastRecord?.fuel_type ?? prev.fuel_type,
      unit_price: lastRecord?.unit_price ?? prev.unit_price,
      station: lastRecord?.station ?? prev.station,
      fuel_gauge: lastRecord?.fuel_gauge ?? prev.fuel_gauge,
      odometer_km: 0,
      distance_since_last_km: 0,
    }));
  };

  // Auto-calculate distance when odometer changes
  const handleOdometerChange = (value: number) => {
    const lastRecord = getLastFuelRecord(form.vehicle_id);
    let distance = 0;
    if (lastRecord && lastRecord.odometer_km > 0) {
      distance = Math.max(0, value - lastRecord.odometer_km);
    }
    setForm(prev => ({ ...prev, odometer_km: value, distance_since_last_km: distance }));
  };

  // Linked calculation: unit_price * liters = total_amount
  const handleUnitPriceChange = (value: number) => {
    setForm(prev => {
      const newAmount = prev.liters > 0 ? Math.round(value * prev.liters * 100) / 100 : prev.total_amount;
      return { ...prev, unit_price: value, total_amount: newAmount };
    });
  };

  const handleLitersChange = (value: number) => {
    setForm(prev => {
      const newAmount = prev.unit_price > 0 ? Math.round(prev.unit_price * value * 100) / 100 : prev.total_amount;
      return { ...prev, liters: value, total_amount: newAmount };
    });
  };

  const handleTotalAmountChange = (value: number) => {
    setForm(prev => {
      if (prev.liters > 0) {
        const newPrice = Math.round((value / prev.liters) * 1000) / 1000;
        return { ...prev, total_amount: value, unit_price: newPrice };
      } else if (prev.unit_price > 0) {
        const newLiters = Math.round((value / prev.unit_price) * 100) / 100;
        return { ...prev, total_amount: value, liters: newLiters };
      }
      return { ...prev, total_amount: value };
    });
  };

  const handleSave = async () => {
    setSaveError('');
    if (!form.vehicle_id) {
      setSaveError('\u8BF7\u5148\u9009\u62E9\u8F66\u8F86');
      return;
    }
    if (!form.fuel_date) {
      setSaveError('\u8BF7\u586B\u5199\u52A0\u6CB9\u65E5\u671F');
      return;
    }
    if (form.total_amount <= 0 && form.liters <= 0) {
      setSaveError('\u8BF7\u586B\u5199\u52A0\u6CB9\u91D1\u989D\u6216\u5347\u6570');
      return;
    }
    setSaving(true);
    try {
      if (editRecord) {
        await updateFuelRecord(editRecord.id, form);
      } else {
        const result = await addFuelRecord(form);
        if (!result) {
          setSaveError('\u4FDD\u5B58\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5');
          setSaving(false);
          return;
        }
      }
      onClose();
    } catch (err) {
      console.error('Fuel save failed:', err);
      setSaveError('\u4FDD\u5B58\u51FA\u9519\uFF1A' + (err instanceof Error ? err.message : String(err)));
    }
    setSaving(false);
  };

  if (!isOpen) return null;

  const vehicleOptions = vehicles.map(v => ({ value: v.id, label: v.name }));
  const fuelTypeOptions = (Object.keys(FUEL_TYPE_LABELS) as FuelType[]).map(k => ({ value: k, label: FUEL_TYPE_LABELS[k] }));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-slate-800 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-slate-700 animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 bg-slate-800 flex items-center justify-between px-4 py-3 border-b border-slate-700 z-10">
          <h2 className="text-lg font-bold text-white">
            {editRecord ? '编辑加油记录' : '新增加油记录'}
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
            <Select
              label="选择车辆"
              options={vehicleOptions}
              value={form.vehicle_id}
              onChange={e => handleVehicleChange(e.target.value)}
            />
          )}

          {/* Date */}
          <Input
            label="加油日期"
            type="date"
            value={form.fuel_date}
            onChange={e => setForm(prev => ({ ...prev, fuel_date: e.target.value }))}
          />

          {/* Odometer */}
          <Input
            label="加油前汽车公里数 (km)"
            type="number"
            value={form.odometer_km || ''}
            onChange={e => handleOdometerChange(parseFloat(e.target.value) || 0)}
            placeholder="填写当前里程数，自动计算上次行驶里程"
            step="0.1"
          />

          {/* Distance since last */}
          <Input
            label="上次加油后行驶里程 (km)"
            type="number"
            value={form.distance_since_last_km || ''}
            onChange={e => setForm(prev => ({ ...prev, distance_since_last_km: parseFloat(e.target.value) || 0 }))}
            step="0.1"
          />

          {/* Fuel gauge */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-300">加油前油格位置</label>
            <div className="flex gap-1.5">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, fuel_gauge: g }))}
                  className={`flex-1 h-9 rounded text-xs font-bold transition-all ${
                    form.fuel_gauge === g
                      ? 'bg-orange-500 text-white'
                      : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500">0=E(空格) 4=半格 8=F(满格)</p>
          </div>

          {/* Fuel type */}
          <Select
            label="油品类型"
            options={fuelTypeOptions}
            value={form.fuel_type}
            onChange={e => setForm(prev => ({ ...prev, fuel_type: e.target.value as FuelType }))}
          />

          {/* Price / Liters / Amount linked */}
          <div className="bg-slate-700/50 rounded-lg p-3 space-y-3">
            <p className="text-xs text-slate-400">💡 单价 × 升数 = 金额，修改任意两个自动计算第三个</p>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input
                  label="本次加油单价"
                  type="number"
                  value={form.unit_price || ''}
                  onChange={e => handleUnitPriceChange(parseFloat(e.target.value) || 0)}
                  step="0.001"
                  min={0}
                  placeholder="元/升"
                />
              </div>
              <span className="text-slate-400 pb-2.5 text-sm">元/升</span>
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input
                  label="本次加油升数"
                  type="number"
                  value={form.liters || ''}
                  onChange={e => handleLitersChange(parseFloat(e.target.value) || 0)}
                  step="0.01"
                  min={0}
                  placeholder="升"
                />
              </div>
              <span className="text-slate-400 pb-2.5 text-sm">升</span>
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input
                  label="本次加油金额"
                  type="number"
                  value={form.total_amount || ''}
                  onChange={e => handleTotalAmountChange(parseFloat(e.target.value) || 0)}
                  step="0.01"
                  min={0}
                  placeholder="元"
                />
              </div>
              <span className="text-slate-400 pb-2.5 text-sm">元</span>
            </div>
          </div>

          {/* Station */}
          <Input
            label="加油站 (可选)"
            type="text"
            value={form.station}
            onChange={e => setForm(prev => ({ ...prev, station: e.target.value }))}
            placeholder="加油站名称"
          />

          {/* Notes */}
          <Textarea
            label="备注 (可选)"
            value={form.notes}
            onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="其他备注信息"
          />

          {/* Error message */}
          {saveError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">
              {saveError}
            </div>
          )}

          {/* Save */}
          <Button onClick={handleSave} className="w-full bg-orange-500 hover:bg-orange-600" size="lg" loading={saving}>
            保存加油记录
          </Button>
        </div>
      </div>
    </div>
  );
}
