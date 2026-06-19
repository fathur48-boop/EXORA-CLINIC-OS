/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Search, Plus, UserPlus, HeartPulse, ClipboardCheck, Pill, FileSpreadsheet, 
  ChevronRight, Calendar, User, Phone, MapPin, Contact2, CheckCircle, Clock,
  ArrowLeft, Download, Eye, AlertTriangle, HelpCircle, Activity, ShieldCheck
} from 'lucide-react';
import { Patient, VitalSign, SOAPNote, Prescription, LabResult, PrescriptionItem } from '../types';
import { dbAdapter } from '../db/dbAdapter';

interface PatientsPanelProps {
  patients: Patient[];
  onRefresh: () => void;
  selectedPatientId: string | null;
  onSelectPatient: (patientId: string | null) => void;
}

export default function PatientsPanel({ patients, onRefresh, selectedPatientId, onSelectPatient }: PatientsPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGender, setFilterGender] = useState<string>('All');
  
  // Modals / Form toggles
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [showAddVitals, setShowAddVitals] = useState(false);
  const [showAddSOAP, setShowAddSOAP] = useState(false);
  const [showAddLab, setShowAddLab] = useState(false);

  // Printable documents generator states (Poin C)
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printDocType, setPrintDocType] = useState<'SuratSakit' | 'Rujukan' | 'Resep' | null>(null);
  const [activeSOAPForPrint, setActiveSOAPForPrint] = useState<SOAPNote | null>(null);
  
  // Surat Sakit Custom Fields
  const [sksDays, setSksDays] = useState(3);
  const [sksStartDate, setSksStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [sksDiagnosis, setSksDiagnosis] = useState('');

  // Rujukan Custom Fields
  const [referenceHospital, setReferenceHospital] = useState('RSUD Dr. Soetomo Surabaya');
  const [referenceSpecialist, setReferenceSpecialist] = useState('Spesialis Penyakit Dalam / Kardiologi');
  const [referenceReason, setReferenceReason] = useState('Diperlukan pemeriksaan penunjang hemodinamika dan evaluasi terapi lanjutan.');
  const [referenceDiagnosis, setReferenceDiagnosis] = useState('');

  // New Patient Form state
  const [newName, setNewName] = useState('');
  const [newBirthDate, setNewBirthDate] = useState('1990-01-01');
  const [newGender, setNewGender] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki');
  const [newPhone, setNewPhone] = useState('62812');
  const [newEmail, setNewEmail] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newBloodType, setNewBloodType] = useState<Patient['bloodType']>('Belum Tahu');
  const [newAllergies, setNewAllergies] = useState('');
  const [newEmergencyContact, setNewEmergencyContact] = useState('');
  const [newNik, setNewNik] = useState('');
  const [newOccupation, setNewOccupation] = useState('');

  // New Vitals Form state
  const [vitBp, setVitBp] = useState('120/80');
  const [vitHr, setVitHr] = useState(80);
  const [vitTemp, setVitTemp] = useState(36.5);
  const [vitWeight, setVitWeight] = useState(65);
  const [vitHeight, setVitHeight] = useState(165);
  const [vitSpo2, setVitSpo2] = useState(99);

  // New SOAP & Prescription form state
  const [soapSubj, setSoapSubj] = useState('');
  const [soapObj, setSoapObj] = useState('');
  const [soapAssess, setSoapAssess] = useState('');
  const [soapPlan, setSoapPlan] = useState('');
  const [incRx, setIncRx] = useState(false);
  const [rxItems, setRxItems] = useState<PrescriptionItem[]>([]);
  const [newRxName, setNewRxName] = useState('');
  const [newRxDosage, setNewRxDosage] = useState('500mg');
  const [newRxFreq, setNewRxFreq] = useState('3x sehari');
  const [newRxInstruct, setNewRxInstruct] = useState('Sesudah makan');
  const [newRxQty, setNewRxQty] = useState(10);
  const [rxNotes, setRxNotes] = useState('');

  // New Lab Request state
  const [labTestName, setLabTestName] = useState('');
  const [labFindings, setLabFindings] = useState('');
  const [labStatus, setLabStatus] = useState<'Pending' | 'Completed'>('Pending');

  // Filter patients
  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      const matchQuery = 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.phone && p.phone.includes(searchQuery)) ||
        (p.nik && p.nik.includes(searchQuery));
        
      const matchGender = filterGender === 'All' ? true : p.gender === filterGender;
      return matchQuery && matchGender;
    });
  }, [patients, searchQuery, filterGender]);

  const activePatient = useMemo(() => {
    if (!selectedPatientId) return null;
    return patients.find(p => p.id === selectedPatientId) || null;
  }, [patients, selectedPatientId]);

  // Handlers
  const handleCreatePatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return alert('Nama Pasien wajib diisi.');
    
    dbAdapter.addPatient({
      id: 'pat-' + Math.random().toString(36).substr(2, 5).toUpperCase(),
      name: newName,
      birthDate: newBirthDate,
      gender: newGender,
      phone: newPhone,
      email: newEmail,
      address: newAddress,
      bloodType: newBloodType,
      allergies: newAllergies || 'Tidak ada riwayat alergi obat/makanan',
      emergencyContact: newEmergencyContact,
      nik: newNik,
      occupation: newOccupation,
    });

    onRefresh();
    setShowAddPatient(false);
    // Reset forms
    setNewName('');
    setNewEmail('');
    setNewAddress('');
    setNewAllergies('');
    setNewEmergencyContact('');
    setNewNik('');
    setNewOccupation('');
  };

  const handleCreateVitals = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePatient) return;

    // Calculate BMI
    const heightInMeters = vitHeight / 100;
    const bmiVal = Number((vitWeight / (heightInMeters * heightInMeters)).toFixed(1));

    dbAdapter.addVitalSign(activePatient.id, {
      bloodPressure: vitBp,
      heartRate: Number(vitHr),
      temperature: Number(vitTemp),
      weight: Number(vitWeight),
      height: Number(vitHeight),
      bmi: bmiVal,
      oxygenSaturation: Number(vitSpo2),
      recordedBy: 'Suster Operasional'
    });

    onRefresh();
    setShowAddVitals(false);
  };

  const addRxItemToCart = () => {
    if (!newRxName.trim()) return;
    const item: PrescriptionItem = {
      name: newRxName,
      dosage: newRxDosage,
      frequency: newRxFreq,
      instruction: newRxInstruct,
      quantity: newRxQty,
    };
    setRxItems([...rxItems, item]);
    setNewRxName('');
  };

  const removeRxItemFromCart = (index: number) => {
    setRxItems(rxItems.filter((_, i) => i !== index));
  };

  const calculateAge = (birthDateString: string): number => {
    const today = new Date();
    const birthDate = new Date(birthDateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handlePrintDocument = () => {
    if (!activePatient || !activeSOAPForPrint) return;

    // Use window.open with detailed styles for standalone layout printing
    const pWindow = window.open('', '_blank');
    if (!pWindow) return alert('Izinkan popup browser untuk proses cetak dokumen.');

    const settings = dbAdapter.getSettings();
    const dateNowStr = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const formattedBirthDate = new Date(activePatient.birthDate).toLocaleDateString('id-ID');
    
    let docHTML = '';

    if (printDocType === 'SuratSakit') {
      const endD = new Date(sksStartDate);
      endD.setDate(endD.getDate() + sksDays - 1);
      const formattedEndDate = endD.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
      const formattedStartDate = new Date(sksStartDate).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });

      docHTML = `
        <html>
          <head>
            <title>Surat_Sakit_${activePatient.name}</title>
            <style>
              body { font-family: 'Times New Roman', serif; font-size: 14px; line-height: 1.6; color: #1e293b; padding: 40px; }
              .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 12px; margin-bottom: 25px; }
              .header h2 { font-size: 20px; font-weight: bold; margin: 0; }
              .header p { margin: 3px 0; font-size: 11px; color: #475569; }
              .doc-title { text-align: center; font-size: 16px; font-weight: bold; text-decoration: underline; margin-bottom: 30px; letter-spacing: 1px; }
              .doc-content { margin-bottom: 40px; }
              .field-row { display: flex; margin-bottom: 6px; }
              .field-label { width: 140px; font-weight: bold; }
              .signature { float: right; text-align: center; margin-top: 55px; width: 250px; }
              .stamp { border: 1px dashed #94a3b8; display: inline-block; padding: 15px; margin-top: 15px; font-size: 10px; color: #94a3b8; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>${settings.clinicName.toUpperCase()}</h2>
              <p>${settings.clinicAddress}</p>
              <p>Email: exora.care@gmail.com | Telpon: ${settings.clinicPhone}</p>
            </div>

            <div class="doc-title">SURAT KETERANGAN SAKIT & ISTIRAHAT</div>

            <div class="doc-content">
              <p>Yang bertanda tangan di bawah ini menerangkan bahwa:</p>
              <div class="field-row"><span class="field-label">Nama Lengkap</span><span>: ${activePatient.name}</span></div>
              <div class="field-row"><span class="field-label">Tgl Lahir / Umur</span><span>: ${formattedBirthDate} (${calculateAge(activePatient.birthDate)} Tahun)</span></div>
              <div class="field-row"><span class="field-label">Jenis Kelamin</span><span>: ${activePatient.gender}</span></div>
              <div class="field-row"><span class="field-label">NIK Pasien</span><span>: ${activePatient.nik || '-'}</span></div>
              <div class="field-row"><span class="field-label">Alamat Domisili</span><span>: ${activePatient.address || '-'}</span></div>
              
              <br/>
              <p>Berdasarkan pemeriksaan medis fisik yang saksama, bersangkutan dalam keadaan kurang sehat (sakit) sehingga memerlukan bantuan istirahat total selama <strong>${sksDays} hari</strong>.</p>
              <p>Terhitung mulai tanggal <strong>${formattedStartDate}</strong> s/d <strong>${formattedEndDate}</strong>.</p>
              <p>Diagnosis kerja / Alasan medis: <strong>${sksDiagnosis || 'Sakit Umum'}</strong></p>
              <br/>
              <p>Demikian surat keterangan sakit ini diterbitkan dengan sebenarnya agar dipergunakan sesuai kepentingan institusi maupun pekerjaan.</p>
            </div>

            <div class="signature">
              <p>Exora Clinic, ${dateNowStr}</p>
              <p>Salam Sejawat,</p>
              <br/><br/><br/><br/>
              <p><strong>${settings.defaultDoctorName}</strong></p>
              <p>SIPP: 442.2/091/IDI/SIPP-P/2026</p>
              <div class="stamp">Cap Basah Exora Clinic</div>
            </div>

            <script>
              window.onload = function() { window.print(); window.close(); }
            </script>
          </body>
        </html>
      `;
    } else if (printDocType === 'Rujukan') {
      docHTML = `
        <html>
          <head>
            <title>Surat_Rujukan_${activePatient.name}</title>
            <style>
              body { font-family: 'Times New Roman', serif; font-size: 13.5px; line-height: 1.5; color: #1e293b; padding: 40px; }
              .header { text-align: center; border-bottom: 2px double #000; padding-bottom: 12px; margin-bottom: 20px; }
              .header h2 { font-size: 19px; font-weight: bold; margin: 0; }
              .header p { margin: 3px 0; font-size: 11px; color: #475569; }
              .doc-title { text-align: center; font-size: 15px; font-weight: bold; text-decoration: underline; margin-bottom: 20px; }
              .field-row { display: flex; margin-bottom: 4px; }
              .field-label { width: 140px; font-weight: bold; }
              .signature { float: right; text-align: center; margin-top: 40px; width: 250px; }
              .section-box { border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; margin: 10px 0; background: #f8fafc; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>${settings.clinicName.toUpperCase()}</h2>
              <p>${settings.clinicAddress}</p>
              <p>Telp: ${settings.clinicPhone} | ID Faskes: EXR-99028</p>
            </div>

            <div class="doc-title">SURAT RUJUKAN MEDIS PASIEN</div>

            <p>Kepada Yth Sejawat Dokter Spesialis:<br/><strong>${referenceSpecialist}</strong><br/>Di: <strong>${referenceHospital}</strong></p>
            
            <p>Dengan hormat, mohon pemeriksaan penunjang lanjutan dan tata laksana spesifik untuk pasien kami di bawah ini:</p>
            
            <div class="field-row"><span class="field-label">Nama Lengkap</span><span>: ${activePatient.name}</span></div>
            <div class="field-row"><span class="field-label">NIK Pasien</span><span>: ${activePatient.nik || '-'}</span></div>
            <div class="field-row"><span class="field-label">Tgl Lahir / Umur</span><span>: ${formattedBirthDate} (${calculateAge(activePatient.birthDate)} Tahun)</span></div>
            <div class="field-row"><span class="field-label">Alamat</span><span>: ${activePatient.address || '-'}</span></div>

            <div class="section-box">
              <p><strong>REKAM KLINIS SEMENTARA:</strong></p>
              <p><strong>Keluhan / Anamnesis:</strong><br/>${activeSOAPForPrint.subjective}</p>
              <p><strong>Pemeriksaan Obyektif / Fisik:</strong><br/>${activeSOAPForPrint.objective}</p>
              <p><strong>Diagnosis Sementara:</strong><br/>${referenceDiagnosis || activeSOAPForPrint.assessment}</p>
              <p><strong>Terapi Pertama Medikamentosa:</strong><br/>${activeSOAPForPrint.plan}</p>
            </div>

            <p><strong>Alasan Rujukan Medis:</strong><br/>${referenceReason}</p>

            <p>Atas perkenan bantuan sejawat dan koordinasi tata laksana pasien ini, kami ucapkan terima kasih yang sebesar-besarnya.</p>

            <div class="signature">
              <p>Exora Clinic, ${dateNowStr}</p>
              <p>Salam Sejawat,</p>
              <br/><br/><br/>
              <p><strong>${settings.defaultDoctorName}</strong></p>
              <p>SIPP: 442.2/091/IDI/SIPP-P/2026</p>
            </div>

            <script>
              window.onload = function() { window.print(); window.close(); }
            </script>
          </body>
        </html>
      `;
    } else if (printDocType === 'Resep') {
      const rx = activePatient.prescriptions?.find(r => r.soapNoteId === activeSOAPForPrint.id);
      if (!rx) return alert('Resep obat digital belum didefinisikan untuk kunjungan ini.');

      docHTML = `
        <html>
          <head>
            <title>Resep_Obat_${activePatient.name}</title>
            <style>
              body { font-family: 'Times New Roman', serif; font-size: 13px; line-height: 1.4; color: #1e293b; padding: 40px; max-width: 500px; margin: 0 auto; }
              .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 15px; }
              .header h2 { font-size: 17px; font-weight: bold; margin: 0; }
              .header p { margin: 2px 0; font-size: 10px; color: #475569; }
              .meta-block { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 15px; background: #f8fafc; padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px; }
              .resep-symbol { font-size: 26px; font-weight: bold; font-family: sans-serif; display: inline-block; margin: 10px 0 5px 0; color: #1d4ed8; }
              .resep-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              .resep-table th, .resep-table td { text-align: left; padding: 6px; border-bottom: 1px solid #e2e8f0; }
              .signature { float: right; text-align: center; margin-top: 30px; width: 180px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>${settings.clinicName.toUpperCase()}</h2>
              <p>${settings.clinicAddress} | Telp: ${settings.clinicPhone}</p>
            </div>

            <div class="meta-block">
              <div>
                <span>Pasien: <strong>${activePatient.name}</strong></span><br/>
                <span>Tgl Lahir: ${formattedBirthDate} | RM: ${activePatient.id}</span>
              </div>
              <div style="text-align: right;">
                <span>Tgl Resep: ${new Date(rx.date).toLocaleDateString('id-ID')}</span><br/>
                <span>Dokter: ${settings.defaultDoctorName}</span>
              </div>
            </div>

            <span class="resep-symbol">R/</span>

            <table class="resep-table">
              <thead>
                <tr style="background: #f1f5f9;">
                  <th>Sediaan & Kekuatan</th>
                  <th>Jumlah</th>
                  <th>Aturan Pakai / Signa</th>
                </tr>
              </thead>
              <tbody>
                ${rx.items.map(it => `
                  <tr>
                    <td><strong>${it.name}</strong><br/><small style="color:#64748b;">Dosis: ${it.dosage}</small></td>
                    <td>${it.quantity} Sediaan</td>
                    <td>${it.frequency}<br/><small style="color:#64748b;">${it.instruction}</small></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            ${rx.notes ? `<p style="font-size:10px; color:#64748b; font-style:italic;">Catatan Tambahan: ${rx.notes}</p>` : ''}

            <div class="signature">
              <p>${dateNowStr}</p>
              <p>Tanda Tangan Dokter S.I.A,</p>
              <br/><br/><br/>
              <p><strong>${settings.defaultDoctorName}</strong></p>
            </div>

            <script>
              window.onload = function() { window.print(); window.close(); }
            </script>
          </body>
        </html>
      `;
    }

    pWindow.document.write(docHTML);
    pWindow.document.close();
    setShowPrintModal(false);
  };

  const handleCreateSOAP = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePatient) return;

    const { soap } = dbAdapter.addSOAPNote(activePatient.id, {
      subjective: soapSubj,
      objective: soapObj || `Tanda vital tercatat hari ini: TD ${activePatient.vitals?.[0]?.bloodPressure || 'N/A'}. Suhu ${activePatient.vitals?.[0]?.temperature || 'N/A'}°C`,
      assessment: soapAssess,
      plan: soapPlan,
      doctorName: dbAdapter.getSettings().defaultDoctorName,
    });

    if (incRx && rxItems.length > 0) {
      dbAdapter.addPrescription(activePatient.id, {
        soapNoteId: soap.id,
        items: rxItems,
        notes: rxNotes,
        doctorName: dbAdapter.getSettings().defaultDoctorName,
        status: 'SentToPharmacy'
      });
    }

    onRefresh();
    setShowAddSOAP(false);
    // Reset inputs
    setSoapSubj('');
    setSoapObj('');
    setSoapAssess('');
    setSoapPlan('');
    setIncRx(false);
    setRxItems([]);
    setRxNotes('');
  };

  const handleCreateLab = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePatient) return;

    dbAdapter.addLabResult(activePatient.id, {
      testName: labTestName,
      status: labStatus,
      findings: labStatus === 'Completed' ? labFindings : undefined,
      laborantName: labStatus === 'Completed' ? 'Analis Lab Exora' : undefined,
    });

    onRefresh();
    setShowAddLab(false);
    setLabTestName('');
    setLabFindings('');
    setLabStatus('Pending');
  };

  const handleUpdateLabStatusToCompleted = (labId: string, findings: string) => {
    if (!activePatient) return;
    dbAdapter.updateLabResult(activePatient.id, labId, {
      status: 'Completed',
      findings,
      resultDate: new Date().toISOString(),
      laborantName: 'Analis Lab Exora'
    });
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Detail Patient Mode */}
      {activePatient ? (
        <div className="space-y-6">
          {/* Top Actions/Back */}
          <div className="flex justify-between items-center bg-white border border-sage-200 px-4 py-3 rounded-xl card-shadow">
            <button 
              onClick={() => onSelectPatient(null)}
              className="flex items-center gap-1.5 text-xs text-sage-600 hover:text-sage-700 transition-colors font-semibold cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Kembali Ke Daftar Pasien
            </button>
            <div className="flex gap-2">
              <button 
                id="btn-add-vitals"
                onClick={() => setShowAddVitals(true)}
                className="bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 border border-rose-100"
              >
                <HeartPulse className="w-3.5 h-3.5" /> Vital Baru
              </button>
              <button 
                id="btn-add-soap"
                onClick={() => {
                  setSoapObj(`Kondisi umum sedang. Vitals: TD ${activePatient.vitals?.[0]?.bloodPressure || 'belum dicatat'}. HR: ${activePatient.vitals?.[0]?.heartRate || 'N/A'} bpm. Temp: ${activePatient.vitals?.[0]?.temperature || 'N/A'}C.`);
                  setShowAddSOAP(true);
                }}
                className="bg-sage-600 hover:bg-sage-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
              >
                <ClipboardCheck className="w-3.5 h-3.5" /> Periksa SOAP
              </button>
              <button 
                id="btn-add-lab"
                onClick={() => setShowAddLab(true)}
                className="bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 border border-amber-100"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Order Lab
              </button>
            </div>
          </div>

          {/* Demographic Banner */}
          <div className="bg-gradient-to-br from-sage-600 to-sage-700 text-white rounded-2xl p-5 card-shadow grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="text-[10px] font-mono text-sage-200 font-bold tracking-widest uppercase">EHR PATIENT RECORD CARD</div>
              <h2 className="text-xl font-display font-medium">{activePatient.name}</h2>
              <div className="flex gap-1.5 mt-2">
                <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                  activePatient.gender === 'Laki-laki' ? 'bg-sage-600/30 text-sage-200 border border-sage-600/20' : 'bg-pink-600/30 text-pink-300 border border-pink-600/10'
                }`}>
                  {activePatient.gender}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-sage-800/40 border border-sage-500/30 text-sage-200">
                  ID: {activePatient.id}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-red-950/40 text-red-300 border border-red-900/30">
                  Gol. Darah: {activePatient.bloodType}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-y-3.5 gap-x-2 text-xs border-t md:border-t-0 md:border-l border-sage-500/30 pt-4 md:pt-0 md:pl-6 text-sage-100 font-sans">
              <div className="space-y-0.5">
                <p className="text-[10px] text-sage-300 font-medium">NIK (Nomor Induk Kependudukan)</p>
                <p className="font-mono font-medium">{activePatient.nik || 'Belum Terdata'}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] text-sage-300 font-medium">Tanggal Lahir / Umur</p>
                <p className="font-medium">{activePatient.birthDate} ({new Date().getFullYear() - new Date(activePatient.birthDate).getFullYear()} thn)</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] text-sage-300 font-medium">Ponsel / WhatsApp</p>
                <p className="font-mono font-medium">+{activePatient.phone}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] text-sage-300 font-medium">Pekerjaan</p>
                <p className="font-medium">{activePatient.occupation || '-'}</p>
              </div>
            </div>

            <div className="text-xs border-t md:border-t-0 md:border-l border-sage-500/30 pt-4 md:pt-0 md:pl-6 space-y-3 text-sage-100">
              <div className="bg-red-950/20 border border-red-900/40 p-2 rounded-lg flex gap-1.5 items-start">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-rose-300 text-[11px]">Riwayat Alergi</h4>
                  <p className="text-[10px] text-slate-300 leading-tight mt-0.5">{activePatient.allergies}</p>
                </div>
              </div>
              <div className="text-[10px] text-slate-400 font-sans leading-relaxed">
                <strong>Alamat:</strong> {activePatient.address || '-'}<br />
                <strong>Kontak Darurat:</strong> {activePatient.emergencyContact || 'Tidak ada'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Consultation SOAP History Area (2/3 width) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Vitals logs chart/strip */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 glow-card">
                <h3 className="font-display font-medium text-slate-800 mb-4 flex items-center gap-2">
                  <HeartPulse className="w-4.5 h-4.5 text-rose-500" />
                  Tren Pengukuran Tanda Vital Terkini
                </h3>
                
                {!activePatient.vitals || activePatient.vitals.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 border border-dashed border-slate-100 rounded-xl">
                    <Activity className="w-8 h-8 stroke-1 mx-auto text-slate-300 mb-1" />
                    <p className="text-xs">Belum ada riwayat tanda vital pasien.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead>
                        <tr className="bg-slate-50 border-y border-slate-200/60 text-[10px] text-slate-400 font-mono uppercase">
                          <th className="py-2.5 px-3">Tanggal Catat</th>
                          <th className="py-2.5 px-2">TD (mmHg)</th>
                          <th className="py-2.5 px-2">Suhu</th>
                          <th className="py-2.5 px-2">Nadi</th>
                          <th className="py-2.5 px-2">SpO2</th>
                          <th className="py-2.5 px-2">IMT/BMI</th>
                          <th className="py-2.5 px-2">Petugas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activePatient.vitals.map(v => (
                          <tr key={v.id} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-semibold text-slate-700">{new Date(v.recordedAt).toLocaleString('id-ID')}</td>
                            <td className="py-2 px-2 font-mono text-slate-800 font-semibold">{v.bloodPressure}</td>
                            <td className="py-2 px-2 font-semibold text-rose-600">{v.temperature}°C</td>
                            <td className="py-2 px-2 font-mono">{v.heartRate} bpm</td>
                            <td className="py-2 px-2 font-mono text-blue-600 font-medium">{v.oxygenSaturation}%</td>
                            <td className="py-2 px-2">
                              <span className="font-semibold font-mono">{v.bmi}</span> 
                              <span className={`text-[9px] ml-1 px-1 py-0.5 rounded font-medium ${
                                v.bmi < 18.5 ? 'bg-blue-50 text-blue-800' : v.bmi < 25 ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                              }`}>
                                {v.bmi < 18.5 ? 'Kurus' : v.bmi < 25 ? 'Normal' : 'Berlebih'}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-slate-400 text-[10px]">{v.recordedBy}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Consultation History */}
              <div className="bg-white border border-sage-200 rounded-2xl p-5 card-shadow">
                <div className="space-y-1 mb-6">
                  <h3 className="font-sans font-semibold text-sage-800 flex items-center gap-2">
                    <ClipboardCheck className="w-4.5 h-4.5 text-sage-600" />
                    Pemeriksaan Klinis (SOAP Notes)
                  </h3>
                  <p className="text-slate-400 text-xs">Catatan dokter lengkap per kunjungan terurut dari yang terbaru</p>
                </div>

                {!activePatient.soapNotes || activePatient.soapNotes.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-sage-200 rounded-xl text-slate-400">
                    <p className="text-xs">Belum ada riwayat rekam medis SOAP terdaftar.</p>
                  </div>
                ) : (
                  <div className="relative border-l-2 border-sage-100 pl-5 ml-2.5 space-y-6">
                    {activePatient.soapNotes.map((soap) => {
                      // Grab prescription for this visit if any
                      const associatedRx = activePatient.prescriptions?.find(r => r.soapNoteId === soap.id);

                      return (
                        <div key={soap.id} className="relative group space-y-3">
                          {/* Circle dot on line */}
                          <span className="absolute -left-[26px] top-1 w-2.5 h-2.5 rounded-full bg-sage-600 ring-4 ring-white" />
                          
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <span className="text-[10px] font-mono text-slate-400">{new Date(soap.date).toLocaleString('id-ID')}</span>
                              <h4 className="text-xs font-semibold text-slate-700">Oleh: {soap.doctorName}</h4>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-sage-50 border border-sage-100 p-4 rounded-xl">
                            <div className="space-y-2 text-xs">
                              <div>
                                <span className="font-mono text-[10px] font-semibold text-sage-700 mr-1.5">[S] Keluhan/Subjective</span>
                                <p className="text-slate-600 font-sans mt-0.5 leading-relaxed">{soap.subjective}</p>
                              </div>
                              <div>
                                <span className="font-mono text-[10px] font-semibold text-sage-700 mr-1.5">[O] Pemeriksaan/Objective</span>
                                <p className="text-slate-600 font-sans mt-0.5 leading-relaxed">{soap.objective}</p>
                              </div>
                            </div>

                            <div className="space-y-2 text-xs">
                              <div>
                                <span className="font-mono text-[10px] font-semibold text-sage-700 mr-1.5">[A] Analisis/Assessment</span>
                                <p className="text-slate-800 font-semibold font-sans mt-0.5 leading-relaxed bg-white border border-sage-100 px-2 py-1 rounded">{soap.assessment}</p>
                              </div>
                              <div>
                                <span className="font-mono text-[10px] font-semibold text-sage-700 mr-1.5">[P] Terapi/Plan</span>
                                <p className="text-slate-600 font-sans mt-0.5 leading-relaxed whitespace-pre-wrap">{soap.plan}</p>
                              </div>
                            </div>
                          </div>

                          {/* Associated Prescription */}
                          {associatedRx && (
                            <div className="ml-4 p-3 bg-sage-50 border border-sage-200 rounded-xl space-y-2">
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-semibold text-sage-800 flex items-center gap-1.5">
                                  <Pill className="w-3.5 h-3.5" /> 
                                  Resep Obat Digital terpaut (ID: {associatedRx.id})
                                </span>
                                <span className="bg-emerald-100 text-emerald-800 text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold">Ready</span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-sans text-slate-600 leading-relaxed">
                                {associatedRx.items.map((item, id) => (
                                  <div key={id} className="bg-white px-2 py-1.5 rounded border border-sage-200 flex justify-between items-center gap-2">
                                    <div>
                                      <span className="font-semibold text-slate-800">{item.name}</span> ({item.dosage})
                                      <p className="text-[10px] text-slate-400">{item.frequency} - {item.instruction}</p>
                                    </div>
                                    <span className="font-mono text-slate-500 font-semibold">Qty: {item.quantity}</span>
                                  </div>
                                ))}
                              </div>
                              {associatedRx.notes && (
                                <p className="text-[10px] text-slate-500 italic pl-1">Dst. Catatan: {associatedRx.notes}</p>
                              )}
                            </div>
                          )}

                          {/* Print Actions Bar (Poin C) */}
                          <div className="flex gap-2 pt-1.5 flex-wrap">
                            <button 
                              type="button"
                              onClick={() => {
                                setPrintDocType('SuratSakit');
                                setActiveSOAPForPrint(soap);
                                setSksDiagnosis(soap.assessment);
                                setShowPrintModal(true);
                              }}
                              className="text-[10px] bg-slate-100 hover:bg-sage-600 hover:text-white font-bold px-2 py-1.5 rounded transition-colors flex items-center gap-1 text-slate-650 cursor-pointer border border-slate-200"
                            >
                              📄 Buat Surat Sakit (SKS)
                            </button>
                            
                            <button 
                              type="button"
                              onClick={() => {
                                setPrintDocType('Rujukan');
                                setActiveSOAPForPrint(soap);
                                setReferenceDiagnosis(soap.assessment);
                                setShowPrintModal(true);
                              }}
                              className="text-[10px] bg-slate-100 hover:bg-sage-600 hover:text-white font-bold px-2 py-1.5 rounded transition-colors flex items-center gap-1 text-slate-650 cursor-pointer border border-slate-200"
                            >
                              🏥 Surat Rujukan (SRM)
                            </button>

                            {associatedRx && (
                              <button 
                                type="button"
                                onClick={() => {
                                  setPrintDocType('Resep');
                                  setActiveSOAPForPrint(soap);
                                  setShowPrintModal(true);
                                }}
                                className="text-[10px] bg-sky-50 text-sky-700 hover:bg-sky-600 hover:text-white font-bold px-2 py-1.5 rounded transition-all flex items-center gap-1 cursor-pointer border border-sky-200"
                              >
                                🖨️ Cetak Resep Dokter
                              </button>
                            )}
                          </div>

                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Diagnostic Laboratories & Prescriptions Lists (1/3 width) */}
            <div className="space-y-6">
              {/* Labs */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 glow-card">
                <h3 className="font-display font-medium text-slate-800 mb-3 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-amber-500" />
                  Katalog Hasil Laboratorium
                </h3>

                {!activePatient.labResults || activePatient.labResults.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Tidak ada catatan pengujian lab.</p>
                ) : (
                  <div className="space-y-3">
                    {activePatient.labResults.map(lab => (
                      <div key={lab.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
                        <div className="flex justify-between items-start text-xs">
                          <div>
                            <h4 className="font-semibold text-slate-800">{lab.testName}</h4>
                            <p className="text-[9px] text-slate-400">{new Date(lab.requestDate).toLocaleDateString()}</p>
                          </div>
                          <span className={`text-[9px] px-2 py-0.5 rounded font-semibold ${
                            lab.status === 'Completed' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
                          }`}>
                            {lab.status === 'Completed' ? 'Selesai' : 'Pending'}
                          </span>
                        </div>                         {lab.status === 'Completed' ? (
                          <div className="text-[10px] text-slate-600 bg-white border border-slate-200 p-2 rounded leading-relaxed font-sans font-medium whitespace-pre-wrap">
                            {lab.findings}
                          </div>
                        ) : (
                          <div className="pt-1.5 space-y-1.5 border-t border-slate-100">
                            <span className="text-[9px] font-mono font-bold text-sage-600">LENGKAPI HASIL LAB:</span>
                            <textarea 
                              placeholder="Ketik temuan laboratorium..."
                              id={`input-lab-findings-${lab.id}`}
                              className="w-full text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-slate-400 font-sans"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  const text = (e.currentTarget as HTMLTextAreaElement).value;
                                  if (text.trim()) {
                                    handleUpdateLabStatusToCompleted(lab.id, text.trim());
                                  }
                                }
                              }}
                            />
                            <p className="text-[9px] text-slate-400 italic leading-none">Tekan Enter untuk menyimpan temuan selesai</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* PDF Print Medical Summary Prescription Preview */}
              <div className="bg-gradient-to-br from-sage-50 to-cream-50 rounded-2xl p-5 border border-sage-200 card-shadow space-y-3">
                <div className="flex gap-2 items-center text-sage-900 font-sans font-medium text-xs">
                  <ShieldCheck className="w-5 h-5 text-sage-600" />
                  Sertifikat Rekam Medis (EHR Dump)
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed font-sans font-medium">
                  Unduh seluruh histori kesehatan pasien ini berupa file JSON lokal terstruktur yang terenkripsi aman sebagai salinan transfer data.
                </p>
                <button 
                  onClick={() => {
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(activePatient, null, 2));
                    const downloadAnchor = document.createElement('a');
                    downloadAnchor.setAttribute("href", dataStr);
                    downloadAnchor.setAttribute("download", `EXORA_EHR_${activePatient.name.replace(/\s+/g, '_')}.json`);
                    document.body.appendChild(downloadAnchor);
                    downloadAnchor.click();
                    downloadAnchor.remove();
                  }}
                  className="w-full bg-white text-sage-700 hover:bg-slate-50 text-xs font-semibold py-2 px-3 border border-sage-300 rounded-lg transition-colors cursor-pointer flex justify-center items-center gap-2"
                >
                  <Download className="w-4 h-4" /> Unduh Salinan EHR (.json)
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Patient Lists Screen */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="space-y-0.5">
              <h2 className="text-xl font-serif italic text-sage-800">Manajemen Registrasi Pasien</h2>
              <p className="text-slate-400 text-xs">Registrasi pasien baru klinik Exora, rekam medis komprehensif, dan filter rekam digital.</p>
            </div>
            <button 
              id="btn-show-add-patient"
              onClick={() => setShowAddPatient(true)}
              className="w-full sm:w-auto bg-sage-600 hover:bg-sage-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <UserPlus className="w-4.5 h-4.5" /> Registrasi Pasien Baru
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-3.5 border border-sage-200 rounded-xl card-shadow">
            {/* Search inputs */}
            <div className="md:col-span-3 relative">
              <Search className="w-4.5 h-4.5 text-slate-400 absolute left-3 top-2.5" />
              <input 
                type="text" 
                placeholder="Cari pasien berdasarkan Nama, NIK, atau ID Pasien..."
                value={searchQuery}
                id="search-patient-input"
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs py-2.5 pl-10 pr-4 border border-slate-200 rounded-lg outline-none focus:border-slate-400 text-slate-800 font-sans"
              />
            </div>
            <div>
              <select 
                value={filterGender}
                id="filter-gender-select"
                onChange={(e) => setFilterGender(e.target.value)}
                className="w-full text-xs py-2.5 px-3 border border-slate-200 rounded-lg outline-none focus:border-slate-400 text-slate-600 bg-white"
              >
                <option value="All">Semua Gender</option>
                <option value="Laki-laki">Laki-Laki</option>
                <option value="Perempuan">Perempuan</option>
              </select>
            </div>
          </div>          {/* List display */}
          <div className="bg-white border border-sage-200 rounded-2xl overflow-hidden card-shadow">
            {filteredPatients.length === 0 ? (
              <div className="p-12 text-center text-slate-400 border border-dashed border-sage-100 rounded-xl mx-4 my-4">
                <Search className="w-10 h-10 stroke-1 mx-auto text-slate-300 mb-2" />
                <p className="text-xs">Tidak ditemukan kecocokan data pasien.</p>
              </div>
            ) : (
              <div className="divide-y divide-sage-100">
                {filteredPatients.map((p) => {
                  const latestVital = p.vitals?.[0];
                  return (
                    <div 
                      key={p.id}
                      onClick={() => onSelectPatient(p.id)}
                      className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-sage-50 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full font-serif text-sage-600 bg-sage-50 border border-sage-200 flex items-center justify-center font-bold">
                          {p.name.substring(0,2).toUpperCase()}
                        </div>
                        <div className="space-y-0.5">
                          <h3 className="text-xs font-semibold text-sage-800 group-hover:text-sage-600 transition-colors">
                            {p.name}
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-slate-400">
                            <span className="font-mono text-sage-600 font-medium font-semibold">ID: {p.id}</span>
                            <span>•</span>
                            <span>{p.gender}</span>
                            <span>•</span>
                            <span>{new Date().getFullYear() - new Date(p.birthDate).getFullYear()} Tahun</span>
                          </div>
                        </div>
                      </div>

                      {latestVital ? (
                        <div className="flex gap-4 items-center">
                          <div className="text-[11px] text-slate-500 font-sans space-y-0.5">
                            <span className="text-[10px] text-slate-400 block font-medium">TANDA VITAL TERBARU:</span>
                            <div className="flex gap-2.5">
                              <span>TD: <strong className="font-mono text-slate-700">{latestVital.bloodPressure}</strong></span>
                              <span>Suhu: <strong className="font-mono text-slate-700">{latestVital.temperature}°C</strong></span>
                              <span>IMT: <strong className="font-mono text-slate-700">{latestVital.bmi}</strong></span>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-sage-600 transition-colors" />
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-sans italic">
                          <span>Belum ada tanda vital terdata</span>
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-sage-600 transition-colors" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL / SUB-PANELS (FORMS) */}

      {/* 1. Register Patient Modal */}
      {showAddPatient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4"
          >
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-display font-medium text-slate-800 text-lg">Form Registrasi Pasien Baru (EHR)</h3>
              <button 
                onClick={() => setShowAddPatient(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            <form onSubmit={handleCreatePatient} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
              <div className="space-y-1">
                <label className="text-slate-500 font-medium font-semibold">Nama Lengkap Pasien *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Contoh: Budi Santoso"
                  value={newName}
                  id="reg-patient-name"
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:border-slate-400 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-medium font-semibold">Nomor Identitas NIK (16 digit) *</label>
                <input 
                  type="text" 
                  maxLength={16}
                  placeholder="Contoh: 3171011502180004"
                  value={newNik}
                  id="reg-patient-nik"
                  onChange={(e) => setNewNik(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:border-slate-400 font-mono font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-medium font-semibold">Tanggal Lahir *</label>
                <input 
                  type="date" 
                  required
                  value={newBirthDate}
                  id="reg-patient-dob"
                  onChange={(e) => setNewBirthDate(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:border-slate-400 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-medium font-semibold">Jenis Kelamin *</label>
                <div className="flex gap-4 pt-2">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input 
                      type="radio" 
                      name="gender" 
                      checked={newGender === 'Laki-laki'} 
                      onChange={() => setNewGender('Laki-laki')} 
                    />
                    Laki-Laki
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input 
                      type="radio" 
                      name="gender" 
                      checked={newGender === 'Perempuan'} 
                      onChange={() => setNewGender('Perempuan')} 
                    />
                    Perempuan
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-medium font-semibold">Nomor Ponsel (WhatsApp Aktif) *</label>
                <input 
                  type="tel" 
                  required
                  placeholder="62812xxxxxx (Diawali kode negara)"
                  value={newPhone}
                  id="reg-patient-phone"
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:border-slate-400 font-mono font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-medium font-semibold">Email</label>
                <input 
                  type="email" 
                  placeholder="budi@gmail.com"
                  value={newEmail}
                  id="reg-patient-email"
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:border-slate-400 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-medium font-semibold">Masyarakat Pekerjaan</label>
                <input 
                  type="text" 
                  placeholder="Misal Wiraswasta, PNS, Mahasiswa"
                  value={newOccupation}
                  id="reg-patient-occ"
                  onChange={(e) => setNewOccupation(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:border-slate-400 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-medium font-semibold">Golongan Darah</label>
                <select 
                  value={newBloodType}
                  id="reg-patient-blood"
                  onChange={(e) => setNewBloodType(e.target.value as Patient['bloodType'])}
                  className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:border-slate-400 bg-white"
                >
                  <option value="Belum Tahu">Belum Tahu</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="AB">AB</option>
                  <option value="O">O</option>
                </select>
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-slate-500 font-medium font-semibold">Alamat Lengkap Rumah *</label>
                <textarea 
                  required
                  placeholder="RT/RW Kelurahan Kecamatan Kota"
                  value={newAddress}
                  id="reg-patient-addr"
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:border-slate-400 min-h-[60px]"
                />
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-slate-500 font-medium font-semibold">Riwayat Alergi (Obat / Makanan)</label>
                <input 
                  type="text" 
                  placeholder="Sebutkan alergi jika ada, atau kosongkan"
                  value={newAllergies}
                  id="reg-patient-allergies"
                  onChange={(e) => setNewAllergies(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:border-slate-400 font-medium"
                />
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-slate-500 font-medium font-semibold text-rose-600">Kontak Darurat (Nama & Nomor HP) *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Contoh: Siti Rahma (Istri) - 08129876544"
                  value={newEmergencyContact}
                  id="reg-patient-emerg"
                  onChange={(e) => setNewEmergencyContact(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:border-slate-400 font-medium"
                />
              </div>

              <div className="md:col-span-2 pt-4 flex gap-2 justify-end">
                <button 
                  type="button" 
                  onClick={() => setShowAddPatient(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg cursor-pointer"
                >
                  Daftarkan Pasien
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* 2. Add Vitals Modal */}
      {showAddVitals && activePatient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4"
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-display font-medium text-slate-800">Catat Pengukuran Tanda Vital</h3>
              <button onClick={() => setShowAddVitals(false)} className="text-slate-400 text-sm cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateVitals} className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-500 font-semibold">Tekanan Darah (mmHg) *</label>
                  <input type="text" required placeholder="120/80" value={vitBp} id="vit-bp-input" onChange={e => setVitBp(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg font-mono font-medium outline-none focus:border-slate-400" />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 font-semibold">Detak Nadi (bpm) *</label>
                  <input type="number" required value={vitHr} id="vit-hr-input" onChange={e => setVitHr(Number(e.target.value))} className="w-full p-2 border border-slate-200 rounded-lg font-mono font-medium outline-none focus:border-slate-400" />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 font-semibold">Suhu Tubuh (°C) *</label>
                  <input type="number" step="0.1" required value={vitTemp} id="vit-temp-input" onChange={e => setVitTemp(Number(e.target.value))} className="w-full p-2 border border-slate-200 rounded-lg font-mono font-medium outline-none focus:border-slate-400" />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 font-semibold">Saturasi Oksigen SpO2 (%) *</label>
                  <input type="number" required value={vitSpo2} id="vit-spo2-input" onChange={e => setVitSpo2(Number(e.target.value))} className="w-full p-2 border border-slate-200 rounded-lg font-mono font-medium outline-none focus:border-slate-400" />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 font-semibold">Berat Badan (kg) *</label>
                  <input type="number" step="0.1" required value={vitWeight} id="vit-weight-input" onChange={e => setVitWeight(Number(e.target.value))} className="w-full p-2 border border-slate-200 rounded-lg font-mono font-medium outline-none focus:border-slate-400" />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 font-semibold">Tinggi Badan (cm) *</label>
                  <input type="number" required value={vitHeight} id="vit-height-input" onChange={e => setVitHeight(Number(e.target.value))} className="w-full p-2 border border-slate-200 rounded-lg font-mono font-medium outline-none focus:border-slate-400" />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddVitals(false)} className="px-3 py-1.5 bg-slate-100 rounded-lg cursor-pointer">Batal</button>
                <button type="submit" className="px-3 py-1.5 bg-rose-600 text-white rounded-lg cursor-pointer font-semibold">Simpan Vitals</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* 3. Add SOAP Note and Prescription Modal (Doctor Panel) */}
      {showAddSOAP && activePatient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 text-xs font-sans"
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-sans font-semibold text-sage-800 text-lg">Format Rekam Medis SOAP Dokter</h3>
                <p className="text-slate-400">Pemeriksaan & pengobatan resep pasien untuk {activePatient.name}</p>
              </div>
              <button onClick={() => setShowAddSOAP(false)} className="text-slate-400 text-sm font-bold cursor-pointer">✕ Close</button>
            </div>

            <form onSubmit={handleCreateSOAP} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left side: SOAP Notes */}
                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-slate-700 font-semibold text-sage-700 block">[S] KELUHAN UTAMA (Subjective) *</label>
                    <textarea 
                      required 
                      placeholder="Keluhan utama pasien, lamanya, keparahan, riwayat penyakit sekarang..."
                      value={soapSubj}
                      id="soap-subj-input"
                      onChange={e => setSoapSubj(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:border-slate-400 min-h-[90px]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-700 font-semibold text-sage-700 block">[O] PEMERIKSAAN FISIK & KONDISI (Objective) *</label>
                    <textarea 
                      required 
                      placeholder="Keadaan umum, hasil inspeksi, auskultasi, palpasi, vital signs..."
                      value={soapObj}
                      id="soap-obj-input"
                      onChange={e => setSoapObj(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:border-slate-400 min-h-[90px]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-700 font-semibold text-sage-700 block">[A] DIAGNOSIS UTAMA / KONDISI (Assessment) *</label>
                    <input 
                      type="text"
                      required
                      placeholder="Contoh: Hipertensi Primer Essensial Grade I / Thypoid Fever"
                      value={soapAssess}
                      id="soap-assess-input"
                      onChange={e => setSoapAssess(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:border-slate-400 font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-700 font-semibold text-sage-700 block">[P] RENCANA TERAPI & EDUKASI (Plan) *</label>
                    <textarea 
                      required
                      placeholder="Instruksi pengobatan non-farmakologi, rujukan, edukasi pasien..."
                      value={soapPlan}
                      id="soap-plan-input"
                      onChange={e => setSoapPlan(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:border-slate-400 min-h-[95px]"
                    />
                  </div>
                </div>

                {/* Right side: Digital Prescriptions */}
                <div className="border border-slate-150 bg-sage-50/20 p-4 rounded-xl space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                    <label className="flex items-center gap-2 font-sans font-bold text-slate-800 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={incRx} 
                        onChange={e => setIncRx(e.target.checked)} 
                        className="w-4 h-4 text-sage-600 rounded focus:ring-sage-500" 
                      />
                      Terbitkan Resep Obat Digital
                    </label>
                    <span className="text-[10px] text-slate-400">Terpaut resep SOAP ini</span>
                  </div>

                  {incRx && (
                    <div className="space-y-4">
                      {/* Prescription Builder */}
                      <div className="bg-white p-3 border border-slate-200 rounded-xl space-y-3">
                        <h4 className="font-semibold text-slate-600 border-b pb-1.5 text-[10px] uppercase font-mono">Input Nama Obat</h4>
                        
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <input 
                              type="text" 
                              placeholder="Nama Obat (misal: Parasetamol)" 
                              value={newRxName}
                              id="rx-name-input"
                              onChange={e => setNewRxName(e.target.value)}
                              className="p-2 border border-slate-200 rounded text-xs col-span-2 outline-none font-semibold" 
                            />
                            <input 
                              type="text" 
                              placeholder="Dosis (500mg/Syr)" 
                              value={newRxDosage}
                              id="rx-dosage-input"
                              onChange={e => setNewRxDosage(e.target.value)}
                              className="p-2 border border-slate-200 rounded text-xs outline-none" 
                            />
                            <input 
                              type="text" 
                              placeholder="Frekuensi (3x sehari)" 
                              value={newRxFreq}
                              id="rx-freq-input"
                              onChange={e => setNewRxFreq(e.target.value)}
                              className="p-2 border border-slate-200 rounded text-xs outline-none" 
                            />
                            <input 
                              type="text" 
                              placeholder="Aturan Pakai (Sesudah makan)" 
                              value={newRxInstruct}
                              id="rx-instruct-input"
                              onChange={e => setNewRxInstruct(e.target.value)}
                              className="p-2 border border-slate-200 rounded text-xs col-span-2 outline-none" 
                            />
                            <div className="col-span-2 flex justify-between items-center gap-4">
                              <div className="flex items-center gap-1.5">
                                <span className="text-slate-500">Jumlah:</span>
                                <input 
                                  type="number" 
                                  value={newRxQty}
                                  id="rx-qty-input"
                                  onChange={e => setNewRxQty(Number(e.target.value))}
                                  className="w-16 p-1 border border-slate-200 rounded text-xs font-mono font-bold text-center" 
                                />
                              </div>
                              <button 
                                type="button" 
                                onClick={addRxItemToCart}
                                className="bg-slate-800 hover:bg-slate-700 text-white text-[10px] uppercase font-bold tracking-wider px-3 py-1.5 rounded cursor-pointer"
                              >
                                Tambahkan Obat
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Items List */}
                      <div className="space-y-1.5">
                        <span className="font-semibold text-slate-500">Daftar Racikan Obat Resep:</span>
                        {rxItems.length === 0 ? (
                          <p className="text-[10px] text-slate-400 italic">Keranjang obat resep kosong.</p>
                        ) : (
                          <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                            {rxItems.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center p-2 rounded-lg bg-white border border-slate-200 text-[10px]">
                                <div>
                                  <strong className="text-xs text-slate-800">{item.name}</strong> - {item.dosage} ({item.frequency})
                                  <p className="text-slate-400">{item.instruction}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono bg-indigo-50 border px-1.5 py-0.5 rounded text-indigo-700">x{item.quantity}</span>
                                  <button type="button" onClick={() => removeRxItemFromCart(idx)} className="text-rose-500 hover:text-rose-700 font-bold">✕</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-500 font-medium font-semibold">Catatan Racikan/Apoteker</label>
                        <input 
                          type="text" 
                          placeholder="Misal: Jauhkan dari jangkauan anak-anak"
                          value={rxNotes}
                          id="rx-notes-input"
                          onChange={e => setRxNotes(e.target.value)}
                          className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-slate-400"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t flex justify-end gap-2 text-xs">
                <button type="button" onClick={() => setShowAddSOAP(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-250 text-slate-700 rounded-lg cursor-pointer font-semibold">Batal</button>
                <button type="submit" className="px-4 py-2 bg-sage-600 hover:bg-sage-700 text-white rounded-lg cursor-pointer font-semibold">Simpan Rekam SOAP & Kirim</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* 4. Add Lab Request Modal */}
      {showAddLab && activePatient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4"
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-display font-medium text-slate-800">Order Permintaan Pengujian Lab</h3>
              <button onClick={() => setShowAddLab(false)} className="text-slate-400 text-sm cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateLab} className="space-y-4 text-xs font-sans">
              <div className="space-y-1">
                <label className="text-slate-500 font-semibold">Nama Pengujian Lab *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Contoh: Darah Rutin, Profil Widal, Kolesterol" 
                  value={labTestName} 
                  id="lab-test-name-input"
                  onChange={e => setLabTestName(e.target.value)} 
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-slate-400" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-semibold">Status Pengujian Sekarang</label>
                <select 
                  value={labStatus}
                  id="lab-status-select"
                  onChange={e => setLabStatus(e.target.value as 'Pending' | 'Completed')}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                >
                  <option value="Pending">Menunggu Antrean (Pending)</option>
                  <option value="Completed">Selesai Sekarang & Input Temuan</option>
                </select>
              </div>

              {labStatus === 'Completed' && (
                <div className="space-y-1">
                  <label className="text-slate-500 font-semibold">Temuan / Hasil Analisis Pengujian</label>
                  <textarea 
                    placeholder="Masukkan hasil, nilai referensi, dan kesimpulan..."
                    value={labFindings}
                    id="lab-findings-input"
                    onChange={e => setLabFindings(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg min-h-[90px] outline-none"
                  />
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddLab(false)} className="px-3 py-1.5 bg-slate-100 rounded-lg cursor-pointer">Batal</button>
                <button type="submit" className="px-3 py-1.5 bg-sage-600 text-white rounded-lg cursor-pointer font-semibold">Kirim Permintaan</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ====================================================
          MODAL: CUSTOMIZE & PRINT MEDICAL DOCUMENT (Poin C)
         ==================================================== */}
      {showPrintModal && activeSOAPForPrint && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl relative z-50">
            <div className="flex justify-between items-center pb-2 border-b border-rose-50">
              <h3 className="font-display font-bold text-slate-800 text-sm">
                {printDocType === 'SuratSakit' && 'Konfigurasi Surat Keterangan Sakit (SKS)'}
                {printDocType === 'Rujukan' && 'Konfigurasi Surat Rujukan Medis Pasien'}
                {printDocType === 'Resep' && 'Konparasi & Cetak Resep Dokter'}
              </h3>
              <button onClick={() => setShowPrintModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
              Kustomisasi field di bawah ini sebelum mencetak dokumen ke printer atau download lembar rekam koveras resmi.
            </p>

            <div className="space-y-4 text-xs font-sans">
              
              {/* IF SURAT SAKIT (SKS) */}
              {printDocType === 'SuratSakit' && (
                <div className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-slate-500 font-bold block">Durasi Istirahat (Hari)</label>
                      <input 
                        type="number"
                        min={1} 
                        value={sksDays}
                        onChange={e => setSksDays(Number(e.target.value))}
                        className="w-full p-2.5 border border-slate-200 rounded-xl font-bold font-mono outline-none focus:border-sage-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-500 font-bold block">Dari Tanggal Mulai</label>
                      <input 
                        type="date"
                        value={sksStartDate}
                        onChange={e => setSksStartDate(e.target.value)}
                        className="w-full p-2.5 border border-slate-200 rounded-xl font-mono outline-none focus:border-sage-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-500 font-bold block">Diagnosis yang Dicantumkan</label>
                    <input 
                      type="text"
                      value={sksDiagnosis}
                      onChange={e => setSksDiagnosis(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-sage-500"
                      placeholder="Diagnosa Kerja"
                    />
                  </div>
                </div>
              )}

              {/* IF RUJUKAN (SRM) */}
              {printDocType === 'Rujukan' && (
                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-slate-500 font-semibold block">Rumah Sakit Tujuan Rujukan</label>
                    <input 
                      type="text"
                      value={referenceHospital}
                      onChange={e => setReferenceHospital(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-sage-500 font-bold text-slate-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-500 font-semibold block">Kategori Spesialisasi Tujuan</label>
                    <input 
                      type="text"
                      value={referenceSpecialist}
                      onChange={e => setReferenceSpecialist(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-sage-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-500 font-semibold block">Diagnosa Penguat Rujukan</label>
                    <input 
                      type="text"
                      value={referenceDiagnosis}
                      onChange={e => setReferenceDiagnosis(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-sage-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-500 font-semibold block">Alasan Klinis Merujuk</label>
                    <textarea 
                      value={referenceReason}
                      onChange={e => setReferenceReason(e.target.value)}
                      rows={3}
                      className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-sage-500 leading-normal"
                    />
                  </div>
                </div>
              )}

              {/* IF RESEP (PREVIEW BRIEF) */}
              {printDocType === 'Resep' && (
                <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl text-center space-y-1">
                  <p className="font-extrabold text-slate-700">Resep Medis Terpaut Siap Cetak</p>
                  <p className="text-[10px] text-slate-400">Tekan "Cetak Dokumen" untuk menerbitkan lembar resep berstempel resmi Exora.</p>
                </div>
              )}

              {/* Bottom buttons action */}
              <div className="flex gap-2 pt-3">
                <button 
                  type="button" 
                  onClick={() => setShowPrintModal(false)}
                  className="flex-1 bg-slate-100 py-3 text-slate-600 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="button"
                  onClick={handlePrintDocument}
                  className="flex-1 bg-sage-600 text-white font-extrabold py-3 rounded-xl cursor-pointer shadow-lg shadow-sage-650/10"
                >
                  Cetak Dokumen 🖨️
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
