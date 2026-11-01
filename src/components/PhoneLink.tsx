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
 const call=<a className="phone-action-icon phone-call" href={`tel:${number}`} title={t('callPhone')} aria-label={`${t('callPhone')} : ${display}`}><span aria-hidden="true">📞</span></a>;
 if(!whatsapp)return <span className="phone-actions"><a className="phone-link" href={`tel:${number}`}><bdi>{display}</bdi></a>{call}</span>;
 const url=`https://web.whatsapp.com/send?phone=${whatsapp}`;
 return <span className="phone-actions"><a className="phone-link" href={url} target="_blank" rel="noopener noreferrer" title={t('openWhatsAppWeb')} aria-label={`${t('openWhatsAppWeb')} : ${display}`}><bdi>{display}</bdi></a>{call}<a className="phone-action-icon phone-whatsapp" href={url} target="_blank" rel="noopener noreferrer" title={t('sendWhatsAppMessage')} aria-label={`${t('sendWhatsAppMessage')} : ${display}`}><span aria-hidden="true">💬</span></a></span>;
}
