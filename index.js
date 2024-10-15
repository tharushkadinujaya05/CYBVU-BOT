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

        // AI Response using API in DM
        const result = await runGemini(message.content);
        message.reply(result);
 } 
    // Handle Guild Messages
    if (message.channel.type === ChannelType.GuildText) {
        if (!message.mentions.has(client.user.id)) return; // Ignore messages that didn't mention the bot

        // Check if the message is a reply to another message
        const referencedMessage = message.reference
            ? await message.channel.messages.fetch(message.reference.messageId)
            : null;

        if (referencedMessage) {
            console.log(`Bot was tagged to a message reference in guild ${message.guild.name}`);
            console.log(`Referenced message: ${referencedMessage.content}`);

            // Use Gemini to process the referenced message
            const result = await runGemini(referencedMessage.content);
            message.reply(result);
        } else {
            console.log(`Received message without reference: ${message.content}`);
            // Regular message handling, pass the current message to Gemini
            const result = await runGemini(message.content);
            message.reply(result);
        }
    }
});