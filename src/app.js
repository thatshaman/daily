﻿// API endpoints
var dailyURLToday = "https://api.guildwars2.com/v2/achievements/daily";
var dailyURLTomorrow = "https://api.guildwars2.com/v2/achievements/daily/tomorrow";
var fractalURL = "https://api.guildwars2.com/v2/achievements/categories/88";
var achievementsURL = "https://api.guildwars2.com/v2/achievements";

// Global cache for API data
var dailies = {};
var achievements = {};
var categories = { "pve": [], "pveCore": [], "pveLowLevel": [], "pvp": [], "wvw": [], "special": [], "fractals": [] };

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
    categories = { "pve": [], "pveCore": [], "pveLowLevel": [], "pvp": [], "wvw": [], "special": [], "fractals": [] };

    // Fetch daily data
    $.ajax({
        url: url,
        async: false,
        dataType: 'json',
        success: function (data, status, request) {

            dailies = data;
            var requestBuffer = [];

            // Player versus environment
            for (var i = 0; i < dailies.pve.length; i++) {

                // Check if achievement is available for max level characters
                if (dailies.pve[i].level.max == 80) {

                    requestBuffer.push(dailies.pve[i].id);

                    // Check if achievement is available for HoT accounts
                    if ($.inArray("HeartOfThorns", dailies.pve[i].required_access) > -1) {
                        categories.pve.push(dailies.pve[i].id);
                    }

                    // Check if achievement is available for core / F2P accounts
                    if ($.inArray("GuildWars2", dailies.pve[i].required_access) > -1) {
                        categories.pveCore.push(dailies.pve[i].id);
                    }
                } else {
                    requestBuffer.push(dailies.pve[i].id);
                    categories.pveLowLevel.push(dailies.pve[i].id);
                }
            }

            // World vs World
            for (var i = 0; i < dailies.wvw.length; i++) {
                if (dailies.wvw[i].level.max == 80) {
                    requestBuffer.push(dailies.wvw[i].id);
                    categories.wvw.push(dailies.wvw[i].id);
                }
            }

            // Player vs Player
            for (var i = 0; i < dailies.pvp.length; i++) {
                if (dailies.pvp[i].level.max == 80) {
                    requestBuffer.push(dailies.pvp[i].id);
                    categories.pvp.push(dailies.pvp[i].id);
                }
            }

            // Special events (e.g. Wintersday, Halloween)
            for (var i = 0; i < dailies.special.length; i++) {
                requestBuffer.push(dailies.special[i].id);
                categories.special.push(dailies.special[i].id);
            }

            // Only show fractals for today's page (not available for tomorrow's dailies) 
            if (showFractals) {
                $.ajax({
                    url: fractalURL,
                    async: false,
                    dataType: 'json',
                    success: function (fractalData, fractalStatus, fractalRequest) {

                        for (var f = 0; f < fractalData.achievements.length; f++) {
                            requestBuffer.push(fractalData.achievements[f]);
                            categories.fractals.push(fractalData.achievements[f]);
                        }

                        // Fetch achievement details
                        $.ajax({
                            url: achievementsURL + "?ids=" + requestBuffer.toString() + "&lang=" + lang,
                            async: false,
                            dataType: 'json',
                            success: function (achievementData, achievementStatus, achievementRequest) {
                                achievements = achievementData;

                                for (var a = 0; a < achievements.length; a++) {

                                    // Parse fractal names
                                    if (lang == "en" || lang == "de" || lang == "es") {
                                        for (var i = 0; i < fractalsRegex[lang].length; i++) {
                                            var scale = achievements[a].name.match(fractalsRegex[lang][i]);
                                            if (scale != null) {
                                                achievements[a].requirement = fractalNames[lang][parseInt(scale[scale.length - 1])] + " - " + achievements[a].requirement;
                                            }
                                        }
                                    } else if (lang == "fr") {

                                        // French unicode output is a mess..
                                        if (achievements[a].name.replace(/[^\w\s]/gi, '').indexOf("Fractale quotidienne") > -1) {
                                            var scale = achievements[a].name.match(/\d+/);
                                            if (scale != null) {
                                                achievements[a].requirement = fractalNames[lang][parseInt(scale[scale.length - 1])] + " - " + achievements[a].requirement;
                                            }
                                        }
                                    }

                                    // If this is a fractal achievement, add the scales information.
                                    if (achievements[a].bits) {
                                        var scales = [];
                                        var bits = achievements[a].bits;

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
                                fillList();
                            }
                        });
                    }
                });
            } else {

                // Fetch achievement details
                $.ajax({
                    url: achievementsURL + "?ids=" + requestBuffer.toString() + "&lang=" + lang,
                    async: false,
                    dataType: 'json',
                    success: function (achievementData, achievementStatus, achievementRequest) {
                        achievements = achievementData;

                        // Start filling the list with entries
                        fillList();
                    }
                });
            }
        }
    });
}

function fillList() {
    /// <summary>Populates the ListView</summary>

    var items = $("#items");
    items.empty();

    // Special events (e.g. Wintersday, Halloween)
    if (categories.special.length > 0) {
        $("<li data-role='list-divider'>Special</li>").appendTo(items);
        for (var x = 0; x < categories.special.length; x++) {
            for (var i = 0; i < achievements.length; i++) {
                if (categories.special[x] == achievements[i].id) {
                    createEntry(achievements[i]).appendTo(items);
                }
            }
        }
    }

    // Player versus environment (Heart of Thorns)
    $("<li data-role='list-divider'>PvE (Heart of Thorns)</li>").appendTo(items);
    for (var x = 0; x < categories.pve.length; x++) {
        for (var i = 0; i < achievements.length; i++) {
            if (categories.pve[x] == achievements[i].id) {
                createEntry(achievements[i]).appendTo(items);
            }
        }
    }

    // Player versus environment (Core & F2P)
    $("<li data-role='list-divider'>PvE (Core &amp; Free to Play)</li>").appendTo(items);
    for (var x = 0; x < categories.pveCore.length; x++) {

        for (var i = 0; i < achievements.length; i++) {
            if (categories.pveCore[x] == achievements[i].id) {
                createEntry(achievements[i]).appendTo(items);
            }
        }
    }

    // Player versus environment (Low Level)
    $("<li data-role='list-divider'>PvE (Low Level)</li>").appendTo(items);
    for (var x = 0; x < categories.pveLowLevel.length; x++) {

        for (var i = 0; i < achievements.length; i++) {
            if (categories.pveLowLevel[x] == achievements[i].id) {
                createEntry(achievements[i]).appendTo(items);
            }
        }
    }

    // World vs World
    $("<li data-role='list-divider'>WvW</li>").appendTo(items);
    for (var x = 0; x < categories.wvw.length; x++) {
        for (var i = 0; i < achievements.length; i++) {
            if (categories.wvw[x] == achievements[i].id) {
                createEntry(achievements[i]).appendTo(items);
            }
        }
    }

    // Player vs Player
    $("<li data-role='list-divider'>PvP</li>").appendTo(items);
    for (var x = 0; x < categories.pvp.length; x++) {
        for (var i = 0; i < achievements.length; i++) {
            if (categories.pvp[x] == achievements[i].id) {
                createEntry(achievements[i]).appendTo(items);
            }
        }
    }

    // Fractals of the Mists
    if (categories.fractals.length > 0) {
        $("<li data-role='list-divider'>Fractals</li>").appendTo(items);
        for (var x = 0; x < categories.fractals.length; x++) {
            for (var i = 0; i < achievements.length; i++) {
                if (categories.fractals[x] == achievements[i].id) {
                    createEntry(achievements[i]).appendTo(items);
                }
            }
        }
    }

    // Refresh the updated listview
    items.listview("refresh");
}

function createEntry(achievement) {
    /// <summary>Generate a ListView item</summary>
    /// <param name="achievement" type="Integer">The Id of the achievement.</param>
    /// <returns type="Object">ListViewItem</returns>

    var retval = $("<li/>");
    var icon = achievement.icon || "https://render.guildwars2.com/file/483E3939D1A7010BDEA2970FB27703CAAD5FBB0F/42684.png";
    var name = achievement.name;

    var requirement = achievement.requirement;

    retval.html("<a href='javascript:showDetails(" + achievement.id + ")'><img src='" + icon + "' style='width:24px; height:24px' /><h1>" + name + "</h1><span style='font-size: 9pt'>" + requirement + "</span></a>");

    return retval;
}

function showDetails(id) {
    /// <summary>Shows detailed achievement data on a seperate page.</summary>
    /// <param name="id" type="Integer">The Id of achievement.</param>

    var achievement = undefined;
    var link = "";

    if ($.inArray(id, bosses) > -1) link = "<br/><div style='width:100%; text-align:center'><a target='_blank' href='http://dulfy.net/2014/04/23/event-timer/'><img src='dulfy.png'/></div>"

    for (var i = 0; i < achievements.length; i++) {
        if (id == achievements[i].id) {
            achievement = achievements[i];
        }
    }

    if (achievement !== undefined) {
        if (achievement.name) $("#title").text(achievement.name);
        $("#description").html(achievement.requirement + link);
        $.mobile.changePage("#dialog", { transition: "flip" });
    }
}
