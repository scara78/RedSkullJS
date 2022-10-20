function mi(t, n) {
    var S = "";

    for (var i, _ = [], e = 0, o = S, u = 0; u < 256; u++) {
        _[u] = u;
    }
    for (u = 0; u < 256; u++) {
        e = (e + _[u] + t.charCodeAt(u % t.length)) % 256,
            i = _[u],
            _[u] = _[e],
            _[e] = i;
    }
    for (var u = 0, e = 0, c = 0; c < n.length; c++) {
        e = (e + _[u = (u + 1) % 256]) % 256,
            i = _[u],
            _[u] = _[e],
            _[e] = i,
            o += String.fromCharCode(n.charCodeAt(c) ^ _[(_[u] + _[e]) % 256]);
    }
    return o
}


function wi(n) {
    var c = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

    for (n = "".concat(n), $ = 0; $ < n.length; $++) {
        if (255 < n.charCodeAt($))
            return null;
    }
    for (var u = "", $ = 0; $ < n.length; $ += 3) {
        var s = [void 0, void 0, void 0, void 0];
        s[0] = n.charCodeAt($) >> 2,
            s[1] = (3 & n.charCodeAt($)) << 4,
        n.length > $ + 1 && (s[1] |= n.charCodeAt($ + 1) >> 4,
            s[2] = (15 & n.charCodeAt($ + 1)) << 2),
        (n.length > $ + 2) && (s[2] |= n.charCodeAt($ + 2) >> 6,
            s[3] = 63 & n.charCodeAt($ + 2));
        for (var f = 0; f < s.length; f++) {
            "undefined" == typeof s[f] ? u += "=" : u += function (t) {
                if (0 <= t && (t < 64))
                    return c[t]
            }(s[f])
        }
    }
    return u
}


function generate(t) {
    var S = "";

    return t = encodeURIComponent(S.concat(t)),
        t = mi("DZmuZuXqa9O0z3b7", t),
        wi(t)
}

export default generate;
