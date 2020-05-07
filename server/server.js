/* eslint-disable import/no-duplicates */
import express from 'express'
import path from 'path'
import cors from 'cors'
import bodyParser from 'body-parser'
import sockjs from 'sockjs'
import axios from 'axios'
import cookieParser from 'cookie-parser'
import Html from '../client/html'
// import { fstat } from 'fs'
// import fs from 'fs'
const { readFile, writeFile, stat, unlink } = require('fs').promises

let connections = []

const port = process.env.PORT || 3000
const server = express()

const writeUserFile = async (text) => {
  await writeFile(`${__dirname}/users.json`, text, { encoding: "utf8" })  
}

/* const readUserFile = async () => {
   await readFile(`${__dirname}/users.json`, { encoding: "utf8" })
} */

server.use(cors())

server.use(express.static(path.resolve(__dirname, '../dist/assets')))
server.use(bodyParser.urlencoded({ limit: '50mb', extended: true, parameterLimit: 50000 }))
server.use(bodyParser.json({ limit: '50mb', extended: true }))

server.use(cookieParser())
server.use('/api/v1/users', (req, res, next) => {
  res.set('x-skillcrucial-user', 'bd0cb7a5-0201-4cb2-a65f-32eac42fc872')
  res.set('Access-Control-Expose-Headers', 'X-SKILLCRUCIAL-USER')
  next()
})

server.get('/api/v1/users', async (req, res) => {
  await stat(`${__dirname}/users.json`)  
  .then(async () => {
    await readFile(`${__dirname}/users.json`, { encoding: "utf8" })  
      .then(data => res.json(JSON.parse(data)))  
   })
   .catch(async () => { 
     await axios('https://jsonplaceholder.typicode.com/users')
     .then((data) => writeUserFile(JSON.stringify(data.data)))
     .then(async () => {
      await readFile(`${__dirname}/users.json`, { encoding: "utf8" })  
        .then(data => res.json(JSON.parse(data)))  
     })
   } )
   
})

server.post('/api/v1/users', async (req, res) => {
  const users = await readFile(`${__dirname}/users.json`, { encoding: "utf8" })  
  let usersObj = JSON.parse(users)
  const newId = usersObj[usersObj.length - 1].id + 1
  const newEl = {...req.body, 'id': newId}
  usersObj = [ ...usersObj,  newEl]
  await writeUserFile(JSON.stringify(usersObj))
  res.json({'status': 'success', 'id': newId})
  
})

server.patch('/api/v1/users/:userId', async (req, res) => {
  const users = await readFile(`${__dirname}/users.json`, { encoding: "utf8" })
  const usersObj = JSON.parse(users)
  for (let i = 0; i < usersObj.length; i += 1){
    if (usersObj[i].id === +req.params.userId){
      // console.log(usersObj[i].id)
      usersObj[i] = Object.assign(usersObj[i], req.body)
    }
  }
  await writeUserFile(JSON.stringify(usersObj))
  res.json({'status': 'success', 'id': req.params.userId})
  
})

server.delete('/api/v1/users/:userId', async (req, res) => {
  const users = await readFile(`${__dirname}/users.json`, { encoding: "utf8" })
  const usersObj = JSON.parse(users)
  for (let i = 0; i < usersObj.length; i += 1){
    if (usersObj[i].id === +req.params.userId){
      // console.log(usersObj[i].id)
      usersObj.splice(i, 1)
    }
  }
  await writeUserFile(JSON.stringify(usersObj))
  res.json({'status': 'success', 'id': req.params.userId})
})

server.delete('/api/v1/users/', async (req, res) => {
  await unlink(`${__dirname}/users.json`).catch(() => res.end('Файла уже нет, удалять нечего')).then(() => res.end('Файл удален!'))
})

server.use('/api/', (req, res) => {
  res.status(404)
  res.end()
})

const echo = sockjs.createServer()
echo.on('connection', (conn) => {
  connections.push(conn)
  conn.on('data', async () => {})

  conn.on('close', () => {
    connections = connections.filter((c) => c.readyState !== 3)
  })
})

server.get('/', (req, res) => {
  // const body = renderToString(<Root />);
  const title = 'Server side Rendering'
  res.send(
    Html({
      body: '',
      title
    })
  )
})

server.get('/*', (req, res) => {
  const initialState = {
    location: req.url
  }

  return res.send(
    Html({
      body: '',
      initialState
    })
  )
})

const app = server.listen(port)

echo.installHandlers(app, { prefix: '/ws' })

// eslint-disable-next-line no-console
console.log(`Serving at http://localhost:${port}`)
