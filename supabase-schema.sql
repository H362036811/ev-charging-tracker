-- 电车充电记录 - Supabase 数据库 Schema
-- 在 Supabase SQL Editor 中执行此脚本
-- 使用 ev_ 前缀避免与已有表冲突

-- 用户配置表
CREATE TABLE IF NOT EXISTS ev_profiles (
  id TEXT PRIMARY KEY,
  email TEXT DEFAULT '',
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_by TEXT REFERENCES ev_profiles(id),
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 车辆表
CREATE TABLE IF NOT EXISTS ev_vehicles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT DEFAULT '',
  model TEXT DEFAULT '',
  owner_id TEXT NOT NULL REFERENCES ev_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 充电记录表
CREATE TABLE IF NOT EXISTS ev_charging_records (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES ev_vehicles(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES ev_profiles(id),
  charge_date DATE NOT NULL,
  odometer_km NUMERIC(10,1) DEFAULT 0,
  charge_duration_hours NUMERIC(4,1) DEFAULT 0,
  charge_cost NUMERIC(10,2) DEFAULT 0,
  distance_since_last_km NUMERIC(10,1) DEFAULT 0,
  charge_number INTEGER DEFAULT 1,
  station TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 车辆共享表
CREATE TABLE IF NOT EXISTS ev_vehicle_shares (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES ev_vehicles(id) ON DELETE CASCADE,
  shared_with_user_id TEXT NOT NULL REFERENCES ev_profiles(id),
  shared_by_user_id TEXT NOT NULL REFERENCES ev_profiles(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vehicle_id, shared_with_user_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_ev_vehicles_owner ON ev_vehicles(owner_id);
CREATE INDEX IF NOT EXISTS idx_ev_charging_records_vehicle ON ev_charging_records(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_ev_charging_records_date ON ev_charging_records(charge_date);
CREATE INDEX IF NOT EXISTS idx_ev_vehicle_shares_vehicle ON ev_vehicle_shares(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_ev_vehicle_shares_user ON ev_vehicle_shares(shared_with_user_id);

-- 关闭 RLS（简化配置，使用 anon key 访问）
-- 因为应用使用自定义 auth（不依赖 Supabase Auth），RLS 基于 auth.uid() 不可用
-- 改为在应用层控制数据访问
ALTER TABLE ev_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ev_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ev_charging_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE ev_vehicle_shares ENABLE ROW LEVEL SECURITY;

-- 简单 RLS：允许 anon key 读写所有表（应用层控制权限）
CREATE POLICY "ev_profiles readable" ON ev_profiles FOR SELECT USING (true);
CREATE POLICY "ev_profiles insertable" ON ev_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "ev_profiles updatable" ON ev_profiles FOR UPDATE USING (true);

CREATE POLICY "ev_vehicles readable" ON ev_vehicles FOR SELECT USING (true);
CREATE POLICY "ev_vehicles insertable" ON ev_vehicles FOR INSERT WITH CHECK (true);
CREATE POLICY "ev_vehicles updatable" ON ev_vehicles FOR UPDATE USING (true);
CREATE POLICY "ev_vehicles deletable" ON ev_vehicles FOR DELETE USING (true);

CREATE POLICY "ev_charging_records readable" ON ev_charging_records FOR SELECT USING (true);
CREATE POLICY "ev_charging_records insertable" ON ev_charging_records FOR INSERT WITH CHECK (true);
CREATE POLICY "ev_charging_records updatable" ON ev_charging_records FOR UPDATE USING (true);
CREATE POLICY "ev_charging_records deletable" ON ev_charging_records FOR DELETE USING (true);

CREATE POLICY "ev_vehicle_shares readable" ON ev_vehicle_shares FOR SELECT USING (true);
CREATE POLICY "ev_vehicle_shares insertable" ON ev_vehicle_shares FOR INSERT WITH CHECK (true);
CREATE POLICY "ev_vehicle_shares updatable" ON ev_vehicle_shares FOR UPDATE USING (true);

-- 启用 Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE ev_charging_records;
ALTER PUBLICATION supabase_realtime ADD TABLE ev_vehicles;
ALTER PUBLICATION supabase_realtime ADD TABLE ev_vehicle_shares;
