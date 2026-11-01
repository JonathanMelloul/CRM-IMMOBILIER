import Workspace from '@/components/Workspace';
export default async function Page({params,searchParams}:{params:Promise<{locale:string;path?:string[]}>;searchParams:Promise<{prospect_id?:string|string[]}>}) {
 const [{path=[]},query]=await Promise.all([params,searchParams]);
 const initialProspectId=typeof query?.prospect_id==='string'&&query.prospect_id.length<=128?query.prospect_id||undefined:undefined;
 return <Workspace path={path} initialProspectId={initialProspectId}/>;
}
