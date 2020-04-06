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

app.post('/', multer({ dest: 'tmp/' }).single('file'), (req, res) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Content-Type', 'application/json; charset=utf-8')
  const data = fs.readFileSync(req.file.path)
  const flg = req.body.covid19
  if (flg != 0 && flg != 1) {
    res.send(JSON.stringify({ res: 'no covid19 flg' }))
    return
  }
  const fn = 'data/' + flg + "/" + util.getYMDHMSM() + "-" + encodeIP(getIP(req)) + ".wav"
  util.writeFileSync(fn, data)
  console.log('uploaded: ' + fn)
  res.send(JSON.stringify({ res: 'ok' }))
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
    for (let i = 0; i < 2; i++) {
      s.push(`<h2>COVID-19 ${i}</h2>`)
      try {
        const list = fs.readdirSync('data/' + i)
        console.log(list)
        for (const f of list) {
          const f2 = i + '/' + f
          s.push(`<a href=${f2}>${f2}</a>`)
        }
      } catch (e) {
      }
      s.push('')
    }
    res.header('Content-Type', 'text/html; charset=utf-8')
    res.send(s.join('<br>'))
  } else {
    res.header('Content-Type', 'audio/wav')
    const data = fs.readFileSync('data/' + fn)
    res.send(data)
  }
})
app.get('/', (req, res) => {
  res.header('Content-Type', 'text/html; charset=utf-8')
  res.send(fs.readFileSync('static/index.html'))
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