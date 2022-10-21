import * as cheerio from 'cheerio';
import {URLSearchParams} from 'react-native-url-polyfill';


class SearchParser {
    constructor(html) {
        this.html = html;
        this.$ = cheerio.load(this.html);
    }

    parse() {
        return {
            "max_page_no": this.parsePageNo(),
            "results": this.parseResults(),
        }
    }

    parsePageNo() {
        const elems = this.$("div.content > div.pagenav > ul.pagination > li > a")
        const arrow = '»'
        for (let i = 0; i < elems.length; i++) {
            const elem = elems[i];
            const is_arrow_key_anchor = elem.children[0].data === arrow;
            const is_last_page_anchor = is_arrow_key_anchor || ((i + 1) === elems.length)
            if (is_last_page_anchor) {
                const params = new Proxy(new URLSearchParams(elem.attribs.href), {
                    get: (searchParams, prop) => searchParams.get(prop)
                })
                return params["page"]
            }
        }
    }

    parseResults() {
        const results = [];
        for (let item of this.$("div.filmlist > div.item")) {
            results.push(this.parseResult(item))
        }
        return results;
    }

    parseResult(item) {
        const $ = this.$(item)
        return {
            "title": $.find("a.poster").attr("title"),
            "poster": $.find("a.poster > img").attr("src"),
            "quality": $.find("div.icons > div.quality").text(),
            "rating": $.find("span.imdb").text(),
            "type": $.find("div.meta > i.type").text(),
            "media_id": $.find("a.poster").attr("href"),
        }
    }
}

class SeriesParser {
    constructor(html, supportedServers) {
        this.html = html;
        this.supportedServers = supportedServers;
        this.$ = cheerio.load(this.html);
        this.servers = this.parseServers()
    }

    parse() {
        return {
            "servers": this.servers,
            "episodes": this.parseSeries(),
        }
    }

    parseServers() {
        const servers = {}

        for (let item of this.$("div#servers > div.server")) {
            const $ = this.$(item)
            const serverName = $.find("div").text().toLowerCase()
            const isValidServer = this.supportedServers.includes(serverName)
            if (isValidServer) {
                const server_id = $.attr("data-id")
                servers[serverName] = server_id
            }
        }

        return servers;
    }

    parseSeries() {
        const series = {}

        for (let item of this.$("div#episodes > div.episodes")) {
            const $ = this.$(item)
            const season = parseInt($.attr("data-season"))
            series[season] = this.parseEpisodes($)
        }

        return series
    }

    parseEpisodes(item) {
        const episodes = {}

        for (let episode of item.find("div.range > div.episode > a")) {
            const $ = this.$(episode)
            let episode_number = $.attr("data-kname").replace("-end", "").split("-").at(-1)
            episode_number = episode_number !== "full" ? parseInt(episode_number) : 1
            episodes[episode_number] = this.parseEpisode($)
        }

        return episodes

    }

    parseEpisode(item) {
        return {
            "name": item.find("span.name").text(),
            "date": item.attr("title").split(" - ").at(-1),
            "sources": this.parseEpisodeSources(JSON.parse(item.attr("data-ep")))
        }
    }

    parseEpisodeSources(data) {
        const supportedServerIds = []
        for (let serverID in this.servers) {
            supportedServerIds.push(this.servers[serverID])
        }


        const sources = {}
        for (let serverID in data) {
            if (supportedServerIds.includes(serverID)) {
                const episodeID = data[serverID]
                sources[serverID] = episodeID
            }
        }

        return sources
    }

}

class MovieParser {
    constructor(html, supportedServers) {
        this.seriesData = new SeriesParser(html, supportedServers).parse()
    }

    parse() {
        const serverMap = {}
        for (let serverName in this.seriesData.servers) {
            const serverID = this.seriesData.servers[serverName]
            serverMap[serverID] = serverName
        }

        let sources = this.seriesData.episodes[1][1]["sources"]
        let parsedSources = {}
        for (let serverID in sources) {
            const episodeID = sources[serverID]
            parsedSources[serverMap[serverID]] = episodeID
        }

        return parsedSources
    }
}

class EpisodeParser {
    constructor(session, iframeURL) {
        this.session = session
        this.iframeURL = iframeURL
    }

    async parse() {
        return {
            "url": await this.get_m3u8_URL()
        }
    }

    async get_m3u8_URL() {
        if (this.iframeURL.includes("filemoon")) {
            return await this.filemoonParser()
        }
        return ""
    }

    async filemoonParser() {
        const resp = await this.session.get(this.iframeURL)
        const $ = cheerio.load(resp.data)

        let script;
        for (let scriptTag of $("script")) {
            scriptTag = $(scriptTag)
            if (scriptTag.text().startsWith("eval")) {
                script = scriptTag.text().replace("eval", "")
            }
        }

        if (script === undefined) {
            throw Error("Unable to find player information script from FileMoon Server")
        }

        script = String(eval(script))
        const regexp = new RegExp('file\\s*:\\s*\"((http|ftp|https)://([\\w_-]+(?:\\.[\\w_-]+)+)([\\w.,@?^=%&:/~+#-]*[\\w@?^=%&/~+#-]))\"')
        let url = script.match(regexp)[1]

        if (url.includes("m3u8")) {
            return url
        }

        throw Error("Unable to find m3u8 URL from FileMoon Server")

    }
}

class TrendingParser {
    constructor(html) {
        this.html = html
        this.$ = cheerio.load(this.html)
    }

    parse() {
        return {
            "results": this.parseResults()
        }
    }

    parseResults() {
        let results = []

        for (let slide of this.$("div#slider > div.swiper-wrapper > div.item.swiper-slide")) {
            results.push(this.parseSlide(slide))
        }

        return results;
    }

    parseSlide(slide) {
        const $ = this.$(slide)
        const removePrefix = (value, prefix) => {
            return value.startsWith(prefix) ? value.slice(prefix.length) : value
        }
        return {
            "title": $.find("div.container > div.info > h3.title").text(),
            "poster": $.attr("data-src"),
            "quality": $.find("div.container > div.info > div.meta > span.quality").text(),
            "rating": $.find("div.container > div.info > div.meta > span.imdb").text(),
            "type": removePrefix($.find("div.container > div.info > div.actions > a.watchnow").attr("href"), "/").split("/")[0],
            "media_id": $.find("div.container > div.info > div.actions > a.watchnow").attr("href"),
        }
    }
}


export {SearchParser, SeriesParser, MovieParser, EpisodeParser, TrendingParser};
