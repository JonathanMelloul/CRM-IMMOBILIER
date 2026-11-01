'use client';
import {useTranslations} from 'next-intl';
import {whatsappNumber} from '@/lib/phone-links';

export default function PhoneLink({value,country}:{value:string|number|boolean|null|undefined;country?:string}){
 const t=useTranslations();
 const display=String(value??'').trim();
 if(!display)return <>—</>;
 const number=display.replace(/[^\d+]/g,'');
 if(!/^\+?\d{3,15}$/.test(number))return <bdi>{display}</bdi>;
 const whatsapp=whatsappNumber(display,country);
 if(!whatsapp)return <a className="phone-link" href={`tel:${number}`}><bdi>{display}</bdi></a>;
 return <span className="phone-actions"><a className="phone-link" href={`https://web.whatsapp.com/send?phone=${whatsapp}`} target="_blank" rel="noopener noreferrer" title={t('openWhatsAppWeb')} aria-label={`${t('openWhatsAppWeb')} : ${display}`}><bdi>{display}</bdi></a><a className="phone-call" href={`tel:${number}`} aria-label={`${t('callPhone')} : ${display}`}>{t('callPhone')}</a></span>;
}
