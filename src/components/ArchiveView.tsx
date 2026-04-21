import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { ArchiveRecord } from '../lib/types';
import { User } from 'firebase/auth';

export default function ArchiveView({ user }: { user: User }) {
  const [records, setRecords] = useState<ArchiveRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchArchive = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const q = query(collection(db, 'users', user.uid, 'archive'), orderBy('issuedAt', 'desc'));
      const snap = await getDocs(q);
      setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() } as ArchiveRecord)));
    } catch (e) {
      console.error(e);
      setErrorMsg('حدث خطأ أثناء جلب الأرشيف');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchArchive();
  }, [user]);

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'archive', id));
      setRecords(records.filter(r => r.id !== id));
      setConfirmDeleteId(null);
    } catch (e) {
      console.error(e);
      setErrorMsg('حدث خطأ أثناء الحذف');
    }
  };

  const filteredRecords = records.filter(r => 
    !search || 
    r.studentName.includes(search) || 
    r.regNum.includes(search) || 
    r.certNumber.includes(search)
  );

  const handlePrint = () => {
    const pw = window.open('', '_blank');
    if (!pw) return;

    let h = `
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="font-size: 20px; font-weight: bold;">أرشيف الشواهد المدرسية المسلمة</h2>
        <div style="font-size: 14px; margin-top: 5px;">تاريخ الطباعة: ${new Date().toLocaleDateString('en-GB')}</div>
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px; text-align: right;" dir="rtl">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="border: 1px solid #000; padding: 8px;">رقم الشهادة / السنة</th>
            <th style="border: 1px solid #000; padding: 8px;">الاسم والنسب</th>
            <th style="border: 1px solid #000; padding: 8px;">رقم التسجيل</th>
            <th style="border: 1px solid #000; padding: 8px;">المستوى</th>
            <th style="border: 1px solid #000; padding: 8px;">تاريخ الإصدار</th>
          </tr>
        </thead>
        <tbody>
    `;

    filteredRecords.forEach(r => {
      h += `
        <tr>
          <td style="border: 1px solid #000; padding: 8px; font-weight: bold;">${r.certYear} / ${r.certNumber}</td>
          <td style="border: 1px solid #000; padding: 8px;">${r.studentName}</td>
          <td style="border: 1px solid #000; padding: 8px;">${r.regNum}</td>
          <td style="border: 1px solid #000; padding: 8px;">${r.level}</td>
          <td style="border: 1px solid #000; padding: 8px; direction: ltr; text-align: right;">${new Date(r.issuedAt).toLocaleString('en-GB')}</td>
        </tr>
      `;
    });

    h += `
        </tbody>
      </table>
    `;

    pw.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>طباعة الأرشيف</title><style>
      body { font-family: 'Arial', sans-serif; padding: 20px; color: #000; background: #fff; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; page-break-after: auto; }
      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }
      @media print {
        @page { size: A4 portrait; margin: 15mm; }
        body { padding: 0; }
      }
    </style></head><body>${h}<script>window.onload = () => { setTimeout(() => { window.print(); }, 500); }</script></body></html>`);
    pw.document.close();
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
         <h2 className="text-2xl font-bold flex items-center gap-3">
           <i className="fas fa-archive text-[var(--color-primary)]"></i>
           أرشيف الشواهد المسلمة
         </h2>
         <div className="text-sm text-[var(--color-mt)]">
            إجمالي الشواهد: {records.length}
         </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-4 text-center font-bold">
          {errorMsg}
        </div>
      )}

      <div className="rounded-2xl p-4 mb-4 flex flex-wrap items-center gap-3 card-grad border border-[var(--color-brd)]">
         <input type="text" className="inp flex-1 min-w-[200px]" placeholder="بحث بالاسم، رقم التسجيل، أو رقم الشهادة..." value={search} onChange={e=>setSearch(e.target.value)} />
         <button className="btn btn-primary" onClick={handlePrint} disabled={filteredRecords.length === 0}><i className="fas fa-print"></i> طباعة الأرشيف</button>
         <button className="btn btn-o btn-s" onClick={fetchArchive}><i className="fas fa-sync"></i> تحديث</button>
      </div>

      <div className="rounded-2xl overflow-hidden card-grad border border-[var(--color-brd)]">
         <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
            <table className="dt w-full text-sm">
               <thead>
                  <tr>
                     <th>رقم الشهادة / السنة</th>
                     <th>الاسم والنسب</th>
                     <th>رقم التسجيل</th>
                     <th>المستوى</th>
                     <th>تاريخ الإصدار</th>
                     <th>إجراء</th>
                  </tr>
               </thead>
               <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="text-center py-8">جاري التحميل...</td></tr>
                  ) : filteredRecords.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-8 text-[var(--color-mt)]">لا توجد شواهد في الأرشيف</td></tr>
                  ) : filteredRecords.map(r => (
                    <tr key={r.id}>
                       <td className="font-bold text-[var(--color-primary)]">{r.certYear} / {r.certNumber}</td>
                       <td className="font-semibold">{r.studentName}</td>
                       <td>{r.regNum}</td>
                       <td>{r.level}</td>
                       <td><span dir="ltr">{new Date(r.issuedAt).toLocaleString('en-GB')}</span></td>
                       <td>
                          {confirmDeleteId === r.id ? (
                            <div className="flex gap-2 items-center justify-center">
                               <button className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-bold transition-colors" onClick={() => r.id && handleDelete(r.id)}>تأكيد الحذف</button>
                               <button className="btn btn-o btn-s text-xs" onClick={() => setConfirmDeleteId(null)}>إلغاء</button>
                            </div>
                          ) : (
                            <button className="btn btn-o btn-s text-[var(--color-dng)]" onClick={() => r.id && setConfirmDeleteId(r.id)} title="حذف من الأرشيف">
                               <i className="fas fa-trash"></i>
                            </button>
                          )}
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
}
