/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Users, Calendar, AlertCircle, MessageSquareCode, Clock, Plus, Settings, Sparkles, HeartPulse, Stethoscope } from 'lucide-react';
import { Patient, Appointment } from '../types';

interface DashboardStatsProps {
  patients: Patient[];
  appointments: Appointment[];
  onNavigate: (tab: string) => void;
  onSelectPatient: (patientId: string) => void;
}

export default function DashboardStats({ patients, appointments, onNavigate, onSelectPatient }: DashboardStatsProps) {
  // Compute key stats
  const totalPatients = patients.length;
  
  const todayStr = useMemo(() => {
    // Return today format YYYY-MM-DD
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const todayAppointments = useMemo(() => {
    return appointments.filter(apt => apt.date === todayStr);
  }, [appointments, todayStr]);

  const ongoingAptsCount = todayAppointments.filter(apt => apt.status === 'Scheduled').length;
  const completedAptsCount = todayAppointments.filter(apt => apt.status === 'Completed').length;

  const pendingLabsCount = useMemo(() => {
    return patients.reduce((acc, p) => {
      const pendingInPatient = p.labResults?.filter(l => l.status === 'Pending').length || 0;
      return acc + pendingInPatient;
    }, 0);
  }, [patients]);

  const waSentCount = useMemo(() => {
    return appointments.filter(apt => apt.whatsappStatus === 'Sent').length;
  }, [appointments]);

  // Priority notifications feed
  const alerts = useMemo(() => {
    const list: { id: string; msg: string; type: 'warning' | 'info' | 'success'; link?: string; patientId?: string }[] = [];
    
    // Check if any patients have dangerous blood pressure in their latest records (> 140 systolic or > 90 diastolic)
    patients.forEach(p => {
      if (p.vitals && p.vitals.length > 0) {
        const latest = p.vitals[0];
        const bpParts = latest.bloodPressure.split('/');
        if (bpParts.length === 2) {
          const sys = parseInt(bpParts[0], 10);
          const dia = parseInt(bpParts[1], 10);
          if (sys >= 140 || dia >= 90) {
            list.push({
              id: `bp-${p.id}`,
              msg: `Alert Vital: ${p.name} mencatat tekanan darah tinggi (${latest.bloodPressure} mmHg)`,
              type: 'warning',
              patientId: p.id
            });
          }
        }
      }
    });

    // Check if any scheduled appointment today has whatsappStatus pending
    todayAppointments.forEach(apt => {
      if (apt.status === 'Scheduled' && apt.whatsappStatus === 'Pending') {
        list.push({
          id: `wa-${apt.id}`,
          msg: `Notifikasi WA keberangkatan belum dikirim ke ${apt.patientName} (${apt.time})`,
          type: 'info'
        });
      }
    });

    // No show or cancelled alerts
    appointments.forEach(apt => {
      if (apt.date === todayStr && apt.status === 'No_Show') {
        list.push({
          id: `noshow-${apt.id}`,
          msg: `Pasien ${apt.patientName} absen (No-Show) pada konsultasi jam ${apt.time}`,
          type: 'warning'
        });
      }
    });

    return list;
  }, [patients, todayAppointments, appointments, todayStr]);

  // Recent patients registered
  const recentPatients = useMemo(() => {
    return [...patients].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 4);
  }, [patients]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-br from-sage-600 to-sage-700 text-white p-6 rounded-2xl card-shadow relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-white/10 to-transparent pointer-events-none" />
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2 text-sage-200 text-xs font-mono uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            Exora Clinic OS Integrated Platform
          </div>
          <h1 className="text-2xl md:text-3xl font-serif italic tracking-tight">
            Selamat datang kembali Dokter
          </h1>
          <p className="text-sage-100 text-xs md:text-sm font-sans max-w-xl">
            Sistem operasi klinik berjalan optimal. Data sinkronisasi pasien, rekam medis komprehensif, dan pengingat WhatsApp siap beroperasi hari ini.
          </p>
        </div>
        <div className="flex gap-2 relative z-10 w-full md:w-auto">
          <button 
            id="btn-nav-pat"
            onClick={() => onNavigate('Pasien')}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 bg-white hover:bg-sage-50 text-sage-700 text-xs font-bold px-4 py-2.5 rounded-lg transition-colors cursor-pointer card-shadow"
          >
            <Plus className="w-4 h-4" /> Pasien Baru
          </button>
          <button 
            id="btn-nav-apt"
            onClick={() => onNavigate('Penjadwalan')}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 bg-sage-700/50 hover:bg-sage-600 text-white text-xs border border-sage-500 font-semibold px-4 py-2.5 rounded-lg transition-colors cursor-pointer"
          >
            <Calendar className="w-4 h-4" /> Janji Temu
          </button>
        </div>
      </div>

      {/* Analytics Bento Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: 'Total Pasien Registered',
            value: totalPatients,
            subtitle: `${patients.filter(p => new Date(p.createdAt).getMonth() === new Date().getMonth()).length} bulan ini`,
            icon: Users,
            color: 'text-sage-700 bg-sage-50 border-sage-200',
          },
          {
            title: 'Kunjungan Hari Ini',
            value: todayAppointments.length,
            subtitle: `${ongoingAptsCount} antrean, ${completedAptsCount} selesai`,
            icon: Calendar,
            color: 'text-sage-700 bg-sage-100 border-sage-200',
          },
          {
            title: 'Hasil Lab Pending',
            value: pendingLabsCount,
            subtitle: 'Menunggu konfirmasi analis',
            icon: AlertCircle,
            color: pendingLabsCount > 0 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-sage-400 bg-sage-50 border-sage-100',
          },
          {
            title: 'Notifikasi WA Terkirim',
            value: waSentCount,
            subtitle: 'Tanpa gateway berbayar',
            icon: MessageSquareCode,
            color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
          },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white border border-sage-200 p-5 rounded-2xl card-shadow flex flex-col justify-between"
            >
              <div className="flex justify-between items-start">
                <span className="text-sage-500 text-xs font-medium tracking-tight line-clamp-1">{card.title}</span>
                <span className={`p-2 rounded-xl text-lg ${card.color} border`}>
                  <Icon className="w-4.5 h-4.5" />
                </span>
              </div>
              <div className="mt-4">
                <span className="text-2xl md:text-3xl font-sans font-semibold text-sage-900">{card.value}</span>
                <p className="text-sage-400 text-[11px] mt-1 font-sans">{card.subtitle}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column (2/3 width on large screens) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today Queue */}
          <div className="bg-white border border-sage-200 rounded-2xl p-5 card-shadow">
            <div className="flex justify-between items-center mb-4">
              <div className="space-y-1">
                <h3 className="font-sans font-semibold text-sage-800 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-sage-600" />
                  Alur Kunjungan & Antrean Hari Ini
                </h3>
                <p className="text-sage-400 text-xs">Daftar janji temu aktual klinik untuk tanggal hari ini</p>
              </div>
              <span className="bg-sage-50 text-sage-600 text-[10px] font-mono border border-sage-200 px-2 py-0.5 rounded">
                {todayStr}
              </span>
            </div>

            {todayAppointments.length === 0 ? (
              <div className="border border-dashed border-sage-200 rounded-xl p-8 text-center text-sage-400">
                <Calendar className="w-8 h-8 mx-auto stroke-1 mb-2 text-sage-300" />
                <p className="text-xs">Tidak ada jadwal kunjungan pasien hari ini.</p>
                <button 
                  onClick={() => onNavigate('Penjadwalan')}
                  className="mt-3 text-xs text-sage-600 hover:text-sage-700 font-medium cursor-pointer"
                >
                  + Tambah Jadwal Baru
                </button>
              </div>
            ) : (
              <div className="divide-y divide-sage-100">
                {todayAppointments.map((apt) => (
                  <div key={apt.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="font-mono text-xs text-sage-600 bg-sage-50 border border-sage-200 p-2 rounded-lg w-12 text-center font-semibold">
                        {apt.time}
                      </div>
                      <div>
                        <h4 
                          onClick={() => onSelectPatient(apt.patientId)}
                          className="text-xs font-semibold text-sage-900 hover:text-sage-600 cursor-pointer transition-colors flex items-center gap-1.5"
                        >
                          {apt.patientName}
                        </h4>
                        <p className="text-[11px] text-sage-500 max-w-sm line-clamp-1">{apt.reason}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* WA indicator */}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        apt.whatsappStatus === 'Sent' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                        : 'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}>
                        WhatsApp {apt.whatsappStatus === 'Sent' ? 'Sent' : 'Pending'}
                      </span>

                      {/* Consultation status */}
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium ${
                        apt.status === 'Completed' 
                          ? 'bg-sage-100 text-sage-700 border border-sage-200'
                          : apt.status === 'Cancelled'
                          ? 'bg-rose-50 text-rose-700 border border-rose-100'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {apt.status === 'Completed' ? 'Selesai' : apt.status === 'Cancelled' ? 'Batal' : 'Daftar Antrean'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Vitals Trends Indicator Panel */}
          <div className="bg-white border border-sage-200 rounded-2xl p-5 card-shadow">
            <div className="mb-4 space-y-1">
              <h3 className="font-sans font-semibold text-sage-800 flex items-center gap-2">
                <HeartPulse className="w-4.5 h-4.5 text-sage-600 animate-pulse" />
                Panduan Tren Tanda Vital & Indeks Massa Tubuh (BMI)
              </h3>
              <p className="text-slate-400 text-xs">Pedoman batasan klasifikasi klinis acuan dokter</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3.5 bg-sage-50 border border-sage-200 rounded-xl space-y-2">
                <div className="text-xs font-semibold text-sage-800">Tekanan Darah (mmHg)</div>
                <ul className="text-[10px] space-y-1.5 text-sage-600 font-sans">
                  <li className="flex justify-between border-b border-sage-100 pb-0.5"><span className="text-emerald-700 font-medium">Normal:</span> &lt; 120 / 80</li>
                  <li className="flex justify-between border-b border-sage-100 pb-0.5"><span className="text-amber-700 font-semibold">Pre-H.:</span> 120-139 / 80-89</li>
                  <li className="flex justify-between"><span className="text-rose-700 font-semibold">Hipertensi:</span> &ge; 140 / 90</li>
                </ul>
              </div>

              <div className="p-3.5 bg-sage-50 border border-sage-200 rounded-xl space-y-2">
                <div className="text-xs font-semibold text-sage-800">BMI / IMT (kg/m²)</div>
                <ul className="text-[10px] space-y-1.5 text-sage-600">
                  <li className="flex justify-between border-b border-sage-100 pb-0.5"><span className="text-sage-600 font-semibold">Underweight:</span> &lt; 18.5</li>
                  <li className="flex justify-between border-b border-sage-100 pb-0.5"><span className="text-emerald-700 font-semibold">Normal:</span> 18.5 - 24.9</li>
                  <li className="flex justify-between"><span className="text-rose-700 font-semibold">Overweight:</span> &ge; 25.0</li>
                </ul>
              </div>

              <div className="p-3.5 bg-sage-50 border border-sage-200 rounded-xl space-y-2">
                <div className="text-xs font-semibold text-sage-800">Saturasi Oksigen & Suhu</div>
                <ul className="text-[10px] space-y-1.5 text-sage-600">
                  <li className="flex justify-between border-b border-sage-100 pb-0.5"><span className="text-emerald-700 font-semibold">SpO2:</span> 95% - 100% (Normal)</li>
                  <li className="flex justify-between border-b border-sage-100 pb-0.5"><span className="text-amber-700 font-semibold">Subfebris:</span> 37.3°C - 38.0°C</li>
                  <li className="flex justify-between"><span className="text-rose-700 font-semibold">Demam:</span> &gt; 38.0°C</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Alerts & Patients List Column (1/3 width) */}
        <div className="space-y-6">
          {/* Active Tickers Panel */}
          <div className="bg-white border border-sage-200 rounded-2xl p-5 card-shadow">
            <h3 className="font-sans font-semibold text-sage-800 mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-sage-600" />
              Notifikasi Keamanan & Alur Kerja
            </h3>
            
            {alerts.length === 0 ? (
              <p className="text-xs text-sage-500 italic">Sistem aman, belum ada rekam medis darurat hari ini.</p>
            ) : (
              <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
                {alerts.map(alert => (
                  <div 
                    key={alert.id} 
                    onClick={() => alert.patientId && onSelectPatient(alert.patientId)}
                    className={`p-2.5 rounded-lg text-[11px] border leading-relaxed transition-all ${
                      alert.type === 'warning' 
                        ? 'bg-rose-50/70 border-rose-100 text-rose-800 cursor-pointer hover:bg-rose-50' 
                        : 'bg-sage-50 border-sage-200 text-sage-800 cursor-pointer hover:bg-sage-100'
                    }`}
                  >
                    {alert.msg}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Newest Patient List */}
          <div className="bg-white border border-sage-200 rounded-2xl p-5 card-shadow">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-sans font-semibold text-sage-800 flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-sage-600" />
                Pasien Baru Terdaftar
              </h3>
              <button 
                onClick={() => onNavigate('Pasien')}
                className="text-[10px] text-sage-600 font-medium hover:underline cursor-pointer"
              >
                Lihat Semua
              </button>
            </div>

            <div className="space-y-3">
              {recentPatients.map(p => (
                <div 
                  key={p.id}
                  onClick={() => onSelectPatient(p.id)}
                  className="p-2.5 rounded-xl border border-sage-200 bg-sage-50/50 hover:bg-sage-100/50 cursor-pointer transition-all flex justify-between items-center"
                >
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-semibold text-sage-800 line-clamp-1">{p.name}</h4>
                    <p className="text-[10px] text-sage-500 font-mono">ID: {p.id}</p>
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                    p.gender === 'Laki-laki' ? 'bg-sage-100 text-sage-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {p.gender === 'Laki-laki' ? 'L' : 'P'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
