import { useState, useEffect, useCallback } from 'react';
import { Vehicle, ChargingRecord, ChargingRecordInput, VehicleShare, DashboardStats } from '../types';
import { generateId } from '../lib/utils';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './useAuth';

const VEHICLES_KEY = 'ev_charging_vehicles';
const RECORDS_KEY = 'ev_charging_records';
const SHARES_KEY = 'ev_charging_shares';

function loadData<T>(key: string): T[] {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function saveData<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

export function useCharging() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [records, setRecords] = useState<ChargingRecord[]>([]);
  const [shares, setShares] = useState<VehicleShare[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');

  // Load data on mount and when user changes
  useEffect(() => {
    if (!user) {
      setVehicles([]);
      setRecords([]);
      setShares([]);
      return;
    }
    refreshData();
  }, [user?.id]);

  // Subscribe to Supabase realtime changes
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !user) return;

    const channel = supabase
      .channel('ev-charging-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ev_charging_records' }, () => {
        refreshRecords();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ev_vehicles' }, () => {
        refreshVehicles();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ev_vehicle_shares' }, () => {
        refreshShares();
      })
      .subscribe();

    return () => {
      if (supabase) supabase.removeChannel(channel);
    };
  }, [user?.id]);

  function refreshData() {
    refreshVehicles();
    refreshRecords();
    refreshShares();
  }

  function refreshVehicles() {
    const allVehicles = loadData<Vehicle>(VEHICLES_KEY);
    // Get vehicles owned by user or shared with user
    const userShares = loadData<VehicleShare>(SHARES_KEY).filter(
      s => s.shared_with_user_id === user?.id && s.status === 'confirmed'
    );
    const sharedVehicleIds = userShares.map(s => s.vehicle_id);
    const myVehicles = allVehicles.filter(
      v => v.owner_id === user?.id || sharedVehicleIds.includes(v.id)
    );
    setVehicles(myVehicles);
    if (myVehicles.length > 0 && !myVehicles.find(v => v.id === selectedVehicleId)) {
      setSelectedVehicleId(myVehicles[0].id);
    }
  }

  function refreshRecords() {
    const allRecords = loadData<ChargingRecord>(RECORDS_KEY);
    const myVehicleIds = vehicles.map(v => v.id);
    const myRecords = allRecords
      .filter(r => myVehicleIds.includes(r.vehicle_id))
      .sort((a, b) => new Date(b.charge_date).getTime() - new Date(a.charge_date).getTime() || b.charge_number - a.charge_number);
    setRecords(myRecords);
  }

  function refreshShares() {
    const allShares = loadData<VehicleShare>(SHARES_KEY);
    // Show shares where user is the sharer or the recipient
    const relevantShares = allShares.filter(
      s => s.shared_by_user_id === user?.id || s.shared_with_user_id === user?.id
    );
    setShares(relevantShares);
  }

  // === Vehicle CRUD ===
  const addVehicle = useCallback(async (name: string, brand: string = '', model: string = '') => {
    if (!user) return;
    const vehicle: Vehicle = {
      id: generateId(),
      name,
      brand,
      model,
      owner_id: user.id,
      created_at: new Date().toISOString(),
    };
    const allVehicles = loadData<Vehicle>(VEHICLES_KEY);
    allVehicles.push(vehicle);
    saveData(VEHICLES_KEY, allVehicles);
    if (isSupabaseConfigured && supabase) {
      await supabase.from('ev_vehicles').insert({
        id: vehicle.id, name, brand, model, owner_id: user.id, created_at: vehicle.created_at,
      });
    }
    refreshVehicles();
    setSelectedVehicleId(vehicle.id);
    return vehicle;
  }, [user]);

  const deleteVehicle = useCallback(async (vehicleId: string) => {
    const allVehicles = loadData<Vehicle>(VEHICLES_KEY).filter(v => v.id !== vehicleId);
    saveData(VEHICLES_KEY, allVehicles);
    // Delete related records
    const allRecords = loadData<ChargingRecord>(RECORDS_KEY).filter(r => r.vehicle_id !== vehicleId);
    saveData(RECORDS_KEY, allRecords);
    // Delete related shares
    const allShares = loadData<VehicleShare>(SHARES_KEY).filter(s => s.vehicle_id !== vehicleId);
    saveData(SHARES_KEY, allShares);
    if (isSupabaseConfigured && supabase) {
      await supabase.from('ev_vehicles').delete().eq('id', vehicleId);
    }
    refreshData();
  }, []);

  // === Charging Record CRUD ===
  const addRecord = useCallback(async (input: ChargingRecordInput) => {
    if (!user) return;
    const allRecords = loadData<ChargingRecord>(RECORDS_KEY);

    // Auto-calculate charge_number based on date order
    const vehicleRecords = allRecords
      .filter(r => r.vehicle_id === input.vehicle_id)
      .sort((a, b) => new Date(a.charge_date).getTime() - new Date(b.charge_date).getTime());

    // Find the position where this record should be inserted
    let chargeNumber = input.charge_number;
    if (!chargeNumber) {
      // Auto-assign: count records before this date + 1
      const recordsBefore = vehicleRecords.filter(
        r => new Date(r.charge_date) < new Date(input.charge_date)
      );
      chargeNumber = recordsBefore.length + 1;
    }

    const record: ChargingRecord = {
      id: generateId(),
      vehicle_id: input.vehicle_id,
      user_id: user.id,
      charge_date: input.charge_date,
      odometer_km: input.odometer_km,
      charge_duration_hours: input.charge_duration_hours,
      charge_cost: input.charge_cost,
      distance_since_last_km: input.distance_since_last_km,
      charge_number: chargeNumber,
      station: input.station,
      notes: input.notes,
      created_at: new Date().toISOString(),
    };
    allRecords.push(record);

    // Re-number all records for this vehicle based on date order
    renumberRecords(allRecords, input.vehicle_id);
    saveData(RECORDS_KEY, allRecords);

    if (isSupabaseConfigured && supabase) {
      await supabase.from('ev_charging_records').insert({
        id: record.id, vehicle_id: record.vehicle_id, user_id: record.user_id,
        charge_date: record.charge_date, odometer_km: record.odometer_km,
        charge_duration_hours: record.charge_duration_hours, charge_cost: record.charge_cost,
        distance_since_last_km: record.distance_since_last_km, charge_number: record.charge_number,
        station: record.station, notes: record.notes, created_at: record.created_at,
      });
    }
    refreshRecords();
    return record;
  }, [user]);

  const updateRecord = useCallback(async (id: string, input: Partial<ChargingRecordInput>) => {
    const allRecords = loadData<ChargingRecord>(RECORDS_KEY);
    const idx = allRecords.findIndex(r => r.id === id);
    if (idx === -1) return;
    allRecords[idx] = { ...allRecords[idx], ...input };
    // Re-number if date changed
    if (input.charge_date) {
      renumberRecords(allRecords, allRecords[idx].vehicle_id);
    }
    saveData(RECORDS_KEY, allRecords);
    if (isSupabaseConfigured && supabase) {
      await supabase.from('ev_charging_records').update(input).eq('id', id);
    }
    refreshRecords();
  }, []);

  const deleteRecord = useCallback(async (id: string) => {
    const allRecords = loadData<ChargingRecord>(RECORDS_KEY);
    const record = allRecords.find(r => r.id === id);
    const filtered = allRecords.filter(r => r.id !== id);
    if (record) {
      renumberRecords(filtered, record.vehicle_id);
    }
    saveData(RECORDS_KEY, filtered);
    if (isSupabaseConfigured && supabase) {
      await supabase.from('ev_charging_records').delete().eq('id', id);
    }
    refreshRecords();
  }, []);

  function renumberRecords(records: ChargingRecord[], vehicleId: string) {
    const vehicleRecords = records
      .filter(r => r.vehicle_id === vehicleId)
      .sort((a, b) => new Date(a.charge_date).getTime() - new Date(b.charge_date).getTime());
    vehicleRecords.forEach((r, i) => {
      r.charge_number = i + 1;
    });
  }

  // === Get last record for auto-fill ===
  const getLastRecord = useCallback((vehicleId: string): ChargingRecord | null => {
    const allRecords = loadData<ChargingRecord>(RECORDS_KEY);
    const vehicleRecords = allRecords
      .filter(r => r.vehicle_id === vehicleId)
      .sort((a, b) => new Date(b.charge_date).getTime() - new Date(a.charge_date).getTime());
    return vehicleRecords[0] || null;
  }, []);

  const getNextChargeNumber = useCallback((vehicleId: string): number => {
    const allRecords = loadData<ChargingRecord>(RECORDS_KEY);
    const vehicleRecords = allRecords.filter(r => r.vehicle_id === vehicleId);
    return vehicleRecords.length + 1;
  }, []);

  // === Vehicle Sharing ===
  const shareVehicle = useCallback(async (vehicleId: string, targetUserId: string) => {
    if (!user) return;
    const allShares = loadData<VehicleShare>(SHARES_KEY);
    // Check if already shared
    const existing = allShares.find(
      s => s.vehicle_id === vehicleId && s.shared_with_user_id === targetUserId
    );
    if (existing) return existing;

    const share: VehicleShare = {
      id: generateId(),
      vehicle_id: vehicleId,
      shared_with_user_id: targetUserId,
      shared_by_user_id: user.id,
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    allShares.push(share);
    saveData(SHARES_KEY, allShares);
    if (isSupabaseConfigured && supabase) {
      await supabase.from('ev_vehicle_shares').insert({
        id: share.id, vehicle_id: vehicleId, shared_with_user_id: targetUserId,
        shared_by_user_id: user.id, status: 'pending', created_at: share.created_at,
      });
    }
    refreshShares();
    return share;
  }, [user]);

  const respondToShare = useCallback(async (shareId: string, response: 'confirmed' | 'rejected') => {
    const allShares = loadData<VehicleShare>(SHARES_KEY);
    const idx = allShares.findIndex(s => s.id === shareId);
    if (idx === -1) return;
    allShares[idx].status = response;
    saveData(SHARES_KEY, allShares);
    if (isSupabaseConfigured && supabase) {
      await supabase.from('ev_vehicle_shares').update({ status: response }).eq('id', shareId);
    }
    refreshData(); // Refresh all data since confirmed shares change visible vehicles
  }, []);

  // === Stats ===
  const getStats = useCallback((): DashboardStats => {
    const vehicleRecords = records.filter(r => r.vehicle_id === selectedVehicleId);
    return {
      totalCost: vehicleRecords.reduce((sum, r) => sum + r.charge_cost, 0),
      totalCount: vehicleRecords.length,
      totalDuration: vehicleRecords.reduce((sum, r) => sum + r.charge_duration_hours, 0),
      totalDistance: vehicleRecords.reduce((sum, r) => sum + r.distance_since_last_km, 0),
    };
  }, [records, selectedVehicleId]);

  // === Data Export/Import ===
  const exportData = useCallback(() => {
    const data = {
      vehicles: loadData<Vehicle>(VEHICLES_KEY),
      records: loadData<ChargingRecord>(RECORDS_KEY),
      shares: loadData<VehicleShare>(SHARES_KEY),
      exportedAt: new Date().toISOString(),
      exportedBy: user?.username,
    };
    return JSON.stringify(data, null, 2);
  }, [user]);

  const importData = useCallback((jsonStr: string) => {
    try {
      const data = JSON.parse(jsonStr);
      if (data.vehicles) {
        const existing = loadData<Vehicle>(VEHICLES_KEY);
        const newVehicles = data.vehicles.filter(
          (v: Vehicle) => !existing.find(e => e.id === v.id)
        );
        saveData(VEHICLES_KEY, [...existing, ...newVehicles]);
      }
      if (data.records) {
        const existing = loadData<ChargingRecord>(RECORDS_KEY);
        const newRecords = data.records.filter(
          (r: ChargingRecord) => !existing.find(e => e.id === r.id)
        );
        saveData(RECORDS_KEY, [...existing, ...newRecords]);
      }
      if (data.shares) {
        const existing = loadData<VehicleShare>(SHARES_KEY);
        const newShares = data.shares.filter(
          (s: VehicleShare) => !existing.find(e => e.id === s.id)
        );
        saveData(SHARES_KEY, [...existing, ...newShares]);
      }
      refreshData();
      return true;
    } catch {
      return false;
    }
  }, []);

  // Sync from Supabase
  const syncFromCloud = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase || !user) return;
    try {
      const [vehiclesRes, recordsRes, sharesRes] = await Promise.all([
        supabase.from('ev_vehicles').select('*'),
        supabase.from('ev_charging_records').select('*'),
        supabase.from('ev_vehicle_shares').select('*'),
      ]);
      if (vehiclesRes.data) saveData(VEHICLES_KEY, vehiclesRes.data);
      if (recordsRes.data) saveData(RECORDS_KEY, recordsRes.data);
      if (sharesRes.data) saveData(SHARES_KEY, sharesRes.data);
      refreshData();
    } catch (err) {
      console.error('Sync failed:', err);
    }
  }, [user]);

  const currentVehicleRecords = records.filter(r => r.vehicle_id === selectedVehicleId);

  return {
    vehicles,
    records: currentVehicleRecords,
    allRecords: records,
    shares,
    selectedVehicleId,
    setSelectedVehicleId,
    addVehicle,
    deleteVehicle,
    addRecord,
    updateRecord,
    deleteRecord,
    getLastRecord,
    getNextChargeNumber,
    shareVehicle,
    respondToShare,
    getStats,
    exportData,
    importData,
    syncFromCloud,
    refreshData,
  };
}
