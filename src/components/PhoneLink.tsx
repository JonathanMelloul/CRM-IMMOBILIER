'use client';
import {useTranslations} from 'next-intl';
import {whatsappNumber} from '@/lib/phone-links';
export default function PhoneLink({value,country,message}:{value:string|number|boolean|null|undefined;country?:string;message?:string}){
 const t=useTranslations();
 const display=String(value??'').trim();
 if(!display)return <>—</>;
 const number=display.replace(/[^\d+]/g,'');
 if(!/^\+?\d{3,15}$/.test(number))return <bdi>{display}</bdi>;
 const whatsapp=whatsappNumber(display,country);
 const call=<a className="phone-action-icon phone-call" href={`tel:${number}`} title={t('callPhone')} aria-label={`${t('callPhone')} : ${display}`}><span aria-hidden="true">📞</span></a>;
 if(!whatsapp)return <span className="phone-actions"><a className="phone-link" href={`tel:${number}`}><bdi>{display}</bdi></a><span className="phone-action-buttons">{call}</span></span>;
 const url=`whatsapp://send?phone=${whatsapp}`;
 const messageUrl=message?`${url}&text=${encodeURIComponent(message)}`:url;
 const messageLabel=t(message?'prepareWhatsAppMessage':'sendWhatsAppMessage');
 return <span className="phone-actions"><a className="phone-link" href={messageUrl} title={message?t('prepareWhatsAppMessage'):t('openWhatsAppApp')} aria-label={`${message?messageLabel:t('openWhatsAppApp')} : ${display}`}><bdi>{display}</bdi></a><span className="phone-action-buttons">{call}<a className="phone-action-icon phone-whatsapp" href={messageUrl} title={messageLabel} aria-label={`${messageLabel} : ${display}`}><span aria-hidden="true">💬</span></a></span></span>;
}
