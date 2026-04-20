import React from 'react';
import { User } from 'firebase/auth';

interface SidebarProps {
  currentView: 'certificates' | 'settings' | 'archive';
  setCurrentView: (v: 'certificates' | 'settings' | 'archive') => void;
  user: User;
  onLogout: () => void;
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
}

export default function Sidebar({ currentView, setCurrentView, user, onLogout, isOpen, setIsOpen }: SidebarProps) {
  return (
    <aside className={`fixed lg:relative inset-y-0 right-0 z-50 w-64 bg-[var(--color-bg2)]/90 backdrop-blur-xl border-l border-[var(--color-brd)] min-h-screen p-5 flex flex-col transform transition-transform duration-300 lg:translate-x-0 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="flex items-center justify-between lg:justify-start gap-3 mb-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] shadow-lg shadow-[var(--color-primary-g)]">
            <i className="fas fa-school text-white"></i>
          </div>
          <div>
            <h1 className="text-sm font-bold leading-tight">بوابة المؤسسة</h1>
            <p className="text-[10px] text-[var(--color-mt)]">إعدادية - شواهد مدرسية</p>
          </div>
        </div>
        <button className="lg:hidden text-[var(--color-mt)]" onClick={() => setIsOpen(false)}>
           <i className="fas fa-times text-xl"></i>
        </button>
      </div>

      <nav className="flex-1 space-y-2">
        <button 
          onClick={() => { setCurrentView('certificates'); setIsOpen(false); }}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${currentView === 'certificates' ? 'bg-[var(--color-primary-g)] text-[var(--color-primary)] border border-[var(--color-primary)]/20' : 'text-[var(--color-mt)] hover:bg-[var(--color-bg)] hover:text-[var(--color-fg)]'}`}
        >
          <i className="fas fa-certificate w-5 text-center"></i>
          الشواهد المدرسية
        </button>
        <button 
          onClick={() => { setCurrentView('archive'); setIsOpen(false); }}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${currentView === 'archive' ? 'bg-[var(--color-primary-g)] text-[var(--color-primary)] border border-[var(--color-primary)]/20' : 'text-[var(--color-mt)] hover:bg-[var(--color-bg)] hover:text-[var(--color-fg)]'}`}
        >
          <i className="fas fa-archive w-5 text-center"></i>
          أرشيف الشواهد
        </button>
        <button 
          onClick={() => { setCurrentView('settings'); setIsOpen(false); }}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${currentView === 'settings' ? 'bg-[var(--color-primary-g)] text-[var(--color-primary)] border border-[var(--color-primary)]/20' : 'text-[var(--color-mt)] hover:bg-[var(--color-bg)] hover:text-[var(--color-fg)]'}`}
        >
          <i className="fas fa-cog w-5 text-center"></i>
          إعدادات المؤسسة
        </button>
      </nav>

      <div className="mt-8 pt-5 border-t border-[var(--color-brd)]">
        <div className="flex flex-col mb-4 bg-[var(--color-card)] p-3 rounded-xl border border-[var(--color-brd)] shadow-inner">
          <div className="text-xs text-[var(--color-mt)] mb-1">المستخدم المتصل</div>
          <div className="text-sm font-semibold truncate text-[var(--color-fg)]" title={user.email || ''}>{user.displayName || user.email}</div>
        </div>
        <button onClick={onLogout} className="btn w-full btn-o text-xs justify-center border-[var(--color-brd)]">
          <i className="fas fa-sign-out-alt"></i> تسجيل الخروج
        </button>
      </div>
    </aside>
  );
}
