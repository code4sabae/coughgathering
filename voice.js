const express = require('express')
const fs = require('fs')
const multer = require('multer')
const util = require('./util.js')
require('dotenv').config()

const SECPATH = process.env.SECPATH || '/uploaded/'
const PORT = process.env.PORT || 8005

const app = express()

const getIP = function(req) {
  if (req.headers['x-forwarded-for']) {
    return req.headers['x-forwarded-for']
  }
  if (req.connection && req.connection.remoteAddress) {
    return req.connection.remoteAddress
  }
  if (req.connection.socket && req.connection.socket.remoteAddress) {
    return req.connection.socket.remoteAddress
  }
  if (req.socket && req.socket.remoteAddress) {
    return req.socket.remoteAddress
  }
  return '0.0.0.0'
}
const encodeIP = function(ip) {
  return ip.replace(/\.|:/g, '_')
}

const fnid = 'data/id.txt'
const getID = function() {
  let id = 0
  try {
    id = parseInt(fs.readFileSync(fnid, 'utf-8'))
  } catch (e) {
  }
  id++
  fs.writeFileSync(fnid, id, 'utf-8')
  return id
}

app.post('/', multer({ dest: 'tmp/' }).single('file'), (req, res) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Content-Type', 'application/json; charset=utf-8')
  const data = fs.readFileSync(req.file.path)
  const flg = req.body.covid19
  if (flg != 0 && flg != 1) {
    res.send(JSON.stringify({ res: 'no covid19 flg' }))
    return
  }
  //const fn = 'data/' + flg + "/" + util.getYMDHMSM() + "-" + encodeIP(getIP(req)) + ".wav"
  const id = getID()
  const fn = 'data/' + id + "-" + util.getYMDHMSM() + "-" + encodeIP(getIP(req)) + ".wav"
  util.writeFileSync(fn, data)
  console.log('uploaded: ' + fn)
  res.send(JSON.stringify({ res: 'ok', id: id }))
})
app.get(SECPATH + '*', (req, res) => {
  let fn = req.url.substring(SECPATH.length)
  const qn = fn.lastIndexOf('?')
  if (qn >= 0) {
    fn = fn.substring(0, qn)
  }
  console.log(req.url, fn)
  if (fn.indexOf('..') >= 0) {
    res.header('Content-Type', 'text/html; charset=utf-8')
    res.send('err')
    return
  }
  if (fn.length == 0) {
    const s = []
    s.push(`<h2>COVID-19</h2>`)
    try {
      const list = fs.readdirSync('data/')
      console.log(list)
      for (const f of list) {
        if (f.endsWith('.wav'))
          s.push(`<a href=${f}>${f}</a>`)
      }
    } catch (e) {
    }
    s.push('')

    res.header('Content-Type', 'text/html; charset=utf-8')
    res.send(s.join('<br>'))
  } else {
    res.header('Content-Type', 'audio/wav')
    const data = fs.readFileSync('data/' + fn)
    res.send(data)
  }
})
app.get('/*', (req, res) => {
  let url = req.url
  if (url == '/' || url.indexOf('..') >= 0) {
    url = '/index.html'
  }
  let ctype = 'text/plain'
  if (url.endsWith('.html')) {
    ctype = 'text/html; charset=utf-8'
  } else if (url.endsWith('.js')) {
    ctype = 'text/javascript'
  }
  let data = null
  try {
    data = fs.readFileSync('static' + url)
  } catch (e) {
  }
  res.header('Content-Type', ctype)
  res.send(data)
})

app.listen(PORT, () => {
  console.log(`to access the top`)
  console.log(`http://localhost:${PORT}/`)
  console.log()
  console.log(`to download voice files uploaded`)
  console.log(`http://localhost:${PORT}${SECPATH}`)
  console.log()
  console.log(`edit .env if you want to change`)
  console.log()
  console.log('https://github.com/code4sabae/coughgathering/')
})
