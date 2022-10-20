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


export {SearchParser, TrendingParser};
