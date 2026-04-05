import dns from 'dns'
import net from 'net'

const host = 'db.aqqfwaozvlaeqjpkgrxy.supabase.co'

function resolve4(h){
  return new Promise((res)=>dns.resolve4(h,(e,addrs)=>res({e,addrs})))
}
function resolve6(h){
  return new Promise((res)=>dns.resolve6(h,(e,addrs)=>res({e,addrs})))
}

async function tryConnect(addr, port=5432, timeout=3000){
  return new Promise((resolve) => {
    const socket = new net.Socket()
    let done = false
    socket.setTimeout(timeout)
    socket.on('connect', ()=>{ if (!done){ done=true; socket.destroy(); resolve({addr, ok:true}) } })
    socket.on('timeout', ()=>{ if (!done){ done=true; socket.destroy(); resolve({addr, ok:false, reason:'timeout'}) } })
    socket.on('error',(err)=>{ if (!done){ done=true; resolve({addr, ok:false, reason:err.message}) } })
    socket.connect(port, addr)
  })
}

;(async ()=>{
  console.log('Resolving IPv4...')
  const r4 = await resolve4(host)
  console.log('IPv4 result:', r4)
  console.log('Resolving IPv6...')
  const r6 = await resolve6(host)
  console.log('IPv6 result:', r6)

  const addrs = []
  if (!r4.e && r4.addrs) addrs.push(...r4.addrs)
  if (!r6.e && r6.addrs) addrs.push(...r6.addrs)

  if (addrs.length===0){
    console.log('No addresses resolved. DNS failure.')
    process.exit(1)
  }

  for (const a of addrs){
    console.log('Testing TCP to', a)
    const res = await tryConnect(a, 5432, 3000)
    console.log(res)
  }
})();

