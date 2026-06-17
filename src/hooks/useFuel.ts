import { useState, useEffect, useCallback, useRef } from 'react';
import { Vehicle, VehicleShare, FuelRecord, FuelRecordInput, FuelDashboardStats } from '../types';
import { generateId } from '../lib/utils';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './useAuth';

const FUEL_RECORDS_KEY = 'ev_fuel_records';
const VEHICLES_KEY = 'ev_charging_vehicles';
const SHARES_KEY = 'ev_charging_shares';

function loadData<T>(key: string): T[] { try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : []; } catch { return []; } }
function saveData<T>(key: string, data: T[]) { localStorage.setItem(key, JSON.stringify(data)); }

async function supabaseInsert(table: string, data: any) { try { if (isSupabaseConfigured && supabase) { await Promise.race([ supabase.from(table).insert(data), new Promise(resolve => setTimeout(() => resolve(null), 5000)) ]); } } catch (err) { console.error('Supabase insert error:', table, err); } }
async function supabaseUpdate(table: string, data: any, eq: [string, string]) { try { if (isSupabaseConfigured && supabase) { await Promise.race([ supabase.from(table).update(data).eq(eq[0], eq[1]), new Promise(resolve => setTimeout(() => resolve(null), 5000)) ]); } } catch (err) { console.error('Supabase update error:', table, err); } }
async function supabaseDelete(table: string, eq: [string, string]) { try { if (isSupabaseConfigured && supabase) { await Promise.race([ supabase.from(table).delete().eq(eq[0], eq[1]), new Promise(resolve => setTimeout(() => resolve(null), 5000)) ]); } } catch (err) { console.error('Supabase delete error:', table, err); } }

export function useFuel() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([]);
  const [shares, setShares] = useState<VehicleShare[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const channelRef = useRef<any>(null);

  function getUserVehicleIds(): string[] {
    const allVehicles = loadData<Vehicle>(VEHICLES_KEY);
    const allShares = loadData<VehicleShare>(SHARES_KEY);
    const sharedIds = allShares.filter(s => s.shared_with_user_id === user?.id && s.status === 'confirmed').map(s => s.vehicle_id);
    return allVehicles.filter(v => v.owner_id === user?.id || sharedIds.includes(v.id)).map(v => v.id);
  }

  function doRefreshVehicles() {
    try {
      const ids = getUserVehicleIds();
      const allVehicles = loadData<Vehicle>(VEHICLES_KEY);
      const myVehicles = allVehicles.filter(v => ids.includes(v.id));
      setVehicles(myVehicles);
      if (myVehicles.length > 0 && !myVehicles.find(v => v.id === selectedVehicleId)) {
        setSelectedVehicleId(myVehicles[0].id);
      }
    } catch (err) { console.error('Fuel refresh vehicles error:', err); }
  }

  function doRefreshFuelRecords() {
    try {
      const ids = getUserVehicleIds();
      const allRecords = loadData<FuelRecord>(FUEL_RECORDS_KEY);
      const myRecords = allRecords
        .filter(r => ids.includes(r.vehicle_id))
        .sort((a, b) => new Date(b.fuel_date).getTime() - new Date(a.fuel_date).getTime());
      setFuelRecords(myRecords);
    } catch (err) { console.error('Fuel refresh records error:', err); }
  }

  function doRefreshShares() {
    try {
      const allShares = loadData<VehicleShare>(SHARES_KEY);
      setShares(allShares.filter(s => s.shared_by_user_id === user?.id || s.shared_with_user_id === user?.id));
    } catch (err) { console.error('Fuel refresh shares error:', err); }
  }

  function doRefreshAll() { doRefreshVehicles(); doRefreshFuelRecords(); doRefreshShares(); }

  useEffect(() => {
    if (!user) { setVehicles([]); setFuelRecords([]); setShares([]); setSelectedVehicleId(''); return; }
    try { doRefreshAll(); } catch (err) { console.error('Fuel load data error:', err); }
  }, [user?.id]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !user) return;
    try {
      const channel = supabase.channel('ev-fuel-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ev_fuel_records' }, () => doRefreshFuelRecords())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ev_vehicles' }, () => doRefreshVehicles())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ev_vehicle_shares' }, () => doRefreshShares())
        .subscribe();
      channelRef.current = channel;
    } catch (err) { console.error('Fuel realtime error:', err); }
    return () => { try { if (channelRef.current && supabase) { supabase.removeChannel(channelRef.current); channelRef.current = null; } } catch {} };
  }, [user?.id]);

  const addFuelRecord = useCallback(async (input: FuelRecordInput) => {
    if (!user) { console.error('addFuelRecord: no user'); return undefined; }
    try {
      const record: FuelRecord = {
        id: generateId(),
        vehicle_id: input.vehicle_id,
        user_id: user.id,
        fuel_date: input.fuel_date,
        odometer_km: input.odometer_km,
        fuel_gauge: input.fuel_gauge,
        fuel_type: input.fuel_type,
        unit_price: input.unit_price,
        total_amount: input.total_amount,
        liters: input.liters,
        distance_since_last_km: input.distance_since_last_km,
        station: input.station,
        notes: input.notes,
        created_at: new Date().toISOString(),
      };
      const allRecords = loadData<FuelRecord>(FUEL_RECORDS_KEY);
      allRecords.push(record);
      saveData(FUEL_RECORDS_KEY, allRecords);
      doRefreshFuelRecords();
      supabaseInsert('ev_fuel_records', record).catch(() => {});
      return record;
    } catch (err) {
      console.error('addFuelRecord error:', err);
      return undefined;
    }
  }, [user]);

  const updateFuelRecord = useCallback(async (id: string, input: Partial<FuelRecordInput>) => {
    try {
      const allRecords = loadData<FuelRecord>(FUEL_RECORDS_KEY);
      const idx = allRecords.findIndex(r => r.id === id);
      if (idx === -1) return;
      allRecords[idx] = { ...allRecords[idx], ...input };
      saveData(FUEL_RECORDS_KEY, allRecords);
      doRefreshFuelRecords();
      supabaseUpdate('ev_fuel_records', input, ['id', id]).catch(() => {});
    } catch (err) { console.error('updateFuelRecord error:', err); }
  }, []);

  const deleteFuelRecord = useCallback(async (id: string) => {
    try {
      const allRecords = loadData<FuelRecord>(FUEL_RECORDS_KEY);
      saveData(FUEL_RECORDS_KEY, allRecords.filter(r => r.id !== id));
      doRefreshFuelRecords();
      supabaseDelete('ev_fuel_records', ['id', id]).catch(() => {});
    } catch (err) { console.error('deleteFuelRecord error:', err); }
  }, []);

  const getLastFuelRecord = useCallback((vehicleId: string): FuelRecord | null => {
    return loadData<FuelRecord>(FUEL_RECORDS_KEY)
      .filter(r => r.vehicle_id === vehicleId)
      .sort((a, b) => new Date(b.fuel_date).getTime() - new Date(a.fuel_date).getTime())[0] || null;
  }, []);

  const getFuelStats = useCallback((): FuelDashboardStats => {
    const vr = fuelRecords.filter(r => r.vehicle_id === selectedVehicleId);
    const totalAmount = vr.reduce((s, r) => s + r.total_amount, 0);
    const totalLiters = vr.reduce((s, r) => s + r.liters, 0);
    const totalDistance = vr.reduce((s, r) => s + r.distance_since_last_km, 0);
    const avgConsumption = totalDistance > 0 ? (totalLiters / totalDistance) * 100 : 0;
    return { totalAmount, totalCount: vr.length, totalLiters, avgConsumption };
  }, [fuelRecords, selectedVehicleId]);

  const syncFromCloud = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase || !user) return;
    try {
      const rRes = await supabase.from('ev_fuel_records').select('*');
      if (rRes.data) saveData(FUEL_RECORDS_KEY, rRes.data);
      doRefreshFuelRecords();
    } catch (err) { console.error('Fuel sync failed:', err); }
  }, [user]);

  const currentVehicleFuelRecords = fuelRecords.filter(r => r.vehicle_id === selectedVehicleId);

  return {
    vehicles,
    fuelRecords: currentVehicleFuelRecords,
    allFuelRecords: fuelRecords,
    shares,
    selectedVehicleId,
    setSelectedVehicleId,
    addFuelRecord,
    updateFuelRecord,
    deleteFuelRecord,
    getLastFuelRecord,
    getFuelStats,
    syncFromCloud,
    refreshData: doRefreshAll,
  };
}
