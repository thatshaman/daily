// API endpoints
var dailyURLToday = "https://api.guildwars2.com/v2/achievements/daily";
var dailyURLTomorrow = "https://api.guildwars2.com/v2/achievements/daily/tomorrow";
var achievementsURL = "https://api.guildwars2.com/v2/achievements";
var rewardsURL = "https://api.guildwars2.com/v2/items";

// URLs for each wiki page
var wikiUrls = {
    "en": "https://wiki.guildwars2.com/wiki/",
    "de": "https://wiki-de.guildwars2.com/wiki/",
    "fr": "https://wiki-fr.guildwars2.com/wiki/",
    "es": "https://wiki-es.guildwars2.com/wiki/",
    "zh": "https://wiki-es.guildwars2.com/wiki/"
};

// Global cache for API data
var dailies = {};
var achievements = {};
var rewards = {};
var categories = {};

// Regular expressions used to determine fractal names
var fractalsRegex =
    {
        "en": [/^Daily Recommended Fractal—Scale (\d+)$/i],
        "de": [/^Empfohlenes tägliches Fraktal: Schwierigkeitsgrad (\d+)$/i],
        "fr": ["Unicode mess.. use alternate"],
        "es": [/^Fractal diario recomendado: escala (\d+)$/i, /^Fractal del día recomendado: escala (\d+)$/i],
        "zh": ["Not implemented"],
    }

// Fixed Id's for world boss achievements
var bosses = [2025, 1930, 1933, 1934, 2026, 1935];

// Fixed Id's for world dungeon achievements
var dungeons = [2893, 2914, 2959, 2917, 2901, 2931, 2953, 2938];

// URL parameters + hash
var urlParams = {};
var hashParams = {};
var lang = "en";

// Parse URL parameters + hash
(window.onpopstate = function () {
    var match, pl = /\+/g, search = /([^&=]+)=?([^&]*)/g, decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); }, query = window.location.search.substring(1);
    while (match = search.exec(query)) urlParams[decode(match[1])] = decode(match[2]);

    var e, a = /\+/g, r = /([^&;=]+)=?([^&;]*)/g, d = function (s) { return decodeURIComponent(s.replace(a, " ")); }, q = window.location.hash.substring(1);
    while (e = r.exec(q)) hashParams[d(e[1])] = d(e[2]);
})();

// Go go go
$(document).ready(function () {

    // Parse requested language
    if (urlParams["lang"] !== undefined) lang = urlParams["lang"].toLowerCase();

    // Switch to today's dailies
    $("#link_today").click(function () {
        loadDailyData(dailyURLToday, true);
    });

    // Switch to tomorrow's dailies
    $("#link_tomorrow").click(function () {
        loadDailyData(dailyURLTomorrow, false);
    });

    // Load today's dailies by default
    loadDailyData(dailyURLToday, true);
});


function loadDailyData(url, showFractals) {
    /// <summary>Loads data from the API</summary>
    /// <param name="url" type="String">API endpoint.</param>
    /// <param name="showFractals" type="Boolean">Show fractal data.</param>

    // Reset data
    categories = { "pve": [], "pvePoF": [], "pveHoT": [], "pveCore": [], "lowLevel": [], "pvp": [], "wvw": [], "special": [], "fractals": [] };

    // Fetch daily data
    $.ajax({
        url: url,
        async: false,
        dataType: 'json',
        success: function (data, status, request) {

            dailies = data;
            var achievementBuffer = [];


            //
            // Temporary fix:
            //    There's an unresolved API bug with the required_access field
            //    More information: https://github.com/arenanet/api-cdi/issues/574
            //
            var hasHoTDaily = false;
            var hasPoFDaily = false;
            var lowestCoreLevel = 99;
            var lowestCoreId = 0;

            for (var i = 0; i < dailies.pve.length; i++) {

                if (dailies.pve[i].level.max == 80 && dailies.pve[i].level.min < lowestCoreLevel) {
                    lowestCoreLevel = dailies.pve[i].level.min;
                    lowestCoreId = i;
                }

                if (dailies.pve[i].id > 2800 && dailies.pve[i].id < 3100) {
                    if ($.inArray(dailies.pve[i].id, dungeons) == -1) {
                        dailies.pve[i].required_access = ["HeartOfThorns"];
                        hasHoTDaily = true;
                    }
                } else if (dailies.pve[i].id > 3100) {
                    dailies.pve[i].required_access = ["PathOfFire"];
                    hasPoFDaily = true;
                } else {
                    dailies.pve[i].required_access = ["GuildWars2"];
                }
            }
            
            if (hasPoFDaily || hasHoTDaily) {
                dailies.pve[lowestCoreId].required_access = ["Core"];
            }

            //
            //
            //

            // Player versus environment
            for (var i = 0; i < dailies.pve.length; i++) {

                achievementBuffer.push(dailies.pve[i].id);

                // Check if achievement is available for max level characters
                if (dailies.pve[i].level.max == 80) {

                    // Check if achievement is available for HoT accounts
                    if ($.inArray("PathOfFire", dailies.pve[i].required_access) > -1) {
                        categories.pvePoF.push(dailies.pve[i].id);
                    }

                    // Check if achievement is available for HoT accounts
                    if ($.inArray("HeartOfThorns", dailies.pve[i].required_access) > -1) {
                        categories.pveHoT.push(dailies.pve[i].id);
                    }

                    // Check if achievement is available for PvE
                    if ($.inArray("GuildWars2", dailies.pve[i].required_access) > -1) {
                        categories.pve.push(dailies.pve[i].id);
                    }

                    // Check if achievement is flagged as Core achievement
                    if ($.inArray("Core", dailies.pve[i].required_access) > -1) {
                        categories.pveCore.push(dailies.pve[i].id);
                    }

                } else if (dailies.pve[i].level.min == 1) {
                    categories.lowLevel.push(dailies.pve[i].id);
                }
            }

            // World vs World
            for (var i = 0; i < dailies.wvw.length; i++) {
                achievementBuffer.push(dailies.wvw[i].id);

                if (dailies.wvw[i].level.max == 80) {
                    categories.wvw.push(dailies.wvw[i].id);
                }

                if (dailies.wvw[i].level.min == 1) {
                    categories.lowLevel.push(dailies.wvw[i].id);
                }
            }

            // Player vs Player
            for (var i = 0; i < dailies.pvp.length; i++) {
                achievementBuffer.push(dailies.pvp[i].id);

                if (dailies.pvp[i].level.max == 80) {
                    categories.pvp.push(dailies.pvp[i].id);
                }

                if (dailies.pvp[i].level.min == 1) {
                    categories.lowLevel.push(dailies.pvp[i].id);
                }
            }

            // Fractals of the Mists
            for (var i = 0; i < dailies.fractals.length; i++) {
                achievementBuffer.push(dailies.fractals[i].id);
                categories.fractals.push(dailies.fractals[i].id);
            }

            // Special events (e.g. Wintersday, Halloween)
            for (var i = 0; i < dailies.special.length; i++) {
                achievementBuffer.push(dailies.special[i].id);
                categories.special.push(dailies.special[i].id);
            }

            // Fetch achievement details
            $.ajax({
                url: achievementsURL + "?ids=" + achievementBuffer.toString() + "&lang=" + lang,
                async: false,
                dataType: 'json',
                success: function (achievementData, achievementStatus, achievementRequest) {
                    achievements = achievementData;

                    for (var a = 0; a < achievements.length; a++) {

                        // Parse fractal names for daily recommended fractals.
                        var scale = null;
                        if (lang == "en" || lang == "de" || lang == "es") {
                            for (var i = 0; i < fractalsRegex[lang].length; i++) {
                                scale = achievements[a].name.match(fractalsRegex[lang][i]);
                                if (scale != null) {
                                    achievements[a].requirement = fractalNames[lang][parseInt(scale[scale.length - 1])] + " - " + achievements[a].requirement;
                                }
                            }
                        } else if (lang == "fr") {

                            // French unicode output is a mess..
                            if (achievements[a].name.replace(/[^\w\s]/gi, '').indexOf("Fractale quotidienne") > -1) {
                                scale = achievements[a].name.match(/\d+/);
                                if (scale != null) {
                                    achievements[a].requirement = fractalNames[lang][parseInt(scale[scale.length - 1])] + " - " + achievements[a].requirement;
                                }
                            }
                        }
                        if (scale != null) {
                            achievements[a].dailyType = "fractalRecommended";
                        }

                        // If this is a fractal daily tier (1-4) achievement, add the scales information.
                        if (achievements[a].bits) {
                            var scales = [];
                            var bits = achievements[a].bits;
                            achievements[a].dailyType = "fractalTier";

                            // bits.text is like "Fractal Scale 25". Pretty verbose to string
                            // a bunch of those together, so use the full first string, which
                            // is nicely translated for us, and then just add the numbers after that.
                            var scaleRegex = /\d+/;

                            for (var i = 0; i < bits.length; i++) {
                                var scaleText = bits[i].text;
                                if (i == 0) {
                                    scales.push(scaleText);
                                } else {
                                    scales.push(bits[i].text.match(scaleRegex));
                                }
                            }
                            if (scales.length > 0) {
                                var reqsString = scales.join(", ");
                                achievements[a].requirement += " (" + reqsString + ")";
                            }
                        }
                    }

                    // Start filling the list with entries
                    loadRewardData();
                }
            });
        }
    });
}

function loadRewardData() {
    /// <summary>Loads reward data from the API</summary>

    var rewardBuffer = [];
    for (i = 0; i < achievements.length; i++) {
        for (r = 0; r < achievements[i].rewards.length; r++) {
            rewardBuffer.push(achievements[i].rewards[r].id);

        }
    }

    $.ajax({
        url: rewardsURL + "?ids=" + rewardBuffer.toString() + "&lang=" + lang,
        async: false,
        dataType: 'json',
        success: function (rewardData, rewardStatus, rewardRequest) {
            rewards = rewardData;
            fillList();
        }
    });
}

function getReward(id) {
    /// <summary>Get a reward item from the rewards buffer</summary>
    /// <param name="id" type="Integer">The Id of the reward item.</param>
    /// <returns type="Object">Guild Wars 2 Item</returns>

    for (var i = 0; i < rewards.length; i++) {
        if (rewards[i].id == id) {
            return rewards[i];
            break;
        }
    }

    return {};
}

function fillList() {
    /// <summary>Populates the ListView</summary>

    var items = $("#items");
    items.empty();

    // First, iterate over achievements once and make a dict so we can look
    // things up easier below.
    achievementsDict = {};
    for (var i = 0; i < achievements.length; i++) {
        var achievementID = achievements[i].id;
        achievementsDict[achievementID] = achievements[i];
    }

    // Special events (e.g. Wintersday, Halloween)
    if (categories.special.length > 0) {
        $("<li data-role='list-divider'>Special</li>").appendTo(items);
        for (var x = 0; x < categories.special.length; x++) {
            var id = categories.special[x];
            createEntry(achievementsDict[id]).appendTo(items);
        }
    }

    // Player versus environment (Core & F2P)
    $("<li data-role='list-divider'>PvE</li>").appendTo(items);
    for (var x = 0; x < categories.pve.length; x++) {
        var id = categories.pve[x];
        createEntry(achievementsDict[id]).appendTo(items);
    }

    // Player versus environment (Core & F2P)
    var coreTitle = "Core & F2P";
    if (categories.pveHoT.length == 0 && categories.pvePoF.length > 0) {
        coreTitle = "Core, F2P & Heart of Thorns";
    } else if (categories.pveHoT.length > 0 && categories.pvePoF.length == 0) {
        coreTitle = "Core, F2P & Path of Fire";
    }

    $("<li data-role='list-divider'>" + coreTitle + "</li>").appendTo(items);
    for (var x = 0; x < categories.pveCore.length; x++) {
        var id = categories.pveCore[x];
        createEntry(achievementsDict[id]).appendTo(items);
    }

    // Player versus environment (Heart of Thorns)
    $("<li data-role='list-divider'>Heart of Thorns</li>").appendTo(items);
    for (var x = 0; x < categories.pveHoT.length; x++) {
        var id = categories.pveHoT[x];
        createEntry(achievementsDict[id]).appendTo(items);
    }

    // Player versus environment (Path of Fire)
    $("<li data-role='list-divider'>Path of Fire</li>").appendTo(items);
    for (var x = 0; x < categories.pvePoF.length; x++) {
        var id = categories.pvePoF[x];
        createEntry(achievementsDict[id]).appendTo(items);
    }

    // World vs World
    $("<li data-role='list-divider'>WvW</li>").appendTo(items);
    for (var x = 0; x < categories.wvw.length; x++) {
        var id = categories.wvw[x];
        createEntry(achievementsDict[id]).appendTo(items);
    }

    // Player vs Player
    $("<li data-role='list-divider'>PvP</li>").appendTo(items);
    for (var x = 0; x < categories.pvp.length; x++) {
        var id = categories.pvp[x];
        createEntry(achievementsDict[id]).appendTo(items);
    }

    // Low level (up to level 10)
    $("<li data-role='list-divider'>Low Level</li>").appendTo(items);
    for (var x = 0; x < categories.lowLevel.length; x++) {
        var id = categories.lowLevel[x];
        createEntry(achievementsDict[id]).appendTo(items);
    }

    // Fractals of the Mists
    if (categories.fractals.length > 0) {
        $("<li data-role='list-divider'>Fractals</li>").appendTo(items);

        var recs = [];
        var tiers = [];

        for (var x = 0; x < categories.fractals.length; x++) {
            var id = categories.fractals[x];
            var achievement = achievementsDict[id];
            var fractalEntry = createEntry(achievement);

            if (achievement.dailyType == 'fractalRecommended') {
                recs.push(fractalEntry);
            } else if (achievement.dailyType == 'fractalTier') {
                tiers.push(fractalEntry);
            }
        }

        // Group daily recommended fractals first, then tiers
        for (var x = 0; x < recs.length; x++) {
            recs[x].appendTo(items);
        }

        for (var x = 0; x < tiers.length; x++) {
            tiers[x].appendTo(items);
        }
    }

    // Refresh the updated listview
    items.listview("refresh");
}

function createEntry(achievement) {
    /// <summary>Generate a ListView item</summary>
    /// <param name="achievement" type="Integer">The Id of the achievement.</param>
    /// <returns type="Object">ListViewItem</returns>

    // TODO: clean these temporary things up and convert everything to CSS

    var retval = $("<li data-iconpos='right' data-icon=''/>");
    var icon = achievement.icon || "https://render.guildwars2.com/file/483E3939D1A7010BDEA2970FB27703CAAD5FBB0F/42684.png";

    var title = "<img src='" + icon + "' style='float:left' /> <span class='title'>" + achievement.name + "</span>";
    var subtitle = "<span class='subtitle'>" + achievement.requirement + "</span>";
    if (subtitle.length > 128) subtitle = subtitle.substring(0, 128) + '...';
    var details = "";

    details += achievement.requirement + "<br/>";
    if (achievement.description.length > 0) details += "<i>- " + achievement.description + "</i><br/>";

    details += "<br/><div class='achievementDetails'>";
    if (achievement.tiers[0].count > 1) details += "<b>Required:</b> " + achievement.tiers[0].count + "<br/>";
    if (achievement.tiers[0].points > 0) details += "<b>Achievement Points:</b> " + achievement.tiers[0].points + "<br/>";

    if (achievement.rewards.length > 0) {
        for (var i = 0; i < achievement.rewards.length; i++) {
            var reward = getReward(achievement.rewards[i].id);

            details += "<b>Reward:</b> <img src='" + reward.icon + "' style='width: 16px; height: 16px;'/> ";

            // English will search by item chat code, other languages will search by name
            if (lang == "en") {
                details += "<a href='" + wikiUrls[lang] + "/?search=" + escape(reward.chat_link) + "' target='_blank'>" + reward.name + "</a>";
            } else {
                details += "<a href='" + wikiUrls[lang] + escape(reward.name) + "' target='_blank'>" + reward.name + "</a>";
            }

            if (achievement.rewards[i].count > 1) details += " (" + achievement.rewards[i].count + ")";
            details += "<br/>";
        }
    }
    details += "</div>";

    retval.html("<h2>" + title + "<br/>" + subtitle + "<div></h2><div style='white-space:normal !important;'>" + details + "</div>");
    retval.collapsible();
    return retval;
}
