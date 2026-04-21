import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { Student } from '../lib/types';

const mLv = ['السنة الأولى إعدادي', 'السنة الثانية إعدادي', 'السنة الثالثة إعدادي'];
const reasons = ['نقل', 'تغيير المؤسسة', 'انتقال مع الأسرة', 'التحاق بمؤسسة خاصة', 'سفر للخارج', 'إعادة التوجيه', 'ظروف عائلية', 'تغيير المدينة'];

function normLv(lv: string) {
  if (!lv) return '—';
  const t = lv.trim();
  if (mLv.includes(t)) return t;
  if (t === '1إع' || t === '1إ') return 'السنة الأولى إعدادي';
  if (t === '2إع' || t === '2إ') return 'السنة الثانية إعدادي';
  if (t === '3إع' || t === '3إ') return 'السنة الثالثة إعدادي';
  for (const f of mLv) if (f.includes(t) || t.includes(f)) return f;
  return t;
}

export default function AddStudentView({ user, onSuccess }: { user: User, onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    regNum: '',
    firstName: '',
    lastName: '',
    birthDate: '',
    birthPlace: '',
    level: mLv[0],
    yearFrom: '',
    yearTo: '',
    reason: reasons[0]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName) {
      alert("الاسم والنسب إجباريان");
      return;
    }
    
    setLoading(true);
    try {
      const _id = Date.now();
      const newStudent: Student = {
        _id,
        regNum: formData.regNum,
        firstName: formData.firstName,
        lastName: formData.lastName,
        birthDate: formData.birthDate,
        birthPlace: formData.birthPlace,
        level: formData.level,
        yearFrom: formData.yearFrom,
        yearTo: formData.yearTo,
        reason: formData.reason,
        _lv: normLv(formData.level)
      };

      await setDoc(doc(db, 'users', user.uid, 'students', _id.toString()), newStudent);
      
      alert("تمت إضافة التلميذ بنجاح");
      onSuccess(); // go back to certificates view
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء الحفظ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto animate-[fi_0.3s_ease-out]">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <i className="fas fa-user-plus text-[var(--color-primary)]"></i>
          إضافة تلميذ جديد
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="card-grad p-6 rounded-2xl border border-[var(--color-brd)] shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--color-mt)] mb-1">الاسم *</label>
            <input required type="text" className="inp w-full" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--color-mt)] mb-1">النسب *</label>
            <input required type="text" className="inp w-full" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--color-mt)] mb-1">رقم التسجيل</label>
            <input type="text" className="inp w-full" value={formData.regNum} onChange={e => setFormData({...formData, regNum: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--color-mt)] mb-1">تاريخ الازدياد</label>
            <input type="text" className="inp w-full" placeholder="مثال: 01/01/2010" value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--color-mt)] mb-1">مكان الازدياد</label>
            <input type="text" className="inp w-full" value={formData.birthPlace} onChange={e => setFormData({...formData, birthPlace: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--color-mt)] mb-1">المستوى</label>
            <select className="inp w-full" value={formData.level} onChange={e => setFormData({...formData, level: e.target.value})}>
              {mLv.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--color-mt)] mb-1">الموسم الدراسي</label>
            <input type="text" className="inp w-full" placeholder="مثال: 2023/2024" value={formData.yearFrom} onChange={e => setFormData({...formData, yearFrom: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--color-mt)] mb-1">تاريخ الوضعية</label>
            <input type="text" className="inp w-full" value={formData.yearTo} onChange={e => setFormData({...formData, yearTo: e.target.value})} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-[var(--color-mt)] mb-1">ملاحظات (سبب المغادرة / النقل)</label>
            <select className="inp w-full" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})}>
               <option value="">-- بدون --</option>
               {reasons.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>

        <div className="pt-4 border-t border-[var(--color-brd)] flex justify-end gap-3">
          <button type="button" className="btn btn-o" onClick={onSuccess}>إلغاء</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
             {loading ? 'جاري الحفظ...' : <span><i className="fas fa-check"></i> حفظ بيانات التلميذ</span>}
          </button>
        </div>
      </form>
    </div>
  );
}
