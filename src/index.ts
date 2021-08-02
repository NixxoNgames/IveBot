import 'json5/lib/require'
// Tokens and stuff.
import { Client } from 'eris'
// Get MongoDB.
import { MongoClient } from 'mongodb'
// Import fs.
import { readdir, statSync } from 'fs'
import { inspect } from 'util'
// Import types.
import { DB, Command } from './imports/types'
// Import the bot.
import CommandParser from './client'
import { guildMemberAdd, guildMemberRemove, guildDelete, guildBanAdd } from './events'
// Get the token needed.
import { token, mongoURL } from '../config.json5'

// If production is explicitly specified via flag..
if (process.argv[2] === '--production') process.env.NODE_ENV = 'production'
// Check for development environment.
const dev = process.env.NODE_ENV !== 'production'

// Create a client to connect to Discord API Gateway.
const client = new Client(`Bot ${token === 'dotenv' ? process.env.IVEBOT_TOKEN : token}`, {
  allowedMentions: { everyone: false, roles: true, users: true },
  autoreconnect: true,
  restMode: true
})

// Connect ASAP, hopefully before the server starts.
// TODO: Use top-level await for this and MongoDB.
// eslint-disable-next-line @typescript-eslint/no-floating-promises
client.connect()

// Create a MongoDB instance.
MongoClient.connect(mongoURL === 'dotenv' ? process.env.MONGO_URL || '' : mongoURL, (err, mongoDB) => {
  if (err || !mongoDB) throw err
  console.log('Bot connected successfully to MongoDB.')
  const db = mongoDB.db('ivebot')
  const bubbleWrap = <F extends (...args: any[]) => any>(func: F) =>
    (...args: Parameters<F>) => { func(...args).catch(console.error) }
  // When a server loses a member, it will callback.
  client.on('guildMemberAdd', bubbleWrap(guildMemberAdd(client, db, tempDB)))
  client.on('guildMemberRemove', bubbleWrap(guildMemberRemove(client, db)))
  client.on('guildBanAdd', bubbleWrap(guildBanAdd(client, db)))
  // When the bot leaves a server, it will callback.
  client.on('guildDelete', bubbleWrap(guildDelete(db)))
  // Register the commandParser.
  const commandParser = new CommandParser(client, tempDB, db)
  client.on('messageCreate', bubbleWrap(commandParser.onMessage))
  client.on('messageUpdate', bubbleWrap(commandParser.onMessageUpdate))
  // Register all commands in src/commands onto the CommandParser.
  const toRead = dev ? './src/commands/' : './lib/commands/'
  readdir(toRead, (err, commandFiles) => {
    // Handle any errors.
    if (err) { console.error(err); throw new Error('Commands could not be retrieved.') }
    // This only supports two levels of files, one including files inside commands, and one in..
    // a subfolder.
    commandFiles.push(dev ? 'admin/index.ts' : 'admin/index.js')
    commandFiles.forEach(commandFile => {
      // If it's a file..
      if (statSync(toRead + commandFile).isFile() && (commandFile.endsWith('.ts') || commandFile.endsWith('.js'))) {
        const commands: { [index: string]: Command } = require('./commands/' + commandFile)
        // ..and there are commands..
        if (Object.keys(commands).length === 0) return
        // ..register the commands.
        Object.keys(commands).forEach((commandName: string) => {
          // exclude TriviaSession from commands
          if (commandName === 'TriviaSession') return
          const command = commands[commandName]
          commandParser.registerCommand(command)
        })
      }
    })
  })
  // Register setInterval to fulfill delayed tasks.
  setInterval(() => {
    db.collection('tasks').find({ time: { $lte: Date.now() + 60000 } }).toArray().then(tasks => {
      if (tasks && tasks.length) {
        tasks.forEach(task => setTimeout(() => {
        // TODO: What if no perms?
          if (task.type === 'unmute') {
            client.removeGuildMemberRole(task.guild, task.user, task.target, 'Muted for fixed duration.')
              .catch(e => e.res.statusCode !== 404 && console.error(e))
          } else if (task.type === 'reminder') {
            client.createMessage(task.target, task.message)
              .catch(e => e.res.statusCode !== 404 && console.error(e))
          }
          db.collection('tasks').deleteOne({ _id: task._id })
            .catch(error => console.error('Failed to remove task from database.', error))
        }, task.time - Date.now()))
      }
    }).catch(console.error)
  }, 60000)
})

// On connecting..
client.on('ready', () => {
  console.log('Connected to Discord.')
  // client.createMessage('361577668677861399', ``)
  client.editStatus('online', {
    name: 'DXMD (5k) on iMac Pro.',
    type: 1,
    url: 'https://twitch.tv/sorrybutyoudontdeservewatchingthisgameunlessyouhaveamacipadoriphone'
  })
})

// Disconnection from Discord by error will trigger the following.
client.on('error', (err: Error, id: string) => {
  console.error(`Error: ${inspect(err, false, 0)}\nShard ID: ${id}`)
})

// Create a database to handle certain stuff.
const tempDB: DB = {
  gunfight: {}, say: {}, trivia: {}, leave: new Set(), mute: {}, cooldowns: { request: new Set() }
}
