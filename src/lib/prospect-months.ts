import type {Row} from './model';

// Reception dates are civil dates: never substitute created_at or shift timezones.
export function prospectMonth(row:Row):string {
 const date=String(row.received_on??'');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return 'unknown';
 const parsed=new Date(`${date}T00:00:00Z`);
 return Number.isNaN(parsed.getTime())||parsed.toISOString().slice(0,10)!==date?'unknown':date.slice(0,7);
}

export function prospectMonths(rows:Row[]) {
 const counts=new Map<string,number>();
 for(const row of rows){const month=prospectMonth(row);counts.set(month,(counts.get(month)??0)+1);}
 return [...counts].sort(([a],[b])=>a==='unknown'?1:b==='unknown'?-1:b.localeCompare(a));
}

export function monthLabel(month:string,locale:string) {
 return new Intl.DateTimeFormat(locale,{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${month}-01T00:00:00Z`));
}
