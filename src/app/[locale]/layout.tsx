import '../sections.css';
import '../quote-pdf.css';
import {NextIntlClientProvider} from 'next-intl';
import {notFound} from 'next/navigation';
import Shell from '@/components/Shell';
import '../globals.css';
import '../design.css';
import '../glass.css';
import '../payment-sheet.css';
import '../light-workspace.css';
import '../reference-theme.css';
import '../world-clocks.css';
import '../agencies.css';
import '../apartments.css';
import '../crm-polish.css';
export const metadata={title:'Yonathan Immobilier',description:'CRM immobilier'};
const locales=['fr','he','en'];
export function generateStaticParams(){return locales.map(locale=>({locale}));}
export default async function Layout({children,params}:{children:React.ReactNode;params:Promise<{locale:string}>}) {
 const {locale}=await params;if(!locales.includes(locale))notFound();
 const messages=(await import(`../../../messages/${locale}.json`)).default;
 return <html lang={locale} dir={locale==='he'?'rtl':'ltr'}><body><NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Jerusalem" now={new Date()} formats={{}}><Shell>{children}</Shell></NextIntlClientProvider></body></html>;
}
