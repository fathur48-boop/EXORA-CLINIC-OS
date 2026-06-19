/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { dbAdapter } from '../db/dbAdapter';
import { Appointment } from '../types';
import { 
  Volume2, Play, Users, Tv, Megaphone, ArrowRight, 
  HelpCircle, Sparkles, AlertCircle, RefreshCw, Layers
} from 'lucide-react';

interface AntreanPanelProps {
  appointments: Appointment[];
  onRefreshAll: () => void;
}

export default function AntreanPanel({ appointments, onRefreshAll }: AntreanPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<'Petugas' | 'TVDisplay'>('Petugas');
  const [callingPatient, setCallingPatient] = useState<{ number: string; name: string } | null>(null);
  const [speechActive, setSpeechActive] = useState(false);
  const [localAppointments, setLocalAppointments] = useState<Appointment[]>(appointments);

  // Load and refresh
  const loadAppointments = () => {
    const list = dbAdapter.getAppointments();
    // Pre-assign queueNumber if not set
    const withQueue = list.map((apt, idx) => {
      if (!apt.queueNumber) {
        apt.queueNumber = `A-${String(idx + 1).padStart(2, '0')}`;
      }
      return apt;
    });
    setLocalAppointments(withQueue);
  };

  useEffect(() => {
    loadAppointments();
  }, [appointments]);

  const activeQueueList = useMemo(() => {
    // Only patients representing today's clinic schedule
    return localAppointments.filter(apt => apt.status !== 'Cancelled' && apt.status !== 'No_Show');
  }, [localAppointments]);

  // Current calling ticket details
  const currentlyExaminedName = useMemo(() => {
    const active = activeQueueList.find(a => a.status === 'Completed');
    return active ? `${active.queueNumber} - ${active.patientName}` : 'Belum Ada';
  }, [activeQueueList]);

  const nextQueueTickets = useMemo(() => {
    return activeQueueList.filter(a => a.status === 'Scheduled').slice(0, 3);
  }, [activeQueueList]);

  // ==========================================
  // WEB AUDIO DING-DONG SYNTH CHIME (NO FILE ASSETS REQUIRED)
  // ==========================================
  const playDingDongChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Tone 1: E5
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
      gain1.gain.setValueAtTime(0.4, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start();
      osc1.stop(audioCtx.currentTime + 0.8);
      
      // Tone 2: C5 played shortly after
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(523.25, audioCtx.currentTime + 0.35); // C5
      gain2.gain.setValueAtTime(0, audioCtx.currentTime);
      gain2.gain.setValueAtTime(0.4, audioCtx.currentTime + 0.35);
      gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.25);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(audioCtx.currentTime + 0.35);
      osc2.stop(audioCtx.currentTime + 1.25);
    } catch (err) {
      console.warn("Speech audio chime failed to trigger:", err);
    }
  };

  // ==========================================
  // TEXT TO SPEECH (INDONESIAN VOICE ANNOUNCEMENT)
  // ==========================================
  const handlePanggilSuara = (queueNum: string, patientName: string) => {
    if (speechActive) return;
    setSpeechActive(true);
    setCallingPatient({ number: queueNum, name: patientName });

    // Step 1: Play Ding-Dong chime
    playDingDongChime();

    // Step 2: Speech Synthesis in Indonesian after Chime delay
    setTimeout(() => {
      try {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel(); // Stop active speech

          // Format voice message: e.g. "Nomor antrean A-02, atas nama Ahmad Fauzan, silakan menuju ke ruang periksa."
          // Add letter spaces to make queue number reading clear (e.g. "A kosong dua" instead of "a strip nol dua")
          const cleanQueue = queueNum.replace('-', ' ');
          const messageText = `Nomor antrean, ${cleanQueue}, atas nama, ${patientName}, silakan menuju ke ruang periksa dokter.`;
          
          const utterance = new SpeechSynthesisUtterance(messageText);
          utterance.lang = 'id-ID';
          utterance.rate = 0.85; // Natural speed
          utterance.pitch = 1.0;

          // Attempt to locate an Indonesian voice, otherwise fallback to default
          const voices = window.speechSynthesis.getVoices();
          const idVoice = voices.find(v => v.lang.startsWith('id') || v.lang.includes('Indonesian'));
          if (idVoice) {
            utterance.voice = idVoice;
          }

          utterance.onend = () => {
            setSpeechActive(false);
            setCallingPatient(null);
          };

          utterance.onerror = () => {
            setSpeechActive(false);
            setCallingPatient(null);
          };

          window.speechSynthesis.speak(utterance);
        } else {
          setSpeechActive(false);
          setCallingPatient(null);
          alert('Sistem browser Anda tidak mendukung Speech Synthesis / Panggilan Suara.');
        }
      } catch (err) {
        console.error('Speech synthesis failure:', err);
        setSpeechActive(false);
        setCallingPatient(null);
      }
    }, 1200);
  };

  const setAsInsideDoctorRoom = (aptId: string) => {
    // Set status to Completed (which means inside medical examiner room in our flow)
    dbAdapter.updateAppointmentStatus(aptId, 'Completed');
    loadAppointments();
    onRefreshAll();
  };

  const handleResetQueue = () => {
    // Reset all status back to scheduled for testing
    const original = dbAdapter.getAppointments();
    original.forEach(apt => {
      apt.status = 'Scheduled';
    });
    dbAdapter.saveAppointments(original);
    loadAppointments();
    onRefreshAll();
  };

  return (
    <div className="space-y-6">
      
      {/* Tab controls */}
      <div className="flex justify-between items-center bg-white border border-sage-200 px-4 py-2.5 rounded-2xl card-shadow">
        <div className="flex gap-2">
          <button 
            id="queuesub-petugas"
            onClick={() => setActiveSubTab('Petugas')}
            className={`flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer ${
              activeSubTab === 'Petugas' 
                ? 'bg-sage-600 text-white shadow-md' 
                : 'text-sage-500 hover:bg-slate-100 hover:text-sage-700'
            }`}
          >
            <Megaphone className="w-4 h-4" /> Manajemen Panggil Antrean (Dokter / Suster)
          </button>
          
          <button 
            id="queuesub-tv"
            onClick={() => setActiveSubTab('TVDisplay')}
            className={`flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer ${
              activeSubTab === 'TVDisplay' 
                ? 'bg-sage-600 text-white shadow-md' 
                : 'text-sage-500 hover:bg-slate-100 hover:text-sage-700'
            }`}
          >
            <Tv className="w-4 h-4" /> TV Monitor Antrean Ruang Tunggu (TV Display)
          </button>
        </div>

        <button 
          onClick={loadAppointments}
          className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl cursor-pointer"
          title="Sinkronisasi Antrean"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {activeSubTab === 'Petugas' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Queue Management Board (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-sage-200 p-5 rounded-2xl card-shadow space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div className="space-y-0.5">
                  <h3 className="font-display font-medium text-slate-800 text-sm">Operator Antrean Harian</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Klik pengeras suara untuk memanggil suara audio klinis secara real-time.</p>
                </div>
                
                <button 
                  onClick={handleResetQueue}
                  className="text-[10px] text-red-650 font-bold bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg border border-red-100 transition-colors cursor-pointer"
                >
                  Reset Semua Antrean
                </button>
              </div>

              {/* Status banner */}
              {callingPatient && (
                <div className="bg-gradient-to-r from-sage-600 to-emerald-600 text-white p-3.5 rounded-xl flex items-center justify-between animate-pulse">
                  <div className="flex items-center gap-3">
                    <Volume2 className="w-5 h-5 text-white" />
                    <div className="text-xs">
                      <span className="font-bold underline">SEDANG MEMANGGIL:</span>
                      <p className="font-semibold">{callingPatient.number} • {callingPatient.name}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono tracking-widest bg-black/20 p-1 rounded">TTS SYSTEM ACTIVE</span>
                </div>
              )}

              {/* Patient Queue listing table */}
              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left text-xs bg-white">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-4">no tiketing</th>
                      <th className="py-3 px-2">Jam Reservasi</th>
                      <th className="py-3 px-3">Nama Lengkap Pasien</th>
                      <th className="py-3 px-2 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Aksi Panggilan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeQueueList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-slate-400 italic font-medium">Tidak ada jadwal antrean pasien aktif hari ini.</td>
                      </tr>
                    ) : (
                      activeQueueList.map(apt => (
                        <tr key={apt.id} className={`hover:bg-slate-50/50 ${apt.status === 'Completed' ? 'bg-indigo-50/10' : ''}`}>
                          <td className="py-3 px-4 font-mono font-bold text-sage-700 text-xs">{apt.queueNumber}</td>
                          <td className="py-3 px-2 font-semibold font-mono text-slate-650">{apt.time} WIB</td>
                          <td className="py-3 px-3">
                            <span className="font-semibold text-slate-800 text-xs block">{apt.patientName}</span>
                            <span className="text-[10px] text-slate-400">Tujuan: {apt.reason}</span>
                          </td>
                          <td className="py-3 px-2 text-center">
                            {apt.status === 'Completed' ? (
                              <span className="bg-indigo-100 text-indigo-800 text-[9px] font-bold px-2 py-0.5 rounded border border-indigo-200 font-mono">DIPERIKSA (IN-ROOM)</span>
                            ) : (
                              <span className="bg-slate-100 text-slate-700 text-[9px] font-bold px-2 py-0.5 rounded border border-slate-200 font-mono">WAITING (ANTRE)</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-1.5 justify-center">
                              <button 
                                onClick={() => handlePanggilSuara(apt.queueNumber || 'A-00', apt.patientName)}
                                disabled={speechActive}
                                className="inline-flex items-center gap-1.5 text-[11px] bg-sage-50 hover:bg-sage-600 hover:text-white text-sage-700 font-bold px-3 py-1.5 rounded-lg border border-sage-200 transition-colors cursor-pointer disabled:opacity-40"
                              >
                                <Volume2 className="w-3.5 h-3.5" /> Panggil Suara (TTS)
                              </button>
                              
                              {apt.status !== 'Completed' && (
                                <button 
                                  onClick={() => setAsInsideDoctorRoom(apt.id)}
                                  className="text-[11px] bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 font-bold px-3 py-1.5 rounded-lg border border-indigo-100 transition-colors cursor-pointer"
                                  title="Silakan masuk ruang periksa"
                                >
                                  Mulai Diperiksa →
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Sidebar Status Board View (1/3 width) */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-5 rounded-3xl card-shadow space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] text-indigo-300 font-mono tracking-widest uppercase block">CLINICAL STATUS BANNER</span>
                <h3 className="font-display font-medium text-white text-sm">Nomor Sedang Diperiksa</h3>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center space-y-2">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">RUANG PERIKSA DOKTER</p>
                <div className="text-4xl font-display font-extrabold text-emerald-400 tracking-wide font-mono">
                  {currentlyExaminedName.split(' - ')[0]}
                </div>
                <p className="font-semibold text-slate-100 text-xs line-clamp-1">{currentlyExaminedName.split(' - ')[1] || 'Mengantre/Kosong'}</p>
              </div>

              {/* Waiting Line Preview */}
              <div className="space-y-2 text-xs">
                <p className="text-indigo-200 font-bold text-[10px] uppercase">BERIKUTNYA DALAM ANTREAN:</p>
                <div className="divide-y divide-white/5 space-y-2 pt-1">
                  {nextQueueTickets.length === 0 ? (
                    <p className="text-[10px] text-slate-500 italic">Antrean berikutnya kosong.</p>
                  ) : (
                    nextQueueTickets.map((nxt, id) => (
                      <div key={id} className="flex justify-between items-center pt-2 text-slate-300">
                        <div className="flex gap-2 items-center">
                          <span className="font-mono bg-white/10 text-white font-bold px-1.5 py-0.5 rounded text-[10px]">{nxt.queueNumber}</span>
                          <span className="font-semibold line-clamp-1">{nxt.patientName}</span>
                        </div>
                        <span className="font-mono text-[10px] text-slate-400">{nxt.time}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Quick Helper Tips */}
            <div className="bg-white border border-sage-200 p-5 rounded-2xl card-shadow space-y-3 font-sans">
              <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                Dukungan Panggilan Pintar
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                Sistem ini tidak memerlukan kabel keras atau speaker khusus. Antrean memanggil langsung menggunakan audio default browser, meng-convert text menjadi suara manusia dalam logat Bahasa Indonesia resmi siap pakai.
              </p>
            </div>
          </div>

        </div>
      ) : (
        /* Immersive Waitroom TV Screen Simulator Subpage */
        <div className="bg-[#101827] border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 text-white min-h-[500px] flex flex-col justify-between relative overflow-hidden">
          {/* Top Board Header */}
          <div className="flex justify-between items-center border-b border-slate-800 pb-4">
            <div className="flex gap-3 items-center">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center font-bold text-xl shadow-lg ring-4 ring-indigo-500/10 animate-pulse">
                🏥
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight uppercase">{dbAdapter.getSettings().clinicName}</h2>
                <p className="text-[10px] text-indigo-400 font-mono">TAMPILAN MONITOR UTAMA RUANG TUNGGU PASIEN</p>
              </div>
            </div>

            {/* Simulated Live time */}
            <div className="text-right">
              <div className="text-xs font-semibold font-mono text-emerald-400">LIVE ANTREAN</div>
              <p className="text-[11px] font-mono text-slate-400">{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>

          {/* Big TV Screen Display Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6 flex-1 items-center">
            
            {/* Left Box: DIPANGGIL FLASH BANNER */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-xl flex flex-col justify-center min-h-[250px]">
              <span className="text-xs tracking-widest text-indigo-400 font-bold bg-indigo-950/40 p-2 rounded-xl inline-block max-w-fit mx-auto uppercase">
                {speechActive ? '📣 SEDANG DIPANGGIL' : 'Nomor Sedang Dilayani'}
              </span>

              <div className={`text-6xl font-display font-extrabold text-emerald-400 transition-all tracking-wider ${speechActive ? 'animate-bounce text-yellow-400 scale-105' : ''}`}>
                {callingPatient ? callingPatient.number : (currentlyExaminedName.split(' - ')[0] !== 'Belum Ada' ? currentlyExaminedName.split(' - ')[0] : 'STANDBY')}
              </div>

              <div className="space-y-0.5">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">NAMA PASIEN:</p>
                <h3 className="text-lg font-bold text-slate-200 truncate">
                  {callingPatient ? callingPatient.name : (currentlyExaminedName.split(' - ')[1] || 'Menunggu Pasien Berikutnya')}
                </h3>
              </div>
            </div>

            {/* Right Box: NEXT IN LINE SIDEBAR SCREEN */}
            <div className="bg-slate-900/30 border border-slate-800 rounded-3xl p-6 space-y-4">
              <h4 className="text-[11px] tracking-wider text-slate-400 font-bold uppercase border-b border-slate-800 pb-2">DAFTAR ANTREAN BERIKUTNYA</h4>
              <div className="space-y-3">
                {nextQueueTickets.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs font-medium italic">Tidak ada antrean berikutnya di ruang tunggu.</div>
                ) : (
                  nextQueueTickets.map((nxt, index) => (
                    <div key={index} className="flex justify-between items-center bg-slate-900/50 p-3 rounded-xl border border-slate-800 hover:border-slate-750 transition-colors">
                      <div className="flex gap-3 items-center">
                        <span className="text-xs font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-900 px-2.5 py-1 rounded-lg">{nxt.queueNumber}</span>
                        <span className="text-xs font-bold text-slate-100">{nxt.patientName}</span>
                      </div>
                      <span className="text-[10.5px] font-mono text-slate-500">Estimasi jam: {nxt.time}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Bottom Ticker/Moving text running horizontally */}
          <div className="bg-indigo-950/20 border border-indigo-900/40 p-2.5 rounded-xl overflow-hidden relative text-center">
            <div className="inline-block animate-marquee whitespace-nowrap text-indigo-300 font-medium text-xs">
              ⚠️ PENGUMUMAN : Mohon tertib mengantre. Siapkan Kartu Identitas Berobat, NIK, dan Kartu BPJS Anda sebelum dipanggil. Selalu jaga kebersihan area tunggu klinik Exora Health Care Suite.
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
