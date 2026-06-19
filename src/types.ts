/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Patient {
  id: string; // UUID or string id
  name: string;
  birthDate: string;
  gender: 'Laki-laki' | 'Perempuan';
  phone: string;
  email: string;
  address: string;
  bloodType: 'A' | 'B' | 'AB' | 'O' | 'Belum Tahu';
  allergies: string;
  emergencyContact: string;
  createdAt: string;
  nik?: string; // NIK ID Card Number Indonesia
  occupation?: string;
  vitals?: VitalSign[];
  soapNotes?: SOAPNote[];
  prescriptions?: Prescription[];
  labResults?: LabResult[];
}

export interface VitalSign {
  id: string;
  patientId: string;
  bloodPressure: string; // e.g. "120/80"
  heartRate: number; // bpm
  temperature: number; // °C
  weight: number; // kg
  height: number; // cm
  bmi: number;
  oxygenSaturation: number; // SpO2 %
  recordedAt: string;
  recordedBy: string;
}

export interface SOAPNote {
  id: string;
  patientId: string;
  subjective: string; // Keluhan pasien
  objective: string; // Pemeriksaan fisik, keadaan umum, vitals
  assessment: string; // Diagnosis / diagnosis diferensial
  plan: string; // Terapi, edukasi, rujukan
  doctorName: string;
  date: string;
}

export interface PrescriptionItem {
  name: string;
  dosage: string; // e.g. "500mg" or "1 tablet"
  frequency: string; // e.g. "3x sehari"
  instruction: string; // e.g. "Sesudah makan" or "Habiskan"
  quantity: number;
}

export interface Prescription {
  id: string;
  patientId: string;
  soapNoteId?: string;
  items: PrescriptionItem[];
  notes: string;
  doctorName: string;
  date: string;
  status: 'Draft' | 'SentToPharmacy' | 'Dispensed';
}

export interface LabResult {
  id: string;
  patientId: string;
  testName: string; // e.g. "Darah Lengkap"
  requestDate: string;
  resultDate?: string;
  status: 'Pending' | 'Completed';
  findings?: string; // Temuan laboratorium
  laborantName?: string;
  referenceRange?: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  reason: string;
  doctorName: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled' | 'No_Show';
  whatsappStatus: 'Pending' | 'Sent' | 'Failed';
  whatsappMessageSent?: string;
  queueNumber?: string; // Number for printing queue ticket & TTS audio call
}

export interface DrugItem {
  id: string;
  name: string;
  stock: number;
  price: number;
  unit: string; // Tablet, Botol, Kapsul, Sachet, dll.
  minStock: number;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  type: 'Obat' | 'Tindakan' | 'Lainnya';
}

export interface Invoice {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  items: InvoiceItem[];
  consultationFee: number;
  treatmentFee: number;
  discount: number;
  tax: number;
  totalAmount: number;
  paymentStatus: 'Belum Bayar' | 'Lunas';
  paymentMethod?: 'Cash' | 'Debit' | 'QRIS' | 'Transfer';
  soapNoteId?: string;
}

export interface SystemSettings {
  supabaseUrl: string;
  supabaseAnonKey: string;
  groqApiKey: string;
  clinicName: string;
  clinicPhone: string;
  clinicAddress: string;
  defaultDoctorName: string;
  waTemplateNewAppointment: string;
  waTemplateReminder: string;
  loginEmail?: string;
  loginPassword?: string;
  loginUsername?: string;
}

export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: 'Dokter' | 'Perawat' | 'Admin';
  token?: string;
}
