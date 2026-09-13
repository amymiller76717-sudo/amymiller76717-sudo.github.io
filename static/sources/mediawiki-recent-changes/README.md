# Recent Changes 组件来源

本组件直接复用 MediaWiki classic Recent Changes（非 JavaScript 过滤界面）的日期分组、列表行、页面链接、时间分隔符与修改说明样式。站点导航和页面外壳仍由现有 al-folio/Tufted 模块提供。

- 官方源码：<https://gerrit.wikimedia.org/r/plugins/gitiles/mediawiki/core/>
- 官方 GitHub 镜像：<https://github.com/wikimedia/mediawiki>
- 固定分支及提交：`REL1_43` / `e6ba9b6dff50b451a0d25b858eda3946cf9171b0`
- 组件说明：<https://www.mediawiki.org/wiki/Help:Recent_changes>
- 许可证：GPL-2.0-or-later。原始文件、逐文件 SHA-256、来源路径保留在 `upstream/recent-changes/manifest.json`，完整许可见 `COPYING` 和 `upstream/recent-changes/mediawiki-COPYING`。

## 直接复用与适配边界

| 来源 | 使用方式 |
| --- | --- |
| `OldChangesList.php::formatChangeLine` | 保留 `li` / `mw-changeslist-line-inner`，页面标题、时间、修改说明的原始顺序。 |
| `ChangesList.php::beginRecentChangesList` / `insertDateHeader` | 保留 `div.mw-changeslist`、`h4` 日期标题及 `ul.special`。 |
| `ChangesList.php::getArticleLink` / `getTimestamp` | 保留 `span.mw-title > bdi > a.mw-changeslist-title` 与两个时间分隔符类。`span` 时间改为语义等价的 `time[datetime]`。 |
| `mediawiki-elements.less` | 构建时直接抽取原链接、日期标题、无序列表、列表行和段落规则。 |
| `mediawiki-linker.styles.less` | 直接抽取原 `newpage` 标记和 `span.comment` 规则。 |
| `mediawiki-skinStyles.less` | 直接抽取原 `. .` 及分号分隔符规则，只绑定分号文案。 |
| `mediawiki-skin.defaults.less` | 直接使用原默认普通蓝链接 `#0645ad`、visited/active 色、字体与行高变量。 |
| `mediawiki-mixins.less` | `margin-inline` 以原生逻辑属性绑定相同参数。 |

本站仅将以上组件作用域约束到 `.site-recent-changes-page .mw-changeslist`，由 Lightning CSS 降级 CSS nesting。修改说明是发布流程生成的纯文本；不会把文件内容解释成 HTML。日期与时间统一显示为北京时间（Asia/Shanghai）。公开列表中的嵌套 document 使用自身稳定锚点；撤下的 document 不再出现在列表中，改名记录跟随当前标题。没有 diff/history/user/patrol 后端，所以不呈现这些操作或空按钮。此页面不使用 RemNote 引用卡片、双链控件或预览脚本。

## 对应源码与构建

公开包包含原始 MediaWiki 文件及其许可证、manifest，以及 GPL-2.0-or-later 的 `recent-changes-view.mjs` 绑定和编译代码。文件不含发布快照、本机配置或用户内容。

在此目录中使用 Node.js 22 或更新版本：

```sh
npm install
node --input-type=module -e "import fs from 'node:fs'; import {composeRecentChangesStyles} from './recent-changes-view.mjs'; fs.writeFileSync('recent-changes.css', composeRecentChangesStyles());"
```

`renderRecentChangesList(snapshot)` 接受 `website-page-changes-v1` 数据，返回原生列表 HTML。`documents` 提供当前公开文档的 `nodeId`、`pageSlug`、`title`；`changes` 提供 `nodeId`、`modifiedAt`（UTC ISO 时间）、`kind`（`created`、`updated` 或 `baseline`）与 `summary`。额外本地字段不会被渲染或序列化。页面外壳由网站自身提供，未改变此 MediaWiki 组件的布局。
