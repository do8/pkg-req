const https = require('https')
    , global_cache = require('./cache')

async function ReqDns(DoH) {
    return new Promise((resolve, reject) => {
        https.request(DoH, { headers: { "accept": "application/dns-json" } }, res => {
            let arr = []
            res.on('data', chunk => arr.push(chunk))
            res.on('end', () => {
                resolve(JSON.parse(Buffer.concat(arr)))
            })
        }).on('error', reject).on('timeout', reject).end()
    })
}
async function cloudflare(name) {
    return await ReqDns('https://1.1.1.1/dns-query?name=' + name)
}
async function alidns(name) {
    return await ReqDns('https://223.5.5.5/resolve?name=' + name)
}
async function getip(name) {
    let cache = global_cache.dns_cache
    let t = Date.now()
    if (cache[name] && cache[name].t > t) {
        //console.log('dns cache', cache[name])
        return cache[name].data
    }
    let d = await alidns(name)
    if (!d || !d.Answer) d = await cloudflare(name)
    cache[name] = d.Answer && d.Answer[d.Answer.length - 1]
    if (cache[name].data) cache[name].t = t + 1000 * cache[name].TTL
    return cache[name].data
}
async function test() {
    let d = await getip('wxext.cn')
    console.log(d)
    d = await getip('wxext.cn')
}
//test()
module.exports = { getip, alidns, cloudflare }