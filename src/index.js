import axios from "axios";
import {setupCache} from 'axios-cache-interceptor';


import vrf_generator from "./reverse_engineered/vrf_generator";
import encryptedURLDecoder from "./reverse_engineered/encryptedURLDecoder.js";
import *  as response_parsers from "./response_parsers.js";


const BASE_URL = "https://hdtoday.ru"
const HEADERS = {
    'sec-ch-ua': '"Not A;Brand";v="99", "Chromium";v="106", "Google Chrome";v="106"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'upgrade-insecure-requests': '1',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',

}
const SUPPORTED_SERVER = [
    "filemoon"
]


export default class RedSkull {
    constructor() {
        this.session = setupCache(axios.create({
            baseURL: BASE_URL,
            headers: HEADERS
        }))
        this.setSessionCookie().then()
        this.cacheTimeout = 1000 * 60 * 30
    }

    async setSessionCookie() {
        const resp = await this.session.get("/ajax/user/panel")
        this.session.defaults.headers.Cookie = resp.headers["set-cookie"][0];
    }

    async mediaIdInfo(mediaID) {
        const media_code = mediaID.split("-").at(-1)
        const vrf = encodeURIComponent(vrf_generator(media_code))
        const url = `${BASE_URL}/ajax/film/servers?id=${media_code}&vrf=${vrf}`
        const resp = await this.session.get(url, {cache: {ttl: this.cacheTimeout}})
        return resp.data.html
    }

    async search(keyword, page_no = 1) {
        const vrf = encodeURIComponent(vrf_generator(keyword))
        keyword = encodeURIComponent(keyword)
        const url = `${BASE_URL}/search?vrf=${vrf}&keyword=${keyword}&page=${page_no}`
        const resp = await this.session.get(url, {cache: {ttl: this.cacheTimeout}})
        return new response_parsers.SearchParser(resp.data).parse()
    }

    async series(mediaID) {
        const html = await this.mediaIdInfo(mediaID)
        return new response_parsers.SeriesParser(html, SUPPORTED_SERVER).parse()
    }

    async movie(mediaID) {
        const html = await this.mediaIdInfo(mediaID)
        return new response_parsers.MovieParser(html, SUPPORTED_SERVER).parse()
    }

    async episode(episodeID) {
        const url = `${BASE_URL}/ajax/episode/info?id=${episodeID}`
        const resp = await this.session.get(url)
        const encryptedURL = resp.data.url
        const iframeURL = encryptedURLDecoder(encryptedURL)
        return new response_parsers.EpisodeParser(this.session, iframeURL).parse()
    }

    async trending() {
        const url = `${BASE_URL}/home`
        const resp = await this.session.get(url, {cache: {ttl: this.cacheTimeout}})
        return new response_parsers.TrendingParser(resp.data).parse()
    }
}
