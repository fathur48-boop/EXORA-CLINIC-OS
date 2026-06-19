/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';
import { Patient, Appointment, SystemSettings, SOAPNote, VitalSign, Prescription, LabResult, DrugItem, Invoice, InvoiceItem } from '../types';

// Standard storage keys
const KEYS = {
  PATIENTS: 'exora_patients',
  APPOINTMENTS: 'exora_appointments',
  SETTINGS: 'exora_settings',
  DRUGS: 'exora_drugs',
  INVOICES: 'exora_invoices',
};

// Safe Supabase connection getter
export function getSupabase() {
  try {
    const data = localStorage.getItem(KEYS.SETTINGS);
    if (!data) return null;
    const settings: SystemSettings = JSON.parse(data);
    if (settings.supabaseUrl?.trim() && settings.supabaseAnonKey?.trim()) {
      return createClient(settings.supabaseUrl.trim(), settings.supabaseAnonKey.trim(), {
        auth: { persistSession: false }
      });
    }
  } catch (err) {
    console.warn('Error reading Supabase settings:', err);
  }
  return null;
}

// Background sync upsert helper
export async function safeSupabaseUpsert(tableName: string, data: any) {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    const { error } = await supabase.from(tableName).upsert(data);
    if (error) {
      console.error(`Supabase sync failed for ${tableName}:`, error);
    }
  } catch (err) {
    console.error(`Error in Supabase upsert for ${tableName}:`, err);
  }
}

// Initial system seed settings
export const DEFAULT_SETTINGS: SystemSettings = {
  supabaseUrl: '',
  supabaseAnonKey: '',
  groqApiKey: '',
  clinicName: 'Exora Health Care Clinic',
  clinicPhone: '6281234567890',
  clinicAddress: 'Jl. Jenderal Sudirman No. 45, Jakarta Selatan, Indonesia',
  defaultDoctorName: 'dr. Baharuddin Yusuf, Sp.PD',
  waTemplateNewAppointment: 'Halo *{name}*, konfirmasi janji temu Anda di *{clinic}* telah berhasil pada tanggal *{date}* pukul *{time}* dengan *{doctor}*. Harap datang 15 menit lebih awal. Terima kasih.',
  waTemplateReminder: 'Pengingat otomatis: Halo *{name}*, Anda memiliki jadwal janji temu besok ({date}) pukul *{time}* dengan *{doctor}* di *{clinic}*. Jika ada perubahan, silakan kabari kami.',
};

// 4-5 Realistic Indonesian patients with complete medical history
const SEED_PATIENTS: Patient[] = [
  {
    id: 'pat-001',
    name: 'Budi Santoso',
    birthDate: '1975-04-12',
    gender: 'Laki-laki',
    phone: '628129876543',
    email: 'budi.santoso@gmail.com',
    address: 'Kebayoran Baru, Jakarta Selatan',
    bloodType: 'O',
    allergies: 'Amoksisilin, Seafood',
    emergencyContact: 'Siti Rahma (Istri) - 08129876544',
    createdAt: '2026-01-10T08:30:00Z',
    nik: '3171021204750003',
    occupation: 'Wiraswasta',
    vitals: [
      {
        id: 'vit-101',
        patientId: 'pat-001',
        bloodPressure: '135/85',
        heartRate: 78,
        temperature: 36.6,
        weight: 78,
        height: 172,
        bmi: 26.4,
        oxygenSaturation: 98,
        recordedAt: '2026-06-15T09:15:00Z',
        recordedBy: 'Suster Nina'
      },
      {
        id: 'vit-102',
        patientId: 'pat-001',
        bloodPressure: '125/80',
        heartRate: 72,
        temperature: 36.5,
        weight: 77.5,
        height: 172,
        bmi: 26.2,
        oxygenSaturation: 99,
        recordedAt: '2026-06-19T08:45:00Z',
        recordedBy: 'Suster Nina'
      }
    ],
    soapNotes: [
      {
        id: 'soap-101',
        patientId: 'pat-001',
        subjective: 'Pasien datang dengan keluhan pusing di bagian tengkuk sejak 3 hari lalu, sering merasa lelah setelah beraktivitas berat. Riwayat hipertensi keluarga (+) dari ayah.',
        objective: 'TD: 135/85 mmHg, HR: 78 bpm, BB: 78 kg. Konjungtiva mata tidak anemis, abdomen supel, bising usus normal. Nyeri tekan daerah tengkuk (+).',
        assessment: 'Pre-hipertensi susp. Essential Hypertension, kelelahan fisik tingkat sedang.',
        plan: '1. Amiloride HCT 1x 2.5mg pagi hari.\n2. Edukasi kurangi konsumsi garam tinggi, makanan berlemak, sate kambing.\n3. Istirahat minimal 7 jam sehari.\n4. Kontrol tekanan darah 1 minggu lagi.',
        doctorName: 'dr. Baharuddin Yusuf, Sp.PD',
        date: '2026-06-15T09:30:00Z'
      },
      {
        id: 'soap-102',
        patientId: 'pat-001',
        subjective: 'Pasien kontrol tekanan darah. Mengaku keluhan pusing tengkuk berkurang banyak setelah beristirahat dan minum obat teratur.',
        objective: 'TD: 125/80 mmHg, HR: 72 bpm, BB: 77.5 kg. Kondisi umum membaik, tensi tampak stabil normal.',
        assessment: 'Hipertensi terkontrol dengan perbaikan gaya hidup.',
        plan: '1. Lanjutkan gaya hidup rendah garam.\n2. Multivitamin B Kompleks 1x1 sehari.\n3. Kontrol kembali jika keluhan pusing parah muncul lagi.',
        doctorName: 'dr. Baharuddin Yusuf, Sp.PD',
        date: '2026-06-19T09:00:00Z'
      }
    ],
    prescriptions: [
      {
        id: 'rx-201',
        patientId: 'pat-001',
        soapNoteId: 'soap-101',
        items: [
          { name: 'Kaptopril', dosage: '25mg', frequency: '2x sehari', instruction: '1 jam sebelum makan', quantity: 14 },
          { name: 'Parasetamol', dosage: '500mg', frequency: '3x sehari', instruction: 'Sesudah makan, jika pusing', quantity: 10 }
        ],
        notes: 'Gunakan parasetamol hanya ketika pusing parah muncul.',
        doctorName: 'dr. Baharuddin Yusuf, Sp.PD',
        date: '2026-06-15T09:30:00Z',
        status: 'Dispensed'
      },
      {
        id: 'rx-202',
        patientId: 'pat-001',
        soapNoteId: 'soap-102',
        items: [
          { name: 'Vitamin B Complex', dosage: '1 tablet', frequency: '1x sehari', instruction: 'Sesudah makan pagi', quantity: 10 }
        ],
        notes: 'Suplemen penunjang stamina tubuh.',
        doctorName: 'dr. Baharuddin Yusuf, Sp.PD',
        date: '2026-06-19T09:00:00Z',
        status: 'SentToPharmacy'
      }
    ],
    labResults: [
      {
        id: 'lab-301',
        patientId: 'pat-001',
        testName: 'Profil Lipid Lengkap',
        requestDate: '2026-06-15T09:15:00Z',
        resultDate: '2026-06-16T15:00:00Z',
        status: 'Completed',
        findings: 'Kolesterol Total: 215 mg/dL (Tinggi > 200)\nTrigliserida: 160 mg/dL (Ambang Batas)\nHDL: 48 mg/dL\nLDL: 135 mg/dL (Sedikit Meningkat)',
        laborantName: 'Analis Ahmad Fauzi',
        referenceRange: 'Kolesterol < 200, LDL < 100'
      }
    ]
  },
  {
    id: 'pat-002',
    name: 'Dewi Lestari',
    birthDate: '1992-09-24',
    gender: 'Perempuan',
    phone: '6281312345678',
    email: 'dewi.lestari@yahoo.com',
    address: 'Kuningan, Jakarta Selatan',
    bloodType: 'AB',
    allergies: 'Debu, Bulu Kucing',
    emergencyContact: 'Toni Pratama (Suami) - 081312345679',
    createdAt: '2026-03-20T10:00:00Z',
    nik: '3204052409920005',
    occupation: 'Pegawai Swasta',
    vitals: [
      {
        id: 'vit-201',
        patientId: 'pat-002',
        bloodPressure: '110/70',
        heartRate: 84,
        temperature: 38.2,
        weight: 55,
        height: 160,
        bmi: 21.5,
        oxygenSaturation: 97,
        recordedAt: '2026-06-18T14:10:00Z',
        recordedBy: 'Suster Nina'
      }
    ],
    soapNotes: [
      {
        id: 'soap-201',
        patientId: 'pat-002',
        subjective: 'Pasien mengeluhkan demam tinggi yang naik turun sejak 2 hari lalu, disertai menggigil, nyeri otot sendi gatal tenggorokan, dan batuk kering.',
        objective: 'Tinggi badan: 160 cm, Berat: 55 kg, Suhu: 38.2°C, TD: 110/70 mmHg. Pharynx hiperemis (+), pembesaran amandel T1-T1, ronki (-), wheezing (-).',
        assessment: 'Faringitis Akut susp. Viral Infection / INFLUENZA A',
        plan: '1. Parasetamol 3x500mg jika demam > 38°C.\n2. GG syrup 3x1 sendok teh untuk batuk.\n3. Banyak konsumsi air hangat, istirahat bed rest total.\n4. Jika demam berlanjut sampai hari ke-5, disarankan cek darah rutin (Widal & DHF).',
        doctorName: 'dr. Baharuddin Yusuf, Sp.PD',
        date: '2026-06-18T14:30:00Z'
      }
    ],
    prescriptions: [
      {
        id: 'rx-203',
        patientId: 'pat-002',
        soapNoteId: 'soap-201',
        items: [
          { name: 'Parasetamol', dosage: '500mg', frequency: '3x sehari', instruction: 'Sesudah makan', quantity: 15 },
          { name: 'Guanfeisin Syr', dosage: '100ml', frequency: '3x sehari 1 cth', instruction: 'Sesudah makan', quantity: 1 },
          { name: 'Vitamin C', dosage: '500mg', frequency: '1x sehari', instruction: 'Sesudah makan', quantity: 10 }
        ],
        notes: 'Pastikan minum banyak air hangat.',
        doctorName: 'dr. Baharuddin Yusuf, Sp.PD',
        date: '2026-06-18T14:30:00Z',
        status: 'Dispensed'
      }
    ],
    labResults: [
      {
        id: 'lab-302',
        patientId: 'pat-002',
        testName: 'Darah Rutin & Serologi DHF',
        requestDate: '2026-06-18T14:15:00Z',
        status: 'Pending'
      }
    ]
  },
  {
    id: 'pat-003',
    name: 'Ahmad Fauzan',
    birthDate: '2018-02-15',
    gender: 'Laki-laki',
    phone: '628577712345',
    email: 'fauzan.ortu@gmail.com',
    address: 'Menteng, Jakarta Pusat',
    bloodType: 'A',
    allergies: 'Tidak ada',
    emergencyContact: 'Ridwan Fauzan (Ayah) - 08577712345',
    createdAt: '2026-05-02T11:00:00Z',
    nik: '3171011502180004',
    occupation: 'Pelajar/Anak-anak',
    vitals: [
      {
        id: 'vit-301',
        patientId: 'pat-003',
        bloodPressure: '100/65',
        heartRate: 98,
        temperature: 36.8,
        weight: 22,
        height: 118,
        bmi: 15.8,
        oxygenSaturation: 99,
        recordedAt: '2026-06-19T10:05:00Z',
        recordedBy: 'Suster Nina'
      }
    ],
    soapNotes: [
      {
        id: 'soap-301',
        patientId: 'pat-003',
        subjective: 'Pasien anak dibawa ibunya karena keluhan diare sebanyak 5 kali hari ini dengan konsistensi cair, ampas sedikit, lendir darah (-). Mengeluhkan lemas dan tidak nafsu makan.',
        objective: 'Suhu tubuh: 36.8°C, HR: 98 bpm, turgor kulit baik, mata tidak cekung, mukosa mulut agak kering.',
        assessment: 'Gastroenteritis Akut (GEA) tanpa dehidrasi susp. viral.',
        plan: '1. Oralit 1 sachet dilarutkan dalam 200ml air hangat setiap kali BAB cair.\n2. Zinc sirup 1x10mg (1/2 sendok teh) selama 10 hari rutin.\n3. Lanjutkan pemberian ASI/air minum putih.\n4. Edukasi tanda-tanda dehidrasi sedang-berat (mata cekung, anak sangat lemas, kencing berkurang).',
        doctorName: 'dr. Baharuddin Yusuf, Sp.PD',
        date: '2026-06-19T10:20:00Z'
      }
    ],
    prescriptions: [
      {
        id: 'rx-204',
        patientId: 'pat-003',
        soapNoteId: 'soap-301',
        items: [
          { name: 'Oralit Sachet', dosage: '200ml', frequency: 'Tiap setelah BAB', instruction: 'Larutkan dalam air hangat', quantity: 10 },
          { name: 'Zinc Sirup', dosage: '10mg/5ml', frequency: '1x sehari 1 sdt', instruction: 'Sesudah makan selama 10 hari', quantity: 1 }
        ],
        notes: 'Pemberian Zinc wajib dihabiskan 10 hari penuh meskipun diare sudah mampet.',
        doctorName: 'dr. Baharuddin Yusuf, Sp.PD',
        date: '2026-06-19T10:20:00Z',
        status: 'SentToPharmacy'
      }
    ],
    labResults: []
  },
  {
    id: 'pat-004',
    name: 'Siti Aminah',
    birthDate: '1958-11-30',
    gender: 'Perempuan',
    phone: '628211112222',
    email: 'siti.aminah@gmail.com',
    address: 'Pejaten, Jakarta Selatan',
    bloodType: 'B',
    allergies: 'Asetosal',
    emergencyContact: 'Putri (Anak) - 08211113333',
    createdAt: '2026-02-15T09:00:00Z',
    nik: '3171033011580001',
    occupation: 'Pensiunan / Ibu Rumah Tangga',
    vitals: [
      {
        id: 'vit-401',
        patientId: 'pat-004',
        bloodPressure: '145/90',
        heartRate: 80,
        temperature: 36.3,
        weight: 62,
        height: 155,
        bmi: 25.8,
        oxygenSaturation: 96,
        recordedAt: '2026-06-17T11:00:00Z',
        recordedBy: 'Suster Nina'
      }
    ],
    soapNotes: [
      {
        id: 'soap-401',
        patientId: 'pat-004',
        subjective: 'Pasien kontrol rutin bulanan untuk penyakit Diabetes Melitus Tipe 2 dan Hipertensi. Badan terasa pegal-pegal terutama di kaki bengkak ringan (+).',
        objective: 'TD: 145/90 mmHg, HR: 80 bpm, GDS: 185 mg/dL. Edema pretibial +/+ minimal.',
        assessment: 'Type 2 Diabetes Mellitus un-controlled + Essential Hypertension Grade I.',
        plan: '1. Metformin 3x500mg sesudah makan tablet.\n2. Amlodipine 1x5mg malam hari.\n3. Edukasi diet ramah DM, kurangi karbohidrat berlebih, rutin jalan kaki santai.\n4. Cek HbA1c bulan depan.',
        doctorName: 'dr. Baharuddin Yusuf, Sp.PD',
        date: '2026-06-17T11:25:00Z'
      }
    ],
    prescriptions: [
      {
        id: 'rx-205',
        patientId: 'pat-004',
        soapNoteId: 'soap-401',
        items: [
          { name: 'Metformin', dosage: '500mg', frequency: '3x sehari', instruction: 'Sesudah makan bersama suapan pertama', quantity: 30 },
          { name: 'Amlodipine', dosage: '5mg', frequency: '1x sehari', instruction: 'Erat malam sebelum tidur', quantity: 30 }
        ],
        notes: 'Pola makan diatur ketat: hindari sirup, nasi putih diganti beras merah jika memungkinkan.',
        doctorName: 'dr. Baharuddin Yusuf, Sp.PD',
        date: '2026-06-17T11:25:00Z',
        status: 'Dispensed'
      }
    ],
    labResults: [
      {
        id: 'lab-303',
        patientId: 'pat-004',
        testName: 'Gula Darah Puasa & HbA1c',
        requestDate: '2026-06-17T11:10:00Z',
        resultDate: '2026-06-18T08:00:00Z',
        status: 'Completed',
        findings: 'GDP: 140 mg/dL (Normal < 100)\nGD2PP: 210 mg/dL (Tinggi > 140)\nHbA1c: 7.9% (Tinggi, target kontrol < 7.0%)',
        laborantName: 'Analis Ahmad Fauzi',
        referenceRange: 'HbA1c < 6.5%'
      }
    ]
  }
];

export const SEED_DRUGS: DrugItem[] = [
  { id: 'drg-001', name: 'Parasetamol', stock: 120, price: 1000, unit: 'Tablet', minStock: 15 },
  { id: 'drg-002', name: 'Pehacain Injection 2ml', stock: 25, price: 15000, unit: 'Ampul', minStock: 5 },
  { id: 'drg-003', name: 'Amoksisilin', stock: 95, price: 1500, unit: 'Tablet', minStock: 15 },
  { id: 'drg-004', name: 'GG (Guaifenesin) Syrup', stock: 12, price: 15000, unit: 'Botol', minStock: 5 },
  { id: 'drg-005', name: 'Oralit Sachet', stock: 150, price: 500, unit: 'Sachet', minStock: 20 },
  { id: 'drg-006', name: 'Zinc Sirup', stock: 18, price: 18000, unit: 'Botol', minStock: 5 },
  { id: 'drg-007', name: 'Metformin', stock: 140, price: 1000, unit: 'Tablet', minStock: 15 },
  { id: 'drg-008', name: 'Amlodipine 5mg', stock: 8, price: 1800, unit: 'Tablet', minStock: 15 },
  { id: 'drg-009', name: 'Vitamin B Complex', stock: 250, price: 800, unit: 'Tablet', minStock: 15 }
];

export const SEED_INVOICES: Invoice[] = [
  {
    id: 'inv-101',
    patientId: 'pat-001',
    patientName: 'Budi Santoso',
    date: '2026-06-15T09:30:00Z',
    items: [
      { id: 'item-1', description: 'Metformin (30 Tablet)', quantity: 30, pricePerUnit: 1000, totalPrice: 30000, type: 'Obat' },
      { id: 'item-2', description: 'Amlodipine 5mg (10 Tablet)', quantity: 10, pricePerUnit: 1800, totalPrice: 18000, type: 'Obat' }
    ],
    consultationFee: 75000,
    treatmentFee: 0,
    discount: 0,
    tax: 4800,
    totalAmount: 127800,
    paymentStatus: 'Lunas',
    paymentMethod: 'Cash',
    soapNoteId: 'soap-101'
  },
  {
    id: 'inv-102',
    patientId: 'pat-001',
    patientName: 'Budi Santoso',
    date: '2026-06-19T09:00:00Z',
    items: [
      { id: 'item-3', description: 'Vitamin B Complex (10 Tablet)', quantity: 10, pricePerUnit: 800, totalPrice: 8000, type: 'Obat' }
    ],
    consultationFee: 75000,
    treatmentFee: 15000,
    discount: 5000,
    tax: 9300,
    totalAmount: 102300,
    paymentStatus: 'Belum Bayar',
    soapNoteId: 'soap-102'
  }
];

// Rich appointment calendar seeding
const SEED_APPOINTMENTS: Appointment[] = [
  {
    id: 'apt-001',
    patientId: 'pat-001',
    patientName: 'Budi Santoso',
    patientPhone: '628129876543',
    date: '2026-06-19',
    time: '09:00',
    reason: 'Kontrol Tekanan Darah & Evaluasi',
    doctorName: 'dr. Baharuddin Yusuf, Sp.PD',
    status: 'Completed',
    whatsappStatus: 'Sent',
    whatsappMessageSent: 'Halo *Budi Santoso*, konfirmasi janji temu Anda di *Exora Health Care Clinic* telah berhasil pada tanggal *2026-06-19* pukul *09:00* dengan *dr. Baharuddin Yusuf, Sp.PD*. Harap datang 15 menit lebih awal. Terima kasih.',
    queueNumber: 'A-01'
  },
  {
    id: 'apt-002',
    patientId: 'pat-003',
    patientName: 'Ahmad Fauzan',
    patientPhone: '628577712345',
    date: '2026-06-19',
    time: '14:30',
    reason: 'Anak Diare Demam Mandiri',
    doctorName: 'dr. Baharuddin Yusuf, Sp.PD',
    status: 'Scheduled',
    whatsappStatus: 'Pending',
    queueNumber: 'A-02'
  },
  {
    id: 'apt-003',
    patientId: 'pat-002',
    patientName: 'Dewi Lestari',
    patientPhone: '6281312345678',
    date: '2026-06-20',
    time: '10:00',
    reason: 'Konsultasi Hasil Lab Darah Infeksi',
    doctorName: 'dr. Baharuddin Yusuf, Sp.PD',
    status: 'Scheduled',
    whatsappStatus: 'Pending',
    queueNumber: 'A-03'
  },
  {
    id: 'apt-004',
    patientId: 'pat-004',
    patientName: 'Siti Aminah',
    patientPhone: '628211112222',
    date: '2026-06-21',
    time: '11:00',
    reason: 'Kontrol Evaluasi Diabetes Melitus Kakinya Bengkak',
    doctorName: 'dr. Baharuddin Yusuf, Sp.PD',
    status: 'Scheduled',
    whatsappStatus: 'Pending',
    queueNumber: 'A-04'
  }
];

export const dbAdapter = {
  // Initialize and Seed Storage
  initialize(): void {
    if (!localStorage.getItem(KEYS.PATIENTS)) {
      localStorage.setItem(KEYS.PATIENTS, JSON.stringify(SEED_PATIENTS));
    }
    if (!localStorage.getItem(KEYS.APPOINTMENTS)) {
      localStorage.setItem(KEYS.APPOINTMENTS, JSON.stringify(SEED_APPOINTMENTS));
    }
    if (!localStorage.getItem(KEYS.SETTINGS)) {
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    }
    if (!localStorage.getItem(KEYS.DRUGS)) {
      localStorage.setItem(KEYS.DRUGS, JSON.stringify(SEED_DRUGS));
    }
    if (!localStorage.getItem(KEYS.INVOICES)) {
      localStorage.setItem(KEYS.INVOICES, JSON.stringify(SEED_INVOICES));
    }
  },

  // Patients CRUD
  getPatients(): Patient[] {
    this.initialize();
    const data = localStorage.getItem(KEYS.PATIENTS);
    return data ? JSON.parse(data) : [];
  },

  savePatients(patients: Patient[]): void {
    localStorage.setItem(KEYS.PATIENTS, JSON.stringify(patients));
  },

  getPatientById(id: string): Patient | undefined {
    return this.getPatients().find(p => p.id === id);
  },

  addPatient(patient: Omit<Patient, "createdAt" | "vitals" | "soapNotes" | "prescriptions" | "labResults">): Patient {
    const patients = this.getPatients();
    const newPatient: Patient = {
      ...patient,
      createdAt: new Date().toISOString(),
      vitals: [],
      soapNotes: [],
      prescriptions: [],
      labResults: [],
    };
    patients.unshift(newPatient);
    this.savePatients(patients);

    // Background cloud sync
    safeSupabaseUpsert("patients", newPatient);

    return newPatient;
  },

  updatePatient(id: string, updatedFields: Partial<Patient>): Patient {
    const patients = this.getPatients();
    const index = patients.findIndex(p => p.id === id);
    if (index === -1) throw new Error("Patient not found");
    patients[index] = { ...patients[index], ...updatedFields };
    this.savePatients(patients);

    // Background cloud sync
    safeSupabaseUpsert("patients", patients[index]);

    return patients[index];
  },

  // Sub-resources of Patient
  addVitalSign(patientId: string, vital: Omit<VitalSign, "id" | "patientId" | "recordedAt">): VitalSign {
    const patients = this.getPatients();
    const index = patients.findIndex(p => p.id === patientId);
    if (index === -1) throw new Error("Patient not found");

    const newVital: VitalSign = {
      ...vital,
      id: "vit-" + Math.random().toString(36).substr(2, 9),
      patientId,
      recordedAt: new Date().toISOString(),
    };

    if (!patients[index].vitals) patients[index].vitals = [];
    patients[index].vitals!.unshift(newVital);
    this.savePatients(patients);

    // Background cloud sync nested document
    safeSupabaseUpsert("patients", patients[index]);

    return newVital;
  },

  addSOAPNote(patientId: string, soap: Omit<SOAPNote, "id" | "patientId" | "date">): { soap: SOAPNote; prescription?: Prescription } {
    const patients = this.getPatients();
    const index = patients.findIndex(p => p.id === patientId);
    if (index === -1) throw new Error("Patient not found");

    const newSOAP: SOAPNote = {
      ...soap,
      id: "soap-" + Math.random().toString(36).substr(2, 9),
      patientId,
      date: new Date().toISOString(),
    };

    if (!patients[index].soapNotes) patients[index].soapNotes = [];
    patients[index].soapNotes!.unshift(newSOAP);
    this.savePatients(patients);

    // Background cloud sync nested document
    safeSupabaseUpsert("patients", patients[index]);

    return { soap: newSOAP };
  },

  addPrescription(patientId: string, rx: Omit<Prescription, "id" | "patientId" | "date">): Prescription {
    const patients = this.getPatients();
    const index = patients.findIndex(p => p.id === patientId);
    if (index === -1) throw new Error("Patient not found");

    const newRx: Prescription = {
      ...rx,
      id: "rx-" + Math.random().toString(36).substr(2, 9),
      patientId,
      date: new Date().toISOString(),
    };

    if (!patients[index].prescriptions) patients[index].prescriptions = [];
    patients[index].prescriptions!.unshift(newRx);
    this.savePatients(patients);

    // Background cloud sync nested document
    safeSupabaseUpsert("patients", patients[index]);

    // Auto-create unpaid cashier invoice for this prescription visits!
    try {
      const drugsMaster = this.getDrugs();
      const invoiceItems: InvoiceItem[] = newRx.items.map((item, idx) => {
        const dMaster = drugsMaster.find(d => d.name.toLowerCase() === item.name.toLowerCase());
        const pricePerUnit = dMaster ? dMaster.price : 1000;
        return {
          id: `item-${Date.now()}-${idx}`,
          description: `${item.name} (${item.dosage})`,
          quantity: item.quantity,
          pricePerUnit,
          totalPrice: pricePerUnit * item.quantity,
          type: "Obat"
        };
      });

      const consultFee = 75000; // Standar biaya periksa dokter umum/spesialis Exora
      const treatmentFee = 0;   // Tindakan dasar
      const subtotal = consultFee + treatmentFee + invoiceItems.reduce((acc, curr) => acc + curr.totalPrice, 0);
      const taxAmount = Math.round(subtotal * 0.11); // PPN 11%

      const invoice = this.addInvoice({
        patientId,
        patientName: patients[index].name,
        items: invoiceItems,
        consultationFee: consultFee,
        treatmentFee,
        discount: 0,
        tax: taxAmount,
        totalAmount: subtotal + taxAmount,
        paymentStatus: "Belum Bayar",
        soapNoteId: newRx.soapNoteId
      });

      // Background cloud sync invoice
      safeSupabaseUpsert("invoices", invoice);
    } catch (err) {
      console.error("Failed to auto-create invoice:", err);
    }

    return newRx;
  },

  addLabResult(patientId: string, lab: Omit<LabResult, "id" | "patientId" | "requestDate">): LabResult {
    const patients = this.getPatients();
    const index = patients.findIndex(p => p.id === patientId);
    if (index === -1) throw new Error("Patient not found");

    const newLab: LabResult = {
      ...lab,
      id: "lab-" + Math.random().toString(36).substr(2, 9),
      patientId,
      requestDate: new Date().toISOString(),
    };

    if (!patients[index].labResults) patients[index].labResults = [];
    patients[index].labResults!.unshift(newLab);
    this.savePatients(patients);

    // Background cloud sync nested document
    safeSupabaseUpsert("patients", patients[index]);

    return newLab;
  },

  updateLabResult(patientId: string, labId: string, updatedFields: Partial<LabResult>): LabResult {
    const patients = this.getPatients();
    const index = patients.findIndex(p => p.id === patientId);
    if (index === -1) throw new Error("Patient not found");

    const labIndex = patients[index].labResults?.findIndex(l => l.id === labId) ?? -1;
    if (labIndex === -1) throw new Error("Lab report not found");

    const originalLab = patients[index].labResults![labIndex];
    const updatedLab = { ...originalLab, ...updatedFields };
    patients[index].labResults![labIndex] = updatedLab;
    this.savePatients(patients);

    // Background cloud sync nested document
    safeSupabaseUpsert("patients", patients[index]);

    return updatedLab;
  },

  // Appointment Booking
  getAppointments(): Appointment[] {
    this.initialize();
    const data = localStorage.getItem(KEYS.APPOINTMENTS);
    return data ? JSON.parse(data) : [];
  },

  saveAppointments(appointments: Appointment[]): void {
    localStorage.setItem(KEYS.APPOINTMENTS, JSON.stringify(appointments));
  },

  addAppointment(apt: Omit<Appointment, "id" | "whatsappStatus">): Appointment {
    const appointments = this.getAppointments();
    const newApt: Appointment = {
      ...apt,
      id: "apt-" + Math.random().toString(36).substr(2, 9),
      whatsappStatus: "Pending",
    };
    appointments.unshift(newApt);
    this.saveAppointments(appointments);

    // Background cloud sync
    safeSupabaseUpsert("appointments", newApt);

    return newApt;
  },

  updateAppointmentStatus(id: string, status: Appointment["status"]): Appointment {
    const appointments = this.getAppointments();
    const index = appointments.findIndex(a => a.id === id);
    if (index === -1) throw new Error("Appointment not found");
    appointments[index].status = status;
    this.saveAppointments(appointments);

    // Background cloud sync
    safeSupabaseUpsert("appointments", appointments[index]);

    return appointments[index];
  },

  updateAppointmentWhatsappStatus(id: string, status: Appointment["whatsappStatus"], message?: string): Appointment {
    const appointments = this.getAppointments();
    const index = appointments.findIndex(a => a.id === id);
    if (index === -1) throw new Error("Appointment not found");
    appointments[index].whatsappStatus = status;
    if (message) {
      appointments[index].whatsappMessageSent = message;
    }
    this.saveAppointments(appointments);

    // Background cloud sync
    safeSupabaseUpsert("appointments", appointments[index]);

    return appointments[index];
  },

  // ==========================================
  // DRUGS (PHARMACY INVENTORY) APIS (Poin A)
  // ==========================================
  getDrugs(): DrugItem[] {
    this.initialize();
    const data = localStorage.getItem(KEYS.DRUGS);
    return data ? JSON.parse(data) : [];
  },

  saveDrugs(drugs: DrugItem[]): void {
    localStorage.setItem(KEYS.DRUGS, JSON.stringify(drugs));
    // Background cloud sync each item
    driversSyncDrugs(drugs);
  },

  decrementDrugStock(name: string, quantity: number): void {
    const drugs = this.getDrugs();
    const index = drugs.findIndex(d => d.name.toLowerCase() === name.toLowerCase());
    if (index !== -1) {
      drugs[index].stock = Math.max(0, drugs[index].stock - quantity);
      this.saveDrugs(drugs);
    }
  },

  incrementDrugStock(name: string, quantity: number): void {
    const drugs = this.getDrugs();
    const index = drugs.findIndex(d => d.name.toLowerCase() === name.toLowerCase());
    if (index !== -1) {
      drugs[index].stock += quantity;
      this.saveDrugs(drugs);
    }
  },

  // ==========================================
  // INVOICES (BILLING & KASIR) APIS (Poin B)
  // ==========================================
  getInvoices(): Invoice[] {
    this.initialize();
    const data = localStorage.getItem(KEYS.INVOICES);
    return data ? JSON.parse(data) : [];
  },

  saveInvoices(invoices: Invoice[]): void {
    localStorage.setItem(KEYS.INVOICES, JSON.stringify(invoices));
  },

  addInvoice(invoice: Omit<Invoice, "id" | "date">): Invoice {
    const invoices = this.getInvoices();
    const newInvoice: Invoice = {
      ...invoice,
      id: "inv-" + Math.random().toString(36).substr(2, 5).toUpperCase(),
      date: new Date().toISOString(),
    };
    invoices.unshift(newInvoice);
    this.saveInvoices(invoices);

    // Background cloud sync
    safeSupabaseUpsert("invoices", newInvoice);

    return newInvoice;
  },

  updateInvoiceStatus(id: string, status: Invoice["paymentStatus"], method?: Invoice["paymentMethod"]): Invoice {
    const invoices = this.getInvoices();
    const index = invoices.findIndex(i => i.id === id);
    if (index === -1) throw new Error("Invoice not found");
    invoices[index].paymentStatus = status;
    if (method) {
      invoices[index].paymentMethod = method;
    }
    this.saveInvoices(invoices);

    // Background cloud sync
    safeSupabaseUpsert("invoices", invoices[index]);

    // Auto-decrement drug inventory stock when invoice is paid (marked as Lunas)
    if (status === "Lunas") {
      const invoiceData = invoices[index];
      invoiceData.items.forEach(item => {
        if (item.type === "Obat") {
          // Extract core drug name from invoice item (e.g. "Parasetamol" from "Parasetamol (500mg)")
          const drugName = item.description.split(" (")[0];
          this.decrementDrugStock(drugName, item.quantity);
        }
      });
    }
    return invoices[index];
  },

  // Settings Getter / Setter
  getSettings(): SystemSettings {
    this.initialize();
    const data = localStorage.getItem(KEYS.SETTINGS);
    return data ? JSON.parse(data) : DEFAULT_SETTINGS;
  },

  saveSettings(settings: SystemSettings): void {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  },

  // ==========================================
  // SUPABASE ACTIVE CLOUD SYNCING MANUAL ACTIONS
  // ==========================================
  async pushLocalToSupabase(): Promise<{ success: boolean; message: string; details?: any }> {
    const supabase = getSupabase();
    if (!supabase) {
      return { success: false, message: "Koneksi Supabase belum siap. Masukkan URL & Anon Key di tab Pengaturan." };
    }

    try {
      const patients = this.getPatients();
      const appointments = this.getAppointments();
      const drugs = this.getDrugs();
      const invoices = this.getInvoices();

      let successCount = 0;
      let errorCount = 0;
      let lastErrorMessage = "";

      // Push Patients
      if (patients.length > 0) {
        const { error } = await supabase.from("patients").upsert(patients);
        if (error) { errorCount++; lastErrorMessage = error.message; }
        else { successCount++; }
      }

      // Push Appointments
      if (appointments.length > 0) {
        const { error } = await supabase.from("appointments").upsert(appointments);
        if (error) { errorCount++; lastErrorMessage = error.message; }
        else { successCount++; }
      }

      // Push Drugs
      if (drugs.length > 0) {
        const { error } = await supabase.from("drugs").upsert(drugs);
        if (error) { errorCount++; lastErrorMessage = error.message; }
        else { successCount++; }
      }

      // Push Invoices
      if (invoices.length > 0) {
        const { error } = await supabase.from("invoices").upsert(invoices);
        if (error) { errorCount++; lastErrorMessage = error.message; }
        else { successCount++; }
      }

      if (errorCount > 0) {
        return {
          success: false,
          message: `Sebagian tabel gagal dipush ke Supabase. Pastikan skema tabel sudah terbuat di SQL console Anda.`,
          details: lastErrorMessage
        };
      }

      return { success: true, message: "Penyelarasan Data (Push) Berhasil! Seluruh data klinis lokal disinkronkan ke Supabase Cloud." };
    } catch (err: any) {
      return { success: false, message: "Koneksi ke server Supabase gagal.", details: err.message || err };
    }
  },

  async pullFromSupabase(): Promise<{ success: boolean; message: string; details?: any }> {
    const supabase = getSupabase();
    if (!supabase) {
      return { success: false, message: "Koneksi Supabase belum siap. Masukkan URL & Anon Key di tab Pengaturan." };
    }

    try {
      const { data: cloudPat, error: errPat } = await supabase.from("patients").select("*");
      if (errPat) throw errPat;

      const { data: cloudApt, error: errApt } = await supabase.from("appointments").select("*");
      if (errApt) throw errApt;

      const { data: cloudDrg, error: errDrg } = await supabase.from("drugs").select("*");
      if (errDrg) throw errDrg;

      const { data: cloudInv, error: errInv } = await supabase.from("invoices").select("*");
      if (errInv) throw errInv;

      if (cloudPat) localStorage.setItem(KEYS.PATIENTS, JSON.stringify(cloudPat));
      if (cloudApt) localStorage.setItem(KEYS.APPOINTMENTS, JSON.stringify(cloudApt));
      if (cloudDrg) localStorage.setItem(KEYS.DRUGS, JSON.stringify(cloudDrg));
      if (cloudInv) localStorage.setItem(KEYS.INVOICES, JSON.stringify(cloudInv));

      return { success: true, message: "Unduh Data (Pull) Berhasil! Seluruh data lokal diperbarui sesuai data Supabase Cloud." };
    } catch (err: any) {
      return { success: false, message: "Gagal menarik data dari server Supabase.", details: err.message || err };
    }
  },

  // Import / Export EHR database
  exportDB(): string {
    const db = {
      patients: this.getPatients(),
      appointments: this.getAppointments(),
      settings: this.getSettings()
    };
    return JSON.stringify(db, null, 2);
  },

  importDB(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.patients && Array.isArray(parsed.patients)) {
        localStorage.setItem(KEYS.PATIENTS, JSON.stringify(parsed.patients));
      }
      if (parsed.appointments && Array.isArray(parsed.appointments)) {
        localStorage.setItem(KEYS.APPOINTMENTS, JSON.stringify(parsed.appointments));
      }
      if (parsed.settings) {
        localStorage.setItem(KEYS.SETTINGS, JSON.stringify(parsed.settings));
      }
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }
};

// Internal utility helper to avoid circularity & sync drugs list
function driversSyncDrugs(drugs: DrugItem[]) {
  drugs.forEach(d => {
    safeSupabaseUpsert("drugs", d);
  });
}
