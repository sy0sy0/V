/** @type {import('./_venera_.js')} */
class BoyLove extends ComicSource {
    // Note: The fields which are marked as [Optional] should be removed if not used

    // name of the source
    name = "香香腐宅"

    // unique id of the source
    key = "boylove"

    version = "1.0.0"

    minAppVersion = "1.6.0"

    // update url
    url = "https://cdn.jsdelivr.net/gh/sy0sy0/V@main/boylove.js"

    settings = {
        domain: {
            title: "主站地址",
            type: "select",
            options: [
                { value: "https://boylove.cc" },
                { value: "https://boylove4.xyz" },
            ],
            default: "https://boylove.cc"
        },
        imageHost: {
            title: "图片域名",
            type: "input",
            validator: "^https?://.+",
            default: "https://img.boylove.cc"
        },
        descramble: {
            title: "自动还原被打乱的图片",
            type: "switch",
            default: true
        }
    }

    get baseUrl() {
        let domain = this.loadSetting('domain')
        return domain ? domain.replace(/\/+$/, '') : "https://boylove.cc"
    }

    get imageBase() {
        let host = this.loadSetting('imageHost')
        return host ? host.replace(/\/+$/, '') : "https://img.boylove.cc"
    }

    get headers() {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Referer": this.baseUrl + "/",
            "Accept": "application/json, text/plain, */*"
        }
    }

    get imageHeaders() {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Referer": this.baseUrl + "/",
            "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8"
        }
    }

    /// 章节图片的打乱块数缓存： epId -> number|null
    _partsCounts = {}

    /**
     * 把接口返回的漫画对象转成 Comic
     */
    _parseComic(item) {
        let cover = item.image || item.cover || ""
        if (cover && !cover.startsWith("http")) {
            cover = this.imageBase + (cover.startsWith("/") ? cover : "/" + cover)
        }

        let tags = []
        if (item.keyword) {
            tags = String(item.keyword).split(",").map(e => e.trim()).filter(e => e.length > 0)
        }

        let updateTime = item.update_time || item.mopen_time || ""
        if (typeof updateTime === "number") {
            updateTime = new Date(updateTime * 1000).toISOString().replace("T", " ").substring(0, 19)
        }

        let status = item.mhstatus === 0 ? "连载中" : (item.mhstatus === 1 ? "已完结" : "")

        let description = item.desc ? String(item.desc).trim() : ""
        let extra = []
        if (status) extra.push(status)
        if (updateTime) extra.push(`更新于 ${updateTime}`)
        if (item.last_chapter_title) extra.push(`最新：${item.last_chapter_title}`)
        if (extra.length > 0) {
            description = description.length > 0 ? `${description}\n\n${extra.join(" · ")}` : extra.join(" · ")
        }

        return new Comic({
            id: String(item.id),
            title: item.title,
            subTitle: item.auther || "",
            cover: cover,
            tags: tags,
            description: description
        })
    }

    /**
     * 人气漫画：/home/api/getpage/tp/1-topestmh-{page-1}
     */
    async _loadPopular(page) {
        let res = await Network.get(`${this.baseUrl}/home/api/getpage/tp/1-topestmh-${page - 1}`, this.headers)
        if (res.status !== 200) {
            throw `Invalid status code: ${res.status}`
        }
        let result = JSON.parse(res.body).result
        let list = result.list || []
        return {
            comics: list.map(e => this._parseComic(e)),
            maxPage: result.lastPage ? page : page + 1
        }
    }

    /**
     * 每日更新：/home/Api/getDailyUpdate.html?widx=4&page={page-1}&limit=10
     */
    async _loadDaily(page) {
        let res = await Network.get(`${this.baseUrl}/home/Api/getDailyUpdate.html?widx=4&page=${page - 1}&limit=10`, this.headers)
        if (res.status !== 200) {
            throw `Invalid status code: ${res.status}`
        }
        let body = JSON.parse(res.body)
        let list = body.result || []
        if (!Array.isArray(list)) {
            list = []
        }
        return {
            comics: list.map(e => this._parseComic(e)),
            // 接口没有分页信息，返回不足一条时认为到底了
            maxPage: list.length >= 10 ? page + 1 : page
        }
    }

    // explore page list
    explore = [
        {
            // title of the page.
            title: "香香腐宅",
            type: "multiPageComicList",
            load: async (page) => {
                return await this._loadPopular(page)
            }
        },
        {
            title: "每日更新",
            type: "multiPageComicList",
            load: async (page) => {
                return await this._loadDaily(page)
            }
        }
    ]

    // categories
    category = {
        /// title of the category page, used to identify the page, it should be unique
        title: "香香腐宅",
        parts: [
            {
                name: "地区",
                type: "fixed",
                categories: ["全部", "日漫", "韩漫", "国漫"],
                // 每一项是 tag|progress|is18|isVip
                itemType: "category",
                categoryParams: ["0|2|0|2", "日漫|2|0|2", "韩漫|2|0|2", "国漫|2|0|2"]
            },
            {
                name: "状态",
                type: "fixed",
                categories: ["全部", "连载中", "已完结"],
                itemType: "category",
                categoryParams: ["0|2|0|2", "0|0|0|2", "0|1|0|2"]
            },
            {
                name: "分级",
                type: "fixed",
                categories: ["全部", "清水", "有肉"],
                itemType: "category",
                categoryParams: ["0|2|0|2", "0|2|1|2", "0|2|2|2"]
            },
            {
                name: "权限",
                type: "fixed",
                categories: ["全部", "一般", "VIP"],
                itemType: "category",
                categoryParams: ["0|2|0|2", "0|2|0|0", "0|2|0|1"]
            }
        ],
        // enable ranking page
        enableRankingPage: false
    }

    /// category comic loading related
    categoryComics = {
        load: async (category, param, options, page) => {
            let seg = (param || "0|2|0|2").split("|")
            let tag = seg[0] || "0"
            let progress = seg[1] || "2"
            let is18 = seg[2] || "0"
            let isVip = seg[3] || "2"
            let sort = (options && options.length > 0) ? options[0] : "1"

            // 格式：1-{tags}-{status}-{sort}-{page}-{type}-1-{vip}
            let tp = `1-${tag}-${progress}-${sort}-${page}-${is18}-1-${isVip}`
            let res = await Network.get(`${this.baseUrl}/home/api/cate/tp/${encodeURIComponent(tp)}`, this.headers)
            if (res.status !== 200) {
                throw `Invalid status code: ${res.status}`
            }
            let result = JSON.parse(res.body).result
            let list = result.list || []
            return {
                comics: list.map(e => this._parseComic(e)),
                maxPage: result.lastPage ? page : page + 1
            }
        },
        optionList: [
            {
                label: "排序",
                options: [
                    "1-顺序",
                    "2-类似排行榜"
                ],
            }
        ]
    }

    /// search related
    search = {
        load: async (keyword, options, page) => {
            let res = await Network.get(
                `${this.baseUrl}/home/api/searchk?keyword=${encodeURIComponent(keyword)}&type=1&pageNo=${page}`,
                this.headers
            )
            if (res.status !== 200) {
                throw `Invalid status code: ${res.status}`
            }
            let result = JSON.parse(res.body).result
            let list = result.list || []
            return {
                comics: list.map(e => this._parseComic(e)),
                maxPage: result.lastPage ? page : page + 1
            }
        },

        // provide options for search
        optionList: [],

        // enable tags suggestions
        enableTagsSuggestions: false,
    }

    /// single comic related
    comic = {
        loadInfo: async (id) => {
            let res = await Network.get(`${this.baseUrl}/home/book/index/id/${id}`, {
                ...this.headers,
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
            })
            if (res.status !== 200) {
                throw `Invalid status code: ${res.status}`
            }

            let doc = new HtmlDocument(res.body)

            // 标题
            let titleEl = doc.querySelector("h1")
            let title = titleEl ? titleEl.text.trim() : ""

            // 封面
            let cover = ""
            let ogImage = doc.querySelector('meta[property="og:image"]')
            if (ogImage) {
                cover = ogImage.attributes.content || ""
            }
            if (cover && !cover.startsWith("http")) {
                cover = this.imageBase + (cover.startsWith("/") ? cover : "/" + cover)
            }

            // 作者、状态、更新时间、标签
            let author = ""
            let status = ""
            let updateTime = ""
            let tags = []
            for (let p of doc.querySelectorAll("p.data")) {
                let text = p.text.trim()
                if (text.startsWith("作者")) {
                    if (!author) {
                        let a = p.querySelector("a")
                        author = (a ? a.text : text.replace(/^\s*作者[:：]\s*/, "")).trim()
                    }
                } else if (text.startsWith("最后更新") || text.startsWith("更新")) {
                    updateTime = text.replace(/^.*?更新[:：]\s*/, "").trim()
                } else if (text.startsWith("标签")) {
                    for (let a of p.querySelectorAll("a")) {
                        let t = a.text.trim()
                        if (t.length > 0) tags.push(t)
                    }
                } else if (text.length > 0 && text.length < 8 && /(连载|完结)/.test(text)) {
                    status = text
                }
            }

            // 简介
            let description = ""
            let descEl = doc.querySelector(".desc.detail .detail-text") ||
                doc.querySelector(".desc.detail") ||
                doc.querySelector("#bookIntro")
            if (descEl) {
                description = descEl.text.trim().replace(/^\s*简介[:：]/, "")
            }

            doc.dispose()

            // 章节目录
            let chapters = new Map()
            let chapRes = await Network.get(`${this.baseUrl}/home/api/chapter_list/tp/${id}`, this.headers)
            if (chapRes.status === 200) {
                let list = JSON.parse(chapRes.body).result.list || []
                // 接口按正序返回，倒序后最新章节在最前面
                for (let c of list.slice().reverse()) {
                    let vip = String(c.isvip) === "1" ? " [VIP]" : ""
                    chapters.set(String(c.id), `${c.title}${vip}`)
                }
            }

            let tagMap = {}
            if (author) tagMap["作者"] = [author]
            if (status) tagMap["状态"] = [status]
            if (updateTime) tagMap["最后更新"] = [updateTime]
            if (tags.length > 0) tagMap["标签"] = tags

            return {
                title: title || `漫画 ${id}`,
                cover: cover,
                description: description,
                tags: tagMap,
                chapters: chapters
            }
        },

        /**
         * 解析章节页的图片列表与打乱块数
         */
        loadEp: async (comicId, epId) => {
            let res = await Network.get(`${this.baseUrl}/home/book/capter/id/${epId}`, {
                ...this.headers,
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
            })
            if (res.status !== 200) {
                throw `Invalid status code: ${res.status}`
            }

            let body = res.body

            // VIP 章节不会返回图片，站点只给一段跳转提示脚本
            if (body.length < 2000 && body.indexOf("VIP") >= 0 && body.indexOf("alert(") >= 0) {
                throw "本章节只限 VIP 会员观看，请先在网页版确认账号等级后再试"
            }

            // 打乱块数：页面里的 var randomClass = N;
            let parts = null
            let m = body.match(/var\s+randomClass\s*=\s*(\d+)/)
            if (m) {
                let n = parseInt(m[1])
                if (n > 1) parts = n
            }
            this._partsCounts[String(epId)] = parts

            // 图片：按页面顺序取 .reader-cartoon-image 内的 data-original
            let doc = new HtmlDocument(body)
            let images = []
            let blocks = doc.querySelectorAll(".reader-cartoon-image img")
            for (let img of blocks) {
                let url = img.attributes["data-original"]
                if (!url && img.attributes["src"]) {
                    url = img.attributes["src"]
                }
                if (!url) continue
                url = url.trim()
                if (url.length === 0) continue
                if (url.includes("load.png")) continue
                if (url.endsWith(".gif")) continue
                images.push(url)
            }
            doc.dispose()

            // 兜底：直接从正文里提取
            if (images.length === 0) {
                for (let mm of body.matchAll(/data-original="([^"]+)"/g)) {
                    let url = mm[1].trim()
                    if (url.includes("load.png") || url.endsWith(".gif")) continue
                    images.push(url)
                }
            }

            if (images.length === 0) {
                throw "没有找到图片，该章节可能需要登录或为会员内容"
            }

            return {
                images: images
            }
        },

        /**
         * 图片加载配置。
         * 香香腐宅的条漫图片被横向切成 N 段并逆序存放，需要还原。
         */
        onImageLoad: async (url, comicId, epId) => {
            let config = {
                headers: this.imageHeaders
            }

            if (!this.loadSetting('descramble')) {
                return config
            }

            let key = String(epId)
            let parts = this._partsCounts[key]
            if (parts === undefined || parts === null) {
                // 直接进入阅读页（例如从历史记录打开）时缓存可能为空，补一次请求
                if (parts === undefined) {
                    try {
                        let res = await Network.get(`${this.baseUrl}/home/book/capter/id/${epId}`, {
                            ...this.headers,
                            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
                        })
                        if (res.status === 200) {
                            let m = res.body.match(/var\s+randomClass\s*=\s*(\d+)/)
                            let n = m ? parseInt(m[1]) : 1
                            parts = n > 1 ? n : null
                        }
                    } catch (e) {
                        parts = null
                    }
                    this._partsCounts[key] = parts
                }
            }

            if (parts && parts > 1) {
                config.modifyImage = `
                    let modifyImage = (image) => {
                        const partsCount = ${parts}
                        const width = image.width
                        const height = image.height
                        // 高度 >= 4000 的图片站点不做处理
                        if (height >= 4000) {
                            return image
                        }
                        const stripWidth = Math.floor(width / partsCount)
                        if (stripWidth <= 0) {
                            return image
                        }
                        const result = Image.empty(width, height)
                        for (let i = 1; i <= partsCount; i++) {
                            if (i === partsCount) {
                                const lastWidth = width - stripWidth * (partsCount - 1)
                                if (lastWidth > 0) {
                                    result.fillImageRangeAt(stripWidth * (partsCount - 1), 0, image, 0, 0, lastWidth, height)
                                }
                            } else {
                                result.fillImageRangeAt(stripWidth * (i - 1), 0, image, width - stripWidth * i, 0, stripWidth, height)
                            }
                        }
                        return result
                    }
                `
            }

            return config
        },

        // {string?} - regex string, used to identify comic id from user input
        idMatch: "^(?:https?://[^/]+/home/book/index/id/)?(\\d+)$",

        /**
         * [Optional] Handle links
         */
        link: {
            domains: [
                'boylove.cc',
                'boylove4.xyz',
            ],
            linkToId: (url) => {
                let m = url.match(/\/home\/book\/index\/id\/(\d+)/)
                if (m) return m[1]
                m = url.match(/\/home\/book\/capter\/id\/(\d+)/)
                if (m) return m[1]
                return null
            }
        },

        // enable tags translate
        enableTagsTranslate: false,
    }

    // [Optional] translations for the strings in this config
    translation = {
        'zh_CN': {
            '主站地址': '主站地址',
            '图片域名': '图片域名',
            '自动还原被打乱的图片': '自动还原被打乱的图片',
        },
        'zh_TW': {
            '主站地址': '主站地址',
            '图片域名': '圖片域名',
            '自动还原被打乱的图片': '自動還原被打亂的圖片',
        },
        'en': {
            '主站地址': 'Site URL',
            '图片域名': 'Image Host',
            '自动还原被打乱的图片': 'Auto descramble images',
        }
    }
}
