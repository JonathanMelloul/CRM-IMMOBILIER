'use client';
import {useLocale,useTranslations} from 'next-intl';
import {monthLabel,prospectMonths} from '@/lib/prospect-months';
import type {Row} from '@/lib/model';

export default function ProspectMonths({rows,month,onChange}:{rows:Row[];month:string;onChange:(month:string)=>void}) {
 const t=useTranslations(),locale=useLocale();
 return <div className="prospect-months">
  <div className="prospect-months-heading"><h2>{t('prospectsByMonth')}</h2><label>{t('chooseProspectMonth')}<input type="month" value={month==='all'||month==='unknown'?'':month} onChange={e=>onChange(e.target.value||'all')}/></label></div>
  <div className="prospect-month-buttons" role="group" aria-label={t('prospectsByMonth')}>
   <button type="button" aria-pressed={month==='all'} onClick={()=>onChange('all')}>{t('allProspectMonths')} <span>{rows.length}</span></button>
   {prospectMonths(rows).map(([key,count])=><button type="button" key={key} aria-pressed={month===key} onClick={()=>onChange(key)}>{key==='unknown'?t('unknownReceptionMonth'):monthLabel(key,locale)} <span>{count}</span></button>)}
  </div>
  <p className="muted" role="status">{month==='all'?t('allProspectMonths'):month==='unknown'?t('unknownReceptionMonth'):monthLabel(month,locale)}</p>
 </div>;
}
