'use client';
import {useTranslations} from 'next-intl';

export type AgencyAdministrator={id:string;agency_id:string;full_name:string|null;email:string|null;active:boolean};
export default function AgencyAdministrators({members,error}:{members:AgencyAdministrator[]|null;error:boolean}){
 const t=useTranslations();
 return <section className="agency-administrators"><h4>{t('platformAdministrators')}</h4>{error?<p className="agency-admin-warning" role="status">{t('platformAdministratorsError')}</p>:members===null?<p role="status">{t('loading')}</p>:members.length===0?<p>{t('platformNoAdministrator')}</p>:<ul>{members.map(member=><li key={member.id}><span className="agency-admin-avatar" aria-hidden="true">{Array.from((member.full_name||member.email||'?').trim())[0]?.toLocaleUpperCase()}</span><div><strong dir="auto">{member.full_name||t('platformAdministratorUnnamed')}</strong><span dir="ltr">{member.email||t('platformAdministratorNoEmail')}</span>{!member.active&&<small>{t('platformAdministratorInactive')}</small>}</div></li>)}</ul>}</section>;
}
