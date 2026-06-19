/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Calendar, Clock, Plus, Filter, MessageSquare, Send, CheckCircle2, XCircle, AlertTriangle, Smartphone, UserCheck } from 'lucide-react';
import { Appointment, Patient, SystemSettings } from '../types';
import { dbAdapter } from '../db/dbAdapter';

interface AppointmentsPanelProps {
  appointments: Appointment[];
  patients: Patient[];
  onRefresh: () => void;
  onSelectPatient: (patientId: string) => void;
}

export default function AppointmentsPanel({ appointments, patients, onRefresh, onSelectPatient }: AppointmentsPanelProps) {
  const [showAddApt, setShowAddApt] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('All');
  
  // New Appointment Form State
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [aptDate, setAptDate] = useState(() => {
    // default tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [aptTime, setAptTime] = useState('09:00');
  const [aptReason, setAptReason] = useState('Pemeriksaan Rutin / Kontrol Bulanan');

  // Currently viewing WA notification draft template
  const [activeWaApt, setActiveWaApt] = useState<Appointment | null>(null);
  const [customWaText, setCustomWaText] = useState('');

  const settings = useMemo(() => dbAdapter.getSettings(), [appointments]); // refresh settings when table changes

  // Filter appointments
  const filteredApts = useMemo(() => {
    return appointments.filter(apt => {
      if (filterStatus === 'All') return true;
      if (filterStatus === 'PendingWA') return apt.whatsappStatus === 'Pending' && apt.status === 'Scheduled';
      return apt.status === filterStatus;
    });
  }, [appointments, filterStatus]);

  // Handle book
  const handleBookAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) return alert('Pilih pasien terlebih dahulu.');

    const patient = patients.find(p => p.id === selectedPatientId);
    if (!patient) return alert('Data pasien tidak valid.');

    dbAdapter.addAppointment({
      patientId: patient.id,
      patientName: patient.name,
      patientPhone: patient.phone,
      date: aptDate,
      time: aptTime,
      reason: aptReason,
      doctorName: settings.defaultDoctorName,
      status: 'Scheduled'
    });

    onRefresh();
    setShowAddApt(false);
    setSelectedPatientId('');
    setAptReason('Pemeriksaan Rutin / Kontrol Bulanan');
  };

  // Status changers
  const handleChangeStatus = (id: string, status: Appointment['status']) => {
    dbAdapter.updateAppointmentStatus(id, status);
    onRefresh();
  };

  // WhatsApp generator and link launcher
  const handleOpenWaDraft = (apt: Appointment) => {
    setActiveWaApt(apt);
    
    // Replace short-codes in template
    let msg = settings.waTemplateNewAppointment;
    msg = msg.replace(/{name}/g, apt.patientName);
    msg = msg.replace(/{date}/g, apt.date);
    msg = msg.replace(/{time}/g, apt.time);
    msg = msg.replace(/{doctor}/g, apt.doctorName);
    msg = msg.replace(/{clinic}/g, settings.clinicName);
    
    setCustomWaText(msg);
  };

  const handleDispatchWhatsAppReal = () => {
    if (!activeWaApt) return;

    // Standardize phone format (remove leading 0 or +, replace with 62)
    let phoneNum = activeWaApt.patientPhone.replace(/[^\d]/g, '');
    if (phoneNum.startsWith('0')) {
      phoneNum = '62' + phoneNum.substring(1);
    }
    if (!phoneNum.startsWith('62')) {
      phoneNum = '62' + phoneNum;
    }

    // Construct URL for Whatsapp Web & Desktop protocol redirect
    const waUrl = `https://api.whatsapp.com/send?phone=${phoneNum}&text=${encodeURIComponent(customWaText)}`;
    
    // Mark as sent in local system
    dbAdapter.updateAppointmentWhatsappStatus(activeWaApt.id, 'Sent', customWaText);
    
    // Open in new tab securely
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    
    onRefresh();
    setActiveWaApt(null);
  };

  return (
    <div className="space-y-6">
      {/* Header and Add button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="space-y-0.5">
          <h2 className="text-xl font-serif italic text-sage-800">Sistem Penjadwalan Janji Temu Terintegrasi</h2>
          <p className="text-slate-400 text-xs">Atur kalender dokter, antrean terjadwal, dan kelola konfirmasi pesan WhatsApp pasien.</p>
        </div>
        <button 
          id="btn-show-add-apt"
          onClick={() => setShowAddApt(true)}
          className="w-full sm:w-auto bg-sage-600 hover:bg-sage-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
        >
          <Plus className="w-5 h-5" /> Buat Janji Temu Baru
        </button>
      </div>

      {/* Appointment calendar listing */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Main Schedule Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 border border-slate-200/80 rounded-xl glow-card">
            <div className="flex gap-1.5 items-center text-slate-700 text-xs font-semibold font-sans">
              <Filter className="w-4 h-4 text-slate-400" />
              Saring Status:
            </div>
            <div className="flex flex-wrap gap-1">
              {[
                { label: 'Semua', value: 'All' },
                { label: 'Terjadwal', value: 'Scheduled' },
                { label: 'WA Pending', value: 'PendingWA' },
                { label: 'Selesai', value: 'Completed' },
                { label: 'Batal', value: 'Cancelled' },
                { label: 'No Show', value: 'No_Show' },
              ].map(badge => (
                <button
                  key={badge.value}
                  id={`filter-apt-${badge.value}`}
                  onClick={() => setFilterStatus(badge.value)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg font-medium cursor-pointer transition-all ${
                    filterStatus === badge.value 
                      ? 'bg-slate-900 border-slate-950 text-white' 
                      : 'bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  {badge.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden glow-card">
            {filteredApts.length === 0 ? (
              <div className="p-12 text-center text-slate-400 border border-dashed border-slate-100 rounded-xl mx-4 my-4">
                <Calendar className="w-10 h-10 stroke-1 mx-auto text-slate-300 mb-2" />
                <p className="text-xs">Tidak ada jadwal janji temu terdaftar untuk filter ini.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredApts.map((apt) => (
                  <div key={apt.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-all font-sans text-xs">
                    <div className="flex items-start gap-3.5">
                      {/* Left: Date/Time Badge */}
                      <div className="bg-sage-50/50 border border-sage-150 p-2.5 rounded-xl text-center w-16 shrink-0 space-y-0.5">
                        <span className="text-[10px] text-sage-600 uppercase font-bold tracking-wider block">Jam</span>
                        <span className="text-xs font-mono font-bold text-slate-800">{apt.time}</span>
                        <div className="text-[9px] text-slate-400 font-mono pt-1 leading-none">{apt.date}</div>
                      </div>

                      {/* Mid: Patient details */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 
                            onClick={() => onSelectPatient(apt.patientId)}
                            className="font-bold text-slate-800 hover:text-sage-600 cursor-pointer transition-colors"
                          >
                            {apt.patientName}
                          </h4>
                          <span className="text-[9px] font-mono text-slate-400">({apt.patientPhone})</span>
                        </div>
                        <p className="text-slate-500 text-[11px] leading-relaxed max-w-md"><strong>Tujuan:</strong> {apt.reason}</p>
                        <p className="text-[10px] text-slate-400">Dokter: {apt.doctorName}</p>
                      </div>
                    </div>

                    {/* Right action control set */}
                    <div className="flex flex-wrap items-center gap-3 md:justify-end">
                      {/* WA indicators */}
                      {apt.whatsappStatus === 'Sent' ? (
                        <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded" title={apt.whatsappMessageSent}>
                          <UserCheck className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-medium font-mono">Notifikasi WA Sent</span>
                        </div>
                      ) : (
                        <button 
                          onClick={() => handleOpenWaDraft(apt)}
                          id={`btn-wa-${apt.id}`}
                          className="bg-emerald-550 hover:bg-emerald-600 bg-emerald-50 text-emerald-700 hover:text-emerald-800 border border-emerald-100 px-2 py-1 rounded cursor-pointer transition-colors flex items-center gap-1.5 font-bold font-mono"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> Kirim Pengingat WA
                        </button>
                      )}

                      {/* Consultation controller */}
                      <select
                        value={apt.status}
                        id={`select-status-${apt.id}`}
                        onChange={(e) => handleChangeStatus(apt.id, e.target.value as Appointment['status'])}
                        className={`text-[10px] py-1 px-2 border rounded-lg outline-none font-semibold ${
                          apt.status === 'Completed' 
                            ? 'bg-blue-50 border-blue-200 text-blue-700' 
                            : apt.status === 'Cancelled' 
                            ? 'bg-rose-50 border-rose-200 text-rose-700' 
                            : apt.status === 'No_Show'
                            ? 'bg-amber-100 border-amber-200 text-amber-700'
                            : 'bg-sage-100 border-sage-200 text-sage-800'
                        }`}
                      >
                        <option value="Scheduled">Terjadwal (Aktif)</option>
                        <option value="Completed">Selesai Berobat</option>
                        <option value="Cancelled">Dibatalkan</option>
                        <option value="No_Show">Absen (No-Show)</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Dispatcher simulation display or Templates */}
        <div className="space-y-6">
          {/* Quick WA instructions */}
          <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 space-y-4">
            <div className="flex gap-2 items-center text-emerald-400 font-display font-medium text-xs">
              <Smartphone className="w-5 h-5 text-emerald-500 animate-bounce" />
              Gateway WhatsApp Instan Pintar (Gratis)
            </div>
            
            <p className="text-[11px] text-slate-300 leading-normal font-sans">
              Gateway ini menggunakan browser redirect protocol yang langsung membuka portal resmi <strong>WhatsApp Web / Desktop</strong> Anda. 
            </p>

            <ul className="text-[10px] text-slate-400 space-y-1.5 list-disc pl-4 font-medium font-sans">
              <li>Tanpa langganan bulanan pihak ketiga.</li>
              <li>Tanpa membutuhkan Meta API Key berbayar.</li>
              <li>Aman, pesan terkirim secara manual resmi dengan nomor klinik Anda sendiri secara legal.</li>
            </ul>

            <div className="pt-2 border-t border-slate-800 font-mono text-[9px] text-slate-400">
              Ubah text acuan format pesan otomatis ini di tab Pengaturan Klinik.
            </div>
          </div>

          {/* Draft Notification Window */}
          {activeWaApt && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-slate-200/80 rounded-xl p-5 glow-card space-y-4 text-xs font-sans"
            >
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="font-semibold text-slate-700 font-display">Tinjau Draft Pesan Notifikasi</span>
                <button onClick={() => setActiveWaApt(null)} className="text-slate-400">✕ Close</button>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 font-medium">Tujuan Penerima:</span>
                <p className="font-bold text-slate-800">{activeWaApt.patientName} (+{activeWaApt.patientPhone})</p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 font-semibold">Teks Pesan (Sesuaikan):</span>
                <textarea 
                  value={customWaText}
                  id="wa-draft-textarea"
                  onChange={(e) => setCustomWaText(e.target.value)}
                  className="w-full text-xs font-sans border border-slate-200 rounded-lg p-2.5 min-h-[140px] outline-none focus:border-slate-400 leading-relaxed font-semibold text-slate-700"
                />
              </div>

              <button 
                onClick={handleDispatchWhatsAppReal}
                id="btn-dispatch-wa"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 px-4 rounded-lg cursor-pointer flex justify-center items-center gap-1.5 transition-colors font-mono uppercase text-[10px] tracking-wide"
              >
                <Send className="w-4 h-4" /> Buka Redirect WhatsApp
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Booking Dialog Modal */}
      {showAddApt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 text-xs font-sans"
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-display font-medium text-slate-800 text-lg">Buat Jadwal Janji Temu</h3>
              <button onClick={() => setShowAddApt(false)} className="text-slate-400 text-sm font-bold cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleBookAppointment} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-slate-500 font-semibold">Pilih Pasien Terdaftar *</label>
                {patients.length === 0 ? (
                  <p className="text-rose-500 font-semibold pl-1">Belum ada pasien terdaftar. Silakan registrasi pasien terlebih dahulu di tab Pasien.</p>
                ) : (
                  <select
                    value={selectedPatientId}
                    id="book-patient-select"
                    onChange={e => setSelectedPatientId(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-lg outline-none bg-white font-semibold"
                    required
                  >
                    <option value="">-- Pilih Rekam Pasien --</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (NIK: {p.nik || 'N/A'} | HP: {p.phone})</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-500 font-semibold">Tanggal Janji Temu *</label>
                  <input 
                    type="date" 
                    required 
                    value={aptDate}
                    id="book-date-input"
                    onChange={e => setAptDate(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-lg outline-none" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 font-semibold">Pilih Jam Mulai *</label>
                  <input 
                    type="time" 
                    required 
                    value={aptTime}
                    id="book-time-input"
                    onChange={e => setAptTime(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-lg outline-none font-mono" 
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-semibold">Tujuan Berobat / Keluhan Singkat *</label>
                <textarea 
                  required 
                  placeholder="Keluhan awal, kontrol bulanan, rujukan lab, atau urusan administratif..."
                  value={aptReason}
                  id="book-reason-input"
                  onChange={e => setAptReason(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none min-h-[70px] font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-semibold">Petugas Dokter Pelaksana</label>
                <input 
                  type="text" 
                  disabled
                  value={settings.defaultDoctorName} 
                  className="w-full p-2.5 border border-slate-100 bg-slate-50 rounded-lg text-slate-400 font-semibold"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 text-xs">
                <button type="button" onClick={() => setShowAddApt(false)} className="px-4 py-2 bg-slate-150 rounded-lg cursor-pointer">Batal</button>
                <button type="submit" disabled={!selectedPatientId} className="px-4 py-2 bg-sage-600 hover:bg-sage-700 text-white rounded-lg cursor-pointer font-bold disabled:bg-slate-300">Pesan Pengunjung</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
