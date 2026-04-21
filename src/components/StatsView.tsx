import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { Student } from '../lib/types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell, LineChart, Line
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1'];

export default function StatsView({ user }: { user: User }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const snap = await getDocs(collection(db, 'users', user.uid, 'students'));
        const data = snap.docs.map(doc => doc.data() as Student);
        setStudents(data);
      } catch (err) {
        console.error("Error fetching stats data:", err);
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
         <div className="font-bold text-lg text-[var(--color-mt)] flex items-center gap-3">
            <i className="fas fa-spinner fa-spin text-[var(--color-primary)]"></i> جاري إعداد الإحصائيات...
         </div>
      </div>
    );
  }

  // Calculate Analytics
  // 1. Group by Level (المستوى)
  const levelCount: Record<string, number> = {};
  // 2. Group by Year (الموسم)
  const yearDataMap: Record<string, any> = {};
  // 3. Group by Age (السن)
  const ageCount: Record<string, number> = {};

  const extractYear = (str?: string) => {
     if (!str) return null;
     const m = str.match(/\b(19|20)\d{2}\b/);
     return m ? parseInt(m[0], 10) : null;
  };

  students.forEach(s => {
     const level = (s._lv || 'غير محدد').trim();
     levelCount[level] = (levelCount[level] || 0) + 1;

     const year = (s.yearFrom || 'غير محدد').trim();
     if (!yearDataMap[year]) {
        yearDataMap[year] = { year, total: 0 };
     }
     yearDataMap[year].total += 1;

     // Calculate departure age
     const bYear = extractYear(s.birthDate);
     const dYear = extractYear(s.yearTo) || extractYear(s.yearFrom);
     if (bYear && dYear && dYear >= bYear) {
        const age = dYear - bYear;
        // Limit reasonable ages for middle school students to prevent anomalies
        if (age >= 8 && age <= 25) {
           const ageStr = `${age} سنة`;
           ageCount[ageStr] = (ageCount[ageStr] || 0) + 1;
        }
     }
  });

  const levelBarData = Object.keys(levelCount)
    .map(k => ({ name: k, count: levelCount[k] }))
    .sort((a,b) => b.count - a.count);

  const yearLineData = Object.values(yearDataMap)
    .sort((a, b) => a.year.localeCompare(b.year));

  const ageBarData = Object.keys(ageCount)
    .map(k => ({ name: k, count: ageCount[k], ageNum: parseInt(k) }))
    .sort((a, b) => a.ageNum - b.ageNum);

  const totalStudents = students.length;
  const topYear = yearLineData.length > 0 ? [...yearLineData].sort((a,b) => b.total - a.total)[0] : null;
  const topLevel = levelBarData.length > 0 ? [...levelBarData].sort((a,b) => b.count - a.count)[0] : null;
  const topAge = ageBarData.length > 0 ? [...ageBarData].sort((a,b) => b.count - a.count)[0] : null;

  return (
    <div className="max-w-6xl mx-auto animate-[fi_0.3s_ease-out]">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <i className="fas fa-chart-pie text-[var(--color-primary)]"></i>
          إحصائيات ومقارنات
        </h2>
      </div>

      {students.length === 0 ? (
        <div className="bg-[var(--color-card)] p-8 text-center rounded-2xl border border-[var(--color-brd)]">
           لا توجد بيانات كافية لعرض الإحصائيات (قاعدة البيانات فارغة).
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          
          {/* Card 1: Yearly Departures */}
          <div className="card-grad p-4 rounded-2xl border border-[var(--color-brd)] shadow-sm">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <i className="fas fa-chart-line text-[var(--color-primary)]"></i> تطور المغادرات حسب السنوات
            </h3>
            <div className="h-80 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={yearLineData} margin={{ top: 20, right: 30, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ccc" opacity={0.2} />
                  <XAxis dataKey="year" tick={{ fill: 'var(--color-mt)', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'var(--color-mt)', fontSize: 12 }} />
                  <Tooltip wrapperStyle={{ direction: 'rtl', fontFamily: 'Inter' }} contentStyle={{ backgroundColor: 'var(--color-bg2)', border: '1px solid var(--color-brd)', borderRadius: '8px', color: '#fff' }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="total" name="إجمالي المغادرات" stroke="#3b82f6" strokeWidth={4} activeDot={{ r: 8, fill: '#3b82f6' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Card 2: Levels Bar */}
          <div className="card-grad p-4 rounded-2xl border border-[var(--color-brd)] shadow-sm">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <i className="fas fa-layer-group text-[#10b981]"></i> مقارنة المغادرات حسب المستوى
            </h3>
            <div className="h-80 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={levelBarData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#ccc" opacity={0.2} horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'var(--color-mt)' }} />
                  <YAxis dataKey="name" type="category" width={140} tick={{ fill: 'var(--color-fg)', fontSize: 13 }} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} wrapperStyle={{ direction: 'rtl', fontFamily: 'Inter' }} contentStyle={{ backgroundColor: 'var(--color-bg2)', border: '1px solid var(--color-brd)', borderRadius: '8px', color: '#fff' }} />
                  <Legend />
                  <Bar dataKey="count" name="عدد التلاميذ المغادرين" fill="#10b981" radius={[0, 4, 4, 0]}>
                    {levelBarData.map((entry, index) => (
                      <Cell key={`cell-lvl-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Card 3: Age Bar */}
          <div className="card-grad p-4 rounded-2xl border border-[var(--color-brd)] shadow-sm">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <i className="fas fa-birthday-cake text-[#f59e0b]"></i> كثافة المغادرات حسب السن
            </h3>
            <div className="h-80 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageBarData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ccc" opacity={0.2} vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: 'var(--color-fg)', fontSize: 13 }} />
                  <YAxis type="number" tick={{ fill: 'var(--color-mt)' }} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} wrapperStyle={{ direction: 'rtl', fontFamily: 'Inter' }} contentStyle={{ backgroundColor: 'var(--color-bg2)', border: '1px solid var(--color-brd)', borderRadius: '8px', color: '#fff' }} />
                  <Legend />
                  <Bar dataKey="count" name="عدد حالات المغادرة" fill="#f59e0b" radius={[4, 4, 0, 0]}>
                    {ageBarData.map((entry, index) => (
                      <Cell key={`cell-age-${index}`} fill='#f59e0b' />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Generated Text Report */}
          <div className="card-grad p-6 rounded-2xl border border-[var(--color-brd)] shadow-sm mt-2">
             <h3 className="font-bold mb-4 flex items-center gap-2 text-lg text-[var(--color-fg)]">
                <i className="fas fa-file-alt text-[#8b5cf6]"></i> تقرير تحليلي وتفسيري للبيانات
             </h3>
             <div className="space-y-4 text-[var(--color-fg)] leading-relaxed font-semibold">
               <p>
                  بناءً على المعطيات المستخرجة من قاعدة البيانات، يبلغ إجمالي حالات المغادرة المسجلة <span className="text-[var(--color-primary)] font-bold">{totalStudents}</span> حالة. 
                  يلاحَظ أن الموسم الدراسي الأكثر تسجيلاً للمغادرات هو موسم <span className="text-red-500 font-bold">{topYear?.year}</span> الذي عرف <span className="font-bold">{topYear?.total}</span> حالة مغادرة. 
                  أما على صعيد المستويات الدراسية، فإن <span className="text-[#10b981] font-bold">{topLevel?.name}</span> هو المستوى الأكثر تفريغاً أو مغادرة بـ <span className="font-bold">{topLevel?.count}</span> حالة.
                  {topAge && (
                     <> علاوة على ذلك، تُظهر البيانات المرتبطة بتاريخ الازدياد وسنة مغادرة المؤسسة أن السن الأكثر تسجيلاً لحالات المغادرة والانتقال هو <span className="text-[#f59e0b] font-bold">{topAge.name}</span> بـ <span className="font-bold">{topAge.count}</span> حالة مسجلة.</>
                  )}
               </p>

               <div className="bg-[var(--color-bg)] p-4 rounded-xl border border-[var(--color-brd)]">
                 <h4 className="font-bold text-[var(--color-primary)] mb-2"><i className="fas fa-search"></i> قراءة تحليلية في الأسباب الكامنة وراء هذه الظاهرة:</h4>
                 <ul className="list-disc list-inside space-y-2 text-sm">
                   <li>
                     <strong>العوامل السوسيوسوسيو-اقتصادية:</strong> غالباً ما يرتبط الانتقال المكثف في مستويات معينة بحركية الأسر وتغيير مقار السكن لأسباب مهنية أو اقتصادية، وهو ما يبرر نسب <span className="text-mt">"تغيير المدينة"</span> أو <span className="text-mt">"تغيير المؤسسة"</span>.
                   </li>
                   <li>
                     <strong>عتبة التوجيه والتسرب السني:</strong> تركُز المغادرات في التقرير حول سن <span className="text-[#f59e0b] font-bold">{topAge?.name || 'محددة'}</span> يشير غالباً إلى الوصول لسن قانوني معين أو مواجهة تحديات التعثر الدراسي وتكرار مستوى <span className="text-[#10b981] font-bold">{topLevel?.name}</span>، مما يدفع التلميذ (أو الأسرة) إما إلى التوجه نحو التكوين المهني أو اللجوء للمدارس الخاصة بحثاً عن تتبع فردي أفضل.
                   </li>
                   <li>
                     <strong>عوامل ديموغرافية:</strong> ارتفاع المغادرات في سنة <span className="text-red-500 font-bold">{topYear?.year}</span> قد يكون مرتبطاً بإحداث مؤسسات إعدادية جديدة في الروافد المجاورة، أو نتاج ظروف استثنائية أدت لحركية سكانية نشطة في الحوض المدرسي للمؤسسة.
                   </li>
                 </ul>
                 <p className="mt-3 text-xs text-[var(--color-mt)] leading-normal">
                   * ملاحظة: هذه القراءة تم توليدها بالاعتماد على المؤشرات الإحصائية الظاهرة، وينصح بمقاطعتها مع البطاقات الاجتماعية للتلاميذ للحصول على تشخيص أدق يمكن استثماره في مشروع المؤسسة.
                 </p>
               </div>
             </div>
          </div>

        </div>
      )}
    </div>
  );
}
