const express = require('express');
const app = express();
app.get('/', (req,res) => res.send('BJOHMEIR BOT IS ALIVE'));
app.listen(process.env.PORT || 3000, () => console.log('Port open'));
const { default: makeWASocket, useMultiFileAuthState, downloadMediaMessage } = require('@whiskeysockets/baileys')
const P = require('pino')
const fs = require('fs')
// Auto-create ranks.json if deleted
if (!fs.existsSync('./ranks.json')) {
  fs.writeFileSync('./ranks.json', JSON.stringify({
    "King": 100,
    "Queen": 95,
    "Emperor": 90,
    "Prince": 80,
    "Duke": 75,
    "Lord": 60,
    "Legend": 50,
    "Knight": 30,
    "Warrior": 15,
    "Novice": 5,
    "Exile": 0
  }, null, 2));
}
const qrcode = require('qrcode-terminal')

const PREFIX = '.'
const KINGDOM = 'BJOHMEIR'
const OWNER_NUMBER = '2347041971847'
const OWNER_JID = OWNER_NUMBER + '@s.whatsapp.net'

// --- DATABASES ---
let economy = fs.existsSync('./economy.json') ? JSON.parse(fs.readFileSync('./economy.json')) : {}
let ranksData = fs.existsSync('./ranks.json') ? JSON.parse(fs.readFileSync('./ranks.json')) : {"King":100,"Goddess":99,"Queen":90,"Prince":80,"Duke":80,"Lord":70,"Legend":70,"Knight":43,"Slave":10}
let expCooldown = new Map()
let mutedUsers = new Set()
let afkUsers = {}
let antilink = new Set()

function saveEconomy(){ fs.writeFileSync('./economy.json', JSON.stringify(economy, null, 2)) }
function saveRanks(){ fs.writeFileSync('./ranks.json', JSON.stringify(ranksData, null, 2)) }

function addExp(userId){
  if(!economy[userId]) economy[userId] = { exp:0, level:1, coins:0, title: 'Slave' }
  let now = Date.now()
  if(expCooldown.has(userId) && now - expCooldown.get(userId) < 120000) return { leveled:false }
  expCooldown.set(userId, now)
  economy[userId].exp += Math.floor(Math.random()*3)+1
  let need = economy[userId].level * 500 // HARD
  if(economy[userId].exp >= need){
    economy[userId].level++; economy[userId].exp -= need; economy[userId].coins += economy[userId].level * 20
    saveEconomy(); return { leveled:true, level: economy[userId].level }
  }
  saveEconomy(); return { leveled:false }
}

// --- STICKER WITHOUT SHARP ---
async function makeSticker(sock, from, message){
  try{
    let buffer = await downloadMediaMessage(message, 'buffer', {}, { logger: P({level:'silent'}), reuploadRequest: sock.updateMediaMessage })
    // Try native WhatsApp sticker
    await sock.sendMessage(from, { sticker: buffer, packname: KINGDOM, author: 'Benjamin' })
  }catch(e){
    await sock.sendMessage(from, { text: `❌ Sticker failed: ${e.message}\nMake sure video <6 sec` })
  }
}

async function startBot(){
  const { state, saveCreds } = await useMultiFileAuthState('./auth')
  const sock = makeWASocket({ auth: state, logger: P({level:'silent'}), browser: ['Bjohmeir','Chrome','1.0'] })
  
  sock.ev.on('creds.update', saveCreds)
  sock.ev.on('connection.update', async(u)=>{
    const { connection, qr } = u
    if(qr){
      console.log('\n==== QR FOR 07041971847 ====\n')
      qrcode.generate(qr, {small:true})
      console.log('Scan: WhatsApp > Linked Devices > Link Device\n')
    }
    if(connection==='open') console.log(`✅ ${KINGDOM} ONLINE - FULL COMMANDS LOADED`)
    if(connection==='close') startBot()
  })

  sock.ev.on('messages.upsert', async({messages})=>{
    const m = messages[0]; if(!m.message || m.key.fromMe) return
    const from = m.key.remoteJid; const isGroup = from.endsWith('@g.us'); const sender = isGroup ? m.key.participant : from
    const text = (m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || m.message.videoMessage?.caption || '').trim()
    const quoted = m.message.extendedTextMessage?.contextInfo?.quotedMessage

    // MUTE
    if(isGroup && mutedUsers.has(sender)){ try{ await sock.sendMessage(from,{delete:m.key}) }catch{} return }
    // AFK check
    if(text && afkUsers[sender]){ afkUsers[sender]=null; await sock.sendMessage(from,{text:`Welcome back @${sender.split('@')[0]} - AFK off`, mentions:[sender]}) }
    // ANTILINK
    if(isGroup && antilink.has(from) && /https?:\/\/|www\.|wa\.me|chat\.whatsapp\.com/i.test(text)){
      let meta = await sock.groupMetadata(from); let isAdmin = !!meta.participants.find(p=>p.id===sender)?.admin
      if(!isAdmin){ await sock.sendMessage(from,{delete:m.key}); await sock.sendMessage(from,{text:`🚫 Link deleted @${sender.split('@')[0]}`, mentions:[sender]}); return }
    }

    // EXP
    if(text && !text.startsWith(PREFIX)){
      let res = addExp(sender)
      if(res.leveled) await sock.sendMessage(from,{text:`⬆️ LEVEL UP! @${sender.split('@')[0]} is now Level ${res.level} 👑 ${KINGDOM}`, mentions:[sender]})
    }
    if(!text.startsWith(PREFIX)) return

    const args = text.slice(1).split(/ +/); const cmd = args[0].toLowerCase(); const q = args.slice(1).join(' ')
    const mentionedJid = m.message.extendedTextMessage?.contextInfo?.mentionedJid || []
    let meta, participants=[], isBotAdmin=false, isSenderAdmin=false
    if(isGroup){ try{ meta=await sock.groupMetadata(from); participants=meta.participants; let botId=sock.user.id.split(':')[0]+'@s.whatsapp.net'; isBotAdmin=!!participants.find(p=>p.id===botId||p.id===sock.user.id)?.admin; isSenderAdmin=!!participants.find(p=>p.id===sender)?.admin || sender===OWNER_JID }catch{} }
    const reply=(t,mn=[])=>sock.sendMessage(from,{text:t, mentions:mn})

    // === MENU ===
   if(['menu','help','commands'].includes(cmd)){
return reply(
`╭━━━〔 👑 BJOHMEIR 〕━━━┈⊷
┃  Prefix: .
┃  Owner: Benjamin Bright
┃  Number: 07041971847
┃  Mode: HARD EXP (500/level)
┃  Cooldown: 2 Minutes
╰━━━━━━━━━━━━━━━━━━┈⊷

┏━━〔 💬 INTERACTION 〕━┈⊷
┃ .hug @user
┃ .kiss @user
┃ .slap @user
┃ .pat @user
┃ .cuddle @user
┃ .kill @user
┃ .punch @user
┃ .bonk @user
┃ .dance @user
┃ .smile @user
┃ .laugh @user
┃ .cry @user
┃ .blush @user
┗━━━━━━━━━━━━━━━┈⊷

┏━━〔 😂 FUN & GAMES 〕━┈⊷
┃ .ship @user @user - Check love %
┃ .joke - Random joke
┃ .meme - Random meme
┃ .truth - Truth question
┃ .dare - Dare challenge
┃ .wyr - Would You Rather
┗━━━━━━━━━━━━━━━┈⊷

┏━━〔 🔍 SEARCH 〕━┈⊷
┃ .pint <query> - Pinterest images
┃ .wallpaper <query>
┃ .play <song name>
┃ .lyrics <song name>
┗━━━━━━━━━━━━━━━┈⊷

┏━━〔 🤖 AI SYSTEM 〕━┈⊷
┃ .gpt <question> - Ask AI
┃ .tldr <long text> - Summarize
┗━━━━━━━━━━━━━━━┈⊷

┏━━〔 🔄 CONVERTER 〕━┈⊷
┃ .s / .sticker - Reply to image/video
┃ .toimg - Reply to sticker to image
┃ .tts <text> - Text to voice
┗━━━━━━━━━━━━━━━┈⊷

┏━━〔 🛠️ UTILITY 〕━┈⊷
┃ .ping - Check speed
┃ .owner - Owner info
┃ .ranks - List all ranks
┃ .level [@user] - Check level & EXP
┃ .exp [@user]
┃ .rules - Group rules
┃ .afk <reason> - Set AFK
┗━━━━━━━━━━━━━━━┈⊷

┏━━〔 🔧 ADMIN ONLY 〕━┈⊷
┃ .admin - List admins
┃ .kick @user
┃ .mute @user - Mute messages
┃ .unmute @user
┃ .promote @user
┃ .demote @user
┃ .tagall <message>
┃ .close - Close group
┃ .open - Open group
┃ .antilink on / off
┗━━━━━━━━━━━━━━━┈⊷

┏━━〔 👑 ROYALTY 〕━┈⊷
┃ .crown <title> @user
┃ .newrank <name> <level>
┃ .delrank <name>
| .Rank
┗━━━━━━━━━━━━━━━┈⊷

   Kingdom: BJOHMEIR - All Systems Active
   © 2026 Benjamin Bright`
)
}



    // UTIL
    if(cmd==='ping') return reply(`Pong 🏓 ${Date.now()%1000}ms | ${KINGDOM} Hard EXP active`)
    if(cmd==='owner') return reply(`👑 Owner: Benjamin Bright\nNumber: 07041971847\nKingdom: ${KINGDOM}`,[OWNER_JID])
    if(cmd==='ranks'){ let t=`*RANKS ${Object.keys(ranksData).length}*\n`; for(let k in ranksData) t+=`• ${k} : ${ranksData[k]}\n`; return reply(t) }
    if(['level','exp','lvl'].includes(cmd)){ let target=mentionedJid[0]||sender; let u=economy[target]||{level:1,exp:0,coins:0}; return reply(`*LEVEL*\n@${target.split('@')[0]}\nLevel: ${u.level}\nEXP: ${u.exp}/${u.level*500}\nCoins: ${u.coins}\nTitle: ${u.title||'Slave'}`,[target]) }
    if(cmd==='afk'){ afkUsers[sender]={reason:q||'AFK', time:Date.now()}; return reply(`@${sender.split('@')[0]} is now AFK: ${q}`,[sender]) }

    // FUN
    if(['joke'].includes(cmd)) return reply(['Why did Bjohmeir cross the road? To grind EXP 😂','I told my bot a joke, it leveled up!','Hard EXP hits harder than your ex'][Math.floor(Math.random()*3)])
    if(['meme'].includes(cmd)) return sock.sendMessage(from,{image:{url:'https://i.imgflip.com/1bij.jpg'}, caption:`${KINGDOM} Meme 😂`})
    if(['truth'].includes(cmd)) return reply(`Truth: Who in this group do you secretly respect? ${KINGDOM}`)
    if(['dare'].includes(cmd)) return reply(`Dare: Send "I love ${KINGDOM}" in 3 groups 😈`)
    if(['wyr'].includes(cmd)) return reply(`Would You Rather: Have 1000 EXP or be King for a day?`)
    if(cmd==='ship'){ let a=mentionedJid[0], b=mentionedJid[1]; if(!a||!b) return reply('.ship @user1 @user2'); let per=Math.floor(Math.random()*101); return reply(`💘 SHIP: @${a.split('@')[0]} + @${b.split('@')[0]} = ${per}% ${per>80?'PERFECT MATCH 👑':per>50?'Maybe ❤️':'Nah 💔'}`,[a,b]) }

    // INTERACTION
    const interactions = ['hug','kiss','slap','pat','kill','cuddle','punch','bonk','dance','smile','laugh','cry','blush']
    if(interactions.includes(cmd)){
      let target=mentionedJid[0]; if(!target) return reply(`Use .${cmd} @user`)
      const gifs = { hug:'🤗', kiss:'😘', slap:'👋', pat:'🐾', kill:'💀', cuddle:'🫂', punch:'👊', bonk:'🔨', dance:'💃', smile:'😊', laugh:'😂', cry:'😭', blush:'😳' }
      return sock.sendMessage(from,{text:`${gifs[cmd]} @${sender.split('@')[0]} ${cmd}ed @${target.split('@')[0]}`, mentions:[sender,target]})
    }

    // STICKER SYSTEM
    if(['sticker','s'].includes(cmd)){
      if(m.message.imageMessage || m.message.videoMessage || quoted?.imageMessage || quoted?.videoMessage){
        let msgToUse = m.message.imageMessage||m.message.videoMessage ? m : {message: quoted}
        await makeSticker(sock, from, msgToUse)
      } else return reply('Reply to an image/video with .s to make sticker 🖼️ ➡️ sticker')
    }
    if(cmd==='toimg'){
      if(!quoted?.stickerMessage) return reply('Reply to a sticker with .toimg')
      try{
        let buff = await downloadMediaMessage({message:quoted}, 'buffer', {}, {logger:P({level:'silent'}), reuploadRequest:sock.updateMediaMessage})
        await sock.sendMessage(from,{image:buff, caption:`Converted by ${KINGDOM}`})
      }catch(e){ reply('Failed to convert') }
    }

    // ADMIN
    if(cmd==='admin'){ if(!isGroup) return reply('Group only'); let admins=participants.filter(p=>p.admin); return sock.sendMessage(from,{text:`*ADMINS ${admins.length}*\n`+admins.map(p=>`• @${p.id.split('@')[0]}`).join('\n'), mentions:admins.map(p=>p.id)}) }
    if(['kick','mute','unmute','promote','demote'].includes(cmd)){
      if(!isGroup) return reply('Group only'); if(!isSenderAdmin) return reply('Admin only 👑'); if(!isBotAdmin) return reply('Bot must be admin'); let target=mentionedJid[0]; if(!target) return reply(`Tag user: .${cmd} @user`); if(target===OWNER_JID) return reply('Cannot touch owner');
      try{
        if(cmd==='kick'){ await sock.groupParticipantsUpdate(from,[target],'remove'); return reply(`Kicked @${target.split('@')[0]} 💥`,[target]) }
        if(cmd==='mute'){ mutedUsers.add(target); return reply(`Muted @${target.split('@')[0]} 🔇`,[target]) }
        if(cmd==='unmute'){ mutedUsers.delete(target); return reply(`Unmuted @${target.split('@')[0]} 🔊`,[target]) }
        if(cmd==='promote'){ await sock.groupParticipantsUpdate(from,[target],'promote'); return reply(`Promoted @${target.split('@')[0]} 👑`,[target]) }
        if(cmd==='demote'){ await sock.groupParticipantsUpdate(from,[target],'demote'); return reply(`Demoted @${target.split('@')[0]}`,[target]) }
      }catch(e){ return reply('Fail: '+e.message) }
    }
    if(cmd==='tagall'){ if(!isSenderAdmin) return reply('Admin only'); let txt=q||'Attention'; await sock.sendMessage(from,{text:`📢 *${txt}*\n`+participants.map(p=>`@${p.id.split('@')[0]}`).join(' '), mentions:participants.map(p=>p.id)}) }
    if(['close','open'].includes(cmd)){ if(!isBotAdmin) return reply('Bot admin needed'); await sock.groupSettingUpdate(from, cmd==='close'?'announcement':'not_announcement'); return reply(cmd==='close'?'🔒 Group Closed':'🔓 Group Opened') }
    if(cmd==='antilink'){ if(!isSenderAdmin) return reply('Admin only'); if(q==='on'){ antilink.add(from); return reply('Antilink ON 🚫🔗') } if(q==='off'){ antilink.delete(from); return reply('Antilink OFF') } return reply('.antilink on/off') }

    // ROYALTY
    if(cmd==='crown'){ let target=mentionedJid[0]; let title=args[1]; if(!target||!title) return reply('.crown [title] @user'); if(economy[target]) economy[target].title=title; saveEconomy(); return reply(`👑 Crowned @${target.split('@')[0]} as ${title}`,[target]) }
    if(cmd === 'ranks'){
let txt = `╭━━〔 👑 BJOHMEIR RANKS - ${Object.keys(ranks).length} 〕━━┈⊷\n`
let sorted = Object.entries(ranks).sort((a,b) => (b[1].power || b[1] || 0) - (a[1].power || a[1] || 0))
for(let [name, data] of sorted){
 let power = typeof data === 'object' ? (data.power || data.level || 0) : data
 let emoji = power >= 100 ? '👑' : power >= 80 ? '⚔️' : power >= 50 ? '🛡️' : '🔰'
 txt += `┃ ${emoji} ${name} : Level ${power}\n`
}
txt += `╰━━━━━━━━━━━━━━━┈⊷\n\nUse .crown <Rank> @user to assign`
return reply(txt)
}
    // PLACEHOLDERS for search/AI (you can add API later)
    if(['pint','wallpaper','play','lyrics','gpt','tldr','tts'].includes(cmd)) return reply(`*${cmd}* command is installed - Add your API key in index.js line for search/AI. Sticker + Admin + EXP already works ✅`)
  })
}
startBot()