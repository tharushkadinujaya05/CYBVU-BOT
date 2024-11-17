require('dotenv').config();
const { Client, GatewayIntentBits, ChannelType, Partials, SlashCommandBuilder, REST, Routes } = require('discord.js');
const { runGemini } = require('./gemini.js');
const { processFile } = require('./fileHandler.js'); 
const express = require('express');
const axios = require('axios');
const { EmbedBuilder, ActivityType } = require('discord.js'); 
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const GENIUS_API_KEY = process.env.GENIUS_API_KEY;
const cheerio = require('cheerio');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMessageReactions,
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

const RulesChannelID = '1294605516361961575'; 
// added bot status
client.once('ready', async () => {
    client.user.setPresence({
        activities: [{ name: 'Dreams of GPA 4.0 evaporate', type: ActivityType.Listening }],
        status: 'online'
    });

    const channel = await client.channels.fetch(RulesChannelID); // Fetch the channel

    // Check if the rules message already exists
    const messages = await channel.messages.fetch({ limit: 10 }); // Fetch the last 10 messages
    const existingMessage = messages.find(msg => msg.embeds.length > 0 && msg.embeds[0].title === ':bookmark: CYBVU HQ Server Rules');

    // If the rules message doesn't exist, send it
    if (!existingMessage) {
        const embed = new EmbedBuilder()
            .setColor('#3A3EDB')
            .setTitle(':bookmark: CYBVU HQ Server Rules')
            .setDescription(`
                Welcome, cyber warriors! To ensure our community thrives and remains a safe space for all members, please adhere to the following guidelines.
                
                <:bullet:1295002729164308552> Respect All Members 
                <:Empty:1295003643522711614><:subcat:1295002845296328735> Kindness is key! Treat everyone with respect—no harassment, hate speech, or discrimination.
                
                <:bullet:1295002729164308552> No Spam Zone
                <:Empty:1295003643522711614><:subcat:1295002845296328735>Please refrain from spamming messages, links, or self-promotions. Let’s keep our discussions meaningful!
                
                <:bullet:1295002729164308552> Stay On Topic
                <:Empty:1295003643522711614><:subcat:1295002845296328735> Keep conversations relevant to cybersecurity and the channel topic. For off-topic chats, check out our other channels!
                
                <:bullet:1295002729164308552> Content Guidelines
                <:Empty:1295003643522711614><:subcat:1295002845296328735> No NSFW, gore, or any content that could be inappropriate. Keep it professional and safe for all!
                
                <:bullet:1295002729164308552> Follow Discord’s Terms of Service
                <:Empty:1295003643522711614><:subcat:1295002845296328735> Make sure you’re abiding by Discord’s rules while you’re here.
                
                <:bullet:1295002729164308552> Have Fun & Collaborate
                <:Empty:1295003643522711614><:subcat:1295002845296328735> Engage, share knowledge, and make new friends in the world of cybersecurity!
                
                **React with <:icon:1295015539139280937> if you understand the rules!**
                            `)
            .setFooter({ text: 'CYBVU HQ'}) 
            .setTimestamp();

        // Send the embed message to the rules channel
        try {
            await channel.send({ embeds: [embed] });
            console.log('Rules message sent successfully!');
        } catch (error) {
            console.error('Error sending rules message:', error);
        }
    } else {
        console.log('Rules message already exists; not sending again.');
    }
});

let lastMessage;
let startTime; 

client.on('ready', async () => {
    startTime = new Date(); 
    const channelId = '1296684450175913984';
    const channel = await client.channels.fetch(channelId);

    // Function to send a message every 5 minutes
    setInterval(async () => {
        try {
            const response = await axios.get('https://cybvu-bot.onrender.com/');
            const body = response.data;

            // Calculate uptime
            const uptime = Math.floor((Date.now() - startTime) / 1000); 
            const minutes = Math.floor(uptime / 60);
            const seconds = uptime % 60; 
            const uptimeString = `${minutes} minutes and ${seconds} seconds`;

            // Create an embed message based on the response
            const embed = new EmbedBuilder()
                .setColor('#3A3EDB') 
                .setTitle('🔔 Bot Status Update');

            // Check if the body contains "BOT IS UPPP!"
            if (response.status === 200 && body.includes('BOT IS UPPP!')) {
                embed.setDescription('**Bot is active!** 🗿\n\nStay tuned for updates and features!')
                    .addFields(
                        { name: '🤖 Current Status', value: 'Online',inline: true }, 
                        { name: '🕒 Uptime', value: uptimeString, inline: true},
                        { name: '📅 Last Restart', value: new Date().toLocaleString()}
                    )
                    .setThumbnail('https://cdn3.emoji.gg/emojis/4083-wumpusbeyonddance.png') 
                    .setFooter({ text: 'CYBVU BOT'}) 
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
                    .setColor('#FF0000') 
                    .setTitle('🔴 Bot Status Update')
                    .setDescription('**Bot is inactive!** 🔴\n\nThe server is temporarily unavailable (503). Please check back later.')
                    .addFields(
                        { name: '🤖 Current Status', value: 'Offline', inline: true }, 
                        { name: '🕒 Uptime', value: 'N/A', inline: true },
                        { name: '📅 Last Restart', value: new Date().toLocaleString(), inline: true }
                    )
                    .setThumbnail('https://cdn3.emoji.gg/emojis/9576-wumpusbeyondsad.png') 
                    .setFooter({ text: 'Thank you for your patience!' }) 
                    .setTimestamp();

                if (lastMessage) {
                    await lastMessage.delete();
                }

                lastMessage = await channel.send({ embeds: [embed] });

            } else {
                // Handle other errors (non-503)
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF0000') 
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
    }, 5 * 60 * 1000); 
});

setInterval(() => {
    axios.get('https://cybvu-bot.onrender.com')
        .then(response => {
            console.log('Keeping the bot alive:', response.data);
        })
        .catch(error => {
            console.error('Error keeping the bot alive:', error.message);
        });
}, 5 * 60 * 1000); 

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

        // Notes Command
        new SlashCommandBuilder()
            .setName('notes')
            .setDescription('Search and list lecture notes')
            .addSubcommand(subcommand =>
                subcommand
                    .setName('search')
                    .setDescription('Search for lecture notes')
                    .addStringOption(option =>
                        option.setName('subject')
                        .setDescription('Subject code (e.g., DFEH)')
                        .setRequired(true))
                    .addIntegerOption(option =>
                        option.setName('week')
                        .setDescription('Week number (optional)')
                        .setRequired(false)))
            .addSubcommand(subcommand =>
                subcommand
                    .setName('list')
                    .setDescription('List all available notes')),

        // Pomodoro Timer
        new SlashCommandBuilder()
            .setName('pomodoro')
            .setDescription('Start a Pomodoro study timer')
            .addIntegerOption(option =>
                option.setName('duration')
                .setDescription('Study duration in minutes')
                .setRequired(true)),

        // Poll Creator
        new SlashCommandBuilder()
            .setName('poll')
            .setDescription('Create a quick poll')
            .addStringOption(option =>
                option.setName('question')
                .setDescription('Poll question')
                .setRequired(true))
            .addStringOption(option =>
                option.setName('options')
                .setDescription('Poll options (comma-separated)')
                .setRequired(true)),

        // Study Group Creator
        new SlashCommandBuilder()
            .setName('studygroup')
            .setDescription('Create or find study groups')
            .addSubcommand(subcommand =>
                subcommand
                    .setName('create')
                    .setDescription('Create a study group')
                    .addStringOption(option =>
                        option.setName('subject')
                        .setDescription('Subject to study')
                        .setRequired(true))
                    .addIntegerOption(option =>
                        option.setName('capacity')
                        .setDescription('Maximum number of participants')
                        .setRequired(true))),

        // Event Creator
        new SlashCommandBuilder()
            .setName('event')
            .setDescription('Create or view college events')
            .addSubcommand(subcommand =>
                subcommand
                    .setName('create')
                    .setDescription('Create a new event')
                    .addStringOption(option =>
                        option.setName('title')
                        .setDescription('Event title')
                        .setRequired(true))
                    .addStringOption(option =>
                        option.setName('date')
                        .setDescription('Event date and time (Format: YYYY-MM-DD HH:mm)')
                        .setRequired(true))
                    .addStringOption(option =>
                        option.setName('description')
                        .setDescription('Event description')
                        .setRequired(true))),

        // Bug Report
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
                    .setDescription('Optional: Message link reference')
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

    // Process File Command
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
                    await interaction.editReply(responseChunks[0]);
    
                    for (let i = 1; i < responseChunks.length; i++) {
                        await interaction.followUp(responseChunks[i]);
                    }
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
    // Slidesummarizer Command
    else if (commandName === 'slidesummarizer') {
        const file = interaction.options.getAttachment('file');
        await interaction.deferReply();
    
        if (file) {
            try {
                const fileContent = await processFile(file);
                if (fileContent) {
                    const summaryPrompt = `Summarize the content slide by slide in a brief manner. Content: ${fileContent}`;
                    const result = await runGemini(summaryPrompt);
                    const responseChunks = splitResponse(result);
                    
                    await interaction.editReply(responseChunks[0]);
    
                    for (let i = 1; i < responseChunks.length; i++) {
                        await interaction.followUp(responseChunks[i]);
                    }
                } else {
                    await interaction.editReply('Unable to process the file.');
                }
            } catch (error) {
                await interaction.editReply('An error occurred while summarizing the slides.');
            }
        }
    } 
    // Quizmode Command
    else if (commandName === 'quizmode') {
        const file = interaction.options.getAttachment('file');  // Get the uploaded file
        const numQuestions = interaction.options.getInteger('number_of_questions'); // Get the number of questions
        const quizType = interaction.options.getString('type');  // Get the quiz type (MCQ or Essay)

        await interaction.deferReply();  // Defer the reply in case it takes time to generate the quiz

        if (file) {
            try {
                // Step 1: Process the uploaded file and extract the text content
                const fileContent = await processFile(file);

                if (!fileContent) {
                    await interaction.editReply('Unable to process the file. Supported file types are PDF, DOCX, PPTX, and images.');
                    return;
                }

                // Step 2: Create a prompt using the specified format
                const prompt = `Create ${numQuestions} ${quizType} Questions using this file content: ${fileContent}`;

                // Step 3: Run the prompt through the AI model
                const result = await runGemini(prompt);
                const responseChunks = splitResponse(result);

                // Step 4: Send the response in chunks to the user
                for (const chunk of responseChunks) {
                    await interaction.followUp(chunk); // Use followUp to send multiple messages
                }
            } catch (error) {
                console.error('Error generating quiz:', error);
                await interaction.editReply('An error occurred while generating the quiz.');
            }
        } else {
            await interaction.editReply('Please attach a file to generate the quiz.');
        }
    }
    // Add this to your interactionCreate event handler
    else if (commandName === 'notes') {
        const subcommand = interaction.options.getSubcommand();
        const forumChannelId = '1294760775142871120';

        try {
            await interaction.deferReply();
            const forumChannel = await client.channels.fetch(forumChannelId);
            
            if (!forumChannel) {
                await interaction.editReply('Could not find the lecture notes forum.');
                return;
            }

            // Fetch active and archived threads
            const activeThreads = await forumChannel.threads.fetchActive();
            const archivedThreads = await forumChannel.threads.fetchArchived();
            
            // Combine all threads
            const allThreads = [...activeThreads.threads.values(), ...archivedThreads.threads.values()];

            if (subcommand === 'search') {
                const subject = interaction.options.getString('subject').toUpperCase();
                const week = interaction.options.getInteger('week');

                // Filter threads based on search criteria
                const matchingThreads = allThreads.filter(thread => {
                    const threadName = thread.name.toUpperCase();
                    if (week) {
                        return threadName.includes(subject) && threadName.includes(`WEEK ${week}`);
                    }
                    return threadName.includes(subject);
                });

                if (matchingThreads.length === 0) {
                    await interaction.editReply({
                        content: week 
                            ? `No notes found for ${subject} Week ${week}`
                            : `No notes found for ${subject}`,
                        ephemeral: true
                    });
                    return;
                }

                // Sort threads by week number
                const sortedThreads = matchingThreads.sort((a, b) => {
                    const weekA = parseInt(a.name.match(/WEEK\s+(\d+)/i)?.[1] || '0');
                    const weekB = parseInt(b.name.match(/WEEK\s+(\d+)/i)?.[1] || '0');
                    return weekA - weekB;
                });

                const searchEmbed = new EmbedBuilder()
                    .setColor('#3A3EDB')
                    .setTitle(`📚 Lecture Notes: ${subject}${week ? ` - Week ${week}` : ''}`)
                    .setDescription(
                        sortedThreads.map(thread => 
                            `• [${thread.name}](${thread.url})`
                        ).join('\n')
                    )
                    .setFooter({ text: `Found ${sortedThreads.length} note(s)` });

                await interaction.editReply({ embeds: [searchEmbed] });
            }
            else if (subcommand === 'list') {
                // Group threads by subject
                const notesBySubject = new Map();

                allThreads.forEach(thread => {
                    const match = thread.name.toUpperCase().match(/([A-Z]{4})/);
                    if (match) {
                        const subject = match[1];
                        if (!notesBySubject.has(subject)) {
                            notesBySubject.set(subject, []);
                        }
                        notesBySubject.get(subject).push(thread);
                    }
                });

                // Sort subjects alphabetically
                const sortedSubjects = Array.from(notesBySubject.keys()).sort();

                const listEmbed = new EmbedBuilder()
                    .setColor('#3A3EDB')
                    .setTitle('📚 Available Lecture Notes')
                    .setDescription('Here are all available notes grouped by subject:');

                for (const subject of sortedSubjects) {
                    const threads = notesBySubject.get(subject);
                    // Sort threads by week number within each subject
                    const sortedThreads = threads.sort((a, b) => {
                        const weekA = parseInt(a.name.match(/WEEK\s+(\d+)/i)?.[1] || '0');
                        const weekB = parseInt(b.name.match(/WEEK\s+(\d+)/i)?.[1] || '0');
                        return weekA - weekB;
                    });

                    const notesList = sortedThreads
                        .map(thread => `• [${thread.name}](${thread.url})`)
                        .join('\n');

                    if (notesList) {
                        listEmbed.addFields({
                            name: `📝 ${subject}`,
                            value: notesList,
                        });
                    }
                }

                await interaction.editReply({ embeds: [listEmbed] });
            }
        } catch (error) {
            console.error('Error handling notes command:', error);
            await interaction.editReply({
                content: 'An error occurred while fetching the notes. Error: ' + error.message,
                ephemeral: true
            });
        }
    }
    // Add this to your interactionCreate event handler
    else if (commandName === 'event') {
        if (interaction.options.getSubcommand() === 'create') {
            const title = interaction.options.getString('title');
            const date = interaction.options.getString('date');
            const description = interaction.options.getString('description');

            // Validate date format
            const dateRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
            if (!dateRegex.test(date)) {
                await interaction.reply({
                    content: '⚠️ Invalid date format! Please use: `YYYY-MM-DD HH:mm`\n' +
                        'Examples:\n' +
                        '`2024-03-20 14:30` (March 20, 2024 at 2:30 PM)\n' +
                        '`2024-04-01 09:00` (April 1, 2024 at 9:00 AM)\n' +
                        '`2024-05-15 18:45` (May 15, 2024 at 6:45 PM)',
                    ephemeral: true
                });
                return;
            }

            const eventDate = new Date(date);
            if (isNaN(eventDate.getTime())) {
                await interaction.reply({
                    content: '⚠️ Invalid date! Please provide a valid date and time.',
                    ephemeral: true
                });
                return;
            }

            const eventEmbed = new EmbedBuilder()
                .setColor('#3A3EDB')
                .setTitle('📅 ' + title)
                .setDescription(description)
                .addFields(
                    { name: '📆 Date', value: eventDate.toLocaleDateString(), inline: true },
                    { name: '⏰ Time', value: eventDate.toLocaleTimeString(), inline: true },
                    { name: '👤 Organizer', value: `<@${interaction.user.id}>` }
                )
                .setFooter({ text: 'React with ✅ to RSVP' });

            const message = await interaction.reply({ embeds: [eventEmbed], fetchReply: true });
            await message.react('✅');
        }
    }
    // Add this to your interactionCreate event handler
    else if (commandName === 'poll') {
        const question = interaction.options.getString('question');
        const optionsString = interaction.options.getString('options');
        const options = optionsString.split(',').map(opt => opt.trim());

        if (options.length > 10) {
            await interaction.reply({
                content: 'Please provide 10 or fewer options.',
                ephemeral: true
            });
            return;
        }

        const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
        
        const pollEmbed = new EmbedBuilder()
            .setColor('#3A3EDB')
            .setTitle('📊 ' + question)
            .setDescription(
                options.map((opt, i) => `${emojis[i]} ${opt}`).join('\n\n')
            )
            .setFooter({ text: `Poll created by ${interaction.user.tag}` });

        const pollMessage = await interaction.reply({ embeds: [pollEmbed], fetchReply: true });
        
        // Add reactions for each option
        for (let i = 0; i < options.length; i++) {
            await pollMessage.react(emojis[i]);
        }
    }
    // Add this to your interactionCreate event handler
    else if (commandName === 'studygroup') {
        if (interaction.options.getSubcommand() === 'create') {
            const subject = interaction.options.getString('subject');
            const capacity = interaction.options.getInteger('capacity');
            
            if (capacity < 2 || capacity > 50) {
                await interaction.reply({
                    content: '⚠️ Please set a capacity between 2 and 50 members.',
                    ephemeral: true
                });
                return;
            }

            const groupEmbed = new EmbedBuilder()
                .setColor('#3A3EDB')
                .setTitle('📚 New Study Group')
                .addFields(
                    { name: '📖 Subject', value: subject, inline: true },
                    { name: '👥 Capacity', value: `${capacity} members`, inline: true },
                    { name: '👤 Created by', value: `<@${interaction.user.id}>`, inline: false },
                    { name: ' Status', value: 'Open for joining (0/' + capacity + ')' }
                )
                .setDescription('Join this study group to collaborate and learn together!')
                .setFooter({ text: 'React with  to join the group' })
                .setTimestamp();

            const message = await interaction.reply({ embeds: [groupEmbed], fetchReply: true });
            await message.react('📚');
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

const keywords = ['stfu', 'damn', 'come alive', 'gay', "for fuck's sake", "kill", "stupid", "deadline", "gn", "gm", "good night", "good morning", "tc", "fast", "asap", "😭"]; 

client.on('messageCreate', async message => {
    console.log(`Received message: ${message.content}`);
    if (message.author.bot) return; 

    if (message.content.endsWith('🎤')) {
        try {
            const lyricLine = message.content.slice(0, -2).trim();
            console.log('Searching for lyrics:', lyricLine);

            // Search song using Genius API
            const searchResponse = await fetch(`https://api.genius.com/search?q=${encodeURIComponent(lyricLine)}`, {
                headers: {
                    'Authorization': 'Bearer ' + GENIUS_API_KEY
                }
            });
            
            const searchData = await searchResponse.json();

            if (!searchData?.response?.hits?.length) {
                console.log('No songs found in search');
                await message.reply("I couldn't find a song with those lyrics. Try another line! 🎵");
                return;
            }

            const song = searchData.response.hits[0].result;
            const artist = song.primary_artist.name;
            const title = song.title;

            console.log(`Found song: "${title}" by ${artist}`);

            // Updated prompt to get three lines
            const prompt = `You are a lyrics expert. For the song "${title}" by ${artist}", if someone says "${lyricLine}", what are the NEXT THREE LINES that come in the song? Respond with ONLY the next three lines, one line per line (with line breaks), nothing else. If you're not sure about the exact next lines, respond with "I'm not sure about the next lines for that song."`;
            
            console.log('Sending prompt to Gemini:', prompt);
            const nextLines = await runGemini(prompt);
            console.log('Gemini response:', nextLines);
            
            await message.reply(`${nextLines} 🎵\n*From: ${title} by ${artist}*`);

        } catch (error) {
            console.error('Error:', error);
            await message.reply('Oops! Something went wrong while searching for the lyrics. Try again later! 🎵');
        }
    }

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
        if (keyword === "😭" && message.content.includes(keyword)) {
            await message.reply("I noticed that you used \"😭\" in your comment. Just wanted to say, don't give up anything in your life. I don't know what you're going through but I'm always here to help.");
            return;
        } else if (regex.test(lowerCaseContent)) {
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

// Add this reaction handler for study groups
client.on('messageReactionAdd', async (reaction, user) => {
    if (user.bot) return;
    
    if (reaction.emoji.name === '📚') {
        const message = reaction.message;
        if (message.embeds.length > 0 && message.embeds[0].title === '📚 New Study Group') {
            const embed = message.embeds[0];
            const capacityField = embed.fields.find(f => f.name === '👥 Capacity');
            const capacity = parseInt(capacityField.value);
            const currentCount = reaction.count - 1; // Subtract 1 to exclude the bot's reaction
            
            if (currentCount > capacity) {
                reaction.users.remove(user);
                await message.channel.send({
                    content: `Sorry <@${user.id}>, this study group is full!`,
                    ephemeral: true
                });
            } else {
                // Update the status field
                const updatedEmbed = EmbedBuilder.from(embed)
                    .spliceFields(3, 1, { 
                        name: '📊 Status', 
                        value: `Open for joining (${currentCount}/${capacity})`
                    });
                
                await message.edit({ embeds: [updatedEmbed] });
            }
        }
    }
});