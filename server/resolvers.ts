// Import permission checks and function to retrieve server settings.
import { getServerSettings } from './bot/imports/tools'
// Get types.
import { DB } from './bot/imports/types'
import { Client } from 'eris'
// Get MongoDB.
import { MongoClient, Db } from 'mongodb'
// Who's the host? He gets special permission.
import 'json5/lib/require'
import { host, mongoURL } from '../config.json5'

// Create a MongoDB instance.
let db: Db
MongoClient.connect(mongoURL === 'dotenv' ? process.env.MONGO_URL : mongoURL, (err, client) => {
  if (err) throw new Error('Error:\n' + err)
  console.log('GraphQL server connected successfully to MongoDB.')
  db = client.db('ivebot')
})

// Set up resolvers.
export default (ctx: { tempDB: DB, client: Client }) => ({
  // Queries.
  Query: {
    serverSettings: async (
      _: string, { serverId, linkToken }: { serverId: string, linkToken: string }
    ) => {
      const member = ctx.client.guilds
        .find(t => t.id === serverId).members.find(t => t.id === ctx.tempDB.link[linkToken])
      let {
        addRoleForAll, joinLeaveMessages, joinAutorole, ocrOnSend
      } = await getServerSettings(db, serverId)
      joinLeaveMessages = joinLeaveMessages || {}
      joinLeaveMessages = {
        channelName: joinLeaveMessages.channelName || '',
        joinMessage: joinLeaveMessages.joinMessage || '',
        leaveMessage: joinLeaveMessages.leaveMessage || ''
      }
      if (
        member && (member.permission.has('manageGuild') || host === ctx.tempDB.link[linkToken])
      ) return { serverId, addRoleForAll, joinLeaveMessages, joinAutorole, ocrOnSend }
      else return { serverId: 'Forbidden.' }
    },
    getUserInfo: (_: string, { linkToken }: { linkToken: string }) => {
      if (ctx.tempDB.link[linkToken]) {
        let servers: Array<{ /* eslint-disable indent */
          perms: boolean, icon: string, serverId: string, name: string, channels: string[]
        }> = [] /* eslint-enable indent */
        ctx.client.guilds.forEach(server => {
          ctx.client.guilds.find(a => a.id === server.id).members.forEach(member => {
            if (member.id === ctx.tempDB.link[linkToken]) {
              servers.push({
                serverId: server.id,
                name: server.name,
                icon: server.iconURL || 'no icon',
                channels: server.channels.filter(i => i.type === 0).map(i => i.name),
                perms: host === ctx.tempDB.link[linkToken]
                  ? true : member.permission.has('manageGuild')
              })
            }
          })
        })
        return servers
      }
      return [{ serverId: 'Unavailable: invalid link token.', icon: 'no icon' }]
    },
    getBotId: () => ctx.client.user.id
  },
  Mutation: {
    editServerSettings: async (
      _: string, { input }: { input: { // eslint-disable-next-line indent
        serverId: string, linkToken: string, addRoleForAll: string, joinAutorole: string,
      // eslint-disable-next-line indent
        joinLeaveMessages: { channelName: string, joinMessage: string, leaveMessage: string },
      // eslint-disable-next-line indent
        ocrOnSend: boolean
      } }
    ) => {
      const {
        serverId, linkToken, addRoleForAll, joinAutorole, joinLeaveMessages, ocrOnSend
      } = input
      const member = ctx.client.guilds
        .find(t => t.id === serverId).members.find(t => t.id === ctx.tempDB.link[linkToken])
      if (
        member.permission.has('manageGuild') || host === ctx.tempDB.link[linkToken]
      ) {
        await getServerSettings(db, serverId)
        await db.collection('servers').updateOne({ serverID: serverId }, { $set: {
          /* eslint-disable no-unneeded-ternary */
          addRoleForAll: addRoleForAll ? addRoleForAll : undefined,
          joinAutorole: joinAutorole ? joinAutorole : undefined,
          ocrOnSend,
          joinLeaveMessages: {
            channelName: null, joinMessage: null, leaveMessage: null, ...joinLeaveMessages
          }
          /* eslint-enable no-unneeded-ternary */
        } })
        return getServerSettings(db, serverId)
      } else return { serverId: 'Forbidden.' }
    }
  }
})
