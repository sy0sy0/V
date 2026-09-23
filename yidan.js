/** @type {import('./_venera_.js')} */
class Yidan extends ComicSource {
    // Note: The fields which are marked as [Optional] should be removed if not used

    // name of the source
    name = "一耽女孩"

    // unique id of the source
    key = "yidan"

    version = "1.0.0"

    minAppVersion = "1.6.0"

    // update url
    url = "https://cdn.jsdelivr.net/gh/sy0sy0/V@main/yidan.js"

    settings = {
        domain: {
            title: "主站地址",
            type: "input",
            validator: "^https?://.+",
            default: "https://www.szfwp.com"
        }
    }

    get baseUrl() {
        let domain = this.loadSetting('domain')
        return domain ? domain.replace(/\/+$/, '') : "https://www.szfwp.com"
    }

    get headers() {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Referer": this.baseUrl + "/",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
    }

    /**
     * 解析漫画列表容器，兼容两种页面结构：
     * 1) 首页 / 分类 / 排行榜：
     *    <ul><li><a class="pic"><img src></a></li>
     *        <li class="title"><a href="/manhwa_1.html">标题</a></li>
     *        <li class="zuozhe">作者：xxx</li>
     *        <li class="info">简介：xxx</li>
     *        <li class="biaoqian"><a href="/chapter_1_2.html">第1话</a></li></ul>
     * 2) 搜索结果：
     *    <dl><dt><a href="/manhwa_1.html"><img src></a></dt>
     *        <dd><h3><a href="/manhwa_1.html">标题</a></h3></dd>
     *        <dd class="book_other">分类：xxx状态：<span>连载</span>作者:xxx</dd>
     *        <dd class="book_des">简介：xxx</dd>
     *        <dd class="book_other">最新章节：<a href="/chapter_1_2.html">第1话</a> 更新时间：<span>...</span></dd></dl>
     */
    _parseList(doc) {
        let comics = []
        let seen = new Set()

        for (let box of doc.querySelectorAll("ul, dl")) {
            let link = null
            for (let a of box.querySelectorAll("a")) {
                let href = a.attributes.href || ""
                if (href.includes("/manhwa_")) {
                    link = a
                    break
                }
            }
            if (!link) continue

            let href = link.attributes.href
            let idMatch = href.match(/\/manhwa_(\d+)\.html/)
            if (!idMatch) continue

            let id = idMatch[1]
            if (seen.has(id)) continue
            seen.add(id)

            // 封面：取第一个有效图片
            let cover = ""
            for (let img of box.querySelectorAll("img")) {
                let src = (img.attributes.src || "").trim()
                if (src.length === 0) continue
                if (src.includes("space.gif")) continue
                cover = src
                break
            }
            if (cover && !cover.startsWith("http")) {
                cover = cover.startsWith("/") ? this.baseUrl + cover : this.baseUrl + "/" + cover
            }

            // 标题：优先 h3 或 li.title
            let title = link.attributes.title || link.text.trim()
            let titleEl = box.querySelector("dd h3 a") || box.querySelector("li.title a")
            if (titleEl && titleEl.text.trim().length > 0) {
                title = box.querySelector("li.title a") ? titleEl.text.trim() : (titleEl.attributes.title || titleEl.text.trim())
            }

            let author = ""
            let description = ""
            let latest = ""
            let status = ""

            // 结构 1
            let zuozhe = box.querySelector("li.zuozhe")
            if (zuozhe) {
                author = zuozhe.text.replace(/^\s*作者[:：]/, "").trim()
            }
            let infoEl = box.querySelector("li.info")
            if (infoEl) {
                description = infoEl.text.replace(/^\s*简介[:：]/, "").trim()
            }
            let biaoqian = box.querySelector("li.biaoqian a")
            if (biaoqian) {
                latest = biaoqian.text.trim()
            }

            // 结构 2
            for (let dd of box.querySelectorAll("dd")) {
                let text = dd.text.trim()
                if (text.startsWith("简介")) {
                    description = text.replace(/^\s*简介[:：]/, "").trim()
                } else if (text.startsWith("最新章节")) {
                    let a = dd.querySelector("a")
                    if (a) latest = a.text.trim()
                } else if (text.startsWith("分类") || text.indexOf("状态") >= 0) {
                    let m = text.match(/作者[:：]\s*(.+)$/)
                    if (m) author = m[1].trim()
                    if (text.indexOf("状态") >= 0) {
                        let sp = dd.querySelector("span")
                        if (sp) status = sp.text.trim()
                    }
                }
            }

            let tags = []
            if (latest) tags.push(latest)
            if (status) tags.push(status)
            if (!status && latest.includes("完结")) status = "已完结"

            let desc = description
            if (latest) {
                desc = desc.length > 0 ? `${desc}\n\n最新：${latest}` : `最新：${latest}`
            }

            comics.push(new Comic({
                id: id,
                title: title,
                subTitle: author,
                cover: cover,
                tags: tags,
                description: desc
            }))
        }
        return comics
    }

    /**
     * 从分页控件里找出最大页数
     */
    _maxPage(doc, page) {
        let max = page
        for (let a of doc.querySelectorAll("a")) {
            let href = a.attributes.href || ""
            let m = href.match(/\/page\/(\d+)/)
            if (m) {
                let n = parseInt(m[1])
                if (n > max) max = n
            }
        }
        return max
    }

    /**
     * 加载一个列表页
     */
    async _loadListPage(url, page) {
        let res = await Network.get(url, this.headers)
        if (res.status !== 200) {
            throw `Invalid status code: ${res.status}`
        }
        let doc = new HtmlDocument(res.body)
        let comics = this._parseList(doc)
        let maxPage = this._maxPage(doc, page)
        doc.dispose()
        return {
            comics: comics,
            maxPage: maxPage
        }
    }

    // explore page list
    explore = [
        {
            title: "热门榜",
            type: "multiPageComicList",
            load: async (page) => {
                return await this._loadListPage(`${this.baseUrl}/custom/hot`, page)
            }
        },
        {
            title: "最新更新",
            type: "multiPageComicList",
            load: async (page) => {
                return await this._loadListPage(`${this.baseUrl}/custom/update`, page)
            }
        },
        {
            title: "日榜",
            type: "multiPageComicList",
            load: async (page) => {
                return await this._loadListPage(`${this.baseUrl}/custom/day`, page)
            }
        },
        {
            title: "周榜",
            type: "multiPageComicList",
            load: async (page) => {
                return await this._loadListPage(`${this.baseUrl}/custom/week`, page)
            }
        },
        {
            title: "月榜",
            type: "multiPageComicList",
            load: async (page) => {
                return await this._loadListPage(`${this.baseUrl}/custom/month`, page)
            }
        }
    ]

    // categories
    category = {
        /// title of the category page, used to identify the page, it should be unique
        title: "一耽女孩",
        parts: [
            {
                name: "分类",
                type: "fixed",
                categories: ["全部", "耽美", "纯爱", "BL", "双男主", "蔷薇", "恋爱", "校园", "青春"],
                itemType: "category",
                categoryParams: ["all", "16", "137", "166", "159", "760", "17", "11", "59"]
            },
            {
                name: "题材",
                type: "fixed",
                categories: ["奇幻", "古风", "架空", "治愈", "重生", "悬疑", "搞笑", "校园", "日常", "娱乐圈", "财阀", "ABO"],
                itemType: "category",
                categoryParams: ["93", "28", "25", "66", "51", "18", "13", "11", "744", "87", "81", "88"]
            },
            {
                name: "关系",
                type: "fixed",
                categories: ["青梅竹马", "年下", "骨科", "甜宠", "高甜", "短篇", "小说改编", "韩漫", "日漫", "国漫"],
                itemType: "category",
                categoryParams: ["1315", "1459", "1421", "1238", "1173", "340", "843", "1303", "1311", "1352"]
            }
        ],
        // enable ranking page
        enableRankingPage: false
    }

    /// category comic loading related
    categoryComics = {
        load: async (category, param, options, page) => {
            let url
            if (!param || param === "all") {
                url = `${this.baseUrl}/category/page/${page}`
            } else {
                url = `${this.baseUrl}/category/tags/${param}/page/${page}`
            }
            return await this._loadListPage(url, page)
        },
        optionList: []
    }

    /// search related
    search = {
        load: async (keyword, options, page) => {
            let res = await Network.post(
                `${this.baseUrl}/index.php/search`,
                {
                    ...this.headers,
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
                },
                `key=${encodeURIComponent(keyword)}`
            )
            if (res.status !== 200) {
                throw `Invalid status code: ${res.status}`
            }
            let doc = new HtmlDocument(res.body)
            let comics = this._parseList(doc)
            doc.dispose()
            return {
                comics: comics,
                // 站内搜索未提供分页
                maxPage: 1
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
            let res = await Network.get(`${this.baseUrl}/manhwa_${id}.html`, this.headers)
            if (res.status !== 200) {
                throw `Invalid status code: ${res.status}`
            }

            let doc = new HtmlDocument(res.body)

            // 标题
            let titleEl = doc.querySelector(".cy_title h1")
            let title = titleEl ? titleEl.text.trim() : ""

            // 封面
            let cover = ""
            let coverEl = doc.querySelector(".cy_info_cover img") || doc.querySelector("img.pic")
            if (coverEl) {
                cover = coverEl.attributes.src || ""
            }
            if (cover && !cover.startsWith("http")) {
                cover = cover.startsWith("/") ? this.baseUrl + cover : this.baseUrl + "/" + cover
            }

            // 作者 / 状态 / 更新时间
            let author = ""
            let status = ""
            let updateTime = ""
            for (let span of doc.querySelectorAll(".cy_xinxi span")) {
                let text = span.text.trim()
                if (text.startsWith("作者")) {
                    author = text.replace(/^\s*作者[:：]/, "").trim()
                } else if (text.startsWith("状态")) {
                    status = text.replace(/^\s*状态[:：]/, "").trim()
                } else if (text.startsWith("更新时间")) {
                    updateTime = text.replace(/^\s*更新时间[:：]/, "").trim()
                }
            }

            // 简介
            let description = ""
            let descEl = doc.querySelector("#comic-description")
            if (descEl) {
                description = descEl.text.trim()
            }

            doc.dispose()

            // 章节目录使用站点接口，数据最完整（含 VIP 标记）
            // {"code":1,"data":[{"id","name","link","pnum","price","vip","cion"}]}
            let chapters = new Map()
            let chapRes = await Network.get(`${this.baseUrl}/index.php/api/comic/chapter?mid=${id}`, {
                ...this.headers,
                "Accept": "application/json, text/plain, */*"
            })
            if (chapRes.status === 200) {
                let data = null
                try {
                    data = JSON.parse(chapRes.body).data
                } catch (e) {
                    data = null
                }
                if (Array.isArray(data)) {
                    // 接口按正序返回，倒序让最新章节排在最前面
                    for (let c of data.slice().reverse()) {
                        let name = c.name || `第${c.id}话`
                        let vip = String(c.vip) === "1" || parseInt(c.price) > 0 || String(c.cion) === "1"
                        chapters.set(String(c.id), vip ? `${name}（VIP）` : name)
                    }
                }
            }

            let tagMap = {}
            if (author) tagMap["作者"] = [author]
            if (status) tagMap["状态"] = [status]
            if (updateTime) tagMap["更新时间"] = [updateTime]

            return {
                title: title || `漫画 ${id}`,
                cover: cover,
                description: description,
                tags: tagMap,
                chapters: chapters
            }
        },

        /**
         * 章节图片直接内联在章节页里
         */
        loadEp: async (comicId, epId) => {
            let res = await Network.get(`${this.baseUrl}/chapter_${comicId}_${epId}.html`, this.headers)
            if (res.status !== 200) {
                throw `Invalid status code: ${res.status}`
            }

            let locked = res.body.indexOf("章节已锁定") >= 0 || res.body.indexOf("请付费后浏览") >= 0

            let doc = new HtmlDocument(res.body)
            let images = []
            for (let img of doc.querySelectorAll(".acgn-reader-chapter__item img")) {
                let src = img.attributes.src || img.attributes["data-src"] || ""
                src = src.trim()
                if (src.length === 0) continue
                if (src.includes("space.gif")) continue
                if (src.startsWith("//")) {
                    src = "https:" + src
                } else if (src.startsWith("/")) {
                    src = this.baseUrl + src
                }
                images.push(src)
            }
            doc.dispose()

            if (images.length === 0) {
                if (locked) {
                    throw "本章节已锁定，需要付费或会员才能阅读"
                }
                throw "没有找到图片，该章节可能需要登录或为会员内容"
            }

            return {
                images: images
            }
        },

        onImageLoad: (url, comicId, epId) => {
            return {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                    "Referer": this.baseUrl + "/"
                }
            }
        },

        // {string?} - regex string, used to identify comic id from user input
        idMatch: "^(?:https?://[^/]+/manhwa_)?(\\d+)(?:\\.html)?$",

        /**
         * [Optional] Handle links
         */
        link: {
            domains: [
                'szfwp.com',
            ],
            linkToId: (url) => {
                let m = url.match(/\/manhwa_(\d+)\.html/)
                if (m) return m[1]
                m = url.match(/\/chapter_(\d+)_\d+\.html/)
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
        },
        'zh_TW': {
            '主站地址': '主站地址',
        },
        'en': {
            '主站地址': 'Site URL',
        }
    }
}
