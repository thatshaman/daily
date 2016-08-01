var dailyURL = "https://api.guildwars2.com/v2/achievements/daily";
var fractalURL = "https://api.guildwars2.com/v2/achievements/categories/88";
var achievementsURL = "https://api.guildwars2.com/v2/achievements";
var dailies = {};
var achievements = {};

var pve = [];
var pveh = [];
var pvp = [];
var wvw = [];
var special = [];
var fractals = [];
var fractalsRegex =
    {
        "en": [/^Daily Recommended Fractal—Scale (\d+)$/i],
        "de": [/^Empfohlenes tägliches Fraktal: Schwierigkeitsgrad (\d+)$/i],
        "fr": ["Unicode mess.. use alternate"],
        "es": [/^Fractal diario recomendado: escala (\d+)$/i, /^Fractal del día recomendado: escala (\d+)$/i],
        "zh": ["Not implemented"],
    }

var bosses = [2025, 1930, 1933, 1934, 2026, 1935];

var urlParams = {};
var hashParams = {};
var lang = "en";

(window.onpopstate = function () {
    var match, pl = /\+/g, search = /([^&=]+)=?([^&]*)/g, decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); }, query = window.location.search.substring(1);
    while (match = search.exec(query)) urlParams[decode(match[1])] = decode(match[2]);

    var e, a = /\+/g, r = /([^&;=]+)=?([^&;]*)/g, d = function (s) { return decodeURIComponent(s.replace(a, " ")); }, q = window.location.hash.substring(1);
    while (e = r.exec(q)) hashParams[d(e[1])] = d(e[2]);
})();


$(document).ready(function () {
    if (urlParams["lang"] !== undefined) lang = urlParams["lang"].toLowerCase();
    loadDailyData();
});



function loadDailyData() {
    jQuery.ajax({
        url: dailyURL,
        async: false,
        dataType: 'json',
        success: function (data, status, request) {

            dailies = data;

            var buffer = [];

            for (var i = 0; i < dailies.pve.length; i++) {
                if (dailies.pve[i].level.max == 80) {
                    buffer.push(dailies.pve[i].id);
                    pve.push(dailies.pve[i].id);
                } else {
                    buffer.push(dailies.pve[i].id);
                    pveh.push(dailies.pve[i].id);
                }
            }

            for (var i = 0; i < dailies.wvw.length; i++) {
                if (dailies.wvw[i].level.max == 80) {
                    buffer.push(dailies.wvw[i].id);
                    wvw.push(dailies.wvw[i].id);
                }
            }

            for (var i = 0; i < dailies.pvp.length; i++) {
                if (dailies.pvp[i].level.max == 80) {
                    buffer.push(dailies.pvp[i].id);
                    pvp.push(dailies.pvp[i].id);
                }
            }

            for (var i = 0; i < dailies.special.length; i++) {
                buffer.push(dailies.special[i].id);
                special.push(dailies.special[i].id);
            }

            jQuery.ajax({
                url: fractalURL,
                async: false,
                dataType: 'json',
                success: function (fractalData, fractalStatus, fractalRequest) {

                    for (var f = 0; f < fractalData.achievements.length; f++) {
                        buffer.push(fractalData.achievements[f]);
                        fractals.push(fractalData.achievements[f]);
                    }

                    jQuery.ajax({
                        url: achievementsURL + "?ids=" + buffer.toString() + "&lang=" + lang,
                        async: false,
                        dataType: 'json',
                        success: function (achievementData, achievementStatus, achievementRequest) {
                            achievements = achievementData;

                            for (var a = 0; a < achievements.length; a++) {

                                console.log(achievements[a].name);
                                console.log(achievements[a].requirement);

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
                            fillList();
                        }
                    });
                }
            });


        }
    });
}

function fillList() {

    if (special.length > 0) {
        $("<li data-role='list-divider'>Special</li>").appendTo(items);
        for (var x = 0; x < special.length; x++) {
            for (var i = 0; i < achievements.length; i++) {
                if (special[x] == achievements[i].id) {
                    createEntry(achievements[i]).appendTo(items);
                }
            }
        }
    }

    var items = $("#items");
    $("<li data-role='list-divider'>PvE</li>").appendTo(items);
    for (var x = 0; x < pve.length; x++) {

        for (var i = 0; i < achievements.length; i++) {
            if (pve[x] == achievements[i].id) {
                createEntry(achievements[i]).appendTo(items);
            }
        }
    }

    $("<li data-role='list-divider'>PvE (hidden)</li>").appendTo(items);
    for (var x = 0; x < pveh.length; x++) {

        for (var i = 0; i < achievements.length; i++) {
            if (pveh[x] == achievements[i].id) {
                createEntry(achievements[i]).appendTo(items);
            }
        }
    }

    $("<li data-role='list-divider'>PvP</li>").appendTo(items);
    for (var x = 0; x < pvp.length; x++) {
        for (var i = 0; i < achievements.length; i++) {
            if (pvp[x] == achievements[i].id) {
                createEntry(achievements[i]).appendTo(items);
            }
        }
    }

    $("<li data-role='list-divider'>WvW</li>").appendTo(items);
    for (var x = 0; x < wvw.length; x++) {
        for (var i = 0; i < achievements.length; i++) {
            if (wvw[x] == achievements[i].id) {
                createEntry(achievements[i]).appendTo(items);
            }
        }
    }

    $("<li data-role='list-divider'>Fractals</li>").appendTo(items);
    for (var x = 0; x < fractals.length; x++) {
        for (var i = 0; i < achievements.length; i++) {
            if (fractals[x] == achievements[i].id) {
                createEntry(achievements[i]).appendTo(items);
            }
        }
    }

    items.listview("refresh");
}

function createEntry(achievement) {
    var retval = $("<li/>");
    var icon = achievement.icon || "https://render.guildwars2.com/file/1273C427032320DDDB63062C140E72DCB0D9B411/502087.png";
    var name = achievement.name;

    var requirement = achievement.requirement;



    retval.html("<a href='javascript:showDetails(" + achievement.id + ")'><img src='" + icon + "' style='width:24px; height:24px' /><h1>" + name + "</h1><span style='font-size: 9pt'>" + requirement + "</span></a>");

    return retval;
}

function showDetails(id) {
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
        $.mobile.changePage("#dialog", { transition: "slide" });
    }
}
