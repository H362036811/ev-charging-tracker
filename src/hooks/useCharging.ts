import { useState, useEffect, useCallback, useRef } from 'react';
import { Vehicle, ChargingRecord, ChargingRecordInput, VehicleShare, DashboardStats } from '../types';
import { generateId } from '../lib/utils';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './useAuth';

const VEHICLES_KEY = 'ev_charging_vehicles';
const RECORDS_KEY = 'ev_charging_records';
const SHARES_KEY = 'ev_charging_shares';

function loadData<T>(key: string): T[] { try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : []; } catch { return []; } }
function saveData<T>(key: string, data: T[]) { localStorage.setItem(key, JSON.stringify(data)); }

function renumberRecords(records: ChargingRecord[], vehicleId: string) {
  records.filter(r => r.vehicle_id === vehicleId).sort((a, b) => new Date(a.charge_date).getTime() - new Date(b.charge_date).getTime()).forEach((r, i) => { r.charge_number = i + 1; });
}

async function supabaseInsert(table: string, data: any) { try { if (isSupabaseConfigured && supabase) await supabase.from(table).insert(data); } catch {} }
async function supabaseUpdate(table: string, data: any, eq: [string, string]) { try { if (isSupabaseConfigured && supabase) await supabase.from(table).update(data).eq(eq[0], eq[1]); } catch {} }
async function supabaseDelete(table: string, eq: [string, string]) { try { if (isSupabaseConfigured && supabase) await supabase.from(table).delete().eq(eq[0], eq[1]); } catch {} }

export function useCharging() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [records, setRecords] = useState<ChargingRecord[]>([]);
  const [shares, setShares] = useState<VehicleShare[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const channelRef = useRef<any>(null);

  function getUserVehicleIds(): string[] {
    const allVehicles = loadData<Vehicle>(VEHICLES_KEY);
    const allShares = loadData<VehicleShare>(SHARES_KEY);
    const sharedIds = allShares.filter(s => s.shared_with_user_id === user?.id && s.status === 'confirmed').map(s => s.vehicle_id);
    return allVehicles.filter(v => v.owner_id === user?.id || sharedIds.includes(v.id)).map(v => v.id);
  }

  function doRefreshAll() { doRefreshVehicles(); doRefreshRecords(); doRefreshShares(); }

  function doRefreshVehicles() {
    try {
      const ids = getUserVehicleIds();
      const allVehicles = loadData<Vehicle>(VEHICLES_KEY);
      const myVehicles = allVehicles.filter(v => ids.includes(v.id));
      setVehicles(myVehicles);
      if (myVehicles.length > 0 && !myVehicles.find(v => v.id === selectedVehicleId)) setSelectedVehicleId(myVehicles[0].id);
    } catch (err) { console.error('Refresh vehicles error:', err); }
  }

  function doRefreshRecords() {
    try {
      const ids = getUserVehicleIds();
      const allRecords = loadData<ChargingRecord>(RECORDS_KEY);
      const myRecords = allRecords.filter(r => ids.includes(r.vehicle_id)).sort((a, b) => new Date(b.charge_date).getTime() - new Date(a.charge_date).getTime() || b.charge_number - a.charge_number);
      setRecords(myRecords);
    } catch (err) { console.error('Refresh records error:', err); }
  }

  function doRefreshShares() {
    try {
      const allShares = loadData<VehicleShare>(SHARES_KEY);
      setShares(allShares.filter(s => s.shared_by_user_id === user?.id || s.shared_with_user_id === user?.id));
    } catch (err) { console.error('Refresh shares error:', err); }
  }

  useEffect(() => {
    if (!user) { setVehicles([]); setRecords([]); setShares([]); setSelectedVehicleId(''); return; }
    try { doRefreshAll(); } catch (err) { console.error('Load data error:', err); }
  }, [user?.id]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !user) return;
    try {
      const channel = supabase.channel('ev-charging-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ev_charging_records' }, () => doRefreshRecords())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ev_vehicles' }, () => doRefreshVehicles())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ev_vehicle_shares' }, () => doRefreshShares())
        .subscribe();
      channelRef.current = channel;
    } catch (err) { console.error('Realtime error:', err); }
    return () => { try { if (channelRef.current && supabase) { supabase.removeChannel(channelRef.current); channelRef.current = null; } } catch {} };
  }, [user?.id]);

  const addVehicle = useCallback(async (name: string, brand: string = '', model: string = '') => {
    if (!user) return;
    const vehicle: Vehicle = { id: generateId(), name, brand, model, owner_id: user.id, created_at: new Date().toISOString() };
    const all = loadData<Vehicle>(VEHICLES_KEY); all.push(vehicle); saveData(VEHICLES_KEY, all);
    await supabaseInsert('ev_vehicles', { id: vehicle.id, name, brand, model, owner_id: user.id, created_at: vehicle.created_at });
    doRefreshVehicles(); setSelectedVehicleId(vehicle.id); return vehicle;
  }, [user]);

  const deleteVehicle = useCallback(async (vehicleId: string) => {
    saveData(VEHICLES_KEY, loadData<Vehicle>(VEHICLES_KEY).filter(v => v.id !== vehicleId));
    saveData(RECORDS_KEY, loadData<ChargingRecord>(RECORDS_KEY).filter(r => r.vehicle_id !== vehicleId));
    saveData(SHARES_KEY, loadData<VehicleShare>(SHARES_KEY).filter(s => s.vehicle_id !== vehicleId));
    await supabaseDelete('ev_vehicles', ['id', vehicleId]); doRefreshAll();
  }, []);

  const addRecord = useCallback(async (input: ChargingRecordInput) => {
    if (!user) return;
    const allRecords = loadData<ChargingRecord>(RECORDS_KEY);
    const vRecs = allRecords.filter(r => r.vehicle_id === input.vehicle_id).sort((a, b) => new Date(a.charge_date).getTime() - new Date(b.charge_date).getTime());
    let chargeNumber = input.charge_number || (vRecs.filter(r => new Date(r.charge_date) < new Date(input.charge_date)).length + 1);
    const record: ChargingRecord = { id: generateId(), vehicle_id: input.vehicle_id, user_id: user.id, charge_date: input.charge_date, odometer_km: input.odometer_km, charge_duration_hours: input.charge_duration_hours, charge_cost: input.charge_cost, distance_since_last_km: input.distance_since_last_km, charge_number: chargeNumber, station: input.station, notes: input.notes, created_at: new Date().toISOString() };
    allRecords.push(record); renumberRecords(allRecords, input.vehicle_id); saveData(RECORDS_KEY, allRecords);
    await supabaseInsert('ev_charging_records', record); doRefreshRecords(); return record;
  }, [user]);

  const updateRecord = useCallback(async (id: string, input: Partial<ChargingRecordInput>) => {
    const allRecords = loadData<ChargingRecord>(RECORDS_KEY); const idx = allRecords.findIndex(r => r.id === id); if (idx === -1) return;
    allRecords[idx] = { ...allRecords[idx], ...input }; if (input.charge_date) renumberRecords(allRecords, allRecords[idx].vehicle_id);
    saveData(RECORDS_KEY, allRecords); await supabaseUpdate('ev_charging_records', input, ['id', id]); doRefreshRecords();
  }, []);

  const deleteRecord = useCallback(async (id: string) => {
    const allRecords = loadData<ChargingRecord>(RECORDS_KEY); const rec = allRecords.find(r => r.id === id);
    const filtered = allRecords.filter(r => r.id !== id); if (rec) renumberRecords(filtered, rec.vehicle_id);
    saveData(RECORDS_KEY, filtered); await supabaseDelete('ev_charging_records', ['id', id]); doRefreshRecords();
  }, []);

  const getLastRecord = useCallback((vehicleId: string): ChargingRecord | null => {
    return loadData<ChargingRecord>(RECORDS_KEY).filter(r => r.vehicle_id === vehicleId).sort((a, b) => new Date(b.charge_date).getTime() - new Date(a.charge_date).getTime())[0] || null;
  }, []);

  const getNextChargeNumber = useCallback((vehicleId: string): number => loadData<ChargingRecord>(RECORDS_KEY).filter(r => r.vehicle_id === vehicleId).length + 1, []);

  const shareVehicle = useCallback(async (vehicleId: string, targetUserId: string) => {
    if (!user) return;
    const allShares = loadData<VehicleShare>(SHARES_KEY);
    if (allShares.find(s => s.vehicle_id === vehicleId && s.shared_with_user_id === targetUserId)) return;
    const share: VehicleShare = { id: generateId(), vehicle_id: vehicleId, shared_with_user_id: targetUserId, shared_by_user_id: user.id, status: 'pending', created_at: new Date().toISOString() };
    allShares.push(share); saveData(SHARES_KEY, allShares);
    await supabaseInsert('ev_vehicle_shares', share); doRefreshShares(); return share;
  }, [user]);

  const respondToShare = useCallback(async (shareId: string, response: 'confirmed' | 'rejected') => {
    const allShares = loadData<VehicleShare>(SHARES_KEY); const idx = allShares.findIndex(s => s.id === shareId); if (idx === -1) return;
    allShares[idx].status = response; saveData(SHARES_KEY, allShares);
    await supabaseUpdate('ev_vehicle_shares', { status: response }, ['id', shareId]); doRefreshAll();
  }, []);

  const getStats = useCallback((): DashboardStats => {
    const vr = records.filter(r => r.vehicle_id === selectedVehicleId);
    return { totalCost: vr.reduce((s, r) => s + r.charge_cost, 0), totalCount: vr.length, totalDuration: vr.reduce((s, r) => s + r.charge_duration_hours, 0), totalDistance: vr.reduce((s, r) => s + r.distance_since_last_km, 0) };
  }, [records, selectedVehicleId]);

  const exportData = useCallback(() => JSON.stringify({ vehicles: loadData<Vehicle>(VEHICLES_KEY), records: loadData<ChargingRecord>(RECORDS_KEY), shares: loadData<VehicleShare>(SHARES_KEY), exportedAt: new Date().toISOString(), exportedBy: user?.username }, null, 2), [user]);

  const importData = useCallback((jsonStr: string) => {
    try {
      const data = JSON.parse(jsonStr);
      if (data.vehicles) { const e = loadData<Vehicle>(VEHICLES_KEY); saveData(VEHICLES_KEY, [...e, ...data.vehicles.filter((v: Vehicle) => !e.find(x => x.id === v.id))]); }
      if (data.records) { const e = loadData<ChargingRecord>(RECORDS_KEY); saveData(RECORDS_KEY, [...e, ...data.records.filter((r: ChargingRecord) => !e.find(x => x.id === r.id))]); }
      if (data.shares) { const e = loadData<VehicleShare>(SHARES_KEY); saveData(SHARES_KEY, [...e, ...data.shares.filter((s: VehicleShare) => !e.find(x => x.id === s.id))]); }
      doRefreshAll(); return true;
    } catch { return false; }
  }, []);

  const syncFromCloud = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase || !user) return;
    try {
      const [vRes, rRes, sRes] = await Promise.all([supabase.from('ev_vehicles').select('*'), supabase.from('ev_charging_records').select('*'), supabase.from('ev_vehicle_shares').select('*')]);
      if (vRes.data) saveData(VEHICLES_KEY, vRes.data); if (rRes.data) saveData(RECORDS_KEY, rRes.data); if (sRes.data) saveData(SHARES_KEY, sRes.data);
      doRefreshAll();
    } catch (err) { console.error('Sync failed:', err); }
  }, [user]);

  const currentVehicleRecords = records.filter(r => r.vehicle_id === selectedVehicleId);

  return { vehicles, records: currentVehicleRecords, allRecords: records, shares, selectedVehicleId, setSelectedVehicleId, addVehicle, deleteVehicle, addRecord, updateRecord, deleteRecord, getLastRecord, getNextChargeNumber, shareVehicle, respondToShare, getStats, exportData, importData, syncFromCloud, refreshData: doRefreshAll };
}