import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Student } from '../lib/types';
import { db } from '../lib/firebase';
import { collection, addDoc, getDocs, setDoc, doc, writeBatch, deleteDoc, query } from 'firebase/firestore';

const cf = [
    {key:'regNum',label:'رقم التسجيل',req:false},
    {key:'firstName',label:'الاسم',req:true},
    {key:'lastName',label:'النسب',req:true},
    {key:'birthDate',label:'تاريخ الازدياد',req:false},
    {key:'birthPlace',label:'مكان الازدياد',req:false},
    {key:'level',label:'المستوى',req:false,type:'select'},
    {key:'yearTo',label:'تاريخ الوضعية',req:false},
    {key:'yearFrom',label:'الموسم',req:false},
    {key:'reason',label:'ملاحظات',req:false,type:'select'},
];

const mLv=['السنة الأولى إعدادي','السنة الثانية إعدادي','السنة الثالثة إعدادي'];
const reasons=['نقل','تغيير المؤسسة','انتقال مع الأسرة','التحاق بمؤسسة خاصة','سفر للخارج','إعادة التوجيه','ظروف عائلية','تغيير المدينة'];

function normLv(lv: string){
  if(!lv)return '—';
  const t=lv.trim();
  if(mLv.includes(t))return t;
  if(t==='1إع'||t==='1إ')return 'السنة الأولى إعدادي';
  if(t==='2إع'||t==='2إ')return 'السنة الثانية إعدادي';
  if(t==='3إع'||t==='3إ')return 'السنة الثالثة إعدادي';
  for(const f of mLv)if(f.includes(t)||t.includes(f))return f;
  return t;
}

export default function CertificatesView({ institutionSettings, user }: { institutionSettings: any, user: any }) {
  const [step, setStep] = useState<1|2|3>(1);
  const [raw, setRaw] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  
  const [students, setStudents] = useState<Student[]>([]);
  const [editLog, setEditLog] = useState<Record<number, any[]>>({});
  
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterEdited, setFilterEdited] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const [loadingDb, setLoadingDb] = useState(true);

  useEffect(() => {
    const fetchStudents = async () => {
      if(!user) return;
      try {
        setLoadingDb(true);
        const snap = await getDocs(collection(db, 'users', user.uid, 'students'));
        if(!snap.empty) {
          const fetched = snap.docs.map(d => d.data() as Student);
          fetched.sort((a,b) => a._id - b._id);
          setStudents(fetched);
          setStep(3);
        }
      } catch(e) {
        console.error("Error fetching students", e);
      } finally {
        setLoadingDb(false);
      }
    };
    fetchStudents();
  }, [user]);

  // Archive inputs
  const [startCertNum, setStartCertNum] = useState('1');
  const [certYear, setCertYear] = useState(new Date().getFullYear().toString());

  // Auto-fetch next certificate number based on Archive
  useEffect(() => {
    const fetchNextCertNum = async () => {
      if (!user) return;
      try {
        const q = query(collection(db, 'users', user.uid, 'archive'));
        const snap = await getDocs(q);
        let maxNum = 0;
        snap.docs.forEach(d => {
          const data = d.data();
          if (data.certYear === certYear) {
            const num = parseInt(data.certNumber, 10);
            if (!isNaN(num) && num > maxNum) {
              maxNum = num;
            }
          }
        });
        setStartCertNum((maxNum + 1).toString());
      } catch (err) {
        console.error("Error fetching next cert num:", err);
      }
    };
    fetchNextCertNum();
  }, [user, certYear]);

  // Modals
  const [certModalId, setCertModalId] = useState<number | null>(null);
  const [editModalId, setEditModalId] = useState<number | null>(null);
  const [confirmDeleteRowId, setConfirmDeleteRowId] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: any) => {
    const f = e.target.files?.[0];
    if(!f) return;
    const r=new FileReader();
    r.onload=ev=>{
      try{
        const wb=XLSX.read(new Uint8Array(ev.target?.result as any),{type:'array'});
        const j=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''});
        if(!j.length) { alert('الملف فارغ'); return; }
        setRaw(j);
        const hdrs = Object.keys(j[0]);
        setHeaders(hdrs);
        
        // Auto-map
        const tempMap: Record<string, string> = {};
        cf.forEach(field => {
          let am=''; const fl=field.label.toLowerCase();
          for(const h of hdrs)if(h.toLowerCase().includes(fl)||fl.includes(h.toLowerCase())){am=h;break}
          if(!am&&field.key==='firstName')am=hdrs.find(h=>h.includes('الاسم') && !h.includes('النسب'))||'';
          if(!am&&field.key==='lastName')am=hdrs.find(h=>h.includes('النسب') && !h.includes('الاسم'))||'';
          if(!am&&(field.key==='firstName'||field.key==='lastName'))am=hdrs.find(h=>h.includes('الاسم والنسب'))||'';
          if(!am&&field.key==='regNum')am=hdrs.find(h=>h.toLowerCase().includes('رقم'))||'';
          if(!am&&field.key==='birthDate')am=hdrs.find(h=>h.includes('ازدياد')||h.includes('ميلاد'))||'';
          if(!am&&field.key==='level')am=hdrs.find(h=>h.includes('مستوى')||h.includes('إعدادي'))||'';
          if(!am&&field.key==='yearFrom')am=hdrs.find(h=>h.includes('موسم')||h.includes('دخل'))||'';
          if(!am&&field.key==='yearTo')am=hdrs.find(h=>h.includes('وضعية')||h.includes('خرج'))||'';
          if(!am&&field.key==='reason')am=hdrs.find(h=>h.includes('ملاحظات'))||'';
          tempMap[field.key] = am;
        });
        setMapping(tempMap);
        setStep(2);
      }catch(err: any){ alert('خطأ: '+err.message); }
    };
    r.readAsArrayBuffer(f);
  };

  const processData = async () => {
    const mis=cf.filter(f=>f.req&&!mapping[f.key]);
    if(mis.length){alert(`يرجى ربط: ${mis.map(f=>f.label).join('، ')}`);return}
    
    setLoadingDb(true); // Re-using this to show spinner while saving
    
    const processed = raw.map((row, idx) => {
      const it: any = { _id: idx };
      cf.forEach(f => {
        let v = mapping[f.key] ? row[mapping[f.key]] : '';
        // Format Excel serial dates (typically > 20000 for relevant dates)
        if (typeof v === 'number' && v > 20000 && v < 60000 && (f.key === 'birthDate' || f.key === 'yearTo')) {
          const d = new Date(Math.round((v - 25569) * 86400 * 1000));
          v = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1)
            .toString()
            .padStart(2, '0')}/${d.getFullYear()}`;
        }
        if(typeof v==='number') v=String(v);
        it[f.key] = (v||'').trim();
      });
      it._lv = normLv(it.level);
      return it as Student;
    });
    
    if (user) {
        try {
            // Delete old students (if any, although this can be slow if large. For now we will just overwrite up to the length and users can ignore old. Best is to clear old documents)
            const snap = await getDocs(collection(db, 'users', user.uid, 'students'));
            const chunksDelete = [];
            for(let i=0; i<snap.docs.length; i+=500) chunksDelete.push(snap.docs.slice(i, i+500));
            
            for(const chunk of chunksDelete) {
               const batch = writeBatch(db);
               chunk.forEach(d => batch.delete(d.ref));
               await batch.commit();
            }

            // Write new students
            const chunksWrite = [];
            for(let i=0; i<processed.length; i+=500) chunksWrite.push(processed.slice(i, i+500));
            
            for(const chunk of chunksWrite) {
               const batch = writeBatch(db);
               chunk.forEach(s => {
                   const ref = doc(db, 'users', user.uid, 'students', s._id.toString());
                   batch.set(ref, s);
               });
               await batch.commit();
            }
        } catch (e) {
            console.error("Error saving students", e);
            alert("حدث خطأ أثناء حفظ التلاميذ في قاعدة البيانات");
        }
    }
    
    setStudents(processed);
    setEditLog({});
    setSelectedIds(new Set());
    setStep(3);
    setLoadingDb(false);
  };

  const filteredStudents = students.filter(d => {
    const fullName = `${d.firstName} ${d.lastName}`.toLowerCase();
    const ms=!search||fullName.includes(search.toLowerCase())||d.regNum.toLowerCase().includes(search.toLowerCase());
    const ml=filterLevel==='all'||d._lv===filterLevel;
    const isEdited=editLog[d._id]&&editLog[d._id].length>0;
    const me=filterEdited==='all'||(filterEdited==='edited'&&isEdited)||(filterEdited==='original'&&!isEdited);
    return ms&&ml&&me;
  });

  const uniqueLevels = Array.from(new Set(students.map(d=>d._lv))).filter(l=>l!=='—');

  // Print Logic inside this file to keep it self-contained
  const certHTML = (d: Student, inst: any, certNum: string, certYear: string) => {
    const logo = inst.logo || "https://upload.wikimedia.org/wikipedia/commons/e/ea/Coat_of_arms_of_Morocco.svg";
    return `
      <div class="cc-modern">
        <div class="top-header header-image-container">
           <img src="${logo}" alt="المملكة المغربية" class="header-image" />
        </div>
        
        <div class="header-info">
          <div style="flex: 1; text-align: right;">
            <div>الأكاديمية الجهوية : ${inst.academy || ''}</div>
            <div>المؤسسة : ${inst.name || ''}</div>
            <div>العنوان : ${inst.address || ''}</div>
          </div>
          <div style="flex: 1; text-align: left;">
            <div>المديرية الإقليمية : ${inst.province || ''}</div>
            <div>الهاتف : <span style="direction: ltr; display: inline-block;">${inst.phone || ''}</span></div>
          </div>
        </div>

        <div class="title-box">
          شهادة مدرسية رقم: ${certYear}/${certNum}
        </div>

        <div class="body-text">
          <div class="row-flex">
             <div style="flex: 3;">يشهد الموقع (ة) أسفله السيد(ة) : <span class="font-normal val-text">${inst.managerName || '................'}</span></div>
             <div style="flex: 1;">بصفته(ا) : <span class="font-normal val-text">مديرا</span></div>
          </div>
          <div class="row-flex">
             <div style="flex: 3;">أن التلميذ(ة) : <span class="font-normal val-text">${d.firstName} ${d.lastName}</span></div>
             <div style="flex: 2;">المسجل(ة)تحت رقم : <span class="font-normal val-text">${d.regNum || '................'}</span></div>
          </div>
          <div class="row-flex">
             <div style="flex: 3;">المزداد(ة) في : <span class="font-normal val-text">${d.birthPlace || '................'}</span></div>
             <div style="flex: 2;">بتاريخ : <span class="font-normal val-text">${d.birthDate || '................'}</span></div>
          </div>
          <div class="row-flex">
             <div>كان(ت) يتابع دراسته(ها) بمستوى : <span class="font-normal val-text" style="font-size: 14px;">${d._lv || '................'}</span></div>
          </div>
          <div class="row-flex" style="justify-content: center; margin: 5px 0;">
             <div>الموسم الدراسي : <span class="font-normal val-text">${d.yearFrom || '................'}</span></div>
          </div>
          <div class="row-flex">
             <div>وقد غادر(ت) المؤسسة بتاريخ : <span class="font-normal val-text">${d.yearTo || '................'}</span></div>
          </div>
          <div class="row-flex">
             <div>سبب المغادرة : <span class="font-normal val-text">${d.reason || '................'}</span></div>
          </div>
          <div class="row-flex">
             <div>ملاحظات : <span class="font-normal val-text">.......................................</span></div>
          </div>
          <div style="text-align: center; margin-top: 15px;">سلمت له (ها) هذه الشهادة لغرض إداري</div>
        </div>

        <div class="bottom-date">
          <div>حرر بـ ${inst.city || '...........'} في :</div>
          <div style="direction: ltr;">${new Date().toLocaleDateString('en-GB')}</div>
        </div>

        <div class="table-box">
           <div class="table-header">
              <div class="th-cell th-right">التوقيع و الامضاء</div>
              <div class="th-cell">مصادقة المديرية الإقليمية</div>
           </div>
           <div class="table-body">
              <div class="td-right"></div>
              <div class="td-left"></div>
           </div>
           <div class="table-footer">
             <div>&raquo; هذه الشهادة لا تخول التسجيل في مؤسسة أخرى.</div>
             <div>&raquo; إن المعلومات الواردة في هذه الشهادة يتحمل مسؤوليتها رئيس المؤسسة.</div>
             <div>&raquo; إن المصادقة تعني أن المؤسسة تنتمي الى هذه المديرية.</div>
           </div>
        </div>
      </div>
    `;
  };

  const printDocs = async (items: Student[]) => {
    const inst = institutionSettings;
    let h='';
    
    let currentNum = parseInt(startCertNum, 10) || 1;
    const recordsToSave: any[] = [];
    
    // Print two identical copies of the same certificate on each A4 page
    for(let i=0;i<items.length;i++){
      const assignedNum = currentNum.toString();
      
      // Prepare record for archive
      recordsToSave.push({
        studentName: `${items[i].firstName || ''} ${items[i].lastName || ''}`.trim(),
        regNum: items[i].regNum || '',
        certNumber: assignedNum,
        certYear: certYear,
        issuedAt: new Date().toISOString(),
        level: items[i]._lv || ''
      });
      
      const last = i === items.length-1;
      h+=`<div class="pp"${last?' style="page-break-after:auto"':''}>`;
      h+=`<div class="ph">${certHTML(items[i], inst, assignedNum, certYear)}</div>`;
      h+=`<div class="ph">${certHTML(items[i], inst, assignedNum, certYear)}</div>`;
      h+=`</div>`;
      
      currentNum++;
    }
    
    // Update next starting number
    setStartCertNum(currentNum.toString());
    
    // Save to archive (fire and forget)
    if(user && recordsToSave.length > 0) {
       recordsToSave.forEach(async (r) => {
         try {
           await addDoc(collection(db, 'users', user.uid, 'archive'), r);
         } catch(e) {
           console.error("Error saving to archive", e);
         }
       });
    }
    
    const pw=window.open('','_blank');
    if(!pw) return;
    pw.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap" rel="stylesheet"><style>
@media print {
  @page { size: A4 landscape; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; width: 297mm; height: 209mm; }
  .pp { page-break-after: always; page-break-inside: avoid; }
}
@page { size: A4 landscape; margin: 0; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Arial', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff; margin: 0; }
.pp { width: 297mm; height: 210mm; display: flex; flex-direction: row; page-break-after: always; background: #fff; position: relative; overflow: hidden; margin: 0 auto; }
.ph { flex: 1; width: 148.5mm; height: 210mm; padding: 10mm 12mm; border-left: 2px dashed #444; display: flex; flex-direction: column; overflow: hidden; }
.ph:last-child { border-left: none; }
.cc-modern { font-family: 'Arial', sans-serif; color: #000; height: 100%; display: flex; flex-direction: column; background: white; direction: rtl; }
.top-header { text-align: center; margin-bottom: 10px; }
.header-image-container {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 10px 20px;
    background: linear-gradient(180deg, #faf8f4 0%, #ffffff 100%);
    border-bottom: 2px solid #c8a84e;
    position: relative;
    box-sizing: border-box;
}
/* ornaments */
.header-image-container::before,
.header-image-container::after {
    content: '';
    position: absolute;
    width: 30px;
    height: 30px;
    border: 1.5px solid #c8a84e;
    opacity: 0.3;
}
.header-image-container::before { top: 8px; right: 8px; border-left: none; border-bottom: none; }
.header-image-container::after { bottom: 8px; left: 8px; border-right: none; border-top: none; }

.header-image { max-width: 250px; max-height: 120px; width: auto; height: auto; object-fit: contain; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.1)); transition: transform 0.4s ease; margin: 0 auto; display: block; }
.divider { border-top: 1.5px solid #000; margin: 5px 0 10px 0; }
.header-info { display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; margin-bottom: 15px; line-height: 1.6; }
.title-box { border: 1.5px solid #000; padding: 5px 20px; text-align: center; font-size: 16px; font-weight: bold; width: fit-content; background: #fff; margin: 0 auto 15px auto; }
.body-text { font-size: 13px; line-height: 2.1; font-weight: bold; flex: 1; }
.row-flex { display: flex; }
.font-normal { font-weight: normal; }
.val-text { font-weight: bold; }
.bottom-date { display: flex; font-weight: bold; font-size: 13px; margin: 5px 0 10px 0; justify-content: center; gap: 40px; padding-left: 10px; }
.table-box { border: 1.5px solid #000; display: flex; flex-direction: column; margin-top: auto; }
.table-header { display: flex; border-bottom: 1.5px solid #000; }
.th-cell { flex: 1; text-align: center; padding: 5px; font-weight: bold; font-size: 13px; }
.th-right { border-left: 1.5px solid #000; }
.table-body { display: flex; height: 80px; border-bottom: 1.5px solid #000; }
.td-right { flex: 1; border-left: 1.5px solid #000; }
.td-left { flex: 1; }
.table-footer { padding: 6px 10px; font-size: 10.5px; font-weight: bold; line-height: 1.6; }
</style></head><body>${h}
<script>
  Promise.all(Array.from(document.images).map(function(img) {
    if (img.complete) return Promise.resolve();
    return new Promise(function(resolve) {
      img.onload = img.onerror = resolve;
    });
  })).then(function() {
    setTimeout(function() {
      window.print();
    }, 300);
  });
</script>
</body></html>`);
    pw.document.close();
  };

  if (loadingDb) return <div className="p-10 text-center text-[var(--color-mt)] flex items-center justify-center gap-3"><i className="fas fa-spinner fa-spin text-2xl"></i> جاري التحميل...</div>;

  return (
    <div className="max-w-6xl mx-auto">
      {step === 1 && (
        <section className="animate-[fi_0.6s_ease-out]">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-extrabold mb-3">قاعدة بيانات المؤسسة</h2>
                <p className="text-[var(--color-mt)] mb-4">يسترجع النظام تلقائياً بيانات التلاميذ المحفوظة في حسابك. يمكنك إضافة بيانات جديدة عبر ملف إكسيل المسحوب من مسار.</p>
                {students.length > 0 && (
                   <button onClick={() => setStep(3)} className="btn btn-g mx-auto mb-4">
                     <i className="fas fa-arrow-left"></i> الدخول إلى سجل التلاميذ ({students.length})
                   </button>
                )}
            </div>
            
            <div className="upload-zone" onClick={() => fileInputRef.current?.click()}>
                <input type="file" accept=".xlsx,.xls,.csv" hidden ref={fileInputRef} onChange={handleFileUpload}/>
                <div className="mx-auto w-[85px] h-[85px] mb-[22px] rounded-full flex items-center justify-center text-[34px] text-[var(--color-primary)] bg-[var(--color-primary-g)] transition-transform hover:scale-110">
                  <i className="fas fa-file-excel"></i>
                </div>
                <p className="text-lg font-semibold mb-2">تحديث قاعدة البيانات بملف Excel جديد</p>
                <p className="text-sm text-[var(--color-mt)] mb-2">اسحب الملف هنا أو انقر للاختيار</p>
                <p className="text-xs text-[var(--color-secondary)] font-bold">ملاحظة: رفع ملف جديد سيقوم بتعويض القائمة الحالية.</p>
            </div>
        </section>
      )}

      {step === 2 && (
        <section className="animate-[fi_0.6s_ease-out]">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold bg-[var(--color-primary-g)] text-[var(--color-primary)]">2</div>
                <h2 className="text-xl font-bold">ربط الأعمدة ببيانات الشهادة</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-2xl p-5 bg-[var(--color-card)] border border-[var(--color-brd)]">
                    <h3 className="font-semibold mb-4 text-sm text-[var(--color-mt)]">أعمدة الملف</h3>
                    <div className="flex flex-wrap gap-2">
                      {headers.map(h => <span key={h} className="px-3 py-1 rounded-lg text-xs bg-[var(--color-bg)] text-[var(--color-primary)] border border-[var(--color-brd)]">{h}</span>)}
                    </div>
                </div>
                <div className="rounded-2xl p-5 bg-[var(--color-card)] border border-[var(--color-brd)]">
                    <h3 className="font-semibold mb-4 text-sm text-[var(--color-mt)]">ربط الحقول</h3>
                    <div className="space-y-2">
                        {cf.map(f => (
                          <div key={f.key} className="flex items-center gap-3 py-2 border-b border-[var(--color-brd)]">
                            <span className={`text-xs font-semibold min-w-[160px] ${f.req ? 'text-[var(--color-primary)]' : 'text-[var(--color-fg)]'}`}>
                              {f.label} {f.req && '*'}
                            </span>
                            <select 
                              className="inp py-1"
                              value={mapping[f.key] || ''}
                              onChange={(e) => setMapping({...mapping, [f.key]: e.target.value})}
                            >
                              <option value="">-- لم يتم الربط --</option>
                              {headers.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                          </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="flex justify-end mt-6 gap-3">
                <button className="btn btn-o" onClick={() => setStep(1)}><i className="fas fa-arrow-right"></i> رجوع</button>
                <button className="btn btn-p" onClick={processData}><i className="fas fa-check"></i> تأكيد وعرض البيانات</button>
            </div>
        </section>
      )}

      {step === 3 && (
        <section className="animate-[fi_0.6s_ease-out]">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-[var(--color-card)] to-[var(--color-bg2)] border border-[var(--color-brd)] rounded-xl p-4">
                  <div className="text-xs text-[var(--color-mt)] mb-1">إجمالي التلاميذ</div>
                  <div className="text-2xl font-bold">{students.length}</div>
                </div>
                <div className="bg-gradient-to-br from-[var(--color-card)] to-[var(--color-bg2)] border border-[var(--color-brd)] rounded-xl p-4">
                  <div className="text-xs text-[var(--color-mt)] mb-1">صفحات للطباعة (الكل)</div>
                  <div className="text-2xl font-bold text-[var(--color-primary)]">{students.length}</div>
                </div>
                <div className="lg:col-span-2 flex items-center justify-end">
                   <button onClick={() => setStep(1)} className="btn btn-o btn-s">
                     <i className="fas fa-file-import"></i> استيراد قائمة تلاميذ جديدة
                   </button>
                </div>
            </div>

            <div className="rounded-2xl p-4 mb-4 flex flex-wrap items-end gap-3 bg-[var(--color-card)] border border-[var(--color-brd)]">
                <div>
                   <label className="block text-xs font-semibold text-[var(--color-mt)] mb-1">السنة</label>
                   <input type="text" className="inp w-24 text-center font-bold" value={certYear} onChange={e=>setCertYear(e.target.value)} />
                </div>
                <div>
                   <label className="block text-xs font-semibold text-[var(--color-mt)] mb-1" title="يتم توليد الرقم أوتوماتيكياً بناءً على الأرشيف">رقم الشهادة الموالية (تلقائي)</label>
                   <input type="number" className="inp w-32 text-center font-bold" value={startCertNum} onChange={e=>setStartCertNum(e.target.value)} />
                </div>
                
                <div className="w-[1px] h-10 bg-[var(--color-brd)] mx-2"></div>
                
                <div className="flex-1 min-w-[200px]">
                   <label className="block text-xs font-semibold text-[var(--color-mt)] mb-1">بحث وتصفية</label>
                   <input type="text" className="inp w-full" placeholder="بحث بالاسم أو الرقم..." value={search} onChange={e=>setSearch(e.target.value)} />
                </div>
                <div>
                   <label className="block text-xs font-semibold text-[var(--color-mt)] mb-1">المستوى</label>
                   <select className="inp w-auto" value={filterLevel} onChange={e=>setFilterLevel(e.target.value)}>
                     <option value="all">جميع المستويات</option>
                     {uniqueLevels.map(l => <option key={l} value={l}>{l}</option>)}
                   </select>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 mb-4 justify-end">
                <button className="btn btn-p btn-s" disabled={selectedIds.size === 0} onClick={() => {
                  const items = Array.from(selectedIds).map(id => students.find(s=>s._id===id)).filter(Boolean) as Student[];
                  printDocs(items);
                }}>
                  <i className="fas fa-print"></i> طباعة المحدد ({selectedIds.size}) وحفظ في الأرشيف
                </button>
                <button className="btn btn-g btn-s" onClick={() => printDocs(filteredStudents)}>
                  <i className="fas fa-file-pdf"></i> طباعة الكل المفلتر وحفظ في الأرشيف
                </button>
            </div>


            <div className="rounded-2xl overflow-hidden bg-[var(--color-card)] border border-[var(--color-brd)]">
                <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
                    <table className="dt">
                      <thead>
                        <tr>
                          <th className="w-10">
                             <input type="checkbox" className="w-4 h-4 cursor-pointer" 
                               checked={filteredStudents.length > 0 && selectedIds.size === filteredStudents.length}
                               onChange={(e) => {
                                 if(e.target.checked) setSelectedIds(new Set(filteredStudents.map(s=>s._id)));
                                 else setSelectedIds(new Set());
                               }}
                             />
                          </th>
                          <th>رقم التسجيل</th>
                          <th>الاسم</th>
                          <th>النسب</th>
                          <th>تاريخ الازدياد</th>
                          <th>مكان الازدياد</th>
                          <th>المستوى</th>
                          <th>تاريخ الوضعية</th>
                          <th>الموسم</th>
                          <th>ملاحظات</th>
                          <th>إجراء</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.map(d => (
                          <tr key={d._id} className={selectedIds.has(d._id) ? 'bg-[var(--color-primary-g)]' : ''}>
                            <td onClick={(e) => e.stopPropagation()}>
                              <input type="checkbox" className="w-4 h-4 cursor-pointer" 
                                checked={selectedIds.has(d._id)}
                                onChange={(e) => {
                                  const n = new Set(selectedIds);
                                  if(e.target.checked) n.add(d._id); else n.delete(d._id);
                                  setSelectedIds(n);
                                }}
                              />
                            </td>
                            <td>{d.regNum}</td>
                            <td className="font-semibold">{d.firstName}</td>
                            <td className="font-semibold">{d.lastName}</td>
                            <td>{d.birthDate}</td>
                            <td>{d.birthPlace}</td>
                            <td><span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--color-primary-g)] text-[var(--color-primary)] border border-[var(--color-primary)]/20">{d._lv}</span></td>
                            <td>{d.yearTo}</td>
                            <td>{d.yearFrom}</td>
                            <td>{d.reason}</td>
                            <td>
                               <div className="flex items-center gap-2">
                                  {confirmDeleteRowId === d._id ? (
                                     <>
                                        <span className="text-xs font-bold text-[var(--color-dng)]">تأكيد:</span>
                                        <button className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-bold transition-colors" onClick={async (e) => {
                                           e.stopPropagation();
                                           try {
                                             if (user) {
                                                await deleteDoc(doc(db, 'users', user.uid, 'students', d._id.toString()));
                                             }
                                             setStudents(prev => prev.filter(s => s._id !== d._id));
                                             setConfirmDeleteRowId(null);
                                           } catch(err){
                                             console.error('Delete error', err);
                                             alert('حدث خطأ أثناء الحذف، الرجاء المحاولة مرة أخرى.');
                                           }
                                        }}>نعم</button>
                                        <button className="btn btn-o btn-s text-xs" onClick={(e) => { e.stopPropagation(); setConfirmDeleteRowId(null); }}>لا</button>
                                     </>
                                  ) : (
                                     <>
                                        <button className="btn btn-o btn-icon btn-s" title="تعديل" onClick={(e) => { e.stopPropagation(); setEditModalId(d._id); }}>
                                           <i className="fas fa-pen"></i>
                                        </button>
                                        <button className="btn btn-o btn-icon btn-s text-[var(--color-dng)]" title="حذف" onClick={(e) => { e.stopPropagation(); setConfirmDeleteRowId(d._id); }}>
                                           <i className="fas fa-trash"></i>
                                        </button>
                                     </>
                                  )}
                               </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                </div>
            </div>
        </section>
      )}

      {/* Cert Modal Wrapper */}
      {certModalId !== null && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-[var(--color-bg2)] border border-[var(--color-brd)] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center p-4 border-b border-[var(--color-brd)]">
                 <h3 className="font-bold"><i className="fas fa-certificate text-[var(--color-primary)] ml-2"></i> معاينة الشهادة المدرسية</h3>
                 <div className="flex gap-2">
                   <button className="btn btn-p btn-s" onClick={() => printDocs([students.find(s=>s._id===certModalId)!])}><i className="fas fa-print"></i> طباعة</button>
                   <button className="btn btn-o btn-s" onClick={() => setCertModalId(null)}><i className="fas fa-times"></i></button>
                 </div>
              </div>
              <div className="p-4 overflow-y-auto flex-1 bg-gray-900 flex justify-center items-center">
                 <div className="bg-[#fffef6] h-auto flex flex-row relative overflow-hidden text-[#1a1a2e] shadow-2xl" style={{ width: '297mm', minHeight: '210mm', direction: 'rtl', fontFamily: 'Amiri, serif', transform: 'scale(0.8)', transformOrigin: 'top center' }}>
                    <div className="flex-1 p-[12mm] border-l border-dashed border-gray-400 relative overflow-hidden" dangerouslySetInnerHTML={{ __html: certHTML(students.find(s=>s._id===certModalId)!, institutionSettings, startCertNum, certYear) }} />
                    <div className="flex-1 p-[12mm] relative overflow-hidden" dangerouslySetInnerHTML={{ __html: certHTML(students.find(s=>s._id===certModalId)!, institutionSettings, startCertNum, certYear) }} />
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Edit Modal Wrapper */}
      {editModalId !== null && (() => {
        const student = students.find(s => s._id === editModalId);
        if (!student) return null;
        return (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
             <div className="bg-[var(--color-bg2)] border border-[var(--color-brd)] rounded-2xl w-full max-w-2xl flex flex-col animate-[fi_0.3s_ease-out]">
                <div className="flex justify-between items-center p-4 border-b border-[var(--color-brd)]">
                   <h3 className="font-bold"><i className="fas fa-user-edit text-[var(--color-primary)] ml-2"></i> تعديل معطيات التلميذ</h3>
                   <button className="btn btn-o btn-s" onClick={() => setEditModalId(null)}><i className="fas fa-times"></i></button>
                </div>
                <div className="p-6 overflow-y-auto space-y-4">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {cf.map(field => (
                        <div key={field.key} className={field.key === 'firstName' || field.key === 'lastName' ? 'md:col-span-1' : ''}>
                           <label className="block text-xs font-semibold text-[var(--color-mt)] mb-1">{field.label}</label>
                           {field.type === 'select' && field.key === 'level' ? (
                             <select 
                               className="inp py-2 text-sm"
                               value={student[field.key as keyof Student] as string || ''}
                               onChange={(e) => {
                                 const newVal = e.target.value;
                                 setStudents(prev => prev.map(s => s._id === editModalId ? { ...s, level: newVal, _lv: normLv(newVal) } : s));
                               }}
                             >
                               {mLv.map(l => <option key={l} value={l}>{l}</option>)}
                             </select>
                           ) : (
                             <input 
                               type="text" 
                               className="inp py-2 text-sm" 
                               value={student[field.key as keyof Student] as string || ''}
                               onChange={(e) => {
                                 const newVal = e.target.value;
                                 setStudents(prev => prev.map(s => s._id === editModalId ? { ...s, [field.key]: newVal } : s));
                               }}
                             />
                           )}
                        </div>
                      ))}
                   </div>
                </div>
                <div className="p-4 border-t border-[var(--color-brd)] flex justify-end items-center">
                   <button className="btn btn-g" onClick={() => {
                        // Persist edits back to exact document for this student
                        const goSave = async () => {
                           if(!user) return;
                           const savedStudent = students.find(s => s._id === editModalId);
                           if(!savedStudent) return;
                           // Update DB document by matching _id
                           const q = query(collection(db, 'users', user.uid, 'students'));
                           const snap = await getDocs(q);
                           let docId = null;
                           snap.forEach(d => { if(d.data()._id === editModalId) docId = d.id; });
                           if (docId) {
                             await setDoc(doc(db, 'users', user.uid, 'students', docId), savedStudent);
                           }
                        };
                        goSave();
                        setEditModalId(null);
                   }}>إغلاق وحفظ</button>
                </div>
             </div>
          </div>
        );
      })()}

    </div>
  );
}
