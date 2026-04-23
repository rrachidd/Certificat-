import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { Staff } from '../lib/types';

export default function AddStaffView({ user, onSuccess }: { user: User, onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    ppr: '',
    firstName: '',
    lastName: '',
    firstNameFr: '',
    lastNameFr: '',
    cin: '',
    framework: '',
    grade: '',
    rank: '',
    adminTasks: '',
    address: '',
    phone: '',
    hiringDate: '',
    joinDate: '',
    birthDate: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.ppr) {
      alert("الاسم والنسب ورقم التأجير إجباريون");
      return;
    }
    
    setLoading(true);
    try {
      const _id = Date.now();
      const newStaff: Staff = {
        _id,
        ppr: formData.ppr,
        firstName: formData.firstName,
        lastName: formData.lastName,
        firstNameFr: formData.firstNameFr,
        lastNameFr: formData.lastNameFr,
        cin: formData.cin,
        framework: formData.framework,
        grade: formData.grade,
        rank: formData.rank,
        adminTasks: formData.adminTasks,
        address: formData.address,
        phone: formData.phone,
        hiringDate: formData.hiringDate,
        joinDate: formData.joinDate,
        birthDate: formData.birthDate
      };

      await setDoc(doc(db, 'users', user.uid, 'staff', _id.toString()), newStaff);
      
      alert("تمت إضافة الموظف بنجاح");
      onSuccess();
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
          إضافة موظف جديد
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="card-grad p-6 rounded-2xl border border-[var(--color-brd)] shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--color-mt)] mb-1">الاسم (بالعربية) *</label>
            <input required type="text" className="inp w-full" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--color-mt)] mb-1">النسب (بالعربية) *</label>
            <input required type="text" className="inp w-full" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--color-mt)] mb-1">الاسم (بالفرنسية)</label>
            <input type="text" className="inp w-full" dir="ltr" value={formData.firstNameFr} onChange={e => setFormData({...formData, firstNameFr: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--color-mt)] mb-1">النسب (بالفرنسية)</label>
            <input type="text" className="inp w-full" dir="ltr" value={formData.lastNameFr} onChange={e => setFormData({...formData, lastNameFr: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--color-mt)] mb-1">رقم التأجير (PPR) *</label>
            <input required type="text" className="inp w-full" value={formData.ppr} onChange={e => setFormData({...formData, ppr: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--color-mt)] mb-1">رقم البطاقة الوطنية (CIN)</label>
            <input type="text" className="inp w-full" value={formData.cin} onChange={e => setFormData({...formData, cin: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--color-mt)] mb-1">الإطار</label>
            <input type="text" className="inp w-full" placeholder="مثال: أستاذ التعليم الثانوي" value={formData.framework} onChange={e => setFormData({...formData, framework: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--color-mt)] mb-1">الدرجة</label>
            <input type="text" className="inp w-full" value={formData.grade} onChange={e => setFormData({...formData, grade: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--color-mt)] mb-1">الرتبة</label>
            <input type="text" className="inp w-full" value={formData.rank} onChange={e => setFormData({...formData, rank: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--color-mt)] mb-1">الهاتف</label>
            <input type="text" className="inp w-full" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--color-mt)] mb-1">تاريخ التوظيف</label>
            <input type="date" className="inp w-full" value={formData.hiringDate} onChange={e => setFormData({...formData, hiringDate: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--color-mt)] mb-1">تاريخ الالتحاق بالمؤسسة</label>
            <input type="date" className="inp w-full" value={formData.joinDate} onChange={e => setFormData({...formData, joinDate: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--color-mt)] mb-1">تاريخ الازدياد</label>
            <input type="date" className="inp w-full" value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-[var(--color-mt)] mb-1">المهام الإدارية</label>
            <input type="text" className="inp w-full" value={formData.adminTasks} onChange={e => setFormData({...formData, adminTasks: e.target.value})} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-[var(--color-mt)] mb-1">العنوان</label>
            <input type="text" className="inp w-full" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
          </div>
        </div>

        <div className="pt-4 border-t border-[var(--color-brd)] flex justify-end gap-3">
          <button type="button" className="btn btn-o" onClick={onSuccess}>إلغاء</button>
          <button type="submit" className="btn btn-p" disabled={loading}>
             {loading ? 'جاري الحفظ...' : <span><i className="fas fa-check"></i> حفظ بيانات الموظف</span>}
          </button>
        </div>
      </form>
    </div>
  );
}
