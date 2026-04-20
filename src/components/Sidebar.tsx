import React from 'react';
import { User } from 'firebase/auth';

interface SidebarProps {
  currentView: 'certificates' | 'settings';
  setCurrentView: (v: 'certificates' | 'settings') => void;
  user: User;
  onLogout: () => void;
}

export default function Sidebar({ currentView, setCurrentView, user, onLogout }: SidebarProps) {
  return (
    <aside className="w-64 bg-[#151d28]/90 backdrop-blur-xl border-l border-[#263348] min-h-screen p-5 flex flex-col relative z-20">
      <div className="flex items-center gap-3 mb-10">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, var(--color-red), var(--color-grn))' }}>
          <i className="fas fa-archive text-white"></i>
        </div>
        <div>
          <h1 className="text-sm font-bold leading-tight">أرشيف المؤسسة</h1>
          <p className="text-[10px] text-[#7b8fa5]">إعدادية - شواهد مدرسية</p>
        </div>
      </div>

      <nav className="flex-1 space-y-2">
        <button 
          onClick={() => setCurrentView('certificates')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${currentView === 'certificates' ? 'bg-[#c1272d]/10 text-[#c1272d] border border-[#c1272d]/20' : 'text-[#7b8fa5] hover:bg-[#1a2535] hover:text-[#e8edf2]'}`}
        >
          <i className="fas fa-certificate w-5 text-center"></i>
          الشواهد المدرسية
        </button>
        <button 
          onClick={() => setCurrentView('settings')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${currentView === 'settings' ? 'bg-[#c1272d]/10 text-[#c1272d] border border-[#c1272d]/20' : 'text-[#7b8fa5] hover:bg-[#1a2535] hover:text-[#e8edf2]'}`}
        >
          <i className="fas fa-cog w-5 text-center"></i>
          إعدادات المؤسسة
        </button>
      </nav>

      <div className="mt-8 pt-5 border-t border-[#263348]">
        <div className="flex flex-col mb-4 bg-[#1a2535] p-3 rounded-xl border border-[#263348]">
          <div className="text-xs text-[#7b8fa5] mb-1">المستخدم المتصل</div>
          <div className="text-sm font-semibold truncate" title={user.email || ''}>{user.displayName || user.email}</div>
        </div>
        <button onClick={onLogout} className="btn w-full btn-o text-xs justify-center border-[#263348]">
          <i className="fas fa-sign-out-alt"></i> تسجيل الخروج
        </button>
      </div>
    </aside>
  );
}
