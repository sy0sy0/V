# Venera-Next 漫画源：香香腐宅 / 一耽女孩

仓库地址：<https://github.com/sy0sy0/V>

为 [Venera-Next](https://github.com/CyrilPeng/Venera-Next) 编写的两个漫画源，移植自
[keiyoushi/extensions-source](https://github.com/keiyoushi/extensions-source) 的同名扩展。

| 文件 | 源名 | key | 站点 |
|---|---|---|---|
| `boylove.js` | 香香腐宅 | `boylove` | boylove.cc / boylove4.xyz |
| `yidan.js` | 一耽女孩 | `yidan` | www.szfwp.com |

`index.json` 是源列表文件，可用于自建源仓库。

---

## 安装方式

### 方式一：单个脚本导入（最快）

1. 把 `boylove.js` / `yidan.js` 拷到手机或电脑上。
2. 打开 Venera-Next →「漫画源」→ 选择「从文件导入」，选中 js 文件。
3. 出现 `key` 已存在时可点「重新加载」覆盖。

### 方式二：作为源仓库（推荐）

本仓库已经可以直接当源仓库用，把下面任一地址填到 Venera-Next 的源管理里，刷新即可：

- jsDelivr（推荐，速度快）：
  `https://cdn.jsdelivr.net/gh/sy0sy0/V@main/index.json`
- GitHub raw（jsDelivr 被墙时备用）：
  `https://raw.githubusercontent.com/sy0sy0/V/main/index.json`

> 两个源的 `url` 字段已指向本仓库对应的 js 文件，因此在源管理里点「更新」即可拉到最新版本。

想换到自己名下托管，把 `index.json` + 两个 `.js` 放到任意可访问 HTTP 的地址（GitHub raw、
jsDelivr、静态服务都行），再把仓库地址指向 `index.json`；同时记得把源里 `url` 字段改成新地址。

---

## 功能

### 香香腐宅（boylove.js）

- 探索页：人气漫画、每日更新
- 分类：地区 / 状态 / 分级 / 权限，可选择排序
- 搜索：关键词搜索，支持翻页
- 详情：标题、封面、作者、状态、更新时间、标签、完整目录（标注 VIP）
- 阅读：自动还原被打乱的章节图片（详见下节）
- 设置项：可切换主站镜像、图片域名、是否自动还原图片

### 一耽女孩（yidan.js）

- 探索页：热门榜、最新更新、日榜、周榜、月榜
- 分类：分类 / 题材 / 关系三组标签，支持翻页
- 搜索：关键词搜索
- 详情：标题、封面、作者、状态、更新时间、完整目录（标注 VIP）
- 设置项：可修改主站地址

---

## 关于香香腐宅的图片还原

香香腐宅的条漫图片在服务器上是**打乱存放**的：整张图被横向切成 N 条，按相反顺序拼接。
站点靠页面里的 `var randomClass = N;` 拿到份数，再用 canvas 重排后才显示。
如果直接下载原图，画面会是错位的（见 `descramble-demo.png` 左图）。

本源的做法：

1. 打开章节时解析出 `randomClass`（即切条份数，如上例为 13）。
2. 通过 Venera 的 `comic.onImageLoad` 返回 `modifyImage` 脚本，用 `Image.empty` /
   `fillImageRangeAt` 把每一条搬回正确位置。
3. 图片高度 ≥ 4000 时站点本身不做处理，脚本也原样返回。

还原算法与原站 `do_mergeImg` 逐行对应：

```
S = floor(W / N)
第 k 段(k = 1..N-1)：目标 x = S*(k-1)，来源 x = W - S*k，宽 S
第 N 段：            目标 x = S*(N-1)，来源 x = 0，宽 W - S*(N-1)
```

实测两张图在还原后，切缝两侧的相邻像素差从 43.4 / 31.8 降到 8.2 / 10.5，画面恢复连续。

如果不想用这个处理，可在源设置里把「自动还原被打乱的图片」关掉。

---

## 已知限制

- **VIP / 付费章节无法阅读。** 两个站点的高章节普遍需要付费或会员等级：
  - 香香腐宅：打不开时会提示「本章节只限 VIP 会员观看」。
  - 一耽女孩：目录里有「（VIP）」标记，打开会提示「本章节已锁定，需要付费或会员才能阅读」。
  本源只做接口转换，不绕过付费。
- 站点靠 Cloudflare，若大量请求可能被临时拦截，建议不要同时批量下载。
- 站点域名偶有更换。香香腐宅可在设置里切换镜像；一耽女孩的主站地址是输入框，可直接改成新域名。
- 一耽女孩的搜索接口没有分页，只返回首页结果。

---

## 目录结构

```
venera-sources/
├── boylove.js            香香腐宅源
├── yidan.js              一耽女孩源
├── index.json            源列表（供自建源仓库使用）
├── descramble-demo.png   图片还原效果对比
└── README.md             本文件
```

---

## 免责声明

两个脚本只做站点接口到 Venera 源 API 的转换，不存储、不转发任何漫画内容。
所有内容版权归原作者与发行方所有，请支持正版。
