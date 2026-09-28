require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    EmbedBuilder
} = require("discord.js");

const {
    Player,
    useQueue
} = require("discord-player");

const {
    DefaultExtractors
} = require("@discord-player/extractor");

const {
    YouTubeDlpExtractor
} = require("discord-player-youtubedlp");

const ffmpeg = require("ffmpeg-static");

// ======================================================
// CONFIG
// ======================================================

const TOKEN = process.env.DISCORD_TOKEN;
const PREFIX = "!";

if (!TOKEN) {
    console.error("❌ DISCORD_TOKEN غير موجود في ملف .env");
    process.exit(1);
}

// ======================================================
// DISCORD CLIENT
// ======================================================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ======================================================
// PLAYER
// ======================================================

const player = new Player(client);

// ======================================================
// READY
// ======================================================

client.once("ready", async () => {

    console.log("====================================");
    console.log(`🎵 Logged in as: ${client.user.tag}`);
    console.log(`🏠 Servers: ${client.guilds.cache.size}`);
    console.log("====================================");

    client.user.setPresence({
        activities: [
            {
                name: "!ش | !p 🎵",
                type: 2
            }
        ],
        status: "online"
    });

    try {

        if (ffmpeg) {
            process.env.FFMPEG_PATH = ffmpeg;
        }

        // YouTube
        await player.extractors.register(
            YouTubeDlpExtractor,
            {
                searchLimit: 5,
                playlistSearchLimit: 100
            }
        );

        // Spotify + extractors
        await player.extractors.loadMulti(
            DefaultExtractors
        );

        console.log("✅ YouTube extractor loaded");
        console.log("✅ Spotify extractor loaded");
        console.log("🎵 Music bot is ready!");

    } catch (error) {

        console.error("❌ Extractor error:");
        console.error(error);

    }
});

// ======================================================
// MESSAGE COMMANDS
// ======================================================

client.on("messageCreate", async (message) => {

    // Ignore bots
    if (message.author.bot) return;

    // Ignore messages without prefix
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content
        .slice(PREFIX.length)
        .trim()
        .split(/\s+/);

    const command = args.shift()?.toLowerCase();

    if (!command) return;

    try {

        // ==============================================
        // PLAY
        // !p
        // !play
        // !ش
        // ==============================================

        if (
            command === "p" ||
            command === "play" ||
            command === "ش"
        ) {

            const voiceChannel =
                message.member?.voice?.channel;

            if (!voiceChannel) {

                return message.reply(
                    "❌ **العربي:** يجب أن تدخل روم صوتي أولًا.\n" +
                    "❌ **English:** You must join a voice channel first."
                );

            }

            const botChannel =
                message.guild.members.me?.voice?.channel;

            if (
                botChannel &&
                botChannel.id !== voiceChannel.id
            ) {

                return message.reply(
                    "❌ **العربي:** أنا موجود في روم صوتي آخر.\n" +
                    "❌ **English:** I am already in another voice channel."
                );

            }

            const query = args.join(" ");

            if (!query) {

                return message.reply(
                    "🎵 **العربي:** اكتب اسم الأغنية أو رابط YouTube / Spotify.\n\n" +
                    "مثال:\n" +
                    "`!ش The Weeknd Blinding Lights`\n\n" +
                    "🎵 **English:** Enter a song name or YouTube / Spotify URL.\n\n" +
                    "Example:\n" +
                    "`!p The Weeknd Blinding Lights`"
                );

            }

            await message.channel.send(
                "🔎 **جاري البحث عن الأغنية...**\n" +
                "🔎 **Searching for the song...**"
            );

            try {

                const result = await player.play(
                    voiceChannel,
                    query,
                    {
                        requestedBy: message.author,

                        nodeOptions: {

                            metadata: {
                                channel: message.channel,
                                requester: message.author
                            },

                            bufferingTimeout: 15000,

                            leaveOnStop: true,
                            leaveOnStopCooldown: 5000,

                            leaveOnEnd: true,
                            leaveOnEndCooldown: 15000,

                            leaveOnEmpty: true,
                            leaveOnEmptyCooldown: 300000,

                            skipOnNoStream: true

                        }
                    }
                );

                const track = result.track;

                const embed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setTitle("🎵 Now Playing / الآن")
                    .setDescription(
                        `**${track.title}**`
                    )
                    .addFields(
                        {
                            name: "👤 Requested by / بواسطة",
                            value: `${message.author}`,
                            inline: true
                        },
                        {
                            name: "🎤 Artist / الفنان",
                            value: track.author || "Unknown",
                            inline: true
                        }
                    )
                    .setTimestamp();

                if (track.thumbnail) {
                    embed.setThumbnail(track.thumbnail);
                }

                if (track.url) {
                    embed.setURL(track.url);
                }

                return message.channel.send({
                    embeds: [embed]
                });

            } catch (error) {

                console.error("PLAY ERROR:", error);

                return message.reply(
                    "❌ **العربي:** لم أستطع تشغيل هذه الأغنية.\n" +
                    "❌ **English:** I couldn't play this song.\n\n" +
                    "جرّب اسم أغنية آخر أو رابط آخر.\n" +
                    "Try another song name or URL."
                );

            }

        }

        // ==============================================
        // PAUSE
        // !وقف
        // !pause
        // ==============================================

        if (
            command === "وقف" ||
            command === "pause"
        ) {

            const queue =
                useQueue(message.guild.id);

            if (!queue || !queue.currentTrack) {

                return message.reply(
                    "❌ لا توجد أغنية تعمل حاليًا.\n" +
                    "❌ No song is currently playing."
                );

            }

            if (queue.node.isPaused()) {

                return message.reply(
                    "⏸️ الأغنية متوقفة مؤقتًا بالفعل.\n" +
                    "⏸️ The song is already paused."
                );

            }

            queue.node.setPaused(true);

            return message.reply(
                "⏸️ تم إيقاف الأغنية مؤقتًا.\n" +
                "⏸️ Song paused."
            );
        }

        // ==============================================
        // RESUME
        // !كمل
        // !resume
        // ==============================================

        if (
            command === "كمل" ||
            command === "استئناف" ||
            command === "resume"
        ) {

            const queue =
                useQueue(message.guild.id);

            if (!queue || !queue.currentTrack) {

                return message.reply(
                    "❌ لا توجد أغنية.\n" +
                    "❌ No song is currently playing."
                );

            }

            if (!queue.node.isPaused()) {

                return message.reply(
                    "▶️ الأغنية تعمل بالفعل.\n" +
                    "▶️ The song is already playing."
                );

            }

            queue.node.setPaused(false);

            return message.reply(
                "▶️ تم استكمال الأغنية.\n" +
                "▶️ Song resumed."
            );
        }

        // ==============================================
        // STOP
        // !s
        // !stop
        // !س
        // !وقف_كامل
        // ==============================================

        if (
            command === "s" ||
            command === "stop" ||
            command === "س" ||
            command === "وقف_كامل"
        ) {

            const queue =
                useQueue(message.guild.id);

            if (!queue) {

                return message.reply(
                    "❌ لا توجد موسيقى تعمل.\n" +
                    "❌ No music is playing."
                );

            }

            queue.delete();

            return message.reply(
                "⏹️ تم إيقاف الموسيقى ومسح القائمة.\n" +
                "⏹️ Music stopped and queue cleared."
            );
        }

        // ==============================================
        // SKIP
        // !تخطي
        // !skip
        // ==============================================

        if (
            command === "تخطي" ||
            command === "التالي" ||
            command === "skip"
        ) {

            const queue =
                useQueue(message.guild.id);

            if (!queue || !queue.currentTrack) {

                return message.reply(
                    "❌ لا توجد أغنية لتخطيها.\n" +
                    "❌ There is no song to skip."
                );

            }

            const current =
                queue.currentTrack.title;

            queue.node.skip();

            return message.reply(
                `⏭️ تم تخطي **${current}**.\n` +
                `⏭️ Skipped **${current}**.`
            );
        }

        // ==============================================
        // QUEUE
        // !قائمة
        // !queue
        // ==============================================

        if (
            command === "قائمة" ||
            command === "queue"
        ) {

            const queue =
                useQueue(message.guild.id);

            if (!queue) {

                return message.reply(
                    "📭 القائمة فارغة.\n" +
                    "📭 The queue is empty."
                );

            }

            const current =
                queue.currentTrack;

            const tracks =
                queue.tracks.toArray();

            let text = "";

            if (current) {

                text +=
                    `🎵 **Now / الآن:** ${current.title}\n\n`;

            }

            if (!tracks.length) {

                text +=
                    "📭 لا توجد أغاني أخرى.\n" +
                    "📭 No upcoming songs.";

            } else {

                text += tracks
                    .slice(0, 10)
                    .map(
                        (track, index) =>
                            `**${index + 1}.** ${track.title}`
                    )
                    .join("\n");

                if (tracks.length > 10) {

                    text +=
                        `\n\n... +${tracks.length - 10} more`;

                }

            }

            const embed =
                new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setTitle(
                        "📜 Queue / قائمة التشغيل"
                    )
                    .setDescription(text)
                    .setTimestamp();

            return message.channel.send({
                embeds: [embed]
            });
        }

        // ==============================================
        // NOW PLAYING
        // !الان
        // !nowplaying
        // ==============================================

        if (
            command === "الان" ||
            command === "الآن" ||
            command === "nowplaying"
        ) {

            const queue =
                useQueue(message.guild.id);

            if (!queue || !queue.currentTrack) {

                return message.reply(
                    "❌ لا توجد أغنية تعمل.\n" +
                    "❌ No song is playing."
                );

            }

            const track =
                queue.currentTrack;

            const embed =
                new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setTitle(
                        "🎵 Now Playing / الأغنية الحالية"
                    )
                    .setDescription(
                        `**${track.title}**`
                    )
                    .addFields(
                        {
                            name: "🎤 Artist / الفنان",
                            value:
                                track.author ||
                                "Unknown",
                            inline: true
                        },
                        {
                            name: "🔊 Volume / الصوت",
                            value:
                                `${queue.node.volume}%`,
                            inline: true
                        }
                    )
                    .setTimestamp();

            if (track.thumbnail) {
                embed.setThumbnail(
                    track.thumbnail
                );
            }

            if (track.url) {
                embed.setURL(track.url);
            }

            return message.channel.send({
                embeds: [embed]
            });
        }

        // ==============================================
        // VOLUME
        // !صوت 50
        // !volume 50
        // ==============================================

        if (
            command === "صوت" ||
            command === "volume"
        ) {

            const queue =
                useQueue(message.guild.id);

            if (!queue) {

                return message.reply(
                    "❌ لا توجد موسيقى.\n" +
                    "❌ No music is playing."
                );

            }

            const volume =
                Number(args[0]);

            if (
                !Number.isInteger(volume) ||
                volume < 1 ||
                volume > 100
            ) {

                return message.reply(
                    "🔊 استخدم رقمًا من 1 إلى 100.\n" +
                    "🔊 Use a number from 1 to 100.\n\n" +
                    "مثال: `!صوت 50`\n" +
                    "Example: `!volume 50`"
                );

            }

            queue.node.setVolume(volume);

            return message.reply(
                `🔊 الصوت: **${volume}%**\n` +
                `🔊 Volume: **${volume}%**`
            );
        }

        // ==============================================
        // SHUFFLE
        // !خلط
        // !shuffle
        // ==============================================

        if (
            command === "خلط" ||
            command === "shuffle"
        ) {

            const queue =
                useQueue(message.guild.id);

            if (!queue) {

                return message.reply(
                    "❌ القائمة فارغة.\n" +
                    "❌ The queue is empty."
                );

            }

            if (queue.tracks.size < 2) {

                return message.reply(
                    "❌ تحتاج أغنيتين على الأقل.\n" +
                    "❌ You need at least two songs."
                );

            }

            queue.tracks.shuffle();

            return message.reply(
                "🔀 تم خلط القائمة.\n" +
                "🔀 Queue shuffled."
            );
        }

        // ==============================================
        // LOOP
        // !تكرار
        // !loop
        // ==============================================

        if (
            command === "تكرار" ||
            command === "loop"
        ) {

            const queue =
                useQueue(message.guild.id);

            if (!queue) {

                return message.reply(
                    "❌ لا توجد موسيقى.\n" +
                    "❌ No music is playing."
                );

            }

            const mode =
                args[0]?.toLowerCase();

            if (!mode) {

                return message.reply(
                    "🔁 **الاستخدام / Usage:**\n\n" +
                    "`!تكرار off` — إيقاف\n" +
                    "`!تكرار track` — تكرار الأغنية\n" +
                    "`!تكرار queue` — تكرار القائمة\n" +
                    "`!تكرار autoplay` — تشغيل تلقائي"
                );

            }

            const modes = {
                off: 0,
                track: 1,
                queue: 2,
                autoplay: 3
            };

            if (!(mode in modes)) {

                return message.reply(
                    "❌ الوضع غير صحيح.\n" +
                    "❌ Invalid loop mode."
                );

            }

            queue.setRepeatMode(
                modes[mode]
            );

            const names = {
                off:
                    "إيقاف / Off",

                track:
                    "الأغنية / Track",

                queue:
                    "القائمة / Queue",

                autoplay:
                    "تلقائي / Autoplay"
            };

            return message.reply(
                `🔁 الوضع: **${names[mode]}**`
            );
        }

        // ==============================================
        // LEAVE
        // !خروج
        // !leave
        // ==============================================

        if (
            command === "خروج" ||
            command === "leave"
        ) {

            const queue =
                useQueue(message.guild.id);

            if (!queue) {

                return message.reply(
                    "❌ البوت غير موجود في روم صوتي.\n" +
                    "❌ Bot is not in a voice channel."
                );

            }

            queue.delete();

            return message.reply(
                "👋 خرجت من الروم الصوتي.\n" +
                "👋 Left the voice channel."
            );
        }

        // ==============================================
        // HELP
        // !مساعدة
        // !help
        // ==============================================

        if (
            command === "مساعدة" ||
            command === "help"
        ) {

            const embed =
                new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setTitle(
                        "🎵 Music Commands / أوامر الموسيقى"
                    )
                    .setDescription(
                        "**🎵 تشغيل / Play**\n" +
                        "`!ش song` | `!p song` | `!play song`\n\n" +

                        "**⏸️ إيقاف مؤقت / Pause**\n" +
                        "`!وقف` | `!pause`\n\n" +

                        "**▶️ استكمال / Resume**\n" +
                        "`!كمل` | `!resume`\n\n" +

                        "**⏹️ إيقاف كامل / Stop**\n" +
                        "`!س` | `!s` | `!stop`\n\n" +

                        "**⏭️ تخطي / Skip**\n" +
                        "`!تخطي` | `!skip`\n\n" +

                        "**📜 القائمة / Queue**\n" +
                        "`!قائمة` | `!queue`\n\n" +

                        "**🎵 الحالية / Now Playing**\n" +
                        "`!الان` | `!nowplaying`\n\n" +

                        "**🔊 الصوت / Volume**\n" +
                        "`!صوت 50` | `!volume 50`\n\n" +

                        "**🔀 خلط / Shuffle**\n" +
                        "`!خلط` | `!shuffle`\n\n" +

                        "**🔁 تكرار / Loop**\n" +
                        "`!تكرار queue` | `!loop queue`\n\n" +

                        "**👋 خروج / Leave**\n" +
                        "`!خروج` | `!leave`"
                    )
                    .setFooter({
                        text:
                            "Arabic + English Music Bot"
                    });

            return message.channel.send({
                embeds: [embed]
            });
        }

    } catch (error) {

        console.error(
            "COMMAND ERROR:",
            error
        );

        return message.reply(
            "❌ حدث خطأ.\n" +
            "❌ Something went wrong."
        ).catch(() => {});
    }

});

// ======================================================
// PLAYER EVENTS
// ======================================================

player.events.on(
    "playerStart",
    async (queue, track) => {

        try {

            const channel =
                queue.metadata?.channel;

            if (!channel) return;

            const embed =
                new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setTitle(
                        "🎵 Now Playing / الآن"
                    )
                    .setDescription(
                        `**${track.title}**`
                    )
                    .addFields({
                        name:
                            "🎤 Artist / الفنان",
                        value:
                            track.author ||
                            "Unknown"
                    })
                    .setTimestamp();

            if (track.thumbnail) {
                embed.setThumbnail(
                    track.thumbnail
                );
            }

            if (track.url) {
                embed.setURL(track.url);
            }

            await channel.send({
                embeds: [embed]
            });

        } catch (error) {

            console.error(error);

        }

    }
);

// ======================================================
// TRACK ADDED
// ======================================================

player.events.on(
    "audioTrackAdd",
    async (queue, track) => {

        try {

            const channel =
                queue.metadata?.channel;

            if (!channel) return;

            await channel.send(
                `🎶 تمت إضافة **${track.title}** إلى القائمة.\n` +
                `🎶 **${track.title}** added to the queue.`
            );

        } catch {}

    }
);

// ======================================================
// MULTIPLE TRACKS ADDED
// ======================================================

player.events.on(
    "audioTracksAdd",
    async (queue, tracks) => {

        try {

            const channel =
                queue.metadata?.channel;

            if (!channel) return;

            await channel.send(
                `🎶 تمت إضافة **${tracks.length}** أغنية.\n` +
                `🎶 **${tracks.length}** songs added.`
            );

        } catch {}

    }
);

// ======================================================
// EMPTY QUEUE
// ======================================================

player.events.on(
    "emptyQueue",
    async (queue) => {

        try {

            const channel =
                queue.metadata?.channel;

            if (!channel) return;

            await channel.send(
                "📭 انتهت قائمة التشغيل.\n" +
                "📭 Queue finished."
            );

        } catch {}

    }
);

// ======================================================
// PLAYER ERROR
// ======================================================

player.events.on(
    "playerError",
    async (queue, error, track) => {

        console.error(
            "PLAYER ERROR:",
            error
        );

        try {

            const channel =
                queue.metadata?.channel;

            if (!channel) return;

            await channel.send(
                `❌ تعذر تشغيل **${track?.title || "الأغنية"}**.\n` +
                `❌ Couldn't play **${track?.title || "the song"}**.`
            );

        } catch {}

    }
);

// ======================================================
// DISCONNECT
// ======================================================

player.events.on(
    "disconnect",
    async (queue) => {

        try {

            const channel =
                queue.metadata?.channel;

            if (!channel) return;

            await channel.send(
                "👋 غادرت الروم الصوتي.\n" +
                "👋 Left the voice channel."
            );

        } catch {}

    }
);

// ======================================================
// ERRORS
// ======================================================

process.on(
    "unhandledRejection",
    (error) => {
        console.error(
            "UNHANDLED REJECTION:",
            error
        );
    }
);

process.on(
    "uncaughtException",
    (error) => {
        console.error(
            "UNCAUGHT EXCEPTION:",
            error
        );
    }
);

// ======================================================
// LOGIN
// ======================================================

client.login(MTU1MzkyMTgzODg1NjI4MjI1Mw.GVm5ty.lEtnH8GlQZ8z6808-p_JqJPS2gR8aI385JkJA0);
