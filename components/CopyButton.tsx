"use client";

import { useState } from "react";

export default function CopyButton() {
  const [copied, setCopied] = useState(false);

  async function copy(e: React.MouseEvent<HTMLButtonElement>) {
    const pre = e.currentTarget.closest(".code-block")?.querySelector("pre");
    const text = pre?.innerText ?? "";
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* 剪贴板不可用时静默失败 */
    }
  }

  return (
    <button className={`code-copy${copied ? " copied" : ""}`} onClick={copy}>
      {copied ? "已复制 ✓" : "复制"}
    </button>
  );
}
