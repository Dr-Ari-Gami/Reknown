module.exports = {
    func: async (client, sql, Discord) => {
        client.bot.on("guildBanAdd", async function (guild, user) {
            try {
                if (user === client.bot.user) return;

                // Checks if the guild has welcome messages enabled
                let r3 = (await sql.query('SELECT * FROM toggleWelcome WHERE guildId = $1', [guild.id])).rows[0];
                if (r3 && r3.bool) {
                    // Gets the goodbye channel for the guild
                    let r = (await sql.query('SELECT * FROM welcomeChannel WHERE guildId = $1', [guild.id])).rows[0];
                    // This is for the goodbye channel
                    async function goodbyeChannel(goodbyeChannel) {
                        // If the channel exists
                        if (goodbyeChannel) {
                            // If the bot does not have send messages perms in the welcome channel & does not have administrator (bypass all overwrites) then return
                            if (!guild.me.permissionsIn(goodbyeChannel).has("SEND_MESSAGES") && !guild.me.hasPermission("ADMINISTRATOR")) return;
                            if (!guild.me.permissionsIn(goodbyeChannel).has("VIEW_CHANNEL") && !guild.me.hasPermission("ADMINISTRATOR")) return;
                            //console.log("guildBanAdd 1");

                            // Creates an embed
                            let embed = new Discord.MessageEmbed()
                                .setColor(0xff0000)
                                .setDescription(user.tag + " has been banned from **" + guild.name + ".**")
                                .setThumbnail(user.displayAvatarURL());
                            // Sends the embed to the goodbye channel
                            goodbyeChannel.send(embed);
                        }
                    }
                    // If it is default
                    if (!r || !r.channel)
                        goodbyeChannel(guild.channels.find(c => c.position === 0 && c.type === 'text'));
                    else // If it's custom
                        goodbyeChannel(guild.channels.get(r.channel));
                }

                // Checks if the guild has action log enabled
                let r = (await sql.query('SELECT * FROM actionlog WHERE guildId = $1', [guild.id])).rows[0];
                if (r && r.bool) { // If they have it enabled
                    // No perms; return
                    if (!guild.me.hasPermission("VIEW_AUDIT_LOG")) return;
                    let audit = await guild.fetchAuditLogs({
                        limit: 1,
                        type: 22 // Guild Ban Add, look at https://discord.js.org/#/docs/main/master/typedef/AuditLogAction
                    });
                    let info = audit.entries.first();
                    let embed = new Discord.MessageEmbed()
                        .setAuthor(info.executor.tag, info.executor.displayAvatarURL())
                        .setTitle("Member Banned")
                        .addField("Time", info.createdAt)
                        .addField("Reason", info.reason ? info.reason : "None")
                        .addField("Member", user.tag + ` (${user.id})`)
                        .setThumbnail(user.displayAvatarURL())
                        .setColor(0xFF0000)
                        .setFooter(`Log ID: ${info.id}`);

                    // Looks for the log channel selected
                    let r2 = (await sql.query('SELECT * FROM logChannel WHERE guildId = $1', [guild.id])).rows[0];
                    if (!r2 || !r2.channelid) { // If it is default
                        let selectedChannel = guild.channels.find(c => c.name === 'action-log');
                        if (selectedChannel) {
                            if (!guild.me.permissionsIn(selectedChannel).has("SEND_MESSAGES") && !guild.me.hasPermission("ADMINISTRATOR")) return;
                            if (!guild.me.permissionsIn(selectedChannel).has("VIEW_CHANNEL") && !guild.me.hasPermission("ADMINISTRATOR")) return;
                            selectedChannel.send(embed);
                        }
                    } else { // If it is custom
                        let selectedChannel = guild.channels.get(r2.channelid);
                        if (selectedChannel) {
                            if (!guild.me.permissionsIn(selectedChannel).has("SEND_MESSAGES") && !guild.me.hasPermission("ADMINISTRATOR")) return;
                            if (!guild.me.permissionsIn(selectedChannel).has("VIEW_CHANNEL") && !guild.me.hasPermission("ADMINISTRATOR")) return;
                            selectedChannel.send(embed);
                        }
                    }
                }
            } catch (e) {
                let rollbar = new client.Rollbar(client.rollbarKey);
                rollbar.error("Something went wrong in guildBanAdd.js", e);
                console.error(e);
            }
        });
    }
}
