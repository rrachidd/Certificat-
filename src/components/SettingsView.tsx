import React, { useState } from 'react';

interface SettingsProps {
  settings: {
    name: string;
    academy: string;
    province: string;
    refNumber: string;
    phone?: string;
    address?: string;
    managerName?: string;
    city?: string;
  };
  onSave: (s: any) => Promise<void>;
}

export default function SettingsView({ settings, onSave }: SettingsProps) {
  const [formData, setFormData] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      await onSave(formData);
      setMsg('تم حفظ الإعدادات بنجاح!');
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setMsg('حدث خطأ أثناء الحفظ.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
        <i className="fas fa-building text-[var(--color-primary)]"></i>
        إعدادات المؤسسة
      </h2>
      
      <div className="bg-[var(--color-card)] border border-[var(--color-brd)] rounded-2xl p-6">
        <p className="text-sm text-[var(--color-mt)] mb-6">
          ستظهر هذه الإعدادات تلقائياً في ترويسة وتذييل جميع الشواهد المدرسية المستخرجة من النظام.
        </p>

        {msg && (
          <div className={`p-4 rounded-xl mb-6 text-sm font-semibold flex items-center gap-2 ${msg.includes('بنجاح') ? 'bg-[var(--color-suc)]/10 text-[var(--color-suc)] border border-[var(--color-suc)]/20' : 'bg-[var(--color-dng)]/10 text-[var(--color-dng)] border border-[var(--color-dng)]/20'}`}>
            <i className={`fas ${msg.includes('بنجاح') ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
            {msg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <label className="block text-sm mb-2 text-[var(--color-mt)] font-semibold">اسم المؤسسة</label>
            <input 
              type="text" 
              name="name" 
              value={formData.name || ''} 
              onChange={handleChange} 
              className="inp" 
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-2 text-[var(--color-mt)] font-semibold">الأكاديمية الجهوية</label>
            <input 
              type="text" 
              name="academy" 
              value={formData.academy || ''} 
              onChange={handleChange} 
              className="inp" 
            />
          </div>
          <div>
            <label className="block text-sm mb-2 text-[var(--color-mt)] font-semibold">النيابة الإقليمية / المديرية</label>
            <input 
              type="text" 
              name="province" 
              value={formData.province || ''} 
              onChange={handleChange} 
              className="inp" 
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm mb-2 text-[var(--color-mt)] font-semibold">العنوان</label>
            <input 
              type="text" 
              name="address" 
              value={formData.address || ''} 
              onChange={handleChange} 
              className="inp" 
            />
          </div>
          <div>
            <label className="block text-sm mb-2 text-[var(--color-mt)] font-semibold">رقم الهاتف</label>
            <input 
              type="text" 
              name="phone" 
              value={formData.phone || ''} 
              onChange={handleChange} 
              className="inp" 
            />
          </div>
          <div>
            <label className="block text-sm mb-2 text-[var(--color-mt)] font-semibold">المدينة</label>
            <input 
              type="text" 
              name="city" 
              value={formData.city || ''} 
              onChange={handleChange} 
              className="inp" 
            />
          </div>
          <div>
            <label className="block text-sm mb-2 text-[var(--color-mt)] font-semibold">اسم المدير(ة)</label>
            <input 
              type="text" 
              name="managerName" 
              value={formData.managerName || ''} 
              onChange={handleChange} 
              className="inp" 
            />
          </div>
          <div>
            <label className="block text-sm mb-2 text-[var(--color-mt)] font-semibold">رقم التأطير القانوني</label>
            <input 
              type="text" 
              name="refNumber" 
              value={formData.refNumber || ''} 
              onChange={handleChange} 
              className="inp" 
            />
          </div>
          <div className="md:col-span-2 pt-4 flex justify-end">
            <button type="submit" disabled={saving} className="btn btn-g">
              {saving ? <><i className="fas fa-spinner fa-spin"></i> جاري الحفظ...</> : <><i className="fas fa-save"></i> حفظ التغييرات</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
