import { getArguments, getIdFromMention } from '../../imports/tools'
import { checkUserForPermission, checkRolePosition } from '../../imports/permissions'
// Get types.
import { client, event, mongoDB } from '../../imports/types'
import { ObjectID } from 'mongodb'
// Get moment.js
import * as moment from 'moment'

// Warn.
export function handleWarn (client: client, event: event, sendResponse: Function, message: string, db: mongoDB) {
  // Check user for permissions.
  if (!checkUserForPermission(client, event.d.author.id, client.channels[event.d.channel_id].guild_id, 'TEXT_MANAGE_MESSAGES')) {
    sendResponse('**Thankfully, you don\'t have enough permissions for that, you ungrateful bastard.**')
    return
  } else if (getArguments(message).split(' ').length < 2) {
    sendResponse('Correct usage: /warn <user> <reason>')
    return
  }
  // Check for valid user.
  let userID = getIdFromMention(getArguments(message).split(' ')[0])
  const ifUserId = getArguments(message).split(' ')[0]
  if (ifUserId in client.users) userID = ifUserId
  else if (
    Object.values(client.users).find(a => a.username.toLocaleLowerCase() === ifUserId.toLocaleLowerCase())
  ) userID = Object.values(client.users).find(a => a.username.toLocaleLowerCase() === ifUserId.toLocaleLowerCase()).id
  // eslint-disable-next-line no-unused-vars
  const a = client.users[userID]
  if (!a) {
    sendResponse('Please specify a valid user.')
    return
  }
  // Respect role order.
  if (checkRolePosition(client, client.users[userID].id, client.channels[event.d.channel_id].guild_id) >=
    checkRolePosition(client, event.d.author.id, client.channels[event.d.channel_id].guild_id)
  ) {
    sendResponse('You cannot warn this person! People nowadays.')
    return
  }
  // userID and server name.
  const serverName = client.servers[client.channels[event.d.channel_id].guild_id].name
  // Reason.
  const reason = getArguments(getArguments(message))
  // Set up the mutation.
  let warned = true
  const serverID = client.channels[event.d.channel_id].guild_id
  const warningCollection = db.collection('warnings')
  warningCollection.insertOne({
    warnedID: userID,
    warnerID: event.d.author.id,
    reason: reason,
    serverID,
    date: new Date().toUTCString()
  }).catch((err: string) => {
    sendResponse(`Something went wrong 👾 Error: ${err}`)
    warned = false
  })
  // DM the poor user.
  setTimeout(() => {
    if (warned) {
      client.sendMessage({
        to: userID,
        message: `You have been warned in ${serverName} for: ${reason}.`
      })
      const user = client.users[userID]
      sendResponse(`**${user.username}#${user.discriminator}** has been warned. **lol.**`)
    }
    if (warned && serverID === '402423671551164416') {
      const user = client.users[userID]
      client.sendMessage({
        to: '427911595352391680',
        message: `**${user.username}#${user.discriminator}** has been warned:`,
        embed: {
          color: 0x00AE86,
          type: 'rich',
          title: 'Information',
          description: `
**| Moderator:** ${event.d.author.username}#${event.d.author.discriminator} **| Reason:** ${getArguments(getArguments(message))}
**| Date:** ${moment(new Date().toUTCString()).format('dddd, MMMM Do YYYY, h:mm:ss A')}`
        }
      })
    }
  }, 1000)
}

// Warnings.
export function handleWarnings (client: client, event: event, sendResponse: Function, message: string, db: mongoDB) {
  // Check for valid user.
  let userID = getIdFromMention(getArguments(message).split(' ')[0])
  const ifUserId = getArguments(message).split(' ')[0]
  if (ifUserId in client.users) userID = ifUserId
  else if (
    Object.values(client.users).find(a => a.username.toLocaleLowerCase() === ifUserId.toLocaleLowerCase())
  ) userID = Object.values(client.users).find(a => a.username.toLocaleLowerCase() === ifUserId.toLocaleLowerCase()).id
  // eslint-disable-next-line no-unused-vars
  const a = client.users[userID]
  if (!a && userID) {
    sendResponse('Please specify a valid user.')
    return
  } else if (!a) {
    userID = event.d.author.id
  }
  // Check user for permissions.
  let notPermitted = false
  if (!checkUserForPermission(client, event.d.author.id, client.channels[event.d.channel_id].guild_id, 'TEXT_MANAGE_MESSAGES')) {
    notPermitted = true
  } else if (getArguments(message).split(' ').length < 1) {
    sendResponse('Correct usage: /warnings <user>')
    return
  }
  if (userID === event.d.author.id) notPermitted = false
  if (notPermitted) {
    sendResponse('**Thankfully, you don\'t have enough permissions for that, you ungrateful bastard.**')
    return
  }
  // Set up the mutation.
  const serverID = client.channels[event.d.channel_id].guild_id
  const warningCollection = db.collection('warnings')
  warningCollection.find({
    warnedID: userID,
    serverID
  }).toArray().then((array: Array<{ warnerID: string, date: string, reason: string, _id: string }>) => {
    let response = ``
    if (array.length === 0) {
      sendResponse('**No** warnings found.')
      return
    }
    for (let x = 0; x < array.length; x++) {
      const a = client.users[array[x].warnerID]
      if (response) response += '\n\n'
      const modUsername = a ? a.username : array[x].warnerID
      const modDiscriminator = a ? '#' + a.discriminator : ''
      response += `**Warning ${x + 1}**
**| Moderator:** ${modUsername}${modDiscriminator} **| Reason:** ${array[x].reason}
**| ID:** ${array[x]._id} **| Date:** ${moment(array[x].date).format('dddd, MMMM Do YYYY, h:mm:ss A')}`
    }
    client.sendMessage({
      to: event.d.channel_id,
      message: `**Warnings for ${a.username}#${a.discriminator}:**`,
      embed: {
        color: 0x00AE86,
        type: 'rich',
        title: 'Warnings',
        description: response
      }
    })
  })
}

// Clear warns.
export function handleClearwarns (client: client, event: event, sendResponse: Function, message: string, db: mongoDB) {
  // Check user for permissions.
  if (!checkUserForPermission(client, event.d.author.id, client.channels[event.d.channel_id].guild_id, 'TEXT_MANAGE_MESSAGES')) {
    sendResponse('**Thankfully, you don\'t have enough permissions for that, you ungrateful bastard.**')
    return
  } else if (getArguments(message).split(' ').length < 1) {
    sendResponse('Correct usage: /clearwarns <user>')
    return
  }
  // Check for valid user.
  let userID = getIdFromMention(getArguments(message).split(' ')[0])
  const ifUserId = getArguments(message).split(' ')[0]
  if (ifUserId in client.users) userID = ifUserId
  else if (
    Object.values(client.users).find(a => a.username.toLocaleLowerCase() === ifUserId.toLocaleLowerCase())
  ) userID = Object.values(client.users).find(a => a.username.toLocaleLowerCase() === ifUserId.toLocaleLowerCase()).id
  // eslint-disable-next-line no-unused-vars
  const a = client.users[userID]
  if (!a) {
    sendResponse('Please specify a valid user.')
    return
  }
  // Respect role order.
  if (checkRolePosition(client, client.users[userID].id, client.channels[event.d.channel_id].guild_id) >=
    checkRolePosition(client, event.d.author.id, client.channels[event.d.channel_id].guild_id)
  ) {
    sendResponse('You cannot clear the warnings of this person! People nowadays.')
    return
  }
  // Set up the mutation.
  let warned = true
  const serverID = client.channels[event.d.channel_id].guild_id
  const warningCollection = db.collection('warnings')
  warningCollection.deleteMany({ warnedID: userID, serverID }).catch((err: string) => {
    sendResponse(`Something went wrong 👾 Error: ${err}`)
    warned = false
  })
  // DM the poor user.
  setTimeout(() => {
    if (warned) {
      const user = client.users[userID]
      sendResponse(`Warnings of **${user.username}#${user.discriminator}** have been **cleared**.`)
    }
  }, 1000)
}

// Clear warns.
export function handleRemovewarn (client: client, event: event, sendResponse: Function, message: string, db: mongoDB) {
  // Check user for permissions.
  if (!checkUserForPermission(client, event.d.author.id, client.channels[event.d.channel_id].guild_id, 'TEXT_MANAGE_MESSAGES')) {
    sendResponse('**Thankfully, you don\'t have enough permissions for that, you ungrateful bastard.**')
    return
  } else if (getArguments(message).split(' ').length < 2) {
    sendResponse('Correct usage: /removewarn <user> <warning ID>')
    return
  }
  // Check for valid user.
  let userID = getIdFromMention(getArguments(message).split(' ')[0])
  const ifUserId = getArguments(message).split(' ')[0]
  if (ifUserId in client.users) userID = ifUserId
  else if (
    Object.values(client.users).find(a => a.username.toLocaleLowerCase() === ifUserId.toLocaleLowerCase())
  ) userID = Object.values(client.users).find(a => a.username.toLocaleLowerCase() === ifUserId.toLocaleLowerCase()).id
  // eslint-disable-next-line no-unused-vars
  const a = client.users[userID]
  if (!a) {
    sendResponse('Please specify a valid user.')
    return
  }
  // Respect role order.
  if (checkRolePosition(client, client.users[userID].id, client.channels[event.d.channel_id].guild_id) >=
    checkRolePosition(client, event.d.author.id, client.channels[event.d.channel_id].guild_id)
  ) {
    sendResponse('You cannot remove a warning from this person! People nowadays.')
    return
  }
  // Set up the mutation.
  let warned = true
  const serverID = client.channels[event.d.channel_id].guild_id
  const warningCollection = db.collection('warnings')
  warningCollection.find({ _id: new ObjectID(getArguments(getArguments(message))) })
    .toArray().catch((err: string) => {
      sendResponse(`Something went wrong 👾 Error: ${err}`)
      warned = false
    }).then((array: Array<{ warnedID: string, serverID: string, _id: string }>) => {
      if (array.length === 0) {
        sendResponse('This warning does not exist.')
        warned = false
        return
      } else if (array[0].warnedID !== userID) {
        sendResponse('This warning does not belong to the specified user.')
        warned = false
        return
      } else if (array[0].serverID !== serverID) {
        sendResponse('I may not be the sharpest tool in the shed, but I am no fool. ' +
        'This warning is not in the current server.')
        warned = false
        return
      }
      warningCollection.deleteMany({ _id: new ObjectID(getArguments(getArguments(message))) })
        .catch((err: string) => {
          sendResponse(`Something went wrong 👾 Error: ${err}`)
          warned = false
        })
    })
  // Respond.
  setTimeout(() => { if (warned) sendResponse(`**Warning has been deleted.**`) }, 2000)
}
