require ('dotenv').config();
const {Client, GatewayIntentBits, ChannelType, Partials} = require('discord.js');
const {runGemini} = require('./gemini.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
    ]
});

client.login(process.env.TOKEN);

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async message => {
    if (message.author.bot) return; // Ignore bots
    if (message.channel.type === ChannelType.DM) {
        console.log(`Received DM from ${message.author.tag}: ${message.content}`);

        // AI Response using API
        const result = await runGemini(message.content);
        message.reply(result);
 } 
    if (message.channel.type === ChannelType.GuildText) {
        if (!message.mentions.has(client.user.id)) return; // Ignore messages that didnt't mention the bot
        else {
            const userId = message.author.id;
            console.log(`Received message in guild ${message.guild.name} from ${message.author.tag}: ${message.content}`);
            
        // AI Response using API
        const result = await runGemini(message.content);
        message.reply(result);
        }
    }
});