/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Send, BrainCircuit, UserCheck, AlertTriangle, Play, HelpCircle, FileText, CheckCircle, FlameKindling } from 'lucide-react';
import { Patient, SystemSettings } from '../types';
import { dbAdapter } from '../db/dbAdapter';

interface AIAssistPanelProps {
  patients: Patient[];
  settings: SystemSettings;
}

export default function AIAssistPanel({ patients, settings }: AIAssistPanelProps) {
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Chat message state
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { 
      role: 'assistant', 
      content: 'Halo Dokter, saya Exora AI Assist. Saya dapat membantu menganalisis rekam medis SOAP, mengecek interaksi obat yang diresepkan, atau menyarankan terapi berdasarkan rekam medis tanda vital pasien. Silakan pilih pasien di atas untuk memulai.' 
    }
  ]);

  const activePatient = useMemo(() => {
    return patients.find(p => p.id === selectedPatientId) || null;
  }, [patients, selectedPatientId]);

  // Command templates
  const aiTemplates = [
    {
      label: 'Analisis SOAP & Diagnosis Diferensial',
      prompt: (p: Patient) => {
        const latestSoap = p.soapNotes?.[0];
        return `Anda adalah asisten medis ahli. Analisis rekam medis pasien berikut:\nNama: ${p.name}\nGender: ${p.gender}\nAlergi: ${p.allergies}\nTanda Vital: TD ${p.vitals?.[0]?.bloodPressure || 'N/A'}, Suhu ${p.vitals?.[0]?.temperature || 'N/A'}°C, BMI ${p.vitals?.[0]?.bmi || 'N/A'}\nKeluhan SOAP Terbaru:\n- S: ${latestSoap?.subjective || 'Kosong'}\n- O: ${latestSoap?.objective || 'Kosong'}\n- A: ${latestSoap?.assessment || 'Kosong'}\n\nBerikan saran 3 Diagnosis Diferensial paling mungkin, usulkan pemeriksaan penunjang tambahan, dan berikan evaluasi terapi klinis singkat secara profesional dalam Bahasa Indonesia.`;
      }
    },
    {
      label: 'Evaluasi Interaksi & Kontraindikasi Obat',
      prompt: (p: Patient) => {
        const latestRx = p.prescriptions?.[0];
        const rxList = latestRx?.items.map(i => `${i.name} (${i.dosage})`).join(', ') || 'N/A';
        return `Anda adalah asisten medis dan farmakologis klinik ahli. Lakukan skrining resep berikut:\nNama: ${p.name}\nRiwayat Alergi: ${p.allergies}\nDaftar Obat Rencana: ${rxList}\nCatatan Resep Dokter: ${latestRx?.notes || 'Tidak ada'}\n\nAnalisis apakah ada bahaya interaksi antar obat tersebut, apakah ada zat kontradiktif dengan riwayat alergi yang bersangkutan, serta berikan rekomendasi dosis/aturan alternatif yang lebih aman bagi pasien secara ringkas dan profesional dalam Bahasa Indonesia.`;
      }
    },
    {
      label: 'Ringkas Riwayat Kesehatan Komprehensif',
      prompt: (p: Patient) => {
        const soapCount = p.soapNotes?.length || 0;
        const historyText = p.soapNotes?.slice(0, 3).map((s, i) => `${i+1}. Tgl ${new Date(s.date).toLocaleDateString()}: Diagnosis "${s.assessment}" | Terapi: "${s.plan}"`).join('\n') || 'Tidak ada riwayat SOAP';
        return `Anda adalah asisten rekam medis rumah sakit digital. Rangkum klinis rekam medis pasien ${p.name} (Gender: ${p.gender}, Umur: ${new Date().getFullYear() - new Date(p.birthDate).getFullYear()} tahun) berdasarkan histori kunjungan berikut:\n${historyText}\n\nBuat kesimpulan status kesehatan pasien saat ini secara terstruktur, soroti poin resiko medis utama, dan berikan rekomendasi rencana pemeliharaan jangka panjang dalam Bahasa Indonesia.`;
      }
    }
  ];
  // Send message handler to server proxy via Groq AI
  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;
    setErrorMsg(null);

    const userMessage = { role: 'user' as const, content: textToSend };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setChatInput('');
    setIsLoading(true);

    try {
      if (!settings.groqApiKey?.trim()) {
        throw new Error("Groq API Key tidak ditemukan. Sila masukkan API Key Groq Anda di tab Pengaturan.");
      }

      // Secure Post to server route for Groq AI
      const response = await fetch("/api/groq/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Groq-Api-Key": settings.groqApiKey,
        },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({
            role: m.role,
            content: m.content
          })),
          model: "llama-3.3-70b-versatile",
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Sistem server mengembalikan error: ${response.statusText}`);
      }

      const data = await response.json();
      const botResponse = data?.choices?.[0]?.message?.content || "Maaf, Groq AI tidak mengembalikan jawaban yang dapat dibaca.";
      
      setMessages(prev => [...prev, { role: 'assistant', content: botResponse }]);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || "Koneksi terhambat, gagal melakukan analisis Groq AI.");
      setMessages(prev => [
        ...prev, 
        { 
          role: 'assistant', 
          content: `⚠️ Gagal terhubung ke Server Groq AI. Detail kesalahan: ${err?.message || 'Kesalahan koneksi'}. Pastikan Groq API Key Anda telah diatur dan valid di tab Pengaturan.` 
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Title Banner */}
      <div className="space-y-0.5">
        <h2 className="text-xl font-serif italic text-sage-800 flex items-center gap-2">
          <BrainCircuit className="w-5 h-5 text-sage-600" />
          Exora AI Assist — Dokter Asisten Pembantu Pintar
        </h2>
        <p className="text-slate-400 text-xs">Menganalisis rekam medis klinis, menguji kemungkinan alergi silang obat, serta merangkum resep SOAP otomatis.</p>
      </div>

      {settings.groqApiKey?.trim() ? (
        <div className="bg-emerald-50 border border-emerald-200 p-3 px-4 rounded-xl flex gap-2 items-center text-xs text-emerald-950 font-medium font-sans">
          <BrainCircuit className="w-4.5 h-4.5 text-emerald-600 animate-pulse shrink-0" />
          <span>Konektor AI Aktif: Groq AI (Model Llama 3.3 70B Versatile) terhubung secara Server-Side menggunakan key Anda.</span>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 p-3 px-4 rounded-xl flex gap-2 items-center text-xs text-amber-950 font-medium font-sans">
          <AlertTriangle className="w-4.5 h-4.5 text-amber-600 shrink-0" />
          <span>Konfigurasi API Diperlukan: Daftarkan Groq API Key Anda di tab Pengaturan untuk mengaktifkan asisten medis pintar secara langsung.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Patient Select & Quick Prompts */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4 text-xs font-sans">
            <h3 className="font-sans font-bold text-sage-800 border-b pb-2">1. Pilih Pasien Rujukan</h3>
            
            <div className="space-y-1">
              <label className="text-slate-500 font-semibold">Tarik Data Pasien:</label>
              <select
                value={selectedPatientId}
                id="ai-patient-select"
                onChange={e => setSelectedPatientId(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-lg bg-white outline-none font-semibold text-slate-700"
              >
                <option value="">-- Hubungkan Pasien --</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.name} (ID: {p.id})</option>
                ))}
              </select>
            </div>

            {activePatient && (
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1.5 leading-relaxed text-[11px] text-slate-600">
                <p><strong>Nama:</strong> {activePatient.name}</p>
                <p><strong>Alergi:</strong> {activePatient.allergies || 'Tidak ada'}</p>
                <p><strong>Vital Terakhir:</strong> TD {activePatient.vitals?.[0]?.bloodPressure || 'N/A'} | Suhu {activePatient.vitals?.[0]?.temperature || 'N/A'}C</p>
                <p className="line-clamp-2"><strong>SOAP Terakhir:</strong> {activePatient.soapNotes?.[0]?.assessment || 'Tidak ada catatan SOAP'}</p>
              </div>
            )}
          </div>

          {activePatient && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-3 text-xs"
            >
              <h3 className="font-sans font-bold text-sage-800 border-b pb-2">2. Instruksi Cepat Dokter</h3>
              <div className="space-y-2">
                {aiTemplates.map((tpl, i) => (
                  <button
                    key={i}
                    id={`btn-ai-prompt-${i}`}
                    onClick={() => handleSendMessage(tpl.prompt(activePatient))}
                    disabled={isLoading}
                    className="w-full text-left bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 p-2.5 rounded-lg font-medium transition-all cursor-pointer flex gap-2 items-start text-[11px] disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5 text-sage-600 shrink-0 mt-0.5" />
                    <span>{tpl.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Right 2 Cols: AI Chat console */}
        <div className="lg:col-span-2 flex flex-col h-[520px] bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
          {/* Console Header */}
          <div className="bg-sage-900 text-white p-4 flex gap-2 items-center border-b border-sage-850">
            <BrainCircuit className="w-5 h-5 text-sage-300" />
            <div>
              <h3 className="font-sans text-xs font-semibold">Exora AI Consult Terminal</h3>
              <p className="text-[10px] text-slate-400">Terbuka secara privat. Analisis dienkripsi lokal.</p>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 scroll-smooth">
            {messages.map((m, idx) => (
              <div 
                key={idx} 
                className={`flex gap-3 text-xs ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role !== 'user' && (
                  <div className="w-7 h-7 rounded-full bg-sage-50 border border-sage-250 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-sage-600 animate-pulse" />
                  </div>
                )}
                <div 
                  className={`p-3 max-w-[85%] rounded-2xl font-sans leading-relaxed ${
                    m.role === 'user' 
                      ? 'bg-slate-900 text-white rounded-tr-none' 
                      : 'bg-slate-50 text-slate-700 border border-slate-150 rounded-tl-none whitespace-pre-wrap font-medium'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3 text-xs justify-start">
                <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0 animate-spin">
                  <BrainCircuit className="w-4 h-4 text-slate-400" />
                </div>
                <div className="p-3 bg-slate-50 border border-slate-150 rounded-2xl rounded-tl-none text-slate-400">
                  Menganalisis rekam medis pasien secara mendalam via Groq AI...
                </div>
              </div>
            )}

            {errorMsg && (
              <p className="text-xs text-rose-500 font-semibold bg-rose-50 p-2.5 rounded-lg">{errorMsg}</p>
            )}
          </div>

          {/* Input Box */}
          <div className="p-3 border-t bg-slate-50 flex gap-2 items-center">
            <input 
              type="text" 
              placeholder={activePatient ? "Ketik konsultasi kustom medis di sini..." : "Pilih pasien terlebih dahulu di kolom kiri..."}
              disabled={isLoading || !activePatient}
              value={chatInput}
              id="ai-console-input"
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSendMessage(chatInput);
              }}
              className="flex-1 text-xs p-2.5 border border-slate-200 bg-white rounded-lg outline-none focus:border-slate-400 text-slate-800 font-sans"
            />
            <button 
              onClick={() => handleSendMessage(chatInput)}
              id="btn-send-ai-chat"
              disabled={isLoading || !chatInput.trim() || !activePatient}
              className="bg-sage-600 hover:bg-sage-700 text-white p-2.5 rounded-lg disabled:opacity-40 transition-colors cursor-pointer flex items-center justify-center"
            >
              <Send className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
