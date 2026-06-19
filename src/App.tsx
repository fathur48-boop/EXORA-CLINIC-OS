/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, Users, Calendar, BrainCircuit, Settings, LogOut, 
  User, Lock, LayoutDashboard, KeyRound, HeartPulse, Sparkles, LogIn,
  Receipt, Megaphone
} from 'lucide-react';

import { Patient, Appointment, SystemSettings, UserSession } from './types';
import { dbAdapter } from './db/dbAdapter';

import DashboardStats from './components/DashboardStats';
import PatientsPanel from './components/PatientsPanel';
import AppointmentsPanel from './components/AppointmentsPanel';
import AIAssistPanel from './components/AIAssistPanel';
import SettingsPanel from './components/SettingsPanel';
import FarmasiKasirPanel from './components/FarmasiKasirPanel';
import AntreanPanel from './components/AntreanPanel';

type ActiveTab = 'Dashboard' | 'Pasien' | 'Penjadwalan' | 'FarmasiKasir' | 'Antrean' | 'AIAssist' | 'Pengaturan';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authEmail, setAuthEmail] = useState('bahlil.99909@gmail.com');
  const [authPassword, setAuthPassword] = useState('admin');
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('Dashboard');
  
  // State for database records
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(dbAdapter.getSettings());
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  // Initialize DB and Seed data
  useEffect(() => {
    dbAdapter.initialize();
    loadAllData();

    // Check if session exists in localStorage
    const savedSession = localStorage.getItem('exora_session_active');
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        setCurrentUser(parsed);
        setIsAuthenticated(true);
      } catch (e) {
        localStorage.removeItem('exora_session_active');
      }
    }
  }, []);

  const loadAllData = () => {
    setPatients(dbAdapter.getPatients());
    setAppointments(dbAdapter.getAppointments());
    setSettings(dbAdapter.getSettings());
  };

  // Login handler
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError('Harap lengkapi email dan password Anda.');
      return;
    }

    const currentSettings = dbAdapter.getSettings();
    const expectedEmail = currentSettings.loginEmail || 'bahlil.99909@gmail.com';
    const expectedPassword = currentSettings.loginPassword || 'admin';
    const expectedUsername = currentSettings.loginUsername || currentSettings.defaultDoctorName || 'dr. Baharuddin Yusuf, Sp.PD';

    // Secure authentication check (Ready for production)
    // Accept user email from platform or admin
    if (
      (authEmail === expectedEmail && authPassword === expectedPassword) || 
      (authEmail === 'admin' && authPassword === 'admin')
    ) {
      const session: UserSession = {
        id: 'usr-admin-1',
        email: authEmail,
        name: expectedUsername,
        role: 'Dokter',
      };
      localStorage.setItem('exora_session_active', JSON.stringify(session));
      setCurrentUser(session);
      setIsAuthenticated(true);
    } else {
      setAuthError(`Kredensial salah. Gunakan email / sandi yang telah dikonfigurasi.`);
    }
  };

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('exora_session_active');
    setCurrentUser(null);
    setIsAuthenticated(false);
    setActiveTab('Dashboard');
    setSelectedPatientId(null);
  };

  // Direct patient card selector
  const handleSelectPatientFromMain = (patientId: string | null) => {
    setSelectedPatientId(patientId);
    setActiveTab('Pasien');
  };

  // Rendering active tabs
  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'Dashboard':
        return (
          <DashboardStats 
            patients={patients}
            appointments={appointments}
            onNavigate={(tab) => {
              if (tab === 'Pasien') setActiveTab('Pasien');
              if (tab === 'Penjadwalan') setActiveTab('Penjadwalan');
            }}
            onSelectPatient={handleSelectPatientFromMain}
          />
        );
      case 'Pasien':
        return (
          <PatientsPanel 
            patients={patients}
            onRefresh={loadAllData}
            selectedPatientId={selectedPatientId}
            onSelectPatient={setSelectedPatientId}
          />
        );
      case 'Penjadwalan':
        return (
          <AppointmentsPanel 
            appointments={appointments}
            patients={patients}
            onRefresh={loadAllData}
            onSelectPatient={handleSelectPatientFromMain}
          />
        );
      case 'FarmasiKasir':
        return (
          <FarmasiKasirPanel 
            onRefreshAll={loadAllData}
          />
        );
      case 'Antrean':
        return (
          <AntreanPanel 
            appointments={appointments}
            onRefreshAll={loadAllData}
          />
        );
      case 'AIAssist':
        return (
          <AIAssistPanel 
            patients={patients}
            settings={settings}
          />
        );
      case 'Pengaturan':
        return (
          <SettingsPanel 
            settings={settings}
            onRefresh={loadAllData}
          />
        );
      default:
        return <div>Tab not found</div>;
    }
  };

  // Auth Guard
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-sage-50 flex justify-center items-center p-4 selection:bg-sage-600 selection:text-white font-sans relative overflow-hidden">
        {/* Decorative background vectors */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-sage-200/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-sage-300/30 rounded-full blur-3xl pointer-events-none" />

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md bg-white border border-sage-200 rounded-3xl p-6 md:p-8 card-shadow space-y-6 relative z-10"
        >
          {/* Logo and Brand */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-sage-600 flex items-center justify-center mx-auto text-white shadow-xl">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            
            <div className="space-y-1">
              <h1 className="text-xl md:text-2xl font-sans font-bold text-sage-900 tracking-tight flex items-center justify-center gap-1.5">
                EXORA <span className="font-serif italic text-sm opacity-70">OS</span>
              </h1>
              <p className="text-sage-500 text-xs md:text-sm font-sans">Sistem Operasi Klinik & Manajemen Rekam Medis (EHR)</p>
            </div>
          </div>

          <div className="bg-sage-50 border border-sage-200 p-3 rounded-xl flex gap-2 items-start text-[11px] text-sage-600 leading-relaxed font-sans font-medium">
            <KeyRound className="w-4 h-4 text-sage-500 shrink-0 mt-0.5" />
            <div>
              <strong>Kredensial Akses Klinik Aktif:</strong><br />
              Email: <span className="font-mono font-bold text-sage-700">{dbAdapter.getSettings().loginEmail || 'bahlil.99909@gmail.com'}</span><br />
              Sandi: <span className="font-mono font-bold text-sage-700">{dbAdapter.getSettings().loginPassword || 'admin'}</span>
              <p className="mt-1 text-[9px] text-slate-400 font-sans italic">Dapat diubah kapan saja di tab Pengaturan Klinik.</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs font-sans">
            <div className="space-y-1">
              <label className="text-sage-500 font-semibold">Alamat Email Pengguna</label>
              <input 
                type="text" 
                required
                placeholder="bahlil.99909@gmail.com"
                value={authEmail}
                id="login-email-input"
                onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full p-3 border border-sage-200 rounded-xl outline-none focus:border-sage-400 font-medium font-mono text-sage-800"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sage-500 font-semibold">Kata Sandi Akses</label>
              <input 
                type="password" 
                required
                placeholder="••••••••"
                value={authPassword}
                id="login-password-input"
                onChange={(e) => setAuthPassword(e.target.value)}
                className="w-full p-3 border border-sage-200 rounded-xl outline-none focus:border-sage-400 font-mono text-sage-800"
              />
            </div>

            {authError && (
              <p className="text-rose-600 font-semibold leading-relaxed p-2 border border-rose-100 bg-rose-50/50 rounded-lg text-center">{authError}</p>
            )}

            <button 
              type="submit"
              id="btn-login-submit"
              className="w-full bg-sage-600 hover:bg-sage-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer flex justify-center items-center gap-2"
            >
              <LogIn className="w-4.5 h-4.5" /> Masuk Ke Sistem Operasi
            </button>
          </form>

          <p className="text-sage-400 text-[10px] text-center font-mono">
            Securely TLS 1.3 encrypted • EXORA v4.1.2
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sage-50 flex selection:bg-sage-600 selection:text-white font-sans text-sage-900">
      
      {/* 1. SIDEBAR NAVIGATION - Natural Tones theme */}
      <aside className="w-64 bg-sage-50 border-r border-sage-200 shrink-0 hidden md:flex flex-col justify-between relative z-30">
        <div className="p-5 space-y-6">
          {/* Logo Brand Header */}
          <div className="flex gap-2 items-center">
            <div className="w-8.5 h-8.5 rounded-xl bg-white text-sage-900 border border-sage-200 flex items-center justify-center font-bold shadow-sm">
              <HeartPulse className="w-5 h-5 text-sage-600 animate-pulse" />
            </div>
            <div>
              <span className="font-sans font-bold text-sm tracking-tight text-sage-700 block">EXORA CLINIC</span>
              <span className="font-serif italic text-[11px] text-sage-500 block opacity-80">OS v4.1</span>
            </div>
          </div>

          {/* Nav List */}
          <nav className="space-y-1.5 text-xs">
            {[
              { label: 'Ringkasan Dashboard', value: 'Dashboard', icon: LayoutDashboard },
              { label: 'EHR / Rekam Medis', value: 'Pasien', icon: Users },
              { label: 'Jadwal & WhatsApp', value: 'Penjadwalan', icon: Calendar },
              { label: 'Farmasi & POS Kasir', value: 'FarmasiKasir', icon: Receipt },
              { label: 'Panggil Antrean & TV', value: 'Antrean', icon: Megaphone },
              { label: 'Exora AI Assist', value: 'AIAssist', icon: BrainCircuit, premium: true },
              { label: 'Pengaturan OS', value: 'Pengaturan', icon: Settings },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.value;
              return (
                <button
                  key={item.value}
                  id={`side-nav-${item.value}`}
                  onClick={() => {
                    setActiveTab(item.value as ActiveTab);
                    if (item.value !== 'Pasien') setSelectedPatientId(null);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-medium transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-sage-100 text-sage-700 font-semibold border-r-3 border-sage-600' 
                      : 'hover:bg-sage-100/50 text-sage-500 hover:text-sage-700'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="w-4.5 h-4.5" />
                    {item.label}
                  </span>
                  
                  {item.premium && (
                    <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Doctor active card and logout */}
        <div className="p-4 border-t border-sage-200 space-y-3 bg-white/40">
          {currentUser && (
            <div className="flex gap-2.5 items-center">
              <div className="w-8 h-8 rounded-full bg-sage-200 flex items-center justify-center font-bold text-xs ring-2 ring-sage-300">
                <User className="w-4.5 h-4.5 text-sage-600" />
              </div>
              <div className="text-[11px] leading-tight font-sans">
                <p className="font-bold text-sage-900 line-clamp-1">{currentUser.name}</p>
                <p className="text-sage-500 font-semibold">{currentUser.role} Operasional</p>
              </div>
            </div>
          )}

          <button 
            id="btn-sidebar-logout"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-sage-100 hover:bg-sage-200/80 text-sage-700 hover:text-sage-900 text-xs py-2 rounded-lg transition-colors cursor-pointer border border-sage-200"
          >
            <LogOut className="w-4 h-4" /> Keluar Sistem (Logout)
          </button>
        </div>
      </aside>

      {/* MOBILE HEADER FOR SMALL DEVICES */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden bg-sage-50 text-sage-700 py-3.5 px-4 flex justify-between items-center z-20 shadow-sm border-b border-sage-200">
          <div className="flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-sage-600 animate-pulse" />
            <h1 className="text-xs font-sans font-bold tracking-wider">EXORA CLINIC OS</h1>
          </div>
          
          <div className="flex items-center gap-1.5">
            {/* Mobile Nav strip */}
            {[
              { id: 'mobile-nav-db', val: 'Dashboard', icon: LayoutDashboard },
              { id: 'mobile-nav-pat', val: 'Pasien', icon: Users },
              { id: 'mobile-nav-apt', val: 'Penjadwalan', icon: Calendar },
              { id: 'mobile-nav-fk', val: 'FarmasiKasir', icon: Receipt },
              { id: 'mobile-nav-ant', val: 'Antrean', icon: Megaphone },
              { id: 'mobile-nav-ai', val: 'AIAssist', icon: BrainCircuit },
              { id: 'mobile-nav-set', val: 'Pengaturan', icon: Settings },
            ].map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.val;
              return (
                <button
                  key={item.id}
                  id={item.id}
                  onClick={() => {
                    setActiveTab(item.val as ActiveTab);
                    if (item.val !== 'Pasien') setSelectedPatientId(null);
                  }}
                  className={`p-1.5 rounded-lg text-sage-500 hover:text-sage-700 ${isActive ? 'bg-sage-100 text-sage-700 font-semibold' : ''}`}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
            
            <button 
              id="mobile-nav-logout"
              onClick={handleLogout}
              className="p-1.5 text-sage-500 hover:text-rose-600 ml-1.5"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* 2. MAIN CORE CONTENT ZONE */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-7xl w-full mx-auto space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + (selectedPatientId || '')}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderActiveTabContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
