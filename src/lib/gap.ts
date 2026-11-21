export function subtitleGapCopy(isLogin: boolean | null): string {
  if (isLogin === false) {
    return '还没有拿到字幕。请先在这个浏览器登录 B 站，很多视频的字幕只对登录用户开放。'
  }
  if (isLogin === true) return '这个视频没有 CC 或 AI 字幕。'
  return '没有拿到字幕。如果这个视频有字幕，先在这个浏览器登录 B 站，然后刷新视频页再试。'
}
