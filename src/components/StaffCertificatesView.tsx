import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, setDoc, writeBatch, deleteDoc } from 'firebase/firestore';
import { Staff } from '../lib/types';
import * as XLSX from 'xlsx';

const staffFields = [
    { key: 'ppr', label: 'رقم التأجير', req: true },
    { key: 'firstName', label: 'الاسم (بالعربية)', req: true },
    { key: 'lastName', label: 'النسب (بالعربية)', req: true },
    { key: 'firstNameFr', label: 'الاسم (بالفرنسية)', req: false },
    { key: 'lastNameFr', label: 'النسب (بالفرنسية)', req: false },
    { key: 'cin', label: 'رقم البطاقة الوطنية', req: false },
    { key: 'framework', label: 'الإطار', req: false },
    { key: 'grade', label: 'الدرجة', req: false },
    { key: 'rank', label: 'الرتبة', req: false },
    { key: 'birthDate', label: 'تاريخ الازدياد', req: false },
    { key: 'hiringDate', label: 'تاريخ التوظيف', req: false },
    { key: 'joinDate', label: 'تاريخ الالتحاق بالمؤسسة', req: false },
    { key: 'adminTasks', label: 'المهام الإدارية', req: false },
    { key: 'address', label: 'العنوان', req: false },
    { key: 'phone', label: 'الهاتف', req: false },
];

export default function StaffCertificatesView({ institutionSettings, user, highlightDoc }: { institutionSettings: any, user: any, highlightDoc?: string }) {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const getDocTitle = () => {
    switch(highlightDoc) {
      case 'staff-work-cert': return 'شهادة العمل';
      case 'staff-resumption': return 'محضر الاستئناف';
      case 'staff-absence': return 'طلب الإذن بالغياب';
      case 'staff-leave': return 'الرخص';
      case 'staff-transmission': return 'ورقة الإرسال';
      default: return 'إدارة شؤون الموظفين';
    }
  };
  const [step, setStep] = useState<1 | 2>(1); // 1: List/Upload, 2: Mapping
  const [raw, setRaw] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [deletingStaff, setDeletingStaff] = useState<Staff | null>(null);

  const [transInputs, setTransInputs] = useState({
    attachments: '',
    count: '1',
    notes: 'للاختصاص و الإخبار'
  });

  useEffect(() => {
    fetchStaff();
  }, [user]);

  const filteredStaff = staffList.filter(s => 
    s.firstName.includes(search) || 
    s.lastName.includes(search) || 
    s.ppr.includes(search) ||
    s.cin.includes(search)
  );

  const fetchStaff = async () => {
    if(!user) return;
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, 'users', user.uid, 'staff'));
      const fetched = snap.docs.map(d => {
        const data = d.data() as Staff;
        if (!data._id) data._id = parseInt(d.id) || Date.now(); // fallback if missing
        return data;
      });
      fetched.sort((a,b) => a._id - b._id);
      setStaffList(fetched);
    } catch(e) {
      console.error("Error fetching staff", e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!editingStaff || !user) return;
    try {
      // Create a sanitized payload without undefined or null values for Firestore
      const payload: Record<string, any> = {};
      Object.entries(editingStaff).forEach(([key, value]) => {
        if (value === undefined || value === null) {
          payload[key] = ''; // Map undefined/null to empty string to pass Firestore `is string` rules
        } else {
          payload[key] = value;
        }
      });
      // Ensure _id stays as number if it has to be
      if (typeof editingStaff._id === 'number') {
        payload._id = editingStaff._id;
      }
      
      const docId = editingStaff._id ? editingStaff._id.toString() : Date.now().toString();
      await setDoc(doc(db, 'users', user.uid, 'staff', docId), payload, { merge: true });
      
      setStaffList(prev => prev.map(s => s._id === editingStaff._id ? (payload as Staff) : s));
      setEditingStaff(null);
    } catch(err) {
      console.error("Error updating staff:", err);
      alert("حدث خطأ أثناء الحفظ");
    }
  };

  const handleDeleteStaff = async () => {
    if(!deletingStaff || !user) return;
    try {
      const docId = deletingStaff._id ? deletingStaff._id.toString() : '';
      if(docId) {
        await deleteDoc(doc(db, 'users', user.uid, 'staff', docId));
      }
      setStaffList(prev => prev.filter(s => s._id !== deletingStaff._id));
      setDeletingStaff(null);
    } catch(err) {
      console.error("Error deleting staff:", err);
      alert("حدث خطأ أثناء الحذف");
    }
  };

  const handleFileUpload = (e: any) => {
    const f = e.target.files?.[0];
    if(!f) return;
    const r = new FileReader();
    r.onload = ev => {
      try {
        const wb = XLSX.read(new Uint8Array(ev.target?.result as any), { type: 'array' });
        const j = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
        if(!j.length) { alert('الملف فارغ'); return; }
        setRaw(j);
        const hdrs = Object.keys(j[0]);
        setHeaders(hdrs);
        
        // Auto-map staff fields
        const tempMap: Record<string, string> = {};
        staffFields.forEach(field => {
          let am = ''; 
          const fl = field.label.toLowerCase();
          for(const h of hdrs) {
            if(h.toLowerCase().includes(fl) || fl.includes(h.toLowerCase())) { am = h; break; }
          }
          if(!am && (field.key === 'firstName')) am = hdrs.find(h => (h.includes('الاسم') || h.includes('First')) && !h.includes('النسب')) || '';
          if(!am && (field.key === 'lastName')) am = hdrs.find(h => (h.includes('النسب') || h.includes('Last')) && !h.includes('الاسم')) || '';
          if(!am && field.key === 'ppr') am = hdrs.find(h => h.includes('PPR') || h.includes('تأجير')) || '';
          if(!am && field.key === 'cin') am = hdrs.find(h => h.includes('CIN') || h.includes('بطاقة')) || '';
          tempMap[field.key] = am;
        });
        setMapping(tempMap);
        setStep(2);
      } catch(err: any) { alert('خطأ: ' + err.message); }
    };
    r.readAsArrayBuffer(f);
  };

  const processStaffData = async () => {
    const mis = staffFields.filter(f => f.req && !mapping[f.key]);
    if(mis.length) { alert(`يرجى ربط: ${mis.map(f => f.label).join('، ')}`); return; }
    
    setLoading(true);
    const processed = raw.map((row, idx) => {
      const it: any = { _id: Date.now() + idx };
      staffFields.forEach(f => {
        let v = mapping[f.key] ? row[mapping[f.key]] : '';
        if(typeof v === 'number') v = String(v);
        it[f.key] = (v || '').trim();
      });
      return it as Staff;
    });

    if(user) {
      try {
        // Option to add or clear. User requested "database for each", 
        // usually import means replacing or adding to existing list. 
        // We will append to keep existing ones if they like, but let's stick to a clean import for now or just add.
        // The user said "Place to import", so let's add them.
        const batch = writeBatch(db);
        processed.forEach(s => {
          const ref = doc(db, 'users', user.uid, 'staff', s._id.toString());
          batch.set(ref, s);
        });
        await batch.commit();
        alert(`تم استيراد ${processed.length} موظف بنجاح`);
      } catch (e) {
        console.error("Error saving staff", e);
        alert("حدث خطأ أثناء الحفظ");
      }
    }
    
    setStep(1);
    fetchStaff();
  };

  const printDoc = (type: string, staff: Staff | null, extras?: any) => {
    const inst = institutionSettings;
    const todayNum = new Date().toLocaleDateString('en-GB');

    let template = '';
    let titleStr = '';
    
    const logoUrl = inst.logo || "https://upload.wikimedia.org/wikipedia/commons/e/ea/Coat_of_arms_of_Morocco.svg";
    const logoHtml = `<img src="${logoUrl}" alt="المملكة المغربية" style="width: 80px; display: block; margin: 0 auto 5px auto;" />`;

    const logoBlock = `<div class="header-image-container mb-6">
        <img src="${logoUrl}" alt="المملكة المغربية" class="header-image" />
      </div>`;

    const headerBlock = `
      ${logoBlock}
      <div class="text-center mb-6" style="font-size: 13px; font-weight: bold; line-height: 1.4;">
        الأكاديمية الجهوية: جهة ${inst.academy || ''}<br>
        المديرية الإقليمية: ${inst.province || ''}<br>
        ${inst.name || ''}
      </div>
    `;

    if (type === 'work') {
      titleStr = 'شهادة العمل';
      template = `
        ${headerBlock}
        <div class="text-center my-8 text-2xl font-bold underline" style="font-family: serif;">شهادة العمل</div>
        <div style="font-size: 16px; line-height: 2.2;">
          <p>يشهد رئيس المؤسسة الموقع أسفله،</p>
          <div style="display: flex; justify-content: space-between; align-items: center;">
             <div>أن السيد(ة) : <span class="font-bold text-lg">${staff?.firstName || '................'} ${staff?.lastName || ''}</span></div>
             <div dir="ltr" style="font-size: 15px;">Nom et Prénom : <b class="text-lg">${staff?.lastNameFr || '................'} ${staff?.firstNameFr || ''}</b></div>
          </div>
          <p>رقم التأجير : <span class="font-bold">${staff?.ppr || '................'}</span></p>
          <p>رقم ج.و.ل.لتعريف : <span class="font-bold">${staff?.cin || '..............'}</span></p>
          <p>الإطار : <span class="font-bold">${staff?.framework || '..............'}</span></p>
          <p>يعمل(تشتغل) بهذه المؤسسة بصفة : <span class="font-bold">${staff?.adminTasks || 'رسمية'}</span>.</p>
          <p>تاريخ التوظيف : <span class="font-bold direction-ltr">${staff?.hiringDate || '..............'}</span></p>
          <p>تاريخ الالتحاق بالمؤسسة : <span class="font-bold direction-ltr">${staff?.joinDate || '..............'}</span></p>
          <p style="margin-top: 20px;">وقد سلمت له(ها) هذه الشهادة بطلب منه(ها) لاستعمالها للاغراض الادارية.</p>
        </div>
        <div style="margin-top: 50px; text-align: left; padding-left: 20px;">
          <div>حرر بـ ${inst.city || '...........'} في : ${todayNum}</div>
          <div style="margin-top: 15px; font-weight: bold;">إمضاء وخاتم مدير المؤسسة</div>
        </div>
      `;
    } else if (type === 'resumption') {
      titleStr = 'محضر استئناف العمل';
      template = `
        <div style="text-align: right; font-size: 13px; font-weight: bold; line-height: 1.4;">
           <div class="header-image-container mb-2">
             <img src="${logoUrl}" class="header-image-small" alt="شعار المملكة المغربية" />
           </div>
           الأكاديمية الجهوية: جهة ${inst.academy || ''}<br>
           المديرية الإقليمية: ${inst.province || ''}<br>
           ${inst.name || ''}
        </div>
        <div class="text-center my-6 text-2xl font-bold" style="font-family: serif;">محضر استئناف العمل</div>
        <div style="font-size: 15px; line-height: 2;">
          <p>يشهد الموقع(ة) أسفله السيد(ة): <b>${inst.managerName || '................'}</b> بصفته مديرا للمؤسسة</p>
          <p>أن السيد(ة):</p>
          <div style="padding-right: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <div>الاسم الشخصي و العائلي: <b class="text-lg">${staff?.firstName || '................'} ${staff?.lastName || ''}</b></div>
              <div dir="ltr" style="font-size: 14px;">Nom et Prénom : <b class="text-lg">${staff?.lastNameFr || '................'} ${staff?.firstNameFr || ''}</b></div>
            </div>
            <p>الإطار: <b>${staff?.framework || '................'}</b></p>
            <p>الدرجة: <b>${staff?.grade || '.......'}</b></p>
            <p>رقم التأجير / ب.ت.و: <b>${staff?.ppr || '................'} / ${staff?.cin || '..............'}</b></p>
          </div>
          <p style="margin-top: 15px;">قد استأنف عمله(ا) بالمؤسسة بتاريخ: <b>....................................</b></p>
          <p>بعد رخصة (مرضية / ولادة / استثنائية): <b>....................................</b></p>
        </div>
        <div style="display: flex; margin-top: 40px; justify-content: space-between;">
           <div style="border: 1px solid #000; padding: 15px; width: 45%; height: 120px; text-align: center;">
             <div style="font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 5px; margin-bottom: 10px;">توقيع المعني بالأمر</div>
             <div style="font-size: 12px;">وحرر بـ: ${inst.city || '...........'} بتاريخ: .............</div>
           </div>
           <div style="border: 1px solid #000; padding: 15px; width: 45%; height: 120px; text-align: center;">
             <div style="font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 5px; margin-bottom: 10px;">توقيع وإمضاء مدير المؤسسة</div>
           </div>
        </div>
      `;
    } else if (type === 'absence') {
      titleStr = 'طلب الإذن بالغياب';
      template = `
        <div class="header-image-container mb-4">
          <img src="${logoUrl}" alt="المملكة المغربية" class="header-image" />
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: bold;">
           <div style="text-align: right; text-align: center; width: 220px;">
              أكاديمية: ${inst.academy || ''}<br>مديرية: ${inst.province || ''}<br>${inst.name || ''}
           </div>
           <div style="text-align: left;"></div>
        </div>
        <div class="text-center my-4 text-2xl font-bold" style="font-family: serif;">طلب الإذن بالغياب</div>
        <div style="font-size: 13px; line-height: 1.8; margin-bottom: 20px;">
          <div style="display: flex;">
            <div style="flex: 1;">الاسم والنسب: <b style="font-size: 16px;">${staff?.firstName || '................'} ${staff?.lastName || ''}</b></div>
            <div style="flex: 1;">رقم ب.ت.و: <b>${staff?.cin || '..............'}</b></div>
          </div>
          <div style="display: flex;">
            <div style="flex: 1;">رقم التأجير: <b>${staff?.ppr || '................'}</b></div>
            <div style="flex: 1;">الدرجة: <b>${staff?.grade || '........'}</b> <span style="margin-right: 15px;">الرتبة: <b>${staff?.rank || '........'}</b></span></div>
          </div>
          <div style="display: flex;">
            <div style="flex: 1;">الإطار: <b>${staff?.framework || '..............'}</b></div>
          </div>
          <div style="display: flex;">
            <div style="flex: 1;">المهمة: <b>${staff?.adminTasks || '..............'}</b></div>
          </div>
        </div>
        
        <div style="font-size: 14px; line-height: 2;">
          <div style="display: flex;">
            <div style="flex: 1;">مدة الغياب (بالأيام): <b>...........</b></div>
            <div style="flex: 1;">من: <b>...........</b></div>
            <div style="flex: 1;">إلى: <b>...........</b></div>
          </div>
          <div style="display: flex;">
            <div style="flex: 1;">ينقطع عن عمله بتاريخ: <b>.....................</b> على الساعة: <b>..... H .....</b></div>
          </div>
          <div style="display: flex;">
            <div style="flex: 1;">السبب: <b>................................................................................</b></div>
          </div>
        </div>
        
        <div style="display: flex; margin-top: 20px; justify-content: space-between; font-weight: bold; font-size: 14px;">
          <div>توقيع المعني(ة) بالأمر:</div>
          <div>حرر بـ: ${inst.city || '..............'} بتاريخ: ...../...../.........</div>
        </div>
        
        <div style="border: 1px solid #000; margin-top: 25px; padding: 10px; min-height: 120px; position: relative;">
          <div style="font-weight: bold; text-decoration: underline; margin-bottom: 30px;">ملاحظات رئيس المؤسسة:</div>
          <div style="display: flex; position: absolute; bottom: 10px; left: 10px; right: 10px;">
            <div style="flex: 1;">الختم مع التوقيع:</div>
            <div style="flex: 1;">بعث بتاريخ: ...../...../......... تحت رقم: ...............</div>
          </div>
        </div>
      `;
    } else if (type === 'leave') {
        titleStr = 'إخبار برخصة';
        template = `
          <div class="header-image-container mb-4">
            <img src="${logoUrl}" alt="المملكة المغربية" class="header-image" />
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: bold;">
            <div style="text-align: right; line-height: 1.4;">إلى السيد(ة) المدير(ة) الإقليمي(ة)<br>لوزارة التربية الوطنية<br>المديرية الإقليمية: ${inst.province || ''}</div>
            <div style="text-align: center; line-height: 1.4;">
               ${inst.name || ''}
            </div>
          </div>
          <div class="text-center mt-4 mb-2"><span class="text-xl font-bold border border-black px-10 py-1" style="font-family: serif;">إخبار برخصة</span></div>
          <div class="text-center mb-4" style="font-size: 12px; font-weight: bold;">
            <span style="border:1px solid #000;display:inline-block;width:10px;height:10px;margin-left:5px;"></span> مرضية
            <span style="border:1px solid #000;display:inline-block;width:10px;height:10px;margin-left:5px;margin-right:20px;"></span> إدارية
            <span style="border:1px solid #000;display:inline-block;width:10px;height:10px;margin-left:5px;margin-right:20px;"></span> استثنائية
            <span style="border:1px solid #000;display:inline-block;width:10px;height:10px;margin-left:5px;margin-right:20px;"></span> ولادة
          </div>
          <div style="display: flex; font-size: 11px; line-height: 1.8;">
             <div style="flex: 55%;">
               <div>الاسم والنسب: <b style="font-size: 14px;">${staff?.firstName || '................'} ${staff?.lastName || ''}</b></div>
               <div>الإطار: <b>${staff?.framework || '..............'}</b></div>
               <div>الوضعية: <span style="border:1px solid #000;display:inline-block;width:10px;height:10px;margin-right:3px;"></span> رسمي <span style="border:1px solid #000;display:inline-block;width:10px;height:10px;margin-right:15px;"></span> متدرب <span style="border:1px solid #000;display:inline-block;width:10px;height:10px;margin-right:15px;"></span> مؤقت</div>
               <div>مقر العمل: <b>${inst.name || ''}</b></div>
               <div>تاريخ الانقطاع عن العمل: <b>........................</b></div>
               <div>عدد الأيام: <b>........</b> من: <b>........</b> إلى: <b>........</b></div>
               <div>تاريخ الاستئناف المحتمل: <b>........................</b></div>
             </div>
             <div style="flex: 45%;">
               <div>رقم التأجير: <b>${staff?.ppr || '................'}</b></div>
               <div>رقم ب.ت.و: <b>${staff?.cin || '..............'}</b></div>
               <div>تاريخ الازدياد: <b>${staff?.birthDate || '..............'}</b></div>
               <div>تاريخ التوظيف: <b>${staff?.hiringDate || '..............'}</b></div>
               <div>تاريخ الالتحاق بالمؤسسة: <b>${staff?.joinDate || '..............'}</b></div>
             </div>
          </div>
          <div style="margin-top: 10px; font-weight: bold; font-size: 12px;">ملاحظة الرئيس المباشر: .......................................</div>
          <div style="margin-top: 10px; font-weight: bold; font-size: 12px;">بيان الرخص المرضية خلال 12 شهرا السابقة:</div>
          <table style="width: 100%; border-collapse: collapse; margin-top: 5px; font-size: 11px; text-align: center;">
            <tr>
              <th colspan="2" style="border: 1px solid #000; padding: 2px;">مدة الرخص المرضية</th>
              <th rowspan="2" style="border: 1px solid #000; padding: 2px;">عدد الأيام</th>
              <th rowspan="2" style="border: 1px solid #000; padding: 2px;">اسم الطبيب المعالج</th>
            </tr>
            <tr>
              <th style="border: 1px solid #000; padding: 2px;">من</th>
              <th style="border: 1px solid #000; padding: 2px;">إلى</th>
            </tr>
            <tr><td style="border: 1px solid #000; height: 18px;"></td><td style="border: 1px solid #000;"></td><td style="border: 1px solid #000;"></td><td style="border: 1px solid #000;"></td></tr>
            <tr><td style="border: 1px solid #000; height: 18px;"></td><td style="border: 1px solid #000;"></td><td style="border: 1px solid #000;"></td><td style="border: 1px solid #000;"></td></tr>
            <tr><td style="border: 1px solid #000; height: 18px;"></td><td style="border: 1px solid #000;"></td><td style="border: 1px solid #000;"></td><td style="border: 1px solid #000;"></td></tr>
            <tr><td style="border: 1px solid #000; height: 18px;"></td><td style="border: 1px solid #000;"></td><td style="border: 1px solid #000;"></td><td style="border: 1px solid #000;"></td></tr>
            <tr><td style="border: 1px solid #000; height: 18px;"></td><td style="border: 1px solid #000;"></td><td style="border: 1px solid #000;"></td><td style="border: 1px solid #000;"></td></tr>
            <tr><td style="border: 1px solid #000; height: 18px;"></td><td style="border: 1px solid #000;"></td><td style="border: 1px solid #000;"></td><td style="border: 1px solid #000;"></td></tr>
          </table>
          <div style="display: flex; margin-top: 15px; justify-content: space-between; font-size: 12px; font-weight: bold;">
            <div style="text-align: center;">توقيع المعني بالأمر<br><br>بتاريخ: ...................</div>
            <div style="text-align: center;">توقيع وختم السيد المدير<br><br>حرر وأرسل بتاريخ: ...................</div>
          </div>
        `;
    } else if (type === 'transmission') {
        titleStr = 'ورقة إرسال';
        const finalAttachments = (extras?.attachments || '').replace(/\n/g, '<br>');
        template = `
          <div class="header-image-container mb-4">
            <img src="${logoUrl}" alt="المملكة المغربية" class="header-image" />
          </div>
          <div style="display: flex; font-size: 13px; font-weight: bold; line-height: 1.5;">
            <div style="flex: 1; text-align: right; display: flex; flex-direction: column; align-items: flex-start;">
                <div style="text-align: center; width:fit-content;">
                   الأكاديمية: ${inst.academy || ''}<br>المديرية: ${inst.province || ''}<br>${inst.name || ''}
                </div>
            </div>
            <div style="flex: 1; text-align: center;"><br>إلى السيد(ة) المدير(ة) الإقليمي(ة)<br>لوزارة التربية الوطنية<br>مصلحة: الموارد البشرية</div>
          </div>
          <div style="margin-top: 15px; text-align: right; font-weight: bold; font-size: 14px;">
            مــن مـديـر المـؤسـسـة
          </div>
          <div style="text-align: center; margin-top: 5px;">
            <div style="font-size: 26px; font-family: serif; font-weight: bold;">ورقة إرســــــال</div>
            <div style="margin-top: 5px; font-size: 16px;">رقم الإرسال : ......... / ${new Date().getFullYear()}</div>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-top: 30px; text-align: center; table-layout: fixed;">
            <tr style="background: #f8f9fa;">
              <th style="border: 1px solid #000; padding: 10px; width: 60%;">بيان المرفقات</th>
              <th style="border: 1px solid #000; padding: 10px; width: 15%;">العدد</th>
              <th style="border: 1px solid #000; padding: 10px; width: 25%;">ملاحظات</th>
            </tr>
            <tr>
              <td style="border: 1px solid #000; padding: 15px; text-align: right; vertical-align: top; line-height: 2; min-height: 220px; overflow-wrap: break-word;">
                 - وثائق تهم السيد(ة): <b style="font-size: 16px;">${staff?.firstName || '................'} ${staff?.lastName || ''}</b><br>
                 - الإطار: <b>${staff?.framework || '................'}</b><br>
                 - رقم التأجير: <b>${staff?.ppr || '................'}</b><br>
                 ${finalAttachments ? `<br>${finalAttachments}` : ''}
              </td>
              <td style="border: 1px solid #000; padding: 15px; vertical-align: top; font-size: 18px; font-weight: bold;">${extras?.count || '1'}</td>
              <td style="border: 1px solid #000; padding: 15px; vertical-align: top;">${extras?.notes || 'للاختصاص و الإخبار'}</td>
            </tr>
          </table>
          <div style="display: flex; justify-content: space-between; margin-top: 30px; font-weight: bold;">
            <div style="text-align: right;">${inst.city || '...........'} في : ........................</div>
            <div style="text-align: left; padding-left: 40px; font-size: 16px;">طابع و إمضاء مدير المؤسسة</div>
          </div>
        `;
    }

    const pw = window.open('', '_blank');
    if(!pw) return;

    // Use A4 Landscape layout with two A5 panes (like CertificatesView)
    pw.document.write(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
        <head>
          <meta charset="UTF-8">
          <title>${titleStr} - ${staff?.lastName || ''}</title>
          <style>
            @media print {
              @page { size: A4 landscape; margin: 0; }
              html, body { margin: 0; padding: 0; background: #fff; width: 297mm; height: 209mm; }
              .pp { page-break-after: always; page-break-inside: avoid; }
            }
            @page { size: A4 landscape; margin: 0; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Arial', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff; margin: 0; }
            .pp { width: 297mm; height: 210mm; display: flex; flex-direction: row; background: #fff; position: relative; overflow: hidden; margin: 0 auto; }
            .ph { flex: 1; width: 148.5mm; height: 210mm; padding: 12mm 15mm; border-left: 1px dashed #999; display: flex; flex-direction: column; overflow: hidden; }
            .ph:last-child { border-left: none; }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .underline { text-decoration: underline; }
            .text-xl { font-size: 20px; }
            .text-2xl { font-size: 24px; }
            .text-lg { font-size: 18px; }
            .my-4 { margin-top: 15px; margin-bottom: 15px; }
            .my-6 { margin-top: 25px; margin-bottom: 25px; }
            .my-8 { margin-top: 30px; margin-bottom: 30px; }
            .mb-2 { margin-bottom: 8px; }
            .mb-6 { margin-bottom: 25px; }
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

            .header-image { max-width: 250px; max-height: 120px; width: auto; height: auto; object-fit: contain; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.1)); }
            .header-image-small { max-width: 160px; max-height: 80px; width: auto; height: auto; object-fit: contain; }
          </style>
        </head>
        <body>
          <div class="pp">
            <div class="ph">${template}</div>
            <div class="ph">${template}</div>
          </div>
          <script>
            setTimeout(() => { window.print(); }, 300);
          </script>
        </body>
      </html>
    `);
    pw.document.close();
  };

  return (
    <div className="animate-[fi_0.4s_ease-out]">
      {step === 1 ? (
        <>
          {highlightDoc && highlightDoc !== 'staff-docs' ? (
            <div className="max-w-3xl mx-auto mt-4">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--color-primary-g)] text-[var(--color-primary)] text-2xl mb-4">
                        <i className={highlightDoc === 'staff-work-cert' ? "fas fa-certificate" : highlightDoc === 'staff-resumption' ? "fas fa-file-signature" : highlightDoc === 'staff-absence' ? "fas fa-calendar-times" : highlightDoc === 'staff-leave' ? "fas fa-leaf" : "fas fa-paper-plane"}></i>
                    </div>
                    <h2 className="text-3xl font-extrabold mb-3">{getDocTitle()}</h2>
                    <p className="text-[var(--color-mt)] text-sm">ابحث عن الموظف في القائمة وحدده لاستخراج وطباعة الوثيقة المطلوبة.</p>
                </div>

                <div className="bg-[var(--color-card)] border border-[var(--color-brd)] rounded-2xl p-6 shadow-sm">
                    <label className="block text-sm font-semibold mb-2">البحث عن الموظف (الاسم، النسب أو إطار/PPR)</label>
                    <div className="relative mb-6">
                        <i className="fas fa-search absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-mt)]"></i>
                        <input 
                            type="text" 
                            placeholder="اكتب للبحث..." 
                            className="inp w-full pr-11"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>

                    {highlightDoc === 'staff-transmission' && (
                        <div className="mb-6 p-4 bg-[var(--color-bg)] rounded-xl border border-[var(--color-brd)] animate-[fi_0.3s_ease-out]">
                             <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
                                <i className="fas fa-edit text-[var(--color-primary)]"></i> بيانات ورقة الإرسال
                             </h4>
                             <div className="space-y-3">
                                <div>
                                    <label className="block text-[10px] uppercase font-bold mb-1 opacity-70">بيان المرفقات</label>
                                    <textarea 
                                        className="inp w-full text-sm h-20" 
                                        placeholder="مثال: - شهادة طبية عدد..."
                                        value={transInputs.attachments}
                                        onChange={e => setTransInputs({...transInputs, attachments: e.target.value})}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] uppercase font-bold mb-1 opacity-70">العدد</label>
                                        <input 
                                            type="text" 
                                            className="inp w-full text-sm" 
                                            value={transInputs.count}
                                            onChange={e => setTransInputs({...transInputs, count: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] uppercase font-bold mb-1 opacity-70">ملاحظات</label>
                                        <input 
                                            type="text" 
                                            className="inp w-full text-sm" 
                                            value={transInputs.notes}
                                            onChange={e => setTransInputs({...transInputs, notes: e.target.value})}
                                        />
                                    </div>
                                </div>
                             </div>
                        </div>
                    )}

                    <div className="max-h-[350px] overflow-y-auto mb-6 border border-[var(--color-brd)] rounded-xl divide-y divide-[var(--color-brd)] custom-scrollbar" style={{scrollbarWidth: 'thin'}}>
                        {loading ? (
                            <div className="p-10 text-center text-[var(--color-mt)]"><i className="fas fa-spinner fa-spin text-xl mb-2"></i><br/>جاري التحميل...</div>
                        ) : filteredStaff.length === 0 ? (
                            <div className="p-10 text-center text-[var(--color-mt)] opacity-70">لم يتم العثور على موظف مطابق للبحث</div>
                        ) : (
                            filteredStaff.map(s => (
                                <div 
                                    key={s._id} 
                                    onClick={() => setSelectedStaffId(s._id)}
                                    className={`p-4 cursor-pointer flex items-center justify-between transition-colors ${selectedStaffId === s._id ? 'bg-[var(--color-primary-g)]' : 'hover:bg-[var(--color-bg)]'}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-[var(--color-bg)] flex items-center justify-center text-[var(--color-mt)] font-bold text-lg border border-[var(--color-brd)]">
                                            {s.firstName?.[0] || ''}{s.lastName?.[0] || ''}
                                        </div>
                                        <div>
                                            <div className="font-bold text-base">{s.firstName} {s.lastName}</div>
                                            <div className="text-xs text-[var(--color-mt)] flex gap-3 mt-1">
                                                <span className="font-mono text-[var(--color-primary)] font-bold">{s.ppr}</span>
                                                <span>• {s.framework || 'بدون إطار'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedStaffId === s._id ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white' : 'border-[var(--color-brd)] text-transparent'}`}>
                                        <i className="fas fa-check text-xs"></i>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="flex gap-3">
                        <button 
                            className="btn btn-p flex-1 justify-center py-3.5 text-base shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!selectedStaffId}
                            onClick={() => {
                                const s = staffList.find(st => st._id === selectedStaffId);
                                if(!s) return;
                                const typeMap: any = {
                                    'staff-work-cert': 'work',
                                    'staff-resumption': 'resumption',
                                    'staff-absence': 'absence',
                                    'staff-leave': 'leave',
                                    'staff-transmission': 'transmission'
                                };
                                const type = typeMap[highlightDoc];
                                const extras = type === 'transmission' ? transInputs : undefined;
                                printDoc(type, s, extras);
                            }}
                        >
                            <i className="fas fa-print"></i> استخراج وطباعة {getDocTitle()}
                        </button>
                        
                        {highlightDoc === 'staff-transmission' && (
                            <button 
                                className="btn btn-o justify-center py-3.5 text-base shadow-md"
                                onClick={() => {
                                    printDoc('transmission', null, transInputs);
                                }}
                            >
                                <i className="fas fa-file-alt"></i> ورقة إرسال فارغة
                            </button>
                        )}

                        {highlightDoc === 'staff-absence' && (
                            <button 
                                className="btn btn-o justify-center py-3.5 text-base shadow-md"
                                onClick={() => {
                                    printDoc('absence', null);
                                }}
                            >
                                <i className="fas fa-file-alt"></i> طلب غياب فارغ
                            </button>
                        )}

                        {highlightDoc === 'staff-leave' && (
                            <button 
                                className="btn btn-o justify-center py-3.5 text-base shadow-md"
                                onClick={() => {
                                    printDoc('leave', null);
                                }}
                            >
                                <i className="fas fa-file-alt"></i> نموذج رخصة فارغ
                            </button>
                        )}

                        {highlightDoc === 'staff-resumption' && (
                            <button 
                                className="btn btn-o justify-center py-3.5 text-base shadow-md"
                                onClick={() => {
                                    printDoc('resumption', null);
                                }}
                            >
                                <i className="fas fa-file-alt"></i> محضر استئناف فارغ
                            </button>
                        )}

                        {highlightDoc === 'staff-work-cert' && (
                            <button 
                                className="btn btn-o justify-center py-3.5 text-base shadow-md"
                                onClick={() => {
                                    printDoc('work', null);
                                }}
                            >
                                <i className="fas fa-file-alt"></i> شهادة عمل فارغة
                            </button>
                        )}
                    </div>
                </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                  <h2 className="text-2xl font-bold flex items-center gap-3">
                      <i className="fas fa-users-cog text-[var(--color-primary)]"></i>
                      إدارة شؤون الموظفين
                  </h2>
                  <div className="flex items-center gap-3">
                      <input 
                        type="text" 
                        placeholder="بحث بالاسم أو PPR..." 
                        className="inp w-64"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                      />
                      <button onClick={() => fileInputRef.current?.click()} className="btn btn-o btn-s">
                        <i className="fas fa-file-import"></i> استيراد من إكسيل
                        <input type="file" accept=".xlsx,.xls,.csv" hidden ref={fileInputRef} onChange={handleFileUpload}/>
                      </button>
                  </div>
              </div>

              <div className="card-grad p-1 border border-[var(--color-brd)] rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                  <table className="dt">
                      <thead>
                          <tr>
                              <th>PPR</th>
                              <th>الاسم والنسب</th>
                              <th>الإطار</th>
                              <th>المهام</th>
                              <th className="text-center">الإجراءات</th>
                          </tr>
                      </thead>
                      <tbody>
                          {loading ? (
                              <tr><td colSpan={5} className="text-center py-10 opacity-50">جاري تحميل البيانات...</td></tr>
                          ) : filteredStaff.length === 0 ? (
                              <tr><td colSpan={5} className="text-center py-10 opacity-50">لا يوجد موظفون مضافون</td></tr>
                          ) : (
                              filteredStaff.map(s => (
                                  <tr key={s._id} className={selectedStaffId === s._id ? 'sel' : ''} onClick={() => setSelectedStaffId(s._id)}>
                                      <td className="font-mono font-bold text-[var(--color-primary)]">{s.ppr}</td>
                                      <td>{s.firstName} {s.lastName}</td>
                                      <td className="text-xs">{s.framework}</td>
                                      <td className="text-xs truncate max-w-[150px]">{s.adminTasks}</td>
                                      <td>
                                          <div className="flex items-center justify-center gap-2">
                                              <>
                                                <button onClick={(e) => { e.stopPropagation(); setEditingStaff(s); }} className="p-2 rounded-lg bg-[var(--color-bg)] text-[var(--color-mt)] hover:text-blue-500 hover:scale-110 transition-transform"><i className="fas fa-edit"></i></button>
                                                <button onClick={(e) => { e.stopPropagation(); printDoc('work', s); }} className="p-2 rounded-lg bg-[var(--color-primary-g)] text-[var(--color-primary)] hover:scale-110 transition-transform" title="شهادة العمل"><i className="fas fa-certificate"></i></button>
                                                <button onClick={(e) => { e.stopPropagation(); printDoc('resumption', s); }} className="p-2 rounded-lg bg-[var(--color-secondary-g)] text-[var(--color-secondary)] hover:scale-110 transition-transform" title="محضر استئناف"><i className="fas fa-file-signature"></i></button>
                                                <button onClick={(e) => { e.stopPropagation(); printDoc('absence', s); }} className="p-2 rounded-lg bg-orange-500/10 text-orange-500 hover:scale-110 transition-transform" title="طلب إذن بالغياب"><i className="fas fa-calendar-times"></i></button>
                                                <button onClick={(e) => { e.stopPropagation(); printDoc('leave', s); }} className="p-2 rounded-lg bg-green-500/10 text-green-500 hover:scale-110 transition-transform" title="رخصة (مرضية/إدارية)"><i className="fas fa-leaf"></i></button>
                                                <button onClick={(e) => { e.stopPropagation(); printDoc('transmission', s); }} className="p-2 rounded-lg bg-purple-500/10 text-purple-500 hover:scale-110 transition-transform" title="ورقة إرسال"><i className="fas fa-paper-plane"></i></button>
                                              </>
                                          </div>
                                      </td>
                                  </tr>
                              ))
                          )}
                      </tbody>
                  </table>
              </div>
              </div>
            </>
          )}
        </>
      ) : (
        <section className="animate-[fi_0.6s_ease-out]">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold bg-[var(--color-primary-g)] text-[var(--color-primary)]">2</div>
                <h2 className="text-xl font-bold">ربط الأعمدة بالموظفين</h2>
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
                        {staffFields.map(f => (
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
                <button className="btn btn-o" onClick={() => setStep(1)}><i className="fas fa-arrow-right"></i> إلغاء</button>
                <button className="btn btn-p" onClick={processStaffData}><i className="fas fa-check"></i> استيراد الآن</button>
            </div>
        </section>
      )}
      
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="card-grad p-4 rounded-xl border border-[var(--color-brd)] text-center">
             <div className="text-2xl font-bold mb-1">{staffList.length}</div>
             <div className="text-[10px] text-[var(--color-mt)] uppercase font-bold">إجمالي الموظفين</div>
          </div>
          <div className="card-grad p-4 rounded-xl border border-[var(--color-brd)] text-center">
             <div className="text-2xl font-bold mb-1">{staffList.filter(s=>s.framework.includes('أستاذ')).length}</div>
             <div className="text-[10px] text-[var(--color-mt)] uppercase font-bold">عدد الأساتذة</div>
          </div>
      </div>

      {editingStaff && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-card)] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-[fi_0.2s_ease-out]">
            <div className="p-6 border-b border-[var(--color-brd)] flex justify-between items-center sticky top-0 bg-[var(--color-card)] z-10">
               <h3 className="text-xl font-bold">تعديل بيانات الموظف</h3>
               <button onClick={() => setEditingStaff(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-bg)] text-[var(--color-mt)] hover:text-red-500">
                  <i className="fas fa-times"></i>
               </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleUpdateStaff} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-mt)] mb-1">الاسم (بالعربية) *</label>
                  <input required type="text" className="inp w-full" value={editingStaff.firstName || ''} onChange={e => setEditingStaff({...editingStaff, firstName: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-mt)] mb-1">النسب (بالعربية) *</label>
                  <input required type="text" className="inp w-full" value={editingStaff.lastName || ''} onChange={e => setEditingStaff({...editingStaff, lastName: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-mt)] mb-1">الاسم (بالفرنسية)</label>
                  <input type="text" className="inp w-full" dir="ltr" value={editingStaff.firstNameFr || ''} onChange={e => setEditingStaff({...editingStaff, firstNameFr: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-mt)] mb-1">النسب (بالفرنسية)</label>
                  <input type="text" className="inp w-full" dir="ltr" value={editingStaff.lastNameFr || ''} onChange={e => setEditingStaff({...editingStaff, lastNameFr: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-mt)] mb-1">رقم التأجير (PPR) *</label>
                  <input required type="text" className="inp w-full" value={editingStaff.ppr || ''} onChange={e => setEditingStaff({...editingStaff, ppr: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-mt)] mb-1">رقم البطاقة الوطنية (CIN)</label>
                  <input type="text" className="inp w-full" value={editingStaff.cin || ''} onChange={e => setEditingStaff({...editingStaff, cin: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-mt)] mb-1">الإطار</label>
                  <input type="text" className="inp w-full" value={editingStaff.framework || ''} onChange={e => setEditingStaff({...editingStaff, framework: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-mt)] mb-1">الدرجة</label>
                  <input type="text" className="inp w-full" value={editingStaff.grade || ''} onChange={e => setEditingStaff({...editingStaff, grade: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-mt)] mb-1">الرتبة</label>
                  <input type="text" className="inp w-full" value={editingStaff.rank || ''} onChange={e => setEditingStaff({...editingStaff, rank: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-mt)] mb-1">الهاتف</label>
                  <input type="text" className="inp w-full" value={editingStaff.phone || ''} onChange={e => setEditingStaff({...editingStaff, phone: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-mt)] mb-1">تاريخ التوظيف</label>
                  <input type="date" className="inp w-full" value={editingStaff.hiringDate || ''} onChange={e => setEditingStaff({...editingStaff, hiringDate: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-mt)] mb-1">تاريخ الالتحاق بالمؤسسة</label>
                  <input type="date" className="inp w-full" value={editingStaff.joinDate || ''} onChange={e => setEditingStaff({...editingStaff, joinDate: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-mt)] mb-1">تاريخ الازدياد</label>
                  <input type="date" className="inp w-full" value={editingStaff.birthDate || ''} onChange={e => setEditingStaff({...editingStaff, birthDate: e.target.value})} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-[var(--color-mt)] mb-1">المهام الإدارية</label>
                  <input type="text" className="inp w-full" value={editingStaff.adminTasks || ''} onChange={e => setEditingStaff({...editingStaff, adminTasks: e.target.value})} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-[var(--color-mt)] mb-1">العنوان</label>
                  <input type="text" className="inp w-full" value={editingStaff.address || ''} onChange={e => setEditingStaff({...editingStaff, address: e.target.value})} />
                </div>
                
                <div className="md:col-span-2 pt-4 border-t border-[var(--color-brd)] flex justify-between gap-3 mt-2">
                  <button type="button" className="btn btn-o text-red-500 border-red-500/30 hover:bg-red-500/10" onClick={() => {setDeletingStaff(editingStaff); setEditingStaff(null);}}>
                    <i className="fas fa-trash"></i> حذف الموظف
                  </button>
                  <div className="flex gap-2">
                    <button type="button" className="btn btn-o" onClick={() => setEditingStaff(null)}>إلغاء</button>
                    <button type="submit" className="btn btn-p"><i className="fas fa-save"></i> حفظ التغييرات</button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {deletingStaff && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-[var(--color-card)] rounded-2xl w-full max-w-sm p-6 shadow-2xl text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-red-500 text-2xl mx-auto mb-4">
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            <h3 className="text-xl font-bold mb-2">تأكيد الحذف</h3>
            <p className="text-[var(--color-mt)] text-sm mb-6">
              هل أنت متأكد من حذف الموظف <b>{deletingStaff.firstName} {deletingStaff.lastName}</b>؟ لا يمكن التراجع عن هذا الإجراء.
            </p>
            <div className="flex justify-center gap-3">
              <button className="btn btn-o w-1/2 justify-center" onClick={() => setDeletingStaff(null)}>إلغاء</button>
              <button className="btn btn-p w-1/2 justify-center !bg-red-500 !border-red-500 !text-white" onClick={handleDeleteStaff}>نعم، احذف</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
