require('dotenv').config();
const { Client, GatewayIntentBits, ChannelType, Partials, SlashCommandBuilder, REST, Routes } = require('discord.js');
const { runGemini } = require('./gemini.js');
const { processFile } = require('./fileHandler.js'); 
const express = require('express');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
    ]
});

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('BOT IS UPPP!'); 
});

app.listen(PORT, () => {
    console.log(`Web server is running on port ${PORT}`);
});

client.login(process.env.TOKEN);

client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);

    const commands = [
        new SlashCommandBuilder()
            .setName('processfile')
            .setDescription('Upload a file and process it with a prompt')
            .addStringOption(option => 
                option.setName('prompt')
                    .setDescription('Prompt for processing the file')
                    .setRequired(true)) 
            .addAttachmentOption(option => 
                option.setName('file')
                    .setDescription('The file to be processed')
                    .setRequired(true)), 
            
         // Add the /bug command here
         new SlashCommandBuilder()
         .setName('bug')
         .setDescription('Report a bug in the bot')
         .addStringOption(option =>
             option.setName('description')
                 .setDescription('Describe the bug you encountered')
                 .setRequired(true))
    ];
    

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );
        console.log('Slash commands registered successfully');
    } catch (error) {
        console.error('Error registering slash commands:', error);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'processfile') {
        const prompt = interaction.options.getString('prompt');
        const attachment = interaction.options.getAttachment('file');

        await interaction.deferReply(); 

        if (attachment) {
            try {
                const fileContent = await processFile(attachment);

                if (fileContent) {
                    const finalPrompt = `${prompt}\n\nFile content: ${fileContent}`;
                    const result = await runGemini(finalPrompt);
                    const responseChunks = splitResponse(result);
                    responseChunks.forEach(async (responseChunk) => {
                        await interaction.editReply(responseChunk); 
                    });
                } else {
                    await interaction.editReply('Sorry, I could not process this file type.');
                }
            } catch (error) {
                console.error(`Error processing file: ${error}`);
                await interaction.editReply('An error occurred while processing the file.');
            }
        } else {
            await interaction.editReply('Please attach a file to process.');
        }
    }
});
const { EmbedBuilder } = require('discord.js'); // Use EmbedBuilder instead of MessageEmbed for v14+

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const { commandName, options } = interaction;

  if (commandName === 'bug') {
    let bugDescription = options.getString('description');
    let referencedMessage = interaction.options.getMessage('message');
    
    // Create the embed
    const bugEmbed = new EmbedBuilder() // Use EmbedBuilder
      .setColor('#ff0000') // Red color for bugs
      .setTitle('Bug Report')
      .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() }) // Adding user profile pic and name
      .setTimestamp();

    // Case 1: Direct bug report
    if (!referencedMessage) {
      bugEmbed.setDescription(`**Bug Description:**\n${bugDescription}`);
    }
    
    // Case 2: Referenced message bug report
    else {
      let messageLink = `https://discord.com/channels/${interaction.guild.id}/${referencedMessage.channel.id}/${referencedMessage.id}`;
      
      bugEmbed.setDescription(`**Bug Description:**\n${bugDescription}`)
              .addFields(
                { name: 'Reported Message', value: referencedMessage.content || 'No content' }, // Show the message content
                { name: 'Message Link', value: `[Click Here](${messageLink})` }, // Provide link to the message
                { name: 'Message Author', value: `${referencedMessage.author.tag}` } // Show the original author's name
              );
    }

    // Send the embed to bot-bugs channel
    let bugChannel = interaction.guild.channels.cache.find(c => c.name === 'bot-bugs');
    if (bugChannel) {
      await bugChannel.send({ embeds: [bugEmbed] });
      await interaction.reply({ content: 'Bug report has been submitted successfully!', ephemeral: true });
    } else {
      await interaction.reply({ content: 'Could not find the bug report channel.', ephemeral: true });
    }
  }
});
const keywords = ['stfu', 'damn', 'come alive', 'gay', "for fuck's sake", "kill", "stupid", "deadline", "gn", "gm", "good night", "good morning", "tc", "fast", "asap"]; 

client.on('messageCreate', async message => {
    console.log(`Received message: ${message.content}`);
    if (message.author.bot) return; 

    const lowerCaseContent = message.content.toLowerCase();
    if (message.mentions.has(client.user.id)) {
        if (lowerCaseContent.includes('man up?')) {
            try {
                const prompt = `You are a Discord bot. When a user tags you and asks "man up?", generate a funny auto-responder message. Keep it short,NO MORE THAN ONE LINE(one response, dont list down many matchinig responses), to avoid clutter on the Discord server.(example: "Alyways 24x8 im up 😏", "Bruh, I’ve been up since 200 lines of code ago! 😏💻", "Yup, no downtime here! 😎💻" )`;
                const result = await runGemini(prompt);
                await message.reply(result);
                return;
            } catch (error) {
                console.error('Error sending "MAN UP?" response via Gemini:', error);
                await message.reply('Oops! Something went wrong while generating the response.');
                return;
            }
        } else if (lowerCaseContent.includes('ping')) {
            try {
                const prompt = `You are a Discord bot. When a user tags you and says "ping", generate a funny, quick auto-responder message. Keep it short, no more than one line, to avoid clutter on the Discord server.(example: "Pong! 🏓 Quick as ever" , "Ping received! Now, what’s good? 😎", "Pong! 🔥 I'm always on point!")`;
                const result = await runGemini(prompt);
                await message.reply(result);
                return; 
            } catch (error) {
                console.error('Error sending "ping" response via Gemini:', error);
                await message.reply('Oops! Something went wrong while generating the response.');
                return;
            }
        } else if (lowerCaseContent.includes('up?')) {
            try {
                const prompt = `You are a Discord bot. When a user tags you and says "UP?", generate a funny, relaxed auto-responder message. NO MORE THAN ONE LINE(one response, dont list down many matchinig responses). (example: "Yup, I’m always up! 😎", "Always up and running! 😏", "Yup, no downtime here! 😎💻")`;
                const result = await runGemini(prompt);
                await message.reply(result);
                return; 
            } catch (error) {
                console.error('Error sending "UP?" response via Gemini:', error);
                await message.reply('Oops! Something went wrong while generating the response.');
                return;
            }
        }
    }

    for (const keyword of keywords) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'i'); 
        if (regex.test(lowerCaseContent)) {
            try {
                const result = await runGemini(`You are a Discord bot in a computer faculty students server that gives funny autoreponders when detecting specific keywords in msgs. Write a funny autorespond message when the user sends the word "${keyword}". Please provide a single funny and chill reply with emojis. If the topic is sensitive or could be considered harassment, respond with a light-hearted joke instead. Don't give the finishReason: "SAFETY" error. Here’s the user complete message: "${message.content}". And don't send multiple messages; send one line at a time so the reply looks clean on the server.`); 
                await message.reply(result);
            } catch (error) {
                console.error('Error occurred while processing message:', error);
                if (error.message.includes('SAFETY')) {
                    await message.reply('Haha, let’s keep things chill! 😅 How about a coding joke instead? 💻');
                } else {
                    await message.reply('Oops! Something went wrong while processing your message. Please try again later. 🤖');
                }
            }
            return;
        }
    }

    // Handle DMs for regular text message prompts
    if (message.channel.type === ChannelType.DM) {
        console.log(`Received DM from ${message.author.tag}: ${message.content}`);

        const result = await runGemini(message.content);
        const responseChunks = splitResponse(result);
        responseChunks.forEach(async (responseChunk) => {
            await message.reply(responseChunk);
        });
    }

    // Handle file uploads in server text channels
    if (message.channel.type === ChannelType.GuildText) {
        if (!message.mentions.has(client.user.id)) return; 

        if (message.attachments.size > 0) {
            console.log(`File uploaded by ${message.author.tag}`);
            for (const attachment of message.attachments.values()) {
                try {
                    const fileContent = await processFile(attachment);

                    if (fileContent) {
                        console.log(`Processing file: ${attachment.name}`);
                        const result = await runGemini(fileContent);
                        const responseChunks = splitResponse(result);
                        responseChunks.forEach(async (responseChunk) => {
                            await message.reply(responseChunk); 
                        }); 
                    } else {
                        await message.reply('Sorry, I could not process this file type.');
                    }
                } catch (error) {
                    console.error(`Error processing file: ${error}`);
                    await message.reply('An error occurred while processing the file.');
                }
            }
        } else {
            // Handle text messages or replies to other messages
            const referencedMessage = message.reference
                ? await message.channel.messages.fetch(message.reference.messageId)
                : null;

            if (referencedMessage) {
                console.log(`Bot was tagged to a message reference in guild ${message.guild.name}`);
                console.log(`Referenced message: ${referencedMessage.content}`);

                const result = await runGemini(referencedMessage.content);
                const responseChunks = splitResponse(result);
                responseChunks.forEach(async (responseChunk) => {
                    await message.reply(responseChunk); 
                }); 
            } else {
                console.log(`Received message without reference: ${message.content}`);

                const result = await runGemini(message.content);
                const responseChunks = splitResponse(result);
                responseChunks.forEach(async (responseChunk) => {
                    await message.reply(responseChunk); 
                }); 
            }
        }
    }
});

function splitResponse(response) {
    const maxChunkLength = 2000;
    let chunks = [];
    for (let i = 0; i < response.length; i += maxChunkLength) {
        chunks.push(response.substring(i, i + maxChunkLength));
    }
    return chunks;
}