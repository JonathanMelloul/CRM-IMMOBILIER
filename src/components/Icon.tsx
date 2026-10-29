type IconName='dashboard'|'prospects'|'projects'|'apartments'|'appointments'|'activities'|'tasks'|'arrow'|'search'|'logout'|'payments'|'chat';
const paths:Record<IconName,string>={
 chat:'M21 11a8 8 0 0 1-8 8H7l-5 3 2-6a8 8 0 0 1-1-5 8 8 0 0 1 18 0 M7 11h10 M7 7h7',
 payments:'M3 5h18v14H3z M3 10h18 M7 15h3',
 dashboard:'M3 3h7v7H3z M14 3h7v4h-7z M14 11h7v10h-7z M3 14h7v7H3z',
 prospects:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
 projects:'M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16 M16 9h3a2 2 0 0 1 2 2v10 M2 21h20 M8 7h4 M8 11h4 M8 15h4 M9 21v-3h2v3',
 apartments:'M3 10l9-7 9 7 M5 9v12h14V9 M9 21v-8h6v8',
 appointments:'M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2 M8 14h2 M14 14h2 M8 18h2',
 activities:'M3 12h4l3-8 4 16 3-8h4',
 tasks:'M9 3h6v4H9z M9 5H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3 M8 14l3 3 5-6',
 arrow:'M7 17L17 7 M7 7h10v10',search:'M21 21l-5-5 M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16',
 logout:'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9'
};
export default function Icon({name,className=''}:{name:IconName;className?:string}){return <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]}/></svg>;}
