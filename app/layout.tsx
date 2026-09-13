import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { DEFAULT_LOCALE } from "@/lib/i18n";
import { stylePackMeta, stylePackMotionVars } from "@/lib/kits/adapters/style-pack";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "智悟云 · AI 财务工作台", template: "%s · 智悟云财务" },
  description:
    "AI-native financial command center：现金跑道、现金流推演、预算执行与确定性财务洞察。",
};

// 在水合前应用主题 class，避免闪烁。
// 由 Server Component 输出 <script>（客户端组件内渲染 script 会有 React 告警）。
const themeScript = `(function(){try{var t=localStorage.getItem("theme");var d=t==="dark"||((!t||t==="system")&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light"}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang={DEFAULT_LOCALE}
      suppressHydrationWarning
      /*
        Style Pack 作用域。Kits 的颜色全部写在
        `[data-kits-pack="cinematic"]` 里，因此页面必须声明一次；
        放在 <html> 上的原因是：对话框 / 抽屉 / toast 都通过 portal
        挂到 body 层，声明在页面容器里会让它们拿不到 pack 取值。

        取值来自适配层（stylePackMeta.id），不在这里写字面量 ——
        换 pack 时"当前是哪一套"只有一个来源，产品不会与适配层脱钩。
      */
      data-kits-pack={stylePackMeta.id}
      /*
        动效刻度由 pack 的 motion.ts 编译而来（见 lib/kits/adapters/style-pack.ts —
        它调用的是 Kits 自己的 motionToCssVars()，不是产品手抄的映射）。
        贴在这里而不是写进 CSS，是为了让"时长只有一个来源"这件事在结构上成立：
        改 pack → 所有时长跟着变，产品一行不用改。
        SSR 阶段即可序列化 → 没有 hydration 差异。
      */
      style={stylePackMotionVars as CSSProperties}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: themeScript }} />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {/* 语言环境：默认 zh-CN。所有界面文案经 useMessages() 读取，见 lib/i18n。 */}
          <LocaleProvider locale={DEFAULT_LOCALE}>
            <TooltipProvider delay={300}>{children}</TooltipProvider>
            {/*
              通知固定在右下角：顶栏右上是账户菜单、通知铃铛与演示控制，
              top-right 的 toast 会直接盖住这些全局控件并拦截点击。
            */}
            <Toaster
              richColors
              position="bottom-right"
              closeButton
              toastOptions={{ className: "font-sans" }}
            />
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
