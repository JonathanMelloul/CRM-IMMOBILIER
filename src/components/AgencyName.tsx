'use client';
import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {supabase} from '@/lib/supabase';

export default function AgencyName({userId}:{userId:string}) {
 const [name,setName]=useState('');
 const [target,setTarget]=useState<HTMLElement|null>(null);
 useEffect(()=>{
  let live=true;
  setName('');
  setTarget(document.getElementById('topbar-agency'));
  async function load(){
   try {
    const {data,error}=await supabase().rpc('crm_saas_context');
    if(live&&!error&&data?.active&&typeof data.agency_name==='string')setName(data.agency_name.trim());
   } catch { /* Historical projects may not expose the SaaS context. */ }
  }
  void load();
  return()=>{live=false;};
 },[userId]);
 return target&&name?createPortal(<strong dir="auto">{name}</strong>,target):null;
}
