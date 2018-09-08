
const blacklist = [
    'Fetcher',
    'FetchOne',
    'Search',
    'chessboard',
    'Adapter',
]

function mylog(msg) {
    var ok = true
    for (var i = 0; i < blacklist.length; i++) {
        if (msg.toLowerCase().startsWith(blacklist[i].toLowerCase())) {
            ok = false
            break
        }
	}
    if (ok) {
        console.log.apply(console, arguments);
    }
}

var Config = {
    host : 'https://chessindex.org',
    api_host : 'https://devapi.chessindex.org',

    pagination : 20,
    api_timeout : 3000,

    log : mylog,
    warn: function() { console.warn.apply(console, arguments) },

    googlebot_debug: true,
}

export default Config
