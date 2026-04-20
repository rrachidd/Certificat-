import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Student } from '../lib/types';

const cf = [
    {key:'regNum',label:'رقم التسجيل',req:false},
    {key:'name',label:'الاسم والنسب',req:true},
    {key:'birthDate',label:'تاريخ الميلاد',req:false},
    {key:'birthPlace',label:'مكان الميلاد',req:false},
    {key:'level',label:'المستوى الإعدادي',req:false,type:'select'},
    {key:'yearFrom',label:'سنة الالتحاق',req:false},
    {key:'yearTo',label:'سنة المغادرة',req:false},
    {key:'reason',label:'سبب المغادرة',req:false,type:'select'},
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

export default function CertificatesView({ institutionSettings }: { institutionSettings: any }) {
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

  // Modals
  const [certModalId, setCertModalId] = useState<number | null>(null);
  const [editModalId, setEditModalId] = useState<number | null>(null);

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
          if(!am&&field.key==='name')am=hdrs.find(h=>h.toLowerCase().includes('اسم')||h.toLowerCase().includes('نسب'))||'';
          if(!am&&field.key==='regNum')am=hdrs.find(h=>h.toLowerCase().includes('رقم'))||'';
          if(!am&&field.key==='birthDate')am=hdrs.find(h=>h.toLowerCase().includes('ميلاد')||h.toLowerCase().includes('تاريخ'))||'';
          if(!am&&field.key==='level')am=hdrs.find(h=>h.toLowerCase().includes('مستوى')||h.toLowerCase().includes('إعدادي')||h.toLowerCase().includes('سنة'))||'';
          if(!am&&field.key==='yearFrom')am=hdrs.find(h=>h.toLowerCase().includes('التحاق')||h.toLowerCase().includes('من'))||'';
          if(!am&&field.key==='yearTo')am=hdrs.find(h=>h.toLowerCase().includes('مغادر')||h.toLowerCase().includes('إلى'))||'';
          if(!am&&field.key==='reason')am=hdrs.find(h=>h.toLowerCase().includes('سبب'))||'';
          tempMap[field.key] = am;
        });
        setMapping(tempMap);
        setStep(2);
      }catch(err: any){ alert('خطأ: '+err.message); }
    };
    r.readAsArrayBuffer(f);
  };

  const processData = () => {
    const mis=cf.filter(f=>f.req&&!mapping[f.key]);
    if(mis.length){alert(`يرجى ربط: ${mis.map(f=>f.label).join('، ')}`);return}
    
    const processed = raw.map((row, idx) => {
      const it: any = { _id: idx };
      cf.forEach(f => {
        let v = mapping[f.key] ? row[mapping[f.key]] : '';
        if(typeof v==='number') v=String(v);
        it[f.key] = (v||'').trim();
      });
      it._lv = normLv(it.level);
      return it as Student;
    });
    
    setStudents(processed);
    setEditLog({});
    setSelectedIds(new Set());
    setStep(3);
  };

  const filteredStudents = students.filter(d => {
    const ms=!search||d.name.toLowerCase().includes(search)||d.regNum.toLowerCase().includes(search);
    const ml=filterLevel==='all'||d._lv===filterLevel;
    const isEdited=editLog[d._id]&&editLog[d._id].length>0;
    const me=filterEdited==='all'||(filterEdited==='edited'&&isEdited)||(filterEdited==='original'&&!isEdited);
    return ms&&ml&&me;
  });

  const uniqueLevels = Array.from(new Set(students.map(d=>d._lv))).filter(l=>l!=='—');

  // Print Logic inside this file to keep it self-contained
  const certHTML = (d: Student, inst: any) => {
    const certNum = `${new Date().getFullYear()}/${d._id + 1}`;
    
    return `
      <div class="cc-modern">
        <div class="header">
          <div class="header-right">
            <div class="gov-text">المملكة المغربية<br/>وزارة التربية الوطنية والتعليم الأولي والرياضة</div>
            <div>الأكاديمية الجهوية : ${inst.academy || ''}</div>
            <div>المؤسسة : ${inst.name || ''}</div>
            <div>العنوان : ${inst.address || ''}</div>
          </div>
          <div class="header-left">
            <div>المديرية الإقليمية : ${inst.province || ''}</div>
            <div>الهاتف : <span style="direction: ltr; display: inline-block;">${inst.phone || ''}</span></div>
          </div>
        </div>

        <div class="title-box">
          شهادة مدرسية رقم : ${certNum}
        </div>

        <div class="body-text">
          <div style="margin-bottom: 12px;">یشهد الموقع (ة) أسفله السيد (ة) : <strong>${inst.managerName || '................'}</strong> بصفته (ا) : <strong>مديرا</strong></div>
          
          <div class="flex-row">
             <div style="flex: 3">أن التلميذ (ة) : <strong class="val-text">${d.name || '................'}</strong></div>
             <div style="flex: 2">المسجل (ة) تحت رقم : <strong class="val-text">${d.regNum || '................'}</strong></div>
          </div>
          
          <div class="flex-row">
             <div style="flex: 3">المزداد (ة) في : <strong class="val-text">${d.birthPlace || '................'}</strong></div>
             <div style="flex: 2">بتاريخ : <strong class="val-text">${d.birthDate || '................'}</strong></div>
          </div>
          
          <div class="flex-row" style="margin-top: 10px; margin-bottom: 10px;">
             <div style="width: 100%">كان (ت) يتابع دراسته(ها) بمستوى : <strong class="val-text" style="font-size: 16px;">${d._lv || '................'}</strong></div>
          </div>
          
          <div class="flex-row">
             <div style="flex: 3">وقد غادر (ت) المؤسسة بتاريخ : <strong class="val-text">${d.yearTo || '................'}</strong></div>
             <div style="flex: 2">الموسم الدراسي : <strong class="val-text">${d.yearFrom || '................'}</strong></div>
          </div>

          <div class="flex-row">
             <div style="width: 100%">سبب المغادرة : <strong class="val-text">${d.reason || '................'}</strong></div>
          </div>
          
          <div style="margin-top: 30px; text-align: center;">سلمت له (ها) هذه الشهادة لغرض إداري</div>
          <div style="margin-top: 10px; text-align: left; padding-left: 20px;">حرر بـ <strong class="val-text">${inst.city || '...........'}</strong> في : <strong class="val-text">${new Date().toLocaleDateString('en-GB')}</strong></div>
        </div>

        <div class="footer-table">
           <div class="footer-col col-sig">
              <div style="text-align: center; font-weight: bold; margin-bottom: 15px;">التوقيع و الإمضاء</div>
           </div>
           <div class="footer-col col-aca">
              <div style="text-align: center; font-weight: bold; margin-bottom: 15px;">مصادقة المديرية الإقليمية</div>
           </div>
           <div class="footer-col col-note">
              <div style="margin-bottom: 5px;"><strong>ملاحظات :</strong></div>
              <div>&raquo; هذه الشهادة لا تخول التسجيل في مؤسسة أخرى.</div>
              <div>&raquo; إن المعلومات الواردة في هذه الشهادة يتحمل مسؤوليتها رئيس المؤسسة.</div>
              <div>&raquo; إن المصادقة تعني أن المؤسسة تنتمي إلى هذه المديرية.</div>
           </div>
        </div>
      </div>
    `;
  };

  const printDocs = (items: Student[]) => {
    const inst = institutionSettings;
    let h='';
    for(let i=0;i<items.length;i+=2){
      const last=i===items.length-1;
      h+=`<div class="pp"${last?' style="page-break-after:auto"':''}><div class="ph">${certHTML(items[i], inst)}</div>`;
      if(items[i+1]) {
        h+=`<div class="ph">${certHTML(items[i+1], inst)}</div>`;
      } else {
        h+=`<div class="ph"></div>`; 
      }
      h+=`</div>`;
    }
    const pw=window.open('','_blank');
    if(!pw) return;
    pw.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap" rel="stylesheet"><style>
@page { size: A4 landscape; margin: 0; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Amiri', serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff; }
.pp { width: 297mm; height: 210mm; display: flex; flex-direction: row; page-break-after: always; background: #fff; position: relative; overflow: hidden; }
.ph { flex: 1; width: 148.5mm; height: 210mm; padding: 15mm; border-left: 1px dashed #444; }
.ph:last-child { border-left: none; }
.cc-modern { font-family: 'Amiri', serif; color: #000; height: 100%; display: flex; flex-direction: column; background: white; direction: rtl; }
.header { display: flex; justify-content: space-between; align-items: flex-start; font-size: 13px; line-height: 1.5; margin-bottom: 20px; }
.header-right { font-weight: bold; width: 60%; }
.header-left { font-weight: bold; width: 40%; text-align: left; }
.gov-text { text-align: center; margin-bottom: 12px; }
.title-box { border: 2px solid #000; padding: 10px 20px; text-align: center; font-size: 18px; font-weight: bold; width: fit-content; margin: 0 auto 30px auto; }
.body-text { font-size: 15px; line-height: 2.1; flex: 1; }
.flex-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
.val-text { font-weight: bold; }
.footer-table { display: flex; border: 1.5px solid #000; min-height: 120px; margin-top: auto; }
.footer-col { display: flex; flex-direction: column; }
.col-sig { flex: 2; padding: 10px; }
.col-aca { flex: 2; padding: 10px; border-right: 1.5px solid #000; }
.col-note { flex: 3; padding: 10px; font-size: 11px; line-height: 1.8; border-right: 1.5px solid #000; }
</style></head><body>${h}</body></html>`);
    pw.document.close();
    setTimeout(()=>pw.print(),600);
  };

  return (
    <div className="max-w-6xl mx-auto">
      {step === 1 && (
        <section className="animate-[fi_0.6s_ease-out]">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-extrabold mb-3">استيراد ملف أرشيف التلاميذ السابقين</h2>
                <p className="text-[var(--color-mt)]">قم برفع ملف إكسيل يحتوي على بيانات تلاميذ السلك الإعدادي</p>
            </div>
            <div className="upload-zone" onClick={() => fileInputRef.current?.click()}>
                <input type="file" accept=".xlsx,.xls,.csv" hidden ref={fileInputRef} onChange={handleFileUpload}/>
                <div className="mx-auto w-[85px] h-[85px] mb-[22px] rounded-full flex items-center justify-center text-[34px] text-[var(--color-red)] bg-gradient-to-br from-[var(--color-red-g)] to-red-600/5 transition-transform hover:scale-110">
                  <i className="fas fa-file-excel"></i>
                </div>
                <p className="text-lg font-semibold mb-2">اسحب ملف الإكسيل هنا أو انقر للاختيار</p>
                <p className="text-sm text-[var(--color-mt)]">XLSX, XLS, CSV</p>
            </div>
        </section>
      )}

      {step === 2 && (
        <section className="animate-[fi_0.6s_ease-out]">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold bg-[var(--color-red-g)] text-[var(--color-red)]">2</div>
                <h2 className="text-xl font-bold">ربط الأعمدة ببيانات الشهادة</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-2xl p-5 bg-[var(--color-card)] border border-[var(--color-brd)]">
                    <h3 className="font-semibold mb-4 text-sm text-[var(--color-mt)]">أعمدة الملف</h3>
                    <div className="flex flex-wrap gap-2">
                      {headers.map(h => <span key={h} className="px-3 py-1 rounded-lg text-xs bg-[var(--color-bg)] text-[var(--color-red)] border border-[var(--color-brd)]">{h}</span>)}
                    </div>
                </div>
                <div className="rounded-2xl p-5 bg-[var(--color-card)] border border-[var(--color-brd)]">
                    <h3 className="font-semibold mb-4 text-sm text-[var(--color-mt)]">ربط الحقول</h3>
                    <div className="space-y-2">
                        {cf.map(f => (
                          <div key={f.key} className="flex items-center gap-3 py-2 border-b border-[var(--color-brd)]">
                            <span className={`text-xs font-semibold min-w-[160px] ${f.req ? 'text-[var(--color-red)]' : 'text-[var(--color-fg)]'}`}>
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
                  <div className="text-2xl font-bold text-[var(--color-red)]">{Math.ceil(students.length/2)}</div>
                </div>
            </div>

            <div className="rounded-2xl p-4 mb-4 flex flex-wrap items-center gap-3 bg-[var(--color-card)] border border-[var(--color-brd)]">
                <input type="text" className="inp flex-1 min-w-[200px]" placeholder="بحث بالاسم أو الرقم..." value={search} onChange={e=>setSearch(e.target.value)} />
                <select className="inp w-auto" value={filterLevel} onChange={e=>setFilterLevel(e.target.value)}>
                  <option value="all">جميع المستويات</option>
                  {uniqueLevels.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <button className="btn btn-p btn-s" disabled={selectedIds.size === 0} onClick={() => {
                  const items = Array.from(selectedIds).map(id => students.find(s=>s._id===id)).filter(Boolean) as Student[];
                  printDocs(items);
                }}>
                  <i className="fas fa-print"></i> طباعة المحدد ({selectedIds.size})
                </button>
                <button className="btn btn-g btn-s" onClick={() => printDocs(filteredStudents)}>
                  <i className="fas fa-file-pdf"></i> طباعة الكل المفلتر
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
                          <th>الاسم والنسب</th>
                          <th>تاريخ الميلاد</th>
                          <th>المستوى الإعدادي</th>
                          <th>فترة التسجيل</th>
                          <th>إجراء</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.map(d => (
                          <tr key={d._id} className={selectedIds.has(d._id) ? 'bg-[var(--color-red-g)]' : ''}>
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
                            <td className="font-semibold">{d.name}</td>
                            <td>{d.birthDate}</td>
                            <td>{d._lv}</td>
                            <td>{d.yearFrom} - {d.yearTo}</td>
                            <td>
                               <div className="flex gap-2">
                                  <button className="btn btn-o btn-s" onClick={() => setCertModalId(d._id)}><i className="fas fa-eye"></i></button>
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
           <div className="bg-[#151d28] border border-[#263348] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center p-4 border-b border-[#263348]">
                 <h3 className="font-bold"><i className="fas fa-certificate text-[var(--color-gld)] ml-2"></i> معاينة الشهادة المدرسية</h3>
                 <div className="flex gap-2">
                   <button className="btn btn-g btn-s" onClick={() => printDocs([students.find(s=>s._id===certModalId)!])}><i className="fas fa-print"></i> طباعة</button>
                   <button className="btn btn-o btn-s" onClick={() => setCertModalId(null)}><i className="fas fa-times"></i></button>
                 </div>
              </div>
              <div className="p-4 overflow-y-auto flex-1 bg-gray-900 flex justify-center">
                 <div className="bg-[#fffef6] w-full max-w-[800px] flex flex-col relative overflow-hidden text-[#1a1a2e]" style={{ direction: 'rtl', fontFamily: 'Amiri, serif' }}>
                    <div className="border-b-2 border-dashed border-gray-300 relative overflow-hidden" dangerouslySetInnerHTML={{ __html: certHTML(students.find(s=>s._id===certModalId)!, institutionSettings) }} />
                    <div className="relative overflow-hidden" dangerouslySetInnerHTML={{ __html: certHTML(students.find(s=>s._id===certModalId)!, institutionSettings) }} />
                 </div>
              </div>
           </div>
        </div>
      )}

    </div>
  );
}
