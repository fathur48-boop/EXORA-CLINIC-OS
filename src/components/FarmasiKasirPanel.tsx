/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { dbAdapter } from '../db/dbAdapter';
import { DrugItem, Invoice, InvoiceItem, Patient } from '../types';
import { 
  Pill, Receipt, Plus, Search, RefreshCw, AlertTriangle, 
  CheckCircle, CreditCard, ChevronRight, Download, Printer, Percent, Trash2
} from 'lucide-react';

interface FarmasiKasirPanelProps {
  onRefreshAll: () => void;
}

export default function FarmasiKasirPanel({ onRefreshAll }: FarmasiKasirPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<'Farmasi' | 'Kasir'>('Farmasi');
  
  // Data State
  const [drugs, setDrugs] = useState<DrugItem[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);

  // Search and Filter States
  const [searchDrugQuery, setSearchDrugQuery] = useState('');
  const [searchInvoiceQuery, setSearchInvoiceQuery] = useState('');
  const [filterInvoiceStatus, setFilterInvoiceStatus] = useState<'All' | 'Belum Bayar' | 'Lunas'>('All');

  // Form states for new drug
  const [showAddDrugModal, setShowAddDrugModal] = useState(false);
  const [newDrugName, setNewDrugName] = useState('');
  const [newDrugStock, setNewDrugStock] = useState(100);
  const [newDrugPrice, setNewDrugPrice] = useState(1000);
  const [newDrugUnit, setNewDrugUnit] = useState('Tablet');
  const [newDrugMinStock, setNewDrugMinStock] = useState(15);

  // Form states for restock
  const [selectedDrugForRestock, setSelectedDrugForRestock] = useState<DrugItem | null>(null);
  const [restockQty, setRestockQty] = useState(50);

  // Cashier active checkout
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [checkoutTreatmentFee, setCheckoutTreatmentFee] = useState(0);
  const [checkoutDiscount, setCheckoutDiscount] = useState(0);
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState<'Cash' | 'Debit' | 'QRIS' | 'Transfer'>('Cash');

  // Receipt printable view
  const [showReceiptInvoice, setShowReceiptInvoice] = useState<Invoice | null>(null);

  // Load Data
  const loadData = () => {
    setDrugs(dbAdapter.getDrugs());
    setInvoices(dbAdapter.getInvoices());
    setPatients(dbAdapter.getPatients());
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    loadData();
    onRefreshAll();
  };

  // ----------------------------------------------------
  // Drugs Logic
  // ----------------------------------------------------
  const filteredDrugs = useMemo(() => {
    return drugs.filter(d => 
      d.name.toLowerCase().includes(searchDrugQuery.toLowerCase()) || d.id.includes(searchDrugQuery)
    );
  }, [drugs, searchDrugQuery]);

  const handleAddDrugSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDrugName.trim()) return alert('Nama obat wajib diisi.');

    const allDrugs = dbAdapter.getDrugs();
    const newDrug: DrugItem = {
      id: 'drg-' + Math.random().toString(36).substr(2, 5).toUpperCase(),
      name: newDrugName.trim(),
      stock: Number(newDrugStock),
      price: Number(newDrugPrice),
      unit: newDrugUnit,
      minStock: Number(newDrugMinStock),
    };

    allDrugs.push(newDrug);
    dbAdapter.saveDrugs(allDrugs);
    
    // Reset and close
    setNewDrugName('');
    setNewDrugStock(100);
    setNewDrugPrice(1000);
    setNewDrugUnit('Tablet');
    setNewDrugMinStock(15);
    setShowAddDrugModal(false);
    handleRefresh();
  };

  const handleRestockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDrugForRestock) return;

    dbAdapter.incrementDrugStock(selectedDrugForRestock.name, Number(restockQty));
    setSelectedDrugForRestock(null);
    setRestockQty(50);
    handleRefresh();
  };

  // ----------------------------------------------------
  // Cashier Billing Logic
  // ----------------------------------------------------
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchesSearch = 
        inv.patientName.toLowerCase().includes(searchInvoiceQuery.toLowerCase()) || 
        inv.id.toLowerCase().includes(searchInvoiceQuery.toLowerCase());
      const matchesStatus = 
        filterInvoiceStatus === 'All' ? true : inv.paymentStatus === filterInvoiceStatus;
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchInvoiceQuery, filterInvoiceStatus]);

  const handleOpenCheckout = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setCheckoutTreatmentFee(inv.treatmentFee || 0);
    setCheckoutDiscount(inv.discount || 0);
    setCheckoutPaymentMethod('Cash');
  };

  const handleProcessPayment = () => {
    if (!selectedInvoice) return;

    try {
      // Calculate active changes
      const subtotalObat = selectedInvoice.items.reduce((acc, c) => acc + c.totalPrice, 0);
      const subtotalTotal = selectedInvoice.consultationFee + Number(checkoutTreatmentFee) + subtotalObat - Number(checkoutDiscount);
      const taxCalculated = Math.round(subtotalTotal * 0.11); // PPN 11%
      const finalAmount = Math.max(0, subtotalTotal + taxCalculated);

      // Create an updated duplicate in dbAdapter
      const allInvoices = dbAdapter.getInvoices();
      const index = allInvoices.findIndex(i => i.id === selectedInvoice.id);
      
      if (index !== -1) {
        allInvoices[index].treatmentFee = Number(checkoutTreatmentFee);
        allInvoices[index].discount = Number(checkoutDiscount);
        allInvoices[index].tax = taxCalculated;
        allInvoices[index].totalAmount = finalAmount;
        allInvoices[index].paymentStatus = 'Lunas';
        allInvoices[index].paymentMethod = checkoutPaymentMethod;
        
        // Auto-decrement drug stock for items inside
        selectedInvoice.items.forEach(item => {
          if (item.type === 'Obat') {
            const drugName = item.description.split(' (')[0];
            dbAdapter.decrementDrugStock(drugName, item.quantity);
          }
        });

        dbAdapter.saveInvoices(allInvoices);
      }

      setSelectedInvoice(null);
      handleRefresh();
    } catch (err) {
      console.error(err);
      alert('Gagal menyelesaikan pembayaran.');
    }
  };

  const calculatePendingCheckoutTotals = useMemo(() => {
    if (!selectedInvoice) return { subtotal: 0, tax: 0, grand: 0 };
    const subtotalObat = selectedInvoice.items.reduce((acc, c) => acc + c.totalPrice, 0);
    const subtotalTotal = selectedInvoice.consultationFee + Number(checkoutTreatmentFee) + subtotalObat - Number(checkoutDiscount);
    const taxValue = Math.round(subtotalTotal * 0.11);
    const grandValue = Math.max(0, subtotalTotal + taxValue);
    return { subtotal: subtotalTotal, tax: taxValue, grand: grandValue };
  }, [selectedInvoice, checkoutTreatmentFee, checkoutDiscount]);

  const handlePrintReceipt = (receipt: Invoice) => {
    // Elegant system print mode opening a clean window
    const pWindow = window.open('', '_blank');
    if (!pWindow) return alert('Tolong izinkan popup untuk mencetak kuitansi.');
    
    const settings = dbAdapter.getSettings();
    const dateFormatted = new Date(receipt.date).toLocaleString('id-ID');

    pWindow.document.write(`
      <html>
        <head>
          <title>Kuitansi-${receipt.id}</title>
          <style>
            body { font-family: 'Courier New', monospace; font-size: 11px; color: #1e293b; padding: 25px; max-width: 500px; margin: 0 auto; }
            .text-center { text-align: center; }
            .header { margin-bottom: 20px; border-bottom: 2px dashed #94a3b8; padding-bottom: 10px; }
            .title { font-size: 14px; font-weight: bold; margin: 5px 0; letter-spacing: 1px; }
            .meta-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
            .underline { border-bottom: 1px dashed #94a3b8; margin: 15px 0; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            th, td { text-align: left; padding: 5px 0; vertical-align: top; }
            .text-right { text-align: right; }
            .grand-total { font-size: 13px; font-weight: bold; border-top: 2px dashed #1e293b; padding-top: 8px; margin-top: 10px; }
            .footer { margin-top: 30px; border-top: 1px dashed #94a3b8; padding-top: 15px; }
            @media print { @page { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header text-center">
            <div class="title">${settings.clinicName.toUpperCase()}</div>
            <div>${settings.clinicAddress}</div>
            <div>Telp: ${settings.clinicPhone}</div>
          </div>
          
          <div class="text-center" style="font-size: 12px; font-weight: bold; margin-bottom: 15px;">KUITANSI PEMBAYARAN RESMI</div>
          
          <div class="meta-row"><span>No Invoice  :</span> <span>${receipt.id}</span></div>
          <div class="meta-row"><span>Nama Pasien :</span> <span>${receipt.patientName}</span></div>
          <div class="meta-row"><span>Tanggal     :</span> <span>${dateFormatted}</span></div>
          <div class="meta-row"><span>Kasir       :</span> <span>OPERASIONAL CLINIC</span></div>
          <div class="meta-row"><span>Dokter      :</span> <span>${settings.defaultDoctorName}</span></div>
          <div class="meta-row"><span>Status/Bayar:</span> <span>LUNAS (${receipt.paymentMethod})</span></div>

          <div class="underline"></div>

          <table>
            <thead>
              <tr style="border-bottom: 1px dashed #94a3b8;">
                <th>Layanan/Item</th>
                <th class="text-right">Qty</th>
                <th class="text-right">Total (IDR)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Konsultasi Medis Dr</td>
                <td class="text-right">1</td>
                <td class="text-right">${receipt.consultationFee.toLocaleString('id-ID')}</td>
              </tr>
              ${receipt.treatmentFee > 0 ? `
              <tr>
                <td>Tindakan Medis Tambahan</td>
                <td class="text-right">1</td>
                <td class="text-right">${receipt.treatmentFee.toLocaleString('id-ID')}</td>
              </tr>` : ''}
              ${receipt.items.map(item => `
              <tr>
                <td>${item.description}</td>
                <td class="text-right">${item.quantity}</td>
                <td class="text-right">${item.totalPrice.toLocaleString('id-ID')}</td>
              </tr>`).join('')}
            </tbody>
          </table>

          <div class="underline"></div>

          <div class="meta-row"><span>Biaya Konsultasi & Jasa:</span> <span>Rp ${(receipt.consultationFee + (receipt.treatmentFee || 0)).toLocaleString('id-ID')}</span></div>
          <div class="meta-row"><span>Biaya Farmasi/Obat      :</span> <span>Rp ${receipt.items.reduce((acc, c) => acc + c.totalPrice, 0).toLocaleString('id-ID')}</span></div>
          ${receipt.discount > 0 ? `<div class="meta-row"><span>Potongan Diskon      :</span> <span>-Rp ${receipt.discount.toLocaleString('id-ID')}</span></div>` : ''}
          <div class="meta-row"><span>PPN Pajak (11%)       :</span> <span>Rp ${receipt.tax.toLocaleString('id-ID')}</span></div>
          
          <div class="grand-total meta-row"><span>GRAND TOTAL (NETTO)   :</span> <span>Rp ${receipt.totalAmount.toLocaleString('id-ID')}</span></div>

          <div class="footer text-center">
            <p>** Terima Kasih Atas Kepercayaan Anda **</p>
            <p style="font-size: 8px; color: #64748b;">Kuitansi diterbitkan otomatis oleh Exora OS Clinical Suite</p>
          </div>

          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    pWindow.document.close();
  };

  return (
    <div className="space-y-6">
      
      {/* Tab controls */}
      <div className="flex justify-between items-center bg-white border border-sage-200 px-4 py-2.5 rounded-2xl card-shadow">
        <div className="flex gap-2">
          <button 
            id="pharmacysub-farmasi"
            onClick={() => setActiveSubTab('Farmasi')}
            className={`flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer ${
              activeSubTab === 'Farmasi' 
                ? 'bg-sage-600 text-white shadow-md' 
                : 'text-sage-500 hover:bg-slate-100 hover:text-sage-700'
            }`}
          >
            <Pill className="w-4 h-4" /> Farmasi & Inventaris Obat (Poin A)
          </button>
          
          <button 
            id="pharmacysub-kasir"
            onClick={() => setActiveSubTab('Kasir')}
            className={`flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer ${
              activeSubTab === 'Kasir' 
                ? 'bg-sage-600 text-white shadow-md' 
                : 'text-sage-500 hover:bg-slate-100 hover:text-sage-700'
            }`}
          >
            <Receipt className="w-4 h-4" /> Billing & POS Kasir Klinik (Poin B)
          </button>
        </div>

        <button 
          onClick={handleRefresh}
          className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl cursor-pointer"
          title="Sinkronisasi Data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {activeSubTab === 'Farmasi' ? (
        <div className="space-y-6">
          {/* Farmasi Header */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 p-5 rounded-2xl card-shadow flex items-center gap-4">
              <div className="p-3 bg-sage-50 rounded-2xl text-sage-600 border border-sage-100">
                <Pill className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Katalog Obat</span>
                <span className="text-xl font-bold text-slate-800">{drugs.length} Item</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl card-shadow flex items-center gap-4">
              <div className="p-3 bg-red-50 rounded-2xl text-red-600 border border-red-100">
                <AlertTriangle className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Stok Menipis / Kritis</span>
                <span className="text-xl font-bold text-red-600">{drugs.filter(d => d.stock <= d.minStock).length} Item</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl card-shadow flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 rounded-2xl text-blue-600 border border-blue-100">
                  <Plus className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block">Tambah Obat Baru</span>
                  <span className="text-xs font-mono text-slate-500 font-medium">Registrasi apotek</span>
                </div>
              </div>
              <button 
                id="btn-regist-drug"
                onClick={() => setShowAddDrugModal(true)}
                className="bg-sage-600 hover:bg-sage-700 text-white rounded-xl text-[11px] font-bold px-3 py-2 cursor-pointer transition-colors"
              >
                + Obat Baru
              </button>
            </div>
          </div>

          {/* Search bar inside drug */}
          <div className="bg-white border border-sage-200 p-5 rounded-2xl card-shadow space-y-4">
            <div className="flex justify-between items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Cari obat berdasarkan nama atau kode..." 
                  value={searchDrugQuery}
                  onChange={e => setSearchDrugQuery(e.target.value)}
                  className="w-full text-xs pl-9 pr-4 py-3.5 border border-slate-200 rounded-xl outline-none focus:border-sage-500"
                />
              </div>
            </div>

            {/* Drugs Table */}
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left text-xs bg-white">
                <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3.5 px-4 font-bold">id obat</th>
                    <th className="py-3.5 px-3">Nama Sediaan</th>
                    <th className="py-3.5 px-2">Stok Sekarang</th>
                    <th className="py-3.5 px-2">Ambang Minimum</th>
                    <th className="py-3.5 px-2 text-right">Harga Satuan</th>
                    <th className="py-3.5 px-2 text-center">Status</th>
                    <th className="py-3.5 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDrugs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-xs text-slate-400 font-medium italic">Obat tidak ditemukan.</td>
                    </tr>
                  ) : (
                    filteredDrugs.map(d => {
                      const isLow = d.stock <= d.minStock;
                      return (
                        <tr key={d.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 font-mono font-bold text-slate-500">{d.id}</td>
                          <td className="py-3 px-3">
                            <span className="font-semibold text-slate-800 text-xs block">{d.name}</span>
                            <span className="text-[10px] text-slate-400">Tipe sediaan: {d.unit}</span>
                          </td>
                          <td className="py-3 px-2 font-semibold font-mono text-slate-800">{d.stock} {d.unit}</td>
                          <td className="py-3 px-2 font-mono text-slate-500">{d.minStock} {d.unit}</td>
                          <td className="py-3 px-2 font-semibold font-mono text-slate-800 text-right">Rp {d.price.toLocaleString('id-ID')}</td>
                          <td className="py-3 px-2 text-center">
                            {isLow ? (
                              <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 text-[9px] font-mono px-2 py-0.5 rounded border border-rose-100 font-bold">LOW STOCK</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 text-[9px] font-mono px-2 py-0.5 rounded border border-emerald-100 font-bold">AMAN</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button 
                              onClick={() => setSelectedDrugForRestock(d)}
                              className="text-[11px] bg-slate-100 hover:bg-sage-600 hover:text-white px-2.5 py-1 rounded font-bold transition-all text-slate-600 cursor-pointer"
                            >
                              + Re-Stock
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Kasir POS Tab */
        <div className="space-y-6">
          <div className="bg-white border border-sage-200 p-5 rounded-2xl card-shadow space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Cari kwitansi berdasarkan ID atau nama pasien..." 
                  value={searchInvoiceQuery}
                  onChange={e => setSearchInvoiceQuery(e.target.value)}
                  className="w-full text-xs pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-sage-500"
                />
              </div>

              {/* Status Filter */}
              <div className="flex gap-1.5 shrink-0 bg-slate-50 p-1 rounded-xl border border-slate-150">
                {(['All', 'Belum Bayar', 'Lunas'] as const).map(status => (
                  <button
                    key={status}
                    onClick={() => setFilterInvoiceStatus(status)}
                    className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                      filterInvoiceStatus === status 
                        ? 'bg-white text-sage-800 shadow-sm border border-slate-100' 
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {status === 'All' ? 'Semua Tagihan' : status}
                  </button>
                ))}
              </div>
            </div>

            {/* Cashier Table listing */}
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left text-xs bg-white">
                <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3.5 px-4 font-medium">Inv ID</th>
                    <th className="py-3.5 px-3">Pasien Kunjungan</th>
                    <th className="py-3.5 px-2">Tanggal Berkas</th>
                    <th className="py-3.5 px-2 text-right">Konsul Dr (Rp)</th>
                    <th className="py-3.5 px-2 text-right">Rincian Obat (Rp)</th>
                    <th className="py-3.5 px-2 text-right">Total Netto (Rp)</th>
                    <th className="py-3.5 px-2 text-center">Status</th>
                    <th className="py-3.5 px-4 text-center">Aksi / Dokumen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-xs text-slate-400 font-medium italic">Tagihan tidak ditemukan.</td>
                    </tr>
                  ) : (
                    filteredInvoices.map(inv => {
                      const drugCost = inv.items.reduce((acc, c) => acc + c.totalPrice, 0);
                      const isUnpaid = inv.paymentStatus === 'Belum Bayar';
                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/50">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-500 text-xs">{inv.id}</td>
                          <td className="py-3.5 px-3">
                            <span className="font-semibold text-slate-800 text-xs block">{inv.patientName}</span>
                            <span className="text-[10px] font-mono text-slate-400">ID Pasien: {inv.patientId}</span>
                          </td>
                          <td className="py-3.5 px-2 text-slate-500">{new Date(inv.date).toLocaleDateString('id-ID')}</td>
                          <td className="py-3.5 px-2 font-mono text-slate-700 text-right">Rp {inv.consultationFee.toLocaleString('id-ID')}</td>
                          <td className="py-3.5 px-2 font-mono text-slate-700 text-right">Rp {drugCost.toLocaleString('id-ID')}</td>
                          <td className="py-3.5 px-2 font-mono font-bold text-slate-800 text-right">Rp {inv.totalAmount.toLocaleString('id-ID')}</td>
                          <td className="py-3.5 px-2 text-center">
                            {isUnpaid ? (
                              <span className="inline-flex bg-amber-50 text-amber-700 text-[10px] font-mono px-2.5 py-0.5 rounded-full border border-amber-150 font-bold">UNPAID</span>
                            ) : (
                              <span className="inline-flex bg-emerald-50 text-emerald-800 text-[10px] font-mono px-2.5 py-0.5 rounded-full border border-emerald-150 font-bold">LUNAS</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {isUnpaid ? (
                              <button 
                                onClick={() => handleOpenCheckout(inv)}
                                className="inline-flex items-center gap-1 text-[11px] bg-emerald-550 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 font-bold px-3 py-1.5 rounded-lg border border-emerald-100 transition-colors cursor-pointer ring-offset-2 focus:ring-2 focus:ring-emerald-500"
                              >
                                <CreditCard className="w-3.5 h-3.5" /> Bayar Kasir
                              </button>
                            ) : (
                              <div className="flex gap-1.5 justify-center">
                                <button 
                                  onClick={() => handlePrintReceipt(inv)}
                                  className="inline-flex items-center gap-1 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-650 font-bold px-2 py-1.5 rounded-lg transition-colors cursor-pointer"
                                  title="Cetak Kuitansi"
                                >
                                  <Printer className="w-3.5 h-3.5" /> Cetak
                                </button>
                                <button 
                                  onClick={() => setShowReceiptInvoice(inv)}
                                  className="inline-flex items-center gap-1 text-[10px] bg-sky-50 text-sky-700 hover:bg-sky-600 hover:text-white font-bold px-2 py-1.5 rounded-lg transition-colors cursor-pointer"
                                  title="Pratinjau Kuitansi"
                                >
                                  Pratinjau
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================
          MODALS / BOXES FOR RE-STOCK 
         ==================================================== */}
      {selectedDrugForRestock && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-display font-bold text-slate-800 text-sm">RE-STOCK SEDIAAN FARMASI</h3>
              <button onClick={() => setSelectedDrugForRestock(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            
            <p className="text-xs text-slate-500 font-medium">Lakukan pengisian ulang kuantitas obat dari supplier atau produsen medis.</p>
            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <p className="text-[10px] text-slate-400 font-bold uppercase">SEDIAAN OBAT:</p>
              <p className="text-xs font-bold text-slate-700">{selectedDrugForRestock.name}</p>
              <p className="text-[11px] font-semibold text-slate-500">Stok saat ini: <span className="font-mono text-slate-700 font-bold">{selectedDrugForRestock.stock} {selectedDrugForRestock.unit}</span></p>
            </div>

            <form onSubmit={handleRestockSubmit} className="space-y-4">
              <div className="space-y-1 text-xs">
                <label className="text-slate-500 font-semibold mb-1 block">Tambah Jumlah Sediaan ({selectedDrugForRestock.unit})</label>
                <input 
                  type="number" 
                  required
                  min={1}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-sage-500 font-bold font-mono"
                  value={restockQty}
                  onChange={e => setRestockQty(Number(e.target.value))}
                />
              </div>

              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => setSelectedDrugForRestock(null)}
                  className="flex-1 bg-slate-100 py-2.5 text-xs text-slate-600 font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-sage-600 hover:bg-sage-700 py-2.5 text-xs text-white font-bold rounded-xl"
                >
                  Tambahkan Stok
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================
          MODAL: REGISTRASI OBAT BARU
         ==================================================== */}
      {showAddDrugModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-display font-medium text-slate-800 flex items-center gap-1.5">
                <Pill className="w-5 h-5 text-sage-600" />
                Registrasi Obat Baru (Katalog Utama)
              </h3>
              <button onClick={() => setShowAddDrugModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleAddDrugSubmit} className="space-y-3 text-xs">
              <div className="space-y-1 text-xs">
                <label className="text-slate-500 font-semibold block">Nama Obat & Sediaan</label>
                <input 
                  type="text" 
                  placeholder="Contoh: Amoksisilin Trihydrate 500mg" 
                  required
                  value={newDrugName}
                  onChange={e => setNewDrugName(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-sage-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 text-xs">
                  <label className="text-slate-500 font-semibold block">Bentuk Sediaan</label>
                  <select 
                    value={newDrugUnit}
                    onChange={e => setNewDrugUnit(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-sage-500 bg-white"
                  >
                    <option value="Tablet">Tablet</option>
                    <option value="Kapsul">Kapsul</option>
                    <option value="Botol">Botol (Syrup)</option>
                    <option value="Sachet">Sachet</option>
                    <option value="Ampul">Ampul (Injeksi)</option>
                    <option value="Tube">Tube (Salep)</option>
                  </select>
                </div>

                <div className="space-y-1 text-xs">
                  <label className="text-slate-500 font-semibold block">Harga Satuan (IDR)</label>
                  <input 
                    type="number" 
                    required
                    value={newDrugPrice}
                    onChange={e => setNewDrugPrice(Number(e.target.value))}
                    className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-sage-500 font-mono font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 text-xs">
                  <label className="text-slate-500 font-semibold block">Stok Awal</label>
                  <input 
                    type="number" 
                    required
                    value={newDrugStock}
                    onChange={e => setNewDrugStock(Number(e.target.value))}
                    className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-sage-500 font-mono"
                  />
                </div>

                <div className="space-y-1 text-xs">
                  <label className="text-slate-500 font-semibold block">Stok Minimum Peringatan</label>
                  <input 
                    type="number" 
                    required
                    value={newDrugMinStock}
                    onChange={e => setNewDrugMinStock(Number(e.target.value))}
                    className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-sage-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-3">
                <button 
                  type="button" 
                  onClick={() => setShowAddDrugModal(false)}
                  className="flex-1 bg-slate-100 py-3 text-slate-600 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-sage-600 text-white font-extrabold py-3 rounded-xl cursor-pointer"
                >
                  Mendaftarkan Obat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================
          MODAL: KASIR CHECKOUT (PENYELESAIAN PEMBAYARAN POS)
         ==================================================== */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-250 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl relative z-50">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-display font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                POS Kasir: Pembayaran Billing {selectedInvoice.id}
              </h3>
              <button onClick={() => setSelectedInvoice(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="p-3 bg-indigo-50/40 border border-indigo-100 rounded-2xl flex justify-between items-center">
                <div>
                  <span className="text-[9px] text-indigo-400 font-bold block uppercase">Pasien Ditagih:</span>
                  <span className="font-bold text-sm text-indigo-900">{selectedInvoice.patientName}</span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-slate-400 font-bold block">Tanggal Konsul:</span>
                  <span className="font-semibold text-slate-700 font-mono">{new Date(selectedInvoice.date).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Items Breakdown list */}
              <div className="border border-slate-150 rounded-2xl overflow-hidden bg-slate-50/50">
                <div className="bg-slate-50 px-3 py-2 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-150 grid grid-cols-3">
                  <span>Layanan / Resep</span>
                  <span className="text-center">Kuantitas</span>
                  <span className="text-right">Harga</span>
                </div>
                <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 divide-dashed p-1">
                  <div className="px-2 py-1.5 grid grid-cols-3 items-center text-[11px]">
                    <span className="font-semibold text-slate-700">Jasa Konsultasi Medis</span>
                    <span className="text-center font-mono">1 Periksa</span>
                    <span className="text-right font-mono font-medium">Rp {selectedInvoice.consultationFee.toLocaleString('id-ID')}</span>
                  </div>

                  {selectedInvoice.items.map((item, idx) => (
                    <div key={idx} className="px-2 py-1.5 grid grid-cols-3 items-center text-[11px]">
                      <div>
                        <span className="font-semibold text-slate-700 block">{item.description}</span>
                        <span className="text-[9px] text-slate-400">Master Satuan: Rp {item.pricePerUnit}</span>
                      </div>
                      <span className="text-center font-mono">{item.quantity}</span>
                      <span className="text-right font-mono font-medium">Rp {item.totalPrice.toLocaleString('id-ID')}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form modifiers */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold block">Biaya Tindakan Medis (IDR)</label>
                  <input 
                    type="number" 
                    value={checkoutTreatmentFee}
                    onChange={e => setCheckoutTreatmentFee(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-200 bg-white rounded-xl outline-none focus:border-sage-500 font-mono font-semibold text-slate-800"
                    placeholder="Contoh: 15000"
                  />
                  <p className="text-[9px] text-slate-400">Misal: jahit luka, injeksi obat infus</p>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 font-bold block">Potongan Diskon (IDR)</label>
                  <input 
                    type="number" 
                    value={checkoutDiscount}
                    onChange={e => setCheckoutDiscount(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-200 bg-white rounded-xl outline-none focus:border-sage-500 font-mono font-semibold text-slate-850"
                  />
                </div>
              </div>

              {/* Payment methods and summary block */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-150 pt-4 items-end">
                <div className="space-y-1.5">
                  <label className="text-slate-500 font-bold block">Metode Pembayaran</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['Cash', 'Debit', 'QRIS', 'Transfer'] as const).map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setCheckoutPaymentMethod(m)}
                        className={`py-2 text-[10px] font-bold rounded-xl cursor-pointer transition-colors border text-center ${
                          checkoutPaymentMethod === m
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subtotal & Totals panel */}
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl space-y-1 font-sans text-xs">
                  <div className="flex justify-between text-slate-500 font-medium">
                    <span>Biaya Layanan:</span>
                    <span className="font-mono">Rp {(calculatePendingCheckoutTotals.subtotal + checkoutDiscount).toLocaleString('id-ID')}</span>
                  </div>
                  {checkoutDiscount > 0 && (
                    <div className="flex justify-between text-rose-500 font-medium">
                      <span>Diskon Promo:</span>
                      <span className="font-mono">-Rp {checkoutDiscount.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-500 font-medium">
                    <span>PPN Tax (11%):</span>
                    <span className="font-mono">Rp {calculatePendingCheckoutTotals.tax.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-slate-200 text-slate-800 font-extrabold text-[13px]">
                    <span>TOTAL BAYAR:</span>
                    <span className="font-mono text-emerald-700">Rp {calculatePendingCheckoutTotals.grand.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>

              {/* Actions submit */}
              <div className="flex gap-2.5 pt-3">
                <button 
                  type="button" 
                  onClick={() => setSelectedInvoice(null)}
                  className="flex-1 bg-slate-100 py-3 text-slate-600 font-semibold rounded-xl text-center cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="button" 
                  onClick={handleProcessPayment}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 rounded-xl text-center cursor-pointer shadow-lg shadow-emerald-600/20"
                >
                  Selesaikan Pembayaran
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================
          MODAL: PRATINJAU KUITANSI PEMBAYARAN RESMI 
         ==================================================== */}
      {showReceiptInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-250 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl relative z-50">
            <div className="flex justify-between items-center pb-2 border-b border-slate-150">
              <h3 className="font-display font-medium text-slate-800 flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-slate-500" />
                Pratinjau Kuitansi Pembayaran
              </h3>
              <button onClick={() => setShowReceiptInvoice(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {/* Simulated Printed Page Container */}
            <div className="border border-slate-300 p-4 rounded-xl bg-amber-50/10 font-mono text-[9px] text-slate-700 leading-relaxed card-shadow divide-y divide-slate-200 divide-dashed space-y-3">
              <div className="text-center space-y-0.5 pb-2">
                <h4 className="font-bold text-slate-900 text-xs tracking-wider uppercase">{dbAdapter.getSettings().clinicName}</h4>
                <p className="text-[8px] text-slate-500">{dbAdapter.getSettings().clinicAddress}</p>
                <p className="text-[8px] text-slate-400">Telpon: {dbAdapter.getSettings().clinicPhone}</p>
              </div>

              <div className="space-y-1 py-2">
                <div className="flex justify-between">
                  <span>No Invoice:</span>
                  <span className="font-bold">{showReceiptInvoice.id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Nama Pasien:</span>
                  <span className="font-bold">{showReceiptInvoice.patientName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Metode Bayar:</span>
                  <span className="font-bold">{showReceiptInvoice.paymentMethod || 'KAS'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Waktu:</span>
                  <span>{new Date(showReceiptInvoice.date).toLocaleString('id-ID')}</span>
                </div>
              </div>

              <div className="py-2 space-y-1.5">
                <div className="flex justify-between font-bold border-b border-slate-100 pb-1">
                  <span>Deskripsi Pekerjaan</span>
                  <span>Total (Rp)</span>
                </div>
                <div className="flex justify-between">
                  <span>Jasa Periksa Dokter</span>
                  <span>{showReceiptInvoice.consultationFee.toLocaleString('id-ID')}</span>
                </div>
                {showReceiptInvoice.treatmentFee > 0 && (
                  <div className="flex justify-between">
                    <span>Tindakan Medis Layanan</span>
                    <span>{showReceiptInvoice.treatmentFee.toLocaleString('id-ID')}</span>
                  </div>
                )}
                {showReceiptInvoice.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{item.description} (x{item.quantity})</span>
                    <span>{item.totalPrice.toLocaleString('id-ID')}</span>
                  </div>
                ))}
              </div>

              <div className="py-2 space-y-1 font-bold">
                {showReceiptInvoice.discount > 0 && (
                  <div className="flex justify-between text-rose-500">
                    <span>Diskon Kemitraan:</span>
                    <span>- {showReceiptInvoice.discount.toLocaleString('id-ID')}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Biaya Pajak PPN (11%):</span>
                  <span>{showReceiptInvoice.tax.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-slate-900 border-t border-slate-200 pt-1.5 text-[11px]">
                  <span>NETTO GRAND TOTAL:</span>
                  <span className="text-emerald-700">Rp {showReceiptInvoice.totalAmount.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => setShowReceiptInvoice(null)}
                className="flex-1 bg-slate-100 text-xs text-slate-600 font-bold py-2.5 rounded-xl block text-center"
              >
                Tutup
              </button>
              <button 
                onClick={() => {
                  handlePrintReceipt(showReceiptInvoice);
                  setShowReceiptInvoice(null);
                }}
                className="flex-1 bg-sage-600 hover:bg-sage-700 text-xs text-white font-extrabold py-2.5 rounded-xl flex items-center justify-center gap-1 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> Cetak Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
