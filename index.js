const http = require('http')
    , https = require('https')
    , zlib = require('zlib')
    , dns = require('./dns')
    , cache = require('./cache')
    , store = require('./store')
module.exports = { get, post, dns, cache, store }
//https.globalAgent.options.rejectUnauthorized = false
//process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"
//{ rejectUnauthorized: false, requestCert: true }
Object.defineProperty(http.IncomingMessage.prototype, 'body', {
    get() { if (this._body == undefined) this._body = this.data.toString(); return this._body },
    configurable: false
})
Object.defineProperty(http.IncomingMessage.prototype, 'json', {
    get() { if (this._json == undefined) this._json = JSON.parse(this.data); return this._json },
    configurable: false
})
async function ReqSync(resolve, reject, options) {
    if (options.dns) {
        if (!/^[ \d.]+$/.test(options.hostname)) {
            let ip = await dns.getip(options.hostname)
            if (ip) {
                options.headers.host = options.hostname
                options.hostname = ip
            }
        }
    }
    const req = (options.protocol[4] == 's' ? https : http).request(options, (res) => {
        if (options.Cookie && res.headers['set-cookie']) for (let c of res.headers['set-cookie']) {
            let str = c.substring(0, c.indexOf(';')), i = str.indexOf('=')
            options.Cookie[str.substring(0, i)] = str.substring(i + 1)
        }
        if (options.redirect !== false && res.headers['location']) {
            url = new URL(res.headers['location'], options.url)
            options.href = url.href
            options.hostname = url.hostname
            options.port = url.port
            options.path = url.pathname + url.search
            options.protocol = url.protocol
            if (options.headers) delete options.headers.host
            if (options.redirectNum) options.redirectNum++
            else options.redirectNum = 1
            if (options.redirectNum < 10) return ReqSync(resolve, reject, options)
        }
        let arr = []
        res.on('data', chunk => arr.push(chunk))
        res.on('end', () => {
            res.options = options
            res.data = Buffer.concat(arr)
            if (!res.headers['content-encoding']) return resolve(res)
            switch (res.headers['content-encoding']) {
                case 'br':
                    res.data = zlib.brotliDecompressSync(res.data)
                    break;
                // all zlib.createUnzip()
                case 'gzip':
                    res.data = zlib.gunzipSync(res.data)
                    break;
                case 'deflate':
                    res.data = zlib.inflateSync(res.data)
                    break;
                default:
                    break;
            }
            resolve(res)
        })
    }).on('error', (e) => {
        reject(e)
    }).on('timeout', () => {
        req.destroy()
        reject('timeout')
    })
    if (options.method == 'POST') req.write(options.body)
    req.end()
}
function Req(options) {
    return new Promise(async (resolve, reject) => {
        await ReqSync(resolve, reject, options)
    })
}
function rawOption(url, option, method) {
    let options = {}
    option = option || url
    if (typeof url == 'string') options.url = new URL(url)
    else if (url.url) options.url = new URL(url.url)
    if (options.url instanceof URL) {
        options.hostname = options.url.hostname
        options.port = options.url.port
        options.path = options.url.pathname + options.url.search
        options.protocol = options.url.protocol
    } else throw 'Invalid URL'
    if (typeof option == 'object') Object.assign(options, option)
    options.headers = Object.assign({
        'accept-encoding': 'gzip, deflate, br',
        'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Safari/537.36',
    }, option.headers)
    if (!options.headers['Content-Type']) {
        if (options.form) options.headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8'
        else if (options.json) options.headers['Content-Type'] = 'application/json; charset=utf-8'
    }
    if (method) options.method = method
    if (!options.body) {
        if (options.json) options.body = JSON.stringify(options.json)
        else if (options.form) options.body = new URLSearchParams(options.form).toString()
        else options.body = ""
    }
    if (options.method == 'POST') {
        options.headers['Content-Length'] = Buffer.byteLength(options.body)
    } else {
        if (options.body) options.path += (options.path.includes('?') ? '&' : '?') + options.body
    }
    if (options.Cookie) {
        let cks = {}, ckarr = []
        if (options.headers['Cookie']) {
            let arr = options.headers['Cookie'].split('; ')
            for (let str of arr) {
                let i = str.indexOf('=')
                cks[str.substr(0, i)] = str.substr(i + 1)
            }
        }
        Object.assign(cks, options.Cookie)
        for (let c in cks) ckarr.push(c + '=' + cks[c])
        options.headers['Cookie'] = ckarr.join('; ')
    }
    return options
}
function post(url, option) {
    let options = rawOption(url, option, 'POST')
    return Req(options)
}
function get(url, option) {
    let options = rawOption(url, option, 'GET')
    return Req(options)
}
