require('dotenv').config();
const { Client, GatewayIntentBits, ChannelType, Partials, SlashCommandBuilder, REST, Routes } = require('discord.js');
const { runGemini } = require('./gemini.js');
const { processFile } = require('./fileHandler.js'); // File handling version: Require the file processing handler for different formats
const express = require('express'); // Import express

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

// Create an Express app
const app = express();
const PORT = process.env.PORT || 3000; // Use environment variable or default to 3000

// Simple endpoint to show bot status
app.get('/', (req, res) => {
    res.send('BOT IS UPPP!'); // Response when accessing the root URL
});

// Start the web server
app.listen(PORT, () => {
    console.log(`Web server is running on port ${PORT}`);
});

client.login(process.env.TOKEN);

// Register slash commands
client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);

    // Register the /processfile slash command
    const commands = [
        new SlashCommandBuilder()
            .setName('processfile')
            .setDescription('Upload a file and process it with a prompt')
            .addStringOption(option => 
                option.setName('prompt')
                    .setDescription('Prompt for processing the file')
                    .setRequired(true)) // Add prompt input
            .addAttachmentOption(option => 
                option.setName('file')
                    .setDescription('The file to be processed')
                    .setRequired(true)), // Add file upload option
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

// Slash command handling
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'processfile') {
        const prompt = interaction.options.getString('prompt');
        const attachment = interaction.options.getAttachment('file');

        // Acknowledge the interaction with an initial response
        await interaction.deferReply(); // Acknowledge the interaction, gives you more time to respond

        // File handling version: Process the uploaded file
        if (attachment) {
            try {
                // Pass the file to processFile handler
                const fileContent = await processFile(attachment);

                if (fileContent) {
                    // Run the Gemini API with both the prompt and the file content
                    const finalPrompt = `${prompt}\n\nFile content: ${fileContent}`;
                    const result = await runGemini(finalPrompt);

                    // Send response back to the user
                    await interaction.editReply(result); // Edit the initial response
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

// Array of keywords to listen for
const keywords = ['stfu', 'damn', 'come alive', 'gay', "for fuck's sake", "kill", "stupid", "deadline"]; 

client.on('messageCreate', async message => {
    console.log(`Received message: ${message.content}`);
    if (message.author.bot) return; // Ignore bots

    // Convert the message content to lowercase for case-insensitive matching
    const lowerCaseContent = message.content.toLowerCase();
    if (message.mentions.has(client.user.id)) {
        // Custom handling for "MAN UP?"
        if (lowerCaseContent.includes('man up?')) {
            try {
                // Generate a cool vibe response using Gemini
                const prompt = `You are a Discord bot. When a user tags you and asks "man up?", generate a funny auto-responder message. Keep it short, no more than one line, so it doesn't look messy on the Discord server.`;
                const result = await runGemini(prompt);
                await message.reply(result);
                return; // Exit to avoid falling through to Gemini
            } catch (error) {
                console.error('Error sending "MAN UP?" response via Gemini:', error);
                await message.reply('Oops! Something went wrong while generating the response.');
                return;
            }
        }

        // Custom handling for "ping"
        else if (lowerCaseContent.includes('ping')) {
            try {
                // Generate a response using Gemini
                const prompt = `You are a Discord bot. When a user tags you and says "ping", generate a funny, quick auto-responder message. Keep it short, no more than one line, to avoid clutter on the Discord server.`;
                const result = await runGemini(prompt);
                await message.reply(result);
                return; // Exit to avoid falling through to Gemini
            } catch (error) {
                console.error('Error sending "ping" response via Gemini:', error);
                await message.reply('Oops! Something went wrong while generating the response.');
                return;
            }
        }

        // Custom handling for "UP?"
        else if (lowerCaseContent.includes('up?')) {
            try {
                // Generate a response using Gemini
                const prompt = `You are a Discord bot. When a user tags you and says "UP?", generate a funny, relaxed auto-responder message. Keep it short, no more than one line, so it stays clean on the Discord server.`;
                const result = await runGemini(prompt);
                await message.reply(result);
                return; // Exit to avoid falling through to Gemini
            } catch (error) {
                console.error('Error sending "UP?" response via Gemini:', error);
                await message.reply('Oops! Something went wrong while generating the response.');
                return;
            }
        }
    }
    for (const keyword of keywords) {
        if (lowerCaseContent.includes(keyword)) {
            try {
                const result = await runGemini(`You are a Discord bot in a computer faculty students server that gives funny autoreponders when detecting specific keywords in msgs. Write a funny autorespond message when the user sends the word "${keyword}". Please provide a single funny and chill reply with emojis. If the topic is sensitive or could be considered harassment, respond with a light-hearted joke instead. Don't give the finishReason: "SAFETY" error. Here’s the user complete message: "${message.content}". And don't send multiple messages; send one line at a time so the reply looks clean on the server.`); // Prompt engineering
                await message.reply(result);
            } catch (error) {
                console.error('Error occurred while processing message:', error);

                // Check if the error is due to safety reasons
                if (error.message.includes('SAFETY')) {
                    // Send a generic safe response instead of crashing
                    await message.reply('Haha, let’s keep things chill! 😅 How about a coding joke instead? 💻');
                } else {
                    await message.reply('Oops! Something went wrong while processing your message. Please try again later. 🤖');
                }
            }
            return; // Exit after responding to avoid multiple replies
        }
    }

    // Handle DMs for regular text message prompts
    if (message.channel.type === ChannelType.DM) {
        console.log(`Received DM from ${message.author.tag}: ${message.content}`);

        // AI Response using API in DM
        const result = await runGemini(message.content);
        message.reply(result);
    }

    // Handle file uploads in server text channels
    if (message.channel.type === ChannelType.GuildText) {
        if (!message.mentions.has(client.user.id)) return; // Ignore messages that didn't mention the bot

        // Check if the message contains attachments (files)
        if (message.attachments.size > 0) {
            console.log(`File uploaded by ${message.author.tag}`);

            // Loop through all attachments (files)
            for (const attachment of message.attachments.values()) {
                try {
                    // File handling version: Pass the file URL and its type to the file handler
                    const fileContent = await processFile(attachment);

                    // If we were able to extract content from the file, send it to Gemini for AI processing
                    if (fileContent) {
                        console.log(`Processing file: ${attachment.name}`);
                        const result = await runGemini(fileContent);
                        await message.reply(result);
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

                // Use Gemini to process the referenced message
                const result = await runGemini(referencedMessage.content);
                await message.reply(result);
            } else {
                console.log(`Received message without reference: ${message.content}`);
                // Regular message handling, pass the current message to Gemini
                const result = await runGemini(message.content);
                await message.reply(result);
            }
        }
    }
});