require('dotenv').config();
const { Client, GatewayIntentBits, ChannelType, Partials, SlashCommandBuilder, REST, Routes } = require('discord.js');
const { runGemini } = require('./gemini.js');
const { processFile } = require('./fileHandler.js'); 
const express = require('express');
const axios = require('axios');
const { EmbedBuilder } = require('discord.js'); 

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
    res.send('Suspenede by owner'); 
});

app.listen(PORT, () => {
    console.log(`Web server is running on port ${PORT}`);
});

let lastMessage; // Variable to hold the last sent message
let startTime; // Variable to hold the start time of the bot

client.on('ready', async () => {
    startTime = new Date(); // Record the start time when the bot is ready
    const channelId = '1296576918728212612';
    const channel = await client.channels.fetch(channelId);

    // Function to send a message every 5 minutes
    setInterval(async () => {
        try {
            // Check the status of the bot from the Render app
            const response = await axios.get('https://cybvu-bot.onrender.com/');
            const body = response.data; // Get the response body

            // Calculate uptime
            const uptime = Math.floor((Date.now() - startTime) / 1000); // Uptime in seconds
            const minutes = Math.floor(uptime / 60); // Convert to minutes
            const seconds = uptime % 60; // Remaining seconds
            const uptimeString = `${minutes} minutes and ${seconds} seconds`;

            // Create an embed message based on the response
            const embed = new EmbedBuilder()
                .setColor('#3A3EDB') 
                .setTitle('🔔 Bot Status Update');

            // Check if the body contains "BOT IS UPPP!"
            if (response.status === 200 && body.includes('BOT IS UPPP!')) {
                embed
                    .setColor('#3A3EDB')
                    .setTitle('🔔 Bot Status Update ')
                    .setDescription('**Bot is active!** 🗿<:wumpus_congrats:1296622027289137217>\n\nStay tuned for updates and features!')
                    .addFields(
                        { name: '🤖 Current Status', value: 'Online', inline: true }, 
                        { name: '🕒 Uptime', value: uptimeString, inline: true }, // Use dynamic uptime
                        { name: '📅 Last Restart', value: new Date().toLocaleString(), inline: true }
                    )
                    .setThumbnail('https://cdn3.emoji.gg/emojis/1237-wumpusbeyondsmile.png') 
                    .setFooter({ text: 'CYBVU BOT  <:icon:1295015539139280937>'}) 
                    .setTimestamp();
            }

            // Delete the last message if it exists
            if (lastMessage) {
                await lastMessage.delete();
            }

            // Send the new embed message
            lastMessage = await channel.send({ embeds: [embed] });

            console.log('Sent a message to #bot-testing');

        } catch (error) {
            console.error('Error checking bot status:', error);

            // Handle 503 errors specifically
            if (error.response && error.response.status === 503) {
                const embed = new EmbedBuilder()
                    .setColor('#FF0000') // Red color for inactive status
                    .setTitle('🔴 Bot Status Update')
                    .setDescription('**Bot is inactive!** 🔴\n\nThe server is temporarily unavailable (503). Please check back later.')
                    .addFields(
                        { name: '🤖 Current Status', value: 'Offline', inline: true }, 
                        { name: '🕒 Uptime', value: 'N/A', inline: true },
                        { name: '📅 Last Restart', value: new Date().toLocaleString(), inline: true }
                    )
                    .setThumbnail('https://example.com/thumbnail.png') // Replace with your image URL
                    .setFooter({ text: 'Thank you for your patience!', iconURL: 'https://example.com/footer-icon.png' }) // Replace with your icon URL
                    .setTimestamp();

                if (lastMessage) {
                    await lastMessage.delete();
                }

                lastMessage = await channel.send({ embeds: [embed] });

            } else {
                // Handle other errors (non-503)
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF0000') // Red color for errors
                    .setTitle('⚠️ Error Updating Bot Status')
                    .setDescription('An error occurred while checking the bot status. Please investigate!')
                    .addFields(
                        { name: 'Error Message', value: error.message, inline: false },
                        { name: '📅 Last Restart', value: new Date().toLocaleString(), inline: true }
                    )
                    .setTimestamp();

                if (lastMessage) {
                    await lastMessage.delete();
                }

                lastMessage = await channel.send({ embeds: [errorEmbed] });
            }
        }
    }, 0.1 * 60 * 1000); // every 5 minutes
});

// Keeping the bot alive
setInterval(() => {
    axios.get('https://cybvu-bot.onrender.com')
        .then(response => {
            console.log('Keeping the bot alive:', response.data);
        })
        .catch(error => {
            console.error('Error keeping the bot alive:', error.message);
        });
}, 5 * 60 * 1000); // every 5 minutes

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

        // /quizmode
        new SlashCommandBuilder()
            .setName('quizmode')
            .setDescription('Generate a quiz from a file')
            .addAttachmentOption(option =>
                option.setName('file')
                    .setDescription('Upload the file for the quiz')
                    .setRequired(true))
            .addIntegerOption(option =>
                option.setName('questions')
                    .setDescription('Number of questions to generate')
                    .setRequired(true))
            .addStringOption(option =>
                option.setName('type')
                    .setDescription('Type of quiz: MCQ or Essay')
                    .addChoices(
                        { name: 'MCQ', value: 'mcq' },
                        { name: 'Essay', value: 'essay' }
                    )
                    .setRequired(true)),

        // /slidesummarizer
        new SlashCommandBuilder()
            .setName('slidesummarizer')
            .setDescription('Summarize a slide deck')
            .addAttachmentOption(option =>
                option.setName('file')
                    .setDescription('Upload the file to summarize')
                    .setRequired(true)),

        // /bug with severity level and optional message link
        new SlashCommandBuilder()
            .setName('bug')
            .setDescription('Report a bug in the bot')
            .addStringOption(option =>
                option.setName('description')
                    .setDescription('Describe the bug you encountered')
                    .setRequired(true))
            .addStringOption(option =>
                option.setName('severity')
                    .setDescription('Bug severity level')
                    .addChoices(
                        { name: 'Low', value: 'low' },
                        { name: 'Medium', value: 'medium' },
                        { name: 'High', value: 'high' }
                    )
                    .setRequired(true))
            .addStringOption(option =>
                option.setName('message_link')
                    .setDescription('Optional: Paste the link to the message you are referencing.')
                    .setRequired(false)) 
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
    } else if (commandName === 'slidesummarizer') {
        const file = options.getAttachment('file');

        await interaction.deferReply();

        if (file) {
            try {
                const fileContent = await processFile(file);
                if (fileContent) {
                    const summaryPrompt = `Summarize the content slide by slide in a brief manner. Content: ${fileContent}`;
                    const result = await runGemini(summaryPrompt);
                    await interaction.editReply(result);
                } else {
                    await interaction.editReply('Unable to process the file.');
                }
            } catch (error) {
                await interaction.editReply('An error occurred while summarizing the slides.');
            }
        }

    } 
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName, options } = interaction;

    if (commandName === 'bug') {
        try {
            let bugDescription = options.getString('description');
            let severity = options.getString('severity'); // Get the severity level
            let referencedMessageLink = options.getString('message_link'); // Get the optional message link

            // Defer the reply to avoid interaction timeout
            await interaction.deferReply({ ephemeral: false });

            // Send the bug report to #bot-bugs
            const bugChannel = interaction.guild.channels.cache.find(c => c.name === 'bot-bugs');
            if (!bugChannel) {
                return await interaction.followUp({ content: 'Could not find the bug report channel.' });
            }

            // Define colors based on severity
            let embedColor;
            if (severity === 'low') {
                embedColor = '#00FF00';
            } else if (severity === 'medium') {
                embedColor = '#FFFF00';
            } else if (severity === 'high') {
                embedColor = '#FF0000'; 
            } else {
                embedColor = '#000000'; 
            }

            // Create a bug report embed
            const bugEmbed = new EmbedBuilder()
                .setColor(embedColor) // Set color based on severity
                .setTitle('Bug Report')
                .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp()
                .setDescription(`**Bug Description:**\n${bugDescription}`)
                .addFields({ name: 'Severity', value: severity, inline: true });

            // If the user provided a referenced message link, include it
            if (referencedMessageLink) {
                bugEmbed.addFields(
                    { name: '🔗 Message Link', value: `${referencedMessageLink} ` }
                );
            }

            // Send confirmation message to the user
            const confirmationMessage = await interaction.followUp({ content: 'Bug report has been submitted successfully!' });

            // Get the URL of the confirmation message (bot's response)
            let confirmationMessageUrl = `https://discord.com/channels/${interaction.guild.id}/${interaction.channel.id}/${confirmationMessage.id}`;

            // Add the bot's confirmation message URL to the bug report embed
            bugEmbed.addFields(
                { name: '💬 Confirmation Message', value: `[Click Here to View Confirmation Message](${confirmationMessageUrl})` }
            );

            // Send the bug report embed to the bug channel
            await bugChannel.send({ embeds: [bugEmbed] });

        } catch (error) {
            console.error('Error handling bug report:', error);

            // Handle specific error if it's related to the API being unavailable
            if (error.status === 503) {
                await interaction.followUp({ content: 'The Discord service is currently unavailable. Please try again later.' });
            } else {
                await interaction.followUp({ content: 'An error occurred while submitting your bug report.' });
            }
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
// Helper function to split large responses
function splitResponse(response) {
    const maxChunkLength = 2000;
    let chunks = [];
    for (let i = 0; i < response.length; i += maxChunkLength) {
        chunks.push(response.substring(i, i + maxChunkLength));
    }
    return chunks;
}