# DSH plugins

[tanlinfeng](https://github.com/tanlinfeng) 的 [DeepSeek Harness](https://github.com/deepseek-ai/dsh) 插件合集。每个子目录是一个独立的 npm 包，可单独安装、单独发版。

| 目录 | 包名 | 功能 |
| --- | --- | --- |
| [`dsh-btw/`](dsh-btw) | `@tanlinfeng/dsh-btw` | 右侧栏旁问：只读当前会话，不写入 |
| [`todolist-plugin/`](todolist-plugin) | `@tanlinfeng/dsh-todolist` | 跨会话共享的 TodoList 面板与 `todolist` 工具 |
| [`multi-agent-plugin/`](multi-agent-plugin) | `@tanlinfeng/dsh-multi-agent` | 角色化 subagent 编排、花名册与按角色配置 |
| [`dsh-iteration-mode/`](dsh-iteration-mode) | `@tanlinfeng/dsh-iteration-mode` | `iterate` agent preset：先对齐需求再迭代 |

## 安装

**通过插件市场（推荐）**：在 DSH 的 Discover 页把下面这个索引地址加入插件市场，然后从列表中安装。

```
https://tanlinfeng.github.io/dsh-plugins/index.json
```

**直接安装单个包**：

```bash
dsh plugin --profile web add @tanlinfeng/dsh-todolist
```

**本地开发**：在 profile 的 `package.json` 里用 `link:` 指向本仓库目录（见下方"开发"）。

## 开发

四个包都是纯 ESM，没有构建步骤，也没有第三方运行时依赖。改完文件后 DSH 的 HMR 会直接重载。

```bash
git clone https://github.com/tanlinfeng/dsh-plugins.git
cd dsh-plugins
```

把某个包链接进你的 profile（以 `~/.dsh/profiles/web` 为例）：

```json
{
  "dependencies": {
    "@tanlinfeng/dsh-todolist": "link:/absolute/path/to/dsh-plugins/todolist-plugin"
  },
  "dsh": {
    "profile": {
      "bundles": ["@tanlinfeng/dsh-todolist"]
    }
  }
}
```

然后在该 profile 目录执行 `pnpm install`。

## 发布

```bash
# 1. 改版本号
npm version patch --prefix todolist-plugin --no-git-tag-version
# 2. 发布到 npm（自动更新 market/releases.json 与 market/index.json）
node scripts/release.mjs todolist-plugin
# 3. 提交并推送
git add -A && git commit -m "release todolist 1.0.1" && git push --follow-tags
```

`scripts/release.mjs` 会显式使用 `https://registry.npmjs.org` 发布（本机默认 registry 是只读镜像），并在发布后打上 `<目录>-v<版本>` 的 tag。新插件要先进 `scripts/plugins.mjs`，否则会被发布脚本拒绝，也不会出现在市场索引里。

市场索引由 GitHub Actions 发布到 Pages；第一次使用需要在仓库 **Settings → Pages → Source** 选择 **GitHub Actions**。

## License

MIT
