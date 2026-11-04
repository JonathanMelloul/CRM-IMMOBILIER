/** Bound bytes while reading, including chunked requests without Content-Length. */
export async function boundedJson(request:Request,limit=48000):Promise<Record<string,any>>{
 if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw Error('content-type');
 const length=request.headers.get('content-length');
 if(length&&(!/^\d+$/.test(length)||Number(length)>limit))throw Error('size');
 const reader=request.body?.getReader();if(!reader)throw Error('body');
 const chunks:Uint8Array[]=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw Error('size');}chunks.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('object');
 return value;
}
