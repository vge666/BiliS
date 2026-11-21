# B站总结

一个 Chrome 侧边栏扩展。打开普通 B 站视频页，提取这一集的标题、简介和带时间轴的字幕，再用你自己的 API Key 生成中文总结。

界面按 Material Design 3 实现：Material Web 组件、基线配色，以及 Roboto。系统是深色时会跟着切换。

## 使用

1. 安装依赖并构建：

```bash
npm install
npm run build
```

2. 打开 `chrome://extensions`，打开开发者模式，选择「加载已解压的扩展程序」，指向 `dist`。
3. 点扩展图标打开侧边栏。在「设置」里填写 API Key。默认是 DeepSeek（`https://api.deepseek.com`，模型 `deepseek-chat`）。也可以换成 Kimi、OpenAI，或任意 OpenAI 兼容接口。
4. 打开一个普通视频页，点「提取并总结」。

结果包含一句话、要点，以及能点回去的时间线。同一视频、同一分 P、同一模型的总结会留在本机，再次打开不会重复请求。要重做，点「重新总结」。

密钥只存在这台浏览器的本地存储里。标题、简介和字幕只会发给你填写的那个接口。

## 支持的页面

- `bilibili.com/video/BV…`
- `bilibili.com/video/av…`
- 多分 P 可以在侧边栏里切换，默认是地址栏当前的 `p`

直播和番剧播放页不在范围内。

没有 CC 或 AI 字幕时，如果简介够长，可以改用「仅用简介总结」。那份结果会标明它不是根据字幕。未登录时，不少视频的字幕列表是空的，侧边栏会提示先在这个浏览器登录 B 站。

## 开发

```bash
npm test
npm run dev
```

`npm run dev` 会持续更新 `dist`。在扩展管理页对这个扩展点一次重新加载，侧边栏就会用上新的构建。

## 测试

`npm test` 覆盖 BV / 分 P 解析、WBI 签名、字幕选择、长字幕分块，以及总结结果的 JSON 解析。
