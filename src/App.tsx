import { useState, useEffect, Component, ReactNode } from 'react';
import { useAuth, AuthProvider } from './hooks/useAuth';
import { Profile, ChargingRecord, FuelRecord } from './types';
import { LoginPage } from './components/LoginPage';
import { ChargingRecords } from './components/ChargingRecords';
import { AddRecordModal } from './components/AddRecordModal';
import { VehicleManager } from './components/VehicleManager';
import { AdminPanel } from './components/AdminPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { FuelRecords } from './components/FuelRecords';
import { AddFuelModal } from './components/AddFuelModal';
import { Card, CardContent } from './components/ui/card';

type Module = 'home' | 'charging' | 'fuel';
type SubTab = 'records' | 'vehicles' | 'admin' | 'settings';

interface NavItem {
  tab: SubTab;
  label: string;
  icon: string;
  adminOnly: boolean;
}

const VEHICLE_ICON = 'M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V5.625c0-.621.504-1.125 1.125-1.125h13.546c.44 0 .836.256 1.02.656l2.07 4.376a1.125 1.125 0 01.09.476v6.068a1.125 1.125 0 01-1.125 1.125H19.5m-1.5-6.75H16.5';
const ADMIN_ICON = 'M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z';
const SETTINGS_ICON = 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z';

const CHARGING_NAV_ITEMS: NavItem[] = [
  { tab: 'records', label: '充电记录', icon: 'M13 10V3L4 14h7v7l9-11h-7z', adminOnly: false },
  { tab: 'vehicles', label: '我的车辆', icon: VEHICLE_ICON, adminOnly: false },
  { tab: 'admin', label: '用户管理', icon: ADMIN_ICON, adminOnly: true },
  { tab: 'settings', label: '设置', icon: SETTINGS_ICON, adminOnly: false },
];

const FUEL_NAV_ITEMS: NavItem[] = [
  { tab: 'records', label: '油耗记录', icon: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z', adminOnly: false },
  { tab: 'vehicles', label: '我的车辆', icon: VEHICLE_ICON, adminOnly: false },
  { tab: 'admin', label: '用户管理', icon: ADMIN_ICON, adminOnly: true },
  { tab: 'settings', label: '设置', icon: SETTINGS_ICON, adminOnly: false },
];

// Error Boundary
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: string }> {
  state = { hasError: false, error: '' };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error: error?.message || String(error) };
  }

  componentDidCatch(error: any, info: any) {
    console.error('App error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 max-w-sm text-center">
            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-red-400 text-xl">!</span>
            </div>
            <h2 className="text-lg font-bold text-white mb-2">出错了</h2>
            <p className="text-sm text-slate-400 mb-4">{this.state.error}</p>
            <button
              onClick={() => { this.setState({ hasError: false, error: '' }); localStorage.clear(); window.location.reload(); }}
              className="bg-sky-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-sky-600"
            >
              重置并刷新
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Subsystem layout component
interface SubsystemLayoutProps {
  title: string;
  headerIconPath: string;
  headerBgColor: string;
  activeTab: SubTab;
  setActiveTab: (tab: SubTab) => void;
  user: Profile;
  onBack: () => void;
  navItems: NavItem[];
  children: ReactNode;
}

function SubsystemLayout({ title, headerIconPath, headerBgColor, activeTab, setActiveTab, user, onBack, navItems, children }: SubsystemLayoutProps) {
  const visibleNavItems = navItems.filter(item => !item.adminOnly || user.role === 'admin');

  // Fix: if current tab is admin and user is not admin, redirect to records
  useEffect(() => {
    if (activeTab === 'admin' && user.role !== 'admin') {
      setActiveTab('records');
    }
  }, [activeTab, user.role]);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-800/95 backdrop-blur border-b border-slate-700">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="text-slate-400 hover:text-white p-1 -ml-1 rounded-lg hover:bg-slate-700 transition-colors" title="返回首页">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className={`w-8 h-8 ${headerBgColor} rounded-lg flex items-center justify-center`}>
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d={headerIconPath} />
              </svg>
            </div>
            <h1 className="text-lg font-bold text-white">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">{user.username}</span>
            {user.role === 'admin' && <span className="text-xs bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">管理员</span>}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 pb-24">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-800/95 backdrop-blur border-t border-slate-700">
        <div className="max-w-lg mx-auto flex">
          {visibleNavItems.map((item) => (
            <button
              key={item.tab}
              onClick={() => setActiveTab(item.tab)}
              className={`flex-1 flex flex-col items-center py-2 transition-colors ${
                activeTab === item.tab ? 'text-sky-400' : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              <span className="text-[10px] mt-0.5">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

function AppContent() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [module, setModule] = useState<Module>('home');

  // Charging subsystem state
  const [chargingTab, setChargingTab] = useState<SubTab>('records');
  const [showAddChargingModal, setShowAddChargingModal] = useState(false);
  const [editChargingRecord, setEditChargingRecord] = useState<ChargingRecord | null>(null);

  // Fuel subsystem state
  const [fuelTab, setFuelTab] = useState<SubTab>('records');
  const [showAddFuelModal, setShowAddFuelModal] = useState(false);
  const [editFuelRecord, setEditFuelRecord] = useState<FuelRecord | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-400 border-t-transparent mx-auto" />
          <p className="mt-4 text-slate-400">加载中...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <LoginPage />;
  }

  // ============ HOME MODULE ============
  if (module === 'home') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col">
        <header className="bg-slate-800/95 border-b border-slate-700 px-4 py-3">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <h1 className="text-lg font-bold text-white">车辆管理系统</h1>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">{user.username}</span>
              {user.role === 'admin' && <span className="text-xs bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">管理员</span>}
            </div>
          </div>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-lg mx-auto w-full">
          <div className="w-full space-y-4">
            <p className="text-center text-slate-400 text-sm mb-6">请选择功能模块</p>

            {/* EV Charging entry */}
            <Card
              className="cursor-pointer hover:border-sky-500 transition-all active:scale-95"
              onClick={() => setModule('charging')}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-sky-500/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-7 h-7 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-base font-bold text-white">电车充电记录</h2>
                    <p className="text-sm text-slate-400 mt-0.5">充电费用、时长、里程统计</p>
                  </div>
                  <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </CardContent>
            </Card>

            {/* Fuel consumption entry */}
            <Card
              className="cursor-pointer hover:border-orange-500 transition-all active:scale-95"
              onClick={() => setModule('fuel')}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-orange-500/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-7 h-7 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-base font-bold text-white">汽车油耗统计</h2>
                    <p className="text-sm text-slate-400 mt-0.5">加油费用、升数、平均油耗</p>
                  </div>
                  <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  // ============ CHARGING SUBSYSTEM ============
  if (module === 'charging') {
    return (
      <SubsystemLayout
        title="充电记录"
        headerIconPath="M13 10V3L4 14h7v7l9-11h-7z"
        headerBgColor="bg-sky-500"
        activeTab={chargingTab}
        setActiveTab={setChargingTab}
        user={user}
        onBack={() => setModule('home')}
        navItems={CHARGING_NAV_ITEMS}
      >
        {chargingTab === 'records' && (
          <ChargingRecords
            onAddRecord={() => { setEditChargingRecord(null); setShowAddChargingModal(true); }}
            onEditRecord={(record) => { setEditChargingRecord(record); setShowAddChargingModal(true); }}
          />
        )}
        {chargingTab === 'vehicles' && <VehicleManager />}
        {chargingTab === 'admin' && user.role === 'admin' && <AdminPanel />}
        {chargingTab === 'settings' && <SettingsPanel />}
        <AddRecordModal
          isOpen={showAddChargingModal}
          onClose={() => { setShowAddChargingModal(false); setEditChargingRecord(null); }}
          editRecord={editChargingRecord}
        />
      </SubsystemLayout>
    );
  }

  // ============ FUEL SUBSYSTEM ============
  return (
    <SubsystemLayout
      title="油耗记录"
      headerIconPath="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
      headerBgColor="bg-orange-500"
      activeTab={fuelTab}
      setActiveTab={setFuelTab}
      user={user}
      onBack={() => setModule('home')}
      navItems={FUEL_NAV_ITEMS}
    >
      {fuelTab === 'records' && (
        <FuelRecords
          onAddRecord={() => { setEditFuelRecord(null); setShowAddFuelModal(true); }}
          onEditRecord={(record) => { setEditFuelRecord(record); setShowAddFuelModal(true); }}
        />
      )}
      {fuelTab === 'vehicles' && <VehicleManager />}
      {fuelTab === 'admin' && user.role === 'admin' && <AdminPanel />}
      {fuelTab === 'settings' && <SettingsPanel />}
      <AddFuelModal
        isOpen={showAddFuelModal}
        onClose={() => { setShowAddFuelModal(false); setEditFuelRecord(null); }}
        editRecord={editFuelRecord}
      />
    </SubsystemLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
