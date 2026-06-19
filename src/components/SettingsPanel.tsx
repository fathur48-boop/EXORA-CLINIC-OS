/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Settings, KeyRound, Building, ClipboardList, Database, Save, Download, 
  Upload, CheckCircle, ShieldAlert, Sparkles, AlertCircle, Trash2 
} from 'lucide-react';
import { SystemSettings } from '../types';
import { dbAdapter } from '../db/dbAdapter';

interface SettingsPanelProps {
  settings: SystemSettings;
  onRefresh: () => void;
}

export default function SettingsPanel({ settings, onRefresh }: SettingsPanelProps) {
  // Config state
  const [supabaseUrl, setSupabaseUrl] = useState(settings.supabaseUrl || '');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(settings.supabaseAnonKey || '');
  const [groqApiKey, setGroqApiKey] = useState(settings.groqApiKey || '');

  // User Authentication settings state
  const [loginEmail, setLoginEmail] = useState(settings.loginEmail || 'bahlil.99909@gmail.com');
  const [loginPassword, setLoginPassword] = useState(settings.loginPassword || 'admin');
  const [loginUsername, setLoginUsername] = useState(settings.loginUsername || 'dr. Baharuddin Yusuf, Sp.PD');
  
  const [clinicName, setClinicName] = useState(settings.clinicName || 'Exora Health Care Clinic');

  // Supabase Active Synchronizer states
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ success?: boolean; msg: string } | null>(null);
  const [showSqlSchema, setShowSqlSchema] = useState(false);

  const handlePushToCloud = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    const result = await dbAdapter.pushLocalToSupabase();
    setIsSyncing(false);
    setSyncStatus({ success: result.success, msg: result.message });
  };

  const handlePullFromCloud = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    const result = await dbAdapter.pullFromSupabase();
    setIsSyncing(false);
    setSyncStatus({ success: result.success, msg: result.message });
  };
  const [clinicPhone, setClinicPhone] = useState(settings.clinicPhone || '6281234567890');
  const [clinicAddress, setClinicAddress] = useState(settings.clinicAddress || '');
  const [defaultDoctorName, setDefaultDoctorName] = useState(settings.defaultDoctorName || '');

  const [waTemplateNewAppointment, setWaTemplateNewAppointment] = useState(settings.waTemplateNewAppointment || '');
  const [waTemplateReminder, setWaTemplateReminder] = useState(settings.waTemplateReminder || '');

  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [restoreFileError, setRestoreFileError] = useState<string | null>(null);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    
    dbAdapter.saveSettings({
      supabaseUrl,
      supabaseAnonKey,
      groqApiKey,
      clinicName,
      clinicPhone,
      clinicAddress,
      defaultDoctorName,
      waTemplateNewAppointment,
      waTemplateReminder,
      loginEmail,
      loginPassword,
      loginUsername,
    });

    onRefresh();
    setToastMsg('Pengaturan Exora Clinic OS Berhasil Disimpan!');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleBackupExport = () => {
    const backupString = dbAdapter.exportDB();
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(backupString);
    const exportFileDefaultName = `EXORA_CLINIC_OS_DUMP_${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    linkElement.remove();
  };

  const handleImportRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRestoreFileError(null);
    const fileReader = new FileReader();
    const targetFile = e.target.files?.[0];

    if (!targetFile) return;

    fileReader.onload = (event) => {
      const fileContent = event.target?.result;
      if (typeof fileContent === 'string') {
        const success = dbAdapter.importDB(fileContent);
        if (success) {
          onRefresh();
          setToastMsg('database Rekam Medis Berhasil Direstore!');
          setShowToast(true);
          setTimeout(() => setShowToast(false), 3000);
        } else {
          setRestoreFileError('Format file backup tidak valid. Gagal melakukan restorasi.');
        }
      }
    };
    fileReader.readAsText(targetFile);
  };

  const handleClearAllData = () => {
    if (window.confirm('Apakah Anda benar-benar yakin ingin menghapus seluruh data dummy klinik saat ini? Seluruh data pasien, riwayat janji temu, obat-obatan, dan tagihan akan dikosongkan secara permanen.')) {
      dbAdapter.clearAllData();
      onRefresh();
      setToastMsg('Seluruh Data Dummy Berhasil Dihapus (Database Kosong)!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {showToast && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-8 right-8 z-50 bg-slate-900 border border-slate-800 text-white p-4 rounded-xl flex gap-2.5 items-center shadow-2xl text-xs font-semibold"
        >
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <span>{toastMsg}</span>
        </motion.div>
      )}

      {/* Title */}
      <div className="space-y-0.5">
        <h2 className="text-xl font-serif italic text-sage-800 flex items-center gap-2">
          <Settings className="w-5 h-5 text-sage-600 animate-spin-slow" />
          Konfigurasi Exora Clinic OS & API Keys
        </h2>
        <p className="text-slate-400 text-xs">Pusat kontrol pengaturan klinik, manajemen kredensial enkripsi API, penalaan pesan WhatsApp, dan cadangan basis data.</p>
      </div>

      <form onSubmit={handleSaveSettings} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Form options */}
        <div className="lg:col-span-2 space-y-6">
          {/* Credentials */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4 text-xs font-sans">
            <h3 className="font-sans font-bold text-sage-800 border-b pb-2 flex gap-2 items-center">
              <KeyRound className="w-4 h-4 text-sage-600" />
              1. Enkripsi API Keys & Cloud Backend Settings
            </h3>

            <div className="bg-sage-50/50 border border-sage-150 p-3 rounded-lg flex gap-2 items-start text-slate-600 leading-relaxed text-[11px] font-medium">
              <ShieldAlert className="w-4.5 h-4.5 text-sage-600 shrink-0" />
              <span>Semua API Key yang diinput di bawah ini hanya disimpan di browser lokal Anda serta dienkripsi aman secara privat. Panggilan AI diverifikasi langsung melalui server proxy aman. Kami tidak menyimpan di database publik.</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1 md:col-span-2">
                <label className="text-slate-500 font-semibold text-sage-800">Groq API Key (Untuk Analisis Rekam Medis & Diagnosis)</label>
                <input 
                  type="password" 
                  placeholder="gsk_xxxx (Groq Personal Key)"
                  value={groqApiKey}
                  id="settings-groq-key"
                  onChange={e => setGroqApiKey(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:border-slate-400 font-mono font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-semibold">Supabase Client Project URL</label>
                <input 
                  type="text" 
                  placeholder="https://xxxxxx.supabase.co"
                  value={supabaseUrl}
                  id="settings-supabase-url"
                  onChange={e => setSupabaseUrl(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:border-slate-400 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-semibold">Supabase Client Anon/Public Key</label>
                <input 
                  type="password" 
                  placeholder="eyJhbGciOi..."
                  value={supabaseAnonKey}
                  id="settings-supabase-key"
                  onChange={e => setSupabaseAnonKey(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:border-slate-400 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Clinic properties */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4 text-xs font-sans">
            <h3 className="font-sans font-bold text-sage-800 border-b pb-2 flex gap-2 items-center">
              <Building className="w-4 h-4 text-sage-600" />
              2. Profil Identitas Klinik & Dokter
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-slate-500 font-semibold">Nama Resmi Klinik *</label>
                <input 
                  type="text" 
                  required
                  value={clinicName}
                  id="settings-clinic-name"
                  onChange={e => setClinicName(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-semibold">Nomor Ponsel Operasional Klinik *</label>
                <input 
                  type="tel" 
                  required
                  value={clinicPhone}
                  id="settings-clinic-phone"
                  onChange={e => setClinicPhone(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg font-mono outline-none"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-slate-500 font-semibold">Dokter Pelaksana Operasional Default *</label>
                <input 
                  type="text" 
                  required
                  value={defaultDoctorName}
                  id="settings-doctor-name"
                  onChange={e => setDefaultDoctorName(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg outline-none font-semibold text-slate-800"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-slate-500 font-semibold">Alamat Fisik Klinik *</label>
                <textarea 
                  required
                  value={clinicAddress}
                  id="settings-clinic-address"
                  onChange={e => setClinicAddress(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg outline-none min-h-[60px]"
                />
              </div>
            </div>
          </div>

          {/* Login Credentials Settings */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4 text-xs font-sans">
            <h3 className="font-sans font-bold text-sage-800 border-b pb-2 flex gap-2 items-center">
              <KeyRound className="w-4 h-4 text-sage-600" />
              3. Kredensial & Akun Login Sistem (Akses Masuk)
            </h3>

            <div className="bg-amber-50/50 border border-amber-200 p-3 rounded-lg flex gap-2 items-start text-amber-800 leading-relaxed text-[11px] font-medium">
              <AlertCircle className="w-4.5 h-4.5 text-amber-600 shrink-0" />
              <span>Gunakan kredensial khusus ini untuk menjaga keamanan akses sistem operasional EHR klinik Anda. Kredensial baru ini akan langsung aktif setelah Anda menekan tombol simpan di bawah.</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-slate-500 font-semibold text-sage-800">Email / Username Login *</label>
                <input 
                  type="text" 
                  required
                  placeholder="bahlil.99909@gmail.com"
                  value={loginEmail}
                  id="settings-login-email"
                  onChange={e => setLoginEmail(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg outline-none font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-semibold text-sage-800">Kata Sandi Login Baru *</label>
                <input 
                  type="text" 
                  required
                  placeholder="admin"
                  value={loginPassword}
                  id="settings-login-password"
                  onChange={e => setLoginPassword(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg outline-none font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-semibold text-sage-800">Nama Lengkap Pengguna *</label>
                <input 
                  type="text" 
                  required
                  placeholder="dr. Baharuddin Yusuf, Sp.PD"
                  value={loginUsername}
                  id="settings-login-username"
                  onChange={e => setLoginUsername(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg outline-none font-semibold text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* WA templates */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4 text-xs font-sans">
            <h3 className="font-sans font-bold text-sage-800 border-b pb-2 flex gap-2 items-center">
              <ClipboardList className="w-4 h-4 text-sage-600" />
              4. Preset Format Pesan Otomatis WhatsApp
            </h3>

            <div className="bg-slate-50 border border-slate-150 p-3 rounded-lg leading-relaxed text-[11px] text-slate-500 flex gap-2">
              <Building className="w-4.5 h-4.5 text-slate-400 shrink-0" />
              <div>
                <strong>Variabel pengganti otomatis yang didukung:</strong><br />
                <span className="font-mono text-sage-700 bg-white border border-slate-100 px-1 py-0.5 rounded leading-none text-[9px] mr-1">{`{name}`}</span> Nama Pasien | 
                <span className="font-mono text-sage-700 bg-white border border-slate-100 px-1 py-0.5 rounded leading-none text-[9px] mx-1">{`{date}`}</span> Tanggal Janji | 
                <span className="font-mono text-sage-700 bg-white border border-slate-100 px-1 py-0.5 rounded leading-none text-[9px] mx-1">{`{time}`}</span> Jam Periksa | 
                <span className="font-mono text-sage-700 bg-white border border-slate-100 px-1 py-0.5 rounded leading-none text-[9px] mx-1">{`{doctor}`}</span> Nama Dokter | 
                <span className="font-mono text-sage-700 bg-white border border-slate-100 px-1 py-0.5 rounded leading-none text-[9px] ml-1">{`{clinic}`}</span> Nama Klinik
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-slate-500 font-semibold">Format Konfirmasi Pendaftaran Janji Temu</label>
                <textarea 
                  value={waTemplateNewAppointment}
                  id="settings-wa-template-new"
                  onChange={e => setWaTemplateNewAppointment(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg outline-none min-h-[80px]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-semibold">Format Pengingat H-1 Jadwal Periksa</label>
                <textarea 
                  value={waTemplateReminder}
                  id="settings-wa-template-reminder"
                  onChange={e => setWaTemplateReminder(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg outline-none min-h-[80px]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Backups / Restore database */}
        <div className="space-y-6">
          {/* Supabase Active Sync Card (Poin C) */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4 text-xs font-sans">
            <h3 className="font-sans font-bold text-sage-800 border-b pb-2 flex gap-2 items-center">
              <Database className="w-4 h-4 text-sky-600 animate-pulse" />
              Penyelarasan Supabase Cloud (Active Sync)
            </h3>
            
            <p className="text-slate-500 leading-relaxed text-[11px] font-medium">
              Hubungkan database lokal Exora dengan server cloud Supabase asli. Data medis Patients, Invoices, Janji Temu, dan Obat Anda akan aman tersinkronisasi di awan secara modular.
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                id="btn-push-supabase"
                disabled={isSyncing}
                onClick={handlePushToCloud}
                className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2.5 px-3 rounded-lg flex justify-center items-center gap-1.5 transition-colors cursor-pointer text-center text-[10px] disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" /> Push ke Cloud
              </button>
              
              <button
                type="button"
                id="btn-pull-supabase"
                disabled={isSyncing}
                onClick={handlePullFromCloud}
                className="bg-sage-600 hover:bg-sage-700 text-white font-bold py-2.5 px-3 rounded-lg flex justify-center items-center gap-1.5 transition-colors cursor-pointer text-center text-[10px] disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" /> Pull dari Cloud
              </button>
            </div>

            {syncStatus && (
              <div className={`p-3 rounded-xl border ${syncStatus.success ? 'bg-emerald-50 border-emerald-150 text-emerald-900' : 'bg-amber-50 border-amber-150 text-amber-950'} text-[10px] font-sans font-medium space-y-1`}>
                <div className="flex gap-2.5 items-center">
                  <CheckCircle className={`w-4 h-4 ${syncStatus.success ? 'text-emerald-500' : 'text-amber-500'}`} />
                  <span>{syncStatus.msg}</span>
                </div>
              </div>
            )}

            <div className="border-t border-slate-100 pt-3 flex flex-col gap-2">
              <button
                type="button"
                id="btn-toggle-schema-view"
                onClick={() => setShowSqlSchema(!showSqlSchema)}
                className="text-sky-600 hover:text-sky-800 text-[10px] font-semibold text-left underline flex gap-1 items-center"
              >
                {showSqlSchema ? 'Sembunyikan SQL Skema' : 'Lihat Skema SQL Supabase Konsol'}
              </button>

              {showSqlSchema && (
                <div className="bg-slate-900 text-slate-300 p-3 rounded-lg font-mono text-[9px] overflow-x-auto max-h-[180px] space-y-2 mt-1 select-all relative group text-left border border-slate-800 leading-normal">
                  <div className="absolute top-1 right-2 text-slate-500 font-sans text-[8px] uppercase font-bold">SQL SCRIPT</div>
                  <pre>{`-- Salin & Jalankan script SQL ini di SQL Editor Supabase Anda:

-- 1. Tabel Patients
CREATE TABLE IF NOT EXISTS public.patients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  "birthDate" TEXT NOT NULL,
  gender TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  "bloodType" TEXT,
  allergies TEXT,
  "createdAt" TEXT,
  vitals JSONB DEFAULT '[]'::jsonb,
  "soapNotes" JSONB DEFAULT '[]'::jsonb,
  prescriptions JSONB DEFAULT '[]'::jsonb,
  "labResults" JSONB DEFAULT '[]'::jsonb
);

-- 2. Tabel Appointments
CREATE TABLE IF NOT EXISTS public.appointments (
  id TEXT PRIMARY KEY,
  "patientId" TEXT NOT NULL,
  "patientName" TEXT NOT NULL,
  "patientPhone" TEXT,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  reason TEXT,
  "doctorName" TEXT,
  status TEXT NOT NULL,
  "whatsappStatus" TEXT,
  "whatsappMessageSent" TEXT,
  "queueNumber" TEXT
);

-- 3. Tabel Drugs
CREATE TABLE IF NOT EXISTS public.drugs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  dosage TEXT,
  category TEXT,
  price INT NOT NULL DEFAULT 0,
  stock INT NOT NULL DEFAULT 0,
  unit TEXT,
  "shelfLocation" TEXT
);

-- 4. Tabel Invoices
CREATE TABLE IF NOT EXISTS public.invoices (
  id TEXT PRIMARY KEY,
  "patientId" TEXT NOT NULL,
  "patientName" TEXT NOT NULL,
  date TEXT NOT NULL,
  items JSONB DEFAULT '[]'::jsonb,
  "consultationFee" INT NOT NULL DEFAULT 0,
  "treatmentFee" INT NOT NULL DEFAULT 0,
  discount INT NOT NULL DEFAULT 0,
  tax INT NOT NULL DEFAULT 0,
  "totalAmount" INT NOT NULL DEFAULT 0,
  "paymentStatus" TEXT NOT NULL,
  "paymentMethod" TEXT,
  "soapNoteId" TEXT
);

-- Buka izin akses untuk demonstrasi (Disable RLS atau Allow Anon Policies)
ALTER TABLE public.patients FORCE ROW LEVEL SECURITY;
ALTER TABLE public.appointments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.drugs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.invoices FORCE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select" ON public.patients FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public insert" ON public.patients FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.patients FOR UPDATE TO anon USING (true);
CREATE POLICY "Allow public delete" ON public.patients FOR DELETE TO anon USING (true);

CREATE POLICY "Allow public select appts" ON public.appointments FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public insert appts" ON public.appointments FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public update appts" ON public.appointments FOR UPDATE TO anon USING (true);
CREATE POLICY "Allow public delete appts" ON public.appointments FOR DELETE TO anon USING (true);

CREATE POLICY "Allow public select drugs" ON public.drugs FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public insert drugs" ON public.drugs FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public update drugs" ON public.drugs FOR UPDATE TO anon USING (true);
CREATE POLICY "Allow public delete drugs" ON public.drugs FOR DELETE TO anon USING (true);

CREATE POLICY "Allow public select inv" ON public.invoices FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public insert inv" ON public.invoices FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public update inv" ON public.invoices FOR UPDATE TO anon USING (true);
CREATE POLICY "Allow public delete inv" ON public.invoices FOR DELETE TO anon USING (true);`}</pre>
                </div>
              )}
            </div>
          </div>
          {/* Backup Database widgets */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4 text-xs font-sans">
            <h3 className="font-sans font-bold text-sage-800 border-b pb-2 flex gap-2 items-center">
              <Database className="w-4 h-4 text-sage-600" />
              4. Backup & Restore Rekam Medis
            </h3>

            <p className="text-slate-500 leading-relaxed text-[11px] font-medium">
              Amankan basis data klinis Anda dengan mengekspor seluruh file rekam medis lengkap berupa file biner .json lokal. Anda juga bisa mengunggah file tersebut kapan saja untuk memulihkan seluruh data operasional klinik.
            </p>

            <button 
              type="button"
              onClick={handleBackupExport}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 px-4 rounded-lg flex justify-center items-center gap-2 transition-colors cursor-pointer"
            >
              <Download className="w-4.5 h-4.5" /> Ekspor Basis Data (.json)
            </button>

            <div className="border-t border-slate-100 pt-3.5 space-y-3">
              <span className="font-semibold text-slate-600 block text-[10px] uppercase font-mono tracking-wider">Restorasi Basis Data:</span>
              
              <div className="relative border border-dashed border-slate-300 rounded-lg p-4 text-center hover:bg-slate-50 transition-colors">
                <Upload className="w-6 h-6 mx-auto stroke-1 text-slate-400 mb-1" />
                <span className="text-[11px] text-slate-500 font-medium">Unggah File Backup (.json)</span>
                <input 
                  type="file"
                  accept=".json"
                  id="upload-backup-file-input"
                  onChange={handleImportRestore}
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                />
              </div>

              {restoreFileError && (
                <div className="p-2 bg-rose-50 text-rose-500 rounded text-[10px] leading-tight flex gap-1.5 items-start">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{restoreFileError}</span>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-2">
              <span className="font-semibold text-rose-600 block text-[10px] uppercase font-mono tracking-wider">Danger Zone:</span>
              <p className="text-[10px] text-slate-400 leading-normal">
                Pembersihan data ini bersifat permanen. Disarankan untuk melakukan <strong>Ekspor Basis Data (.json)</strong> terlebih dahulu sebelum melakukan pembersihan jika Anda membutuhkan cadangannya.
              </p>
              <button
                type="button"
                onClick={handleClearAllData}
                id="btn-clear-all-data-dummy"
                className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200 hover:border-rose-300 font-bold py-2 px-4 rounded-lg flex justify-center items-center gap-2 transition-colors cursor-pointer text-[11px]"
              >
                <Trash2 className="w-4 h-4" /> Hapus Semua Data Dummy Klinik
              </button>
            </div>
          </div>

          {/* Final controls submit */}
          <div className="bg-gradient-to-br from-sage-50 to-cream-50 border border-sage-200 p-5 rounded-2xl space-y-4 shadow-xs text-xs font-sans">
            <div className="flex gap-2 items-center font-sans font-bold text-sage-955">
              <Sparkles className="w-5 h-5 text-sage-600" />
              Konfirmasi Perubahan
            </div>
            <p className="text-slate-600 leading-relaxed font-sans font-medium text-[11px]">
              Klik tombol di bawah ini untuk menyimpan seluruh profil pendaftaran klinik, credentials, serta format rekam medik.
            </p>
            <button 
              type="submit"
              id="btn-save-settings"
              className="w-full bg-sage-600 hover:bg-sage-700 text-white font-extrabold py-3 px-4 rounded-xl shadow-md cursor-pointer flex justify-center items-center gap-2 text-xs transition-colors"
            >
              <Save className="w-4.5 h-4.5" /> Simpan Seluruh Pengaturan
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
