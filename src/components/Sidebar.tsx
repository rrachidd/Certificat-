import React from 'react';
import { User } from 'firebase/auth';

interface SidebarProps {
  currentView: 'certificates' | 'settings' | 'archive' | 'add-student' | 'stats' | 'staff-docs' | 'add-staff' | 'staff-work-cert' | 'staff-resumption' | 'staff-absence' | 'staff-leave' | 'staff-transmission' | 'staff-medical-receipt';
  setCurrentView: (v: 'certificates' | 'settings' | 'archive' | 'add-student' | 'stats' | 'staff-docs' | 'add-staff' | 'staff-work-cert' | 'staff-resumption' | 'staff-absence' | 'staff-leave' | 'staff-transmission' | 'staff-medical-receipt') => void;
  user: User;
  onLogout: () => void;
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
}

export default function Sidebar({ currentView, setCurrentView, user, onLogout, isOpen, setIsOpen }: SidebarProps) {
  return (
    <aside className={`fixed lg:relative inset-y-0 right-0 z-50 w-64 sidebar-grad backdrop-blur-xl border-l border-[var(--color-brd)] min-h-screen p-5 flex flex-col transform transition-transform duration-300 lg:translate-x-0 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="flex items-center justify-between lg:justify-start gap-3 mb-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] shadow-lg shadow-[var(--color-primary-g)]">
            <i className="fas fa-school text-white"></i>
          </div>
          <div>
            <h1 className="text-sm font-bold leading-tight">بوابة المؤسسة</h1>
            <p className="text-[10px] text-[var(--color-mt)]">نظام الإدارة المتكامل</p>
          </div>
        </div>
        <button className="lg:hidden text-[var(--color-mt)]" onClick={() => setIsOpen(false)}>
           <i className="fas fa-times text-xl"></i>
        </button>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto pr-1">
        {/* Student Section */}
        <div>
          <div className="px-4 mb-2 text-[10px] uppercase tracking-wider font-bold text-[var(--color-mt)] opacity-50">شؤون التلاميذ</div>
          <div className="space-y-1">
            <button 
              onClick={() => { setCurrentView('certificates'); setIsOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${currentView === 'certificates' ? 'bg-[var(--color-primary-g)] text-[var(--color-primary)] border border-[var(--color-primary)]/20' : 'text-[var(--color-mt)] hover:bg-[var(--color-bg)] hover:text-[var(--color-fg)]'}`}
            >
              <i className="fas fa-certificate w-4 text-center"></i>
              الشواهد المدرسية
            </button>
            <button 
              onClick={() => { setCurrentView('add-student'); setIsOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${currentView === 'add-student' ? 'bg-[var(--color-primary-g)] text-[var(--color-primary)] border border-[var(--color-primary)]/20' : 'text-[var(--color-mt)] hover:bg-[var(--color-bg)] hover:text-[var(--color-fg)]'}`}
            >
              <i className="fas fa-plus-circle w-4 text-center"></i>
              إضافة تلميذ
            </button>
          </div>
        </div>

        {/* System Section */}
        <div>
          <div className="px-4 mb-2 text-[10px] uppercase tracking-wider font-bold text-[var(--color-mt)] opacity-50">النظام</div>
          <div className="space-y-1">
            <button 
              onClick={() => { setCurrentView('archive'); setIsOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${currentView === 'archive' ? 'bg-[var(--color-primary-g)] text-[var(--color-primary)] border border-[var(--color-primary)]/20' : 'text-[var(--color-mt)] hover:bg-[var(--color-bg)] hover:text-[var(--color-fg)]'}`}
            >
              <i className="fas fa-archive w-4 text-center"></i>
              أرشيف الشواهد
            </button>
            <button 
              onClick={() => { setCurrentView('stats'); setIsOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${currentView === 'stats' ? 'bg-[var(--color-primary-g)] text-[var(--color-primary)] border border-[var(--color-primary)]/20' : 'text-[var(--color-mt)] hover:bg-[var(--color-bg)] hover:text-[var(--color-fg)]'}`}
            >
              <i className="fas fa-chart-pie w-4 text-center"></i>
              إحصائيات
            </button>
            <button 
              onClick={() => { setCurrentView('settings'); setIsOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${currentView === 'settings' ? 'bg-[var(--color-primary-g)] text-[var(--color-primary)] border border-[var(--color-primary)]/20' : 'text-[var(--color-mt)] hover:bg-[var(--color-bg)] hover:text-[var(--color-fg)]'}`}
            >
              <i className="fas fa-cog w-4 text-center"></i>
              الإعدادات
            </button>
          </div>
        </div>

        {/* Staff Section */}
        <div>
          <div className="px-4 mb-2 text-[10px] uppercase tracking-wider font-bold text-[var(--color-mt)] opacity-50">شؤون الموظفين</div>
          <div className="space-y-1">
            <button 
              onClick={() => { setCurrentView('staff-docs'); setIsOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${currentView === 'staff-docs' ? 'bg-[var(--color-primary-g)] text-[var(--color-primary)] border border-[var(--color-primary)]/20' : 'text-[var(--color-mt)] hover:bg-[var(--color-bg)] hover:text-[var(--color-fg)]'}`}
            >
              <i className="fas fa-user-tie w-4 text-center"></i>
              وثائق الموظفين
            </button>
            <button 
              onClick={() => { setCurrentView('add-staff'); setIsOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${currentView === 'add-staff' ? 'bg-[var(--color-primary-g)] text-[var(--color-primary)] border border-[var(--color-primary)]/20' : 'text-[var(--color-mt)] hover:bg-[var(--color-bg)] hover:text-[var(--color-fg)]'}`}
            >
              <i className="fas fa-user-plus w-4 text-center"></i>
              إضافة موظف
            </button>
            <div className="pt-2 pb-1 px-4 text-[10px] text-[var(--color-mt)] opacity-40 font-bold border-t border-white/5 mt-2">نماذج الوثائق</div>
            <button 
              onClick={() => { setCurrentView('staff-work-cert'); setIsOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-[11px] font-medium transition-all ${currentView === 'staff-work-cert' ? 'text-[var(--color-primary)]' : 'text-[var(--color-mt)] hover:text-[var(--color-fg)]'}`}
            >
              <i className="fas fa-certificate w-4 text-center opacity-70"></i>
              شهادة العمل
            </button>
            <button 
              onClick={() => { setCurrentView('staff-resumption'); setIsOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-[11px] font-medium transition-all ${currentView === 'staff-resumption' ? 'text-[var(--color-primary)]' : 'text-[var(--color-mt)] hover:text-[var(--color-fg)]'}`}
            >
              <i className="fas fa-file-signature w-4 text-center opacity-70"></i>
              محضر الاستئناف
            </button>
            <button 
              onClick={() => { setCurrentView('staff-absence'); setIsOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-[11px] font-medium transition-all ${currentView === 'staff-absence' ? 'text-[var(--color-primary)]' : 'text-[var(--color-mt)] hover:text-[var(--color-fg)]'}`}
            >
              <i className="fas fa-calendar-times w-4 text-center opacity-70"></i>
              طلب الإذن بالغياب
            </button>
            <button 
              onClick={() => { setCurrentView('staff-leave'); setIsOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-[11px] font-medium transition-all ${currentView === 'staff-leave' ? 'text-[var(--color-primary)]' : 'text-[var(--color-mt)] hover:text-[var(--color-fg)]'}`}
            >
              <i className="fas fa-leaf w-4 text-center opacity-70"></i>
              الرخص
            </button>
            <button 
              onClick={() => { setCurrentView('staff-transmission'); setIsOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-[11px] font-medium transition-all ${currentView === 'staff-transmission' ? 'text-[var(--color-primary)]' : 'text-[var(--color-mt)] hover:text-[var(--color-fg)]'}`}
            >
              <i className="fas fa-paper-plane w-4 text-center opacity-70"></i>
              ورقة الإرسال
            </button>
            <button 
              onClick={() => { setCurrentView('staff-medical-receipt'); setIsOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-[11px] font-medium transition-all ${currentView === 'staff-medical-receipt' ? 'text-[var(--color-primary)]' : 'text-[var(--color-mt)] hover:text-[var(--color-fg)]'}`}
            >
              <i className="fas fa-file-medical w-4 text-center opacity-70"></i>
              وصل استلام شهادة طبية
            </button>
          </div>
        </div>
      </nav>

      <div className="mt-8 pt-5 border-t border-[var(--color-brd)]">
        <div className="flex flex-col items-center mb-6 bg-white/5 p-4 rounded-2xl border border-white/10 shadow-xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="w-14 h-14 rounded-full border-2 border-[var(--color-primary)] p-1 mb-3 relative z-10 transition-transform group-hover:scale-105">
             <div className="w-full h-full rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center text-white shadow-lg overflow-hidden">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                ) : (
                  <i className="fas fa-user-circle text-3xl"></i>
                )}
             </div>
          </div>
          <div className="text-center relative z-10">
            <div className="text-sm font-bold text-[var(--color-fg)] mb-0.5">{user.displayName || 'مدير النظام'}</div>
            <div className="text-[10px] text-[var(--color-mt)] font-medium mb-3 opacity-70 truncate max-w-[150px]">{user.email}</div>
            <button onClick={onLogout} className="text-[10px] text-red-400 hover:text-red-300 font-bold flex items-center justify-center gap-1.5 transition-colors">
              <i className="fas fa-power-off"></i> تسجيل الخروج
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
