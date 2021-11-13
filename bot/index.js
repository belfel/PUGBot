const Discord = require('discord.js');
const config = require('./config.json');
const client = new Discord.Client();
const SQLite = require("better-sqlite3");
const sql = new SQLite('./db.sqlite');


client.on("ready", () => {
    const table = sql.prepare("SELECT count(*) FROM sqlite_master WHERE type='table' AND name = 'db';").get();
    if (!table['count(*)']) {
        sql.prepare("CREATE TABLE db (id TEXT PRIMARY KEY, user TEXT);").run();
        sql.prepare("CREATE UNIQUE INDEX idx_db_id ON db (id);").run();
        sql.pragma("synchronous = 1");
        sql.pragma("journal_mode = wal");
    }

    client.getData = sql.prepare("SELECT * FROM db WHERE id = ?");
    client.setData = sql.prepare("INSERT OR REPLACE INTO db (id, user) VALUES (@id, @user);");
    client.removeData = sql.prepare("DELETE FROM db WHERE id = ?");

    let channel = client.channels.get(config.hiddenChannelID);
    channel.send("PUG Bot is now online. If I crashed type !crash for more information.")

    let channel2 = client.channels.get(config.reactionChannelID);
    channel2.fetchMessages({ limit: 5 }).then(messages => {
        let lastMessage = messages.first();
        messages.remove(lastMessage);
        console.log(lastMessage.content);
    });
});

client.on('message', message => {

    if (message.content == '!new')
    {
        let channel = client.channels.get(config.reactionChannelID);
        channel.fetchMessages({ limit: 1 }).then(messages => {
            let lastMessage = messages.first();
            config.messageID = lastMessage.id;
            lastMessage.react('😄');
        });
    }

    else if (message.content == '!who') 
    {
        const users = sql.prepare("SELECT * FROM db ORDER BY id DESC;").all();
        
        var players = '';
        var amount = 0
        for (const data of users)
        {
            players = players.concat(`${data.user}, `);
            amount += 1;
        }    
        players = players.concat(`TOTAL: `, amount);
        message.channel.send(players);
    }

    else if (message.content == '!start')
    {
        const users = sql.prepare("SELECT * FROM db").all();
        let channel = client.channels.get(config.pugChannelID);
        var players = '';
        for (const data of users)
        {
            players = players.concat(`<@${data.id}>, `);
        }
        players = players.concat("the PUG has been started.")
        channel.send(players);
    }
    else if (message.content == '!crash')
    {
        message.reply("Please do suck a dick agagaga");
    }
    else if (message.content == '!end')
    {
        const users = sql.prepare("SELECT * FROM db").all();
        for (const data of users)
        {
            client.removeData.run(`${data.id}`);
        }
    }
})

client.on('messageReactionAdd', (reaction, user) => {
        let message = reaction.message, emoji = reaction.emoji;
    
    if (user.id == config.botID)
    {
        return;
    }

    if (message.id == config.messageID)
    {
        let data = client.getData.get(user.id);
        let channel = client.channels.get(config.pugChannelID);
        if (!data)
        {
            data = {id: user.id, user: user.username};
            client.setData.run(data);
            channel.send(`<@${user.id}> has signed for this week's PUGs`);
        }
        else
        {
            client.removeData.run(user.id);
            channel.send(`<@${user.id}> has checked out from this week's PUGs`);
        }
    }

    if (message.channel.id == config.reactionChannelID)
    {
        reaction.remove(user);
    }
});

client.login(config.token);