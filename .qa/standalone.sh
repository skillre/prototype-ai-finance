#!/usr/bin/env bash
# =============================================================================
# Standalone 验证 —— 模拟 prototype-kits 仓库不存在
#
#   bash .qa/standalone.sh
#
# 判据（全部必须在 Kits 仓库不可见时通过）：
#   kits doctor · pnpm factory:manifest · next typegen · tsc · next build · pnpm test
#
# 任何异常都必须把目录恢复回去 —— 因此用 trap EXIT 而不是顺序语句。
#
# Factory v1.1 端口契约（2026-09-15 治理对齐后）：本脚本**不再自己起 dev server**。
# 它曾经在 3210 起一个 server 再用 FINANCE_REUSE=1 让 Playwright 接上去 ——
# `reuseExistingServer` 一旦可被环境变量打开，任何以 2xx/3xx 应答该端口的进程
# 都会被当成被测应用，整套断言可能在错误的页面上变绿。现在 `pnpm test` 自己
# 管 server（`reuseExistingServer: false` + `scripts/check-qa-port.mjs` 前置守卫）。
# =============================================================================
set -uo pipefail

FINANCE="/Users/skillre/ai-prototypes/prototype-ai-finance"
KITS="/Users/skillre/ai-prototypes/prototype-kits"
HIDDEN="/Users/skillre/ai-prototypes/prototype-kits.__hidden_standalone_probe__"
LOG="/Users/skillre/ai-prototypes/.agent-tmp/fa-source-install/standalone"
mkdir -p "$LOG"

restore() {
  if [ -d "$HIDDEN" ]; then
    mv "$HIDDEN" "$KITS"
    echo "── 已恢复: $KITS"
  fi
}
trap restore EXIT INT TERM

if [ -d "$KITS" ]; then
  mv "$KITS" "$HIDDEN"
  echo "── 已隐藏 Kits 仓库: prototype-kits → $(basename "$HIDDEN")"
else
  echo "!! 未找到 $KITS，无法开始"; exit 1
fi

if [ -e "$KITS" ]; then echo "!! 隐藏失败，$KITS 仍然存在"; exit 1; fi
echo "── 确认: [ -e $KITS ] = $([ -e "$KITS" ] && echo yes || echo no)"
echo

fail=0
run() {
  local name="$1"; shift
  echo "════ $name"
  ( cd "$FINANCE" && "$@" ) >"$LOG/$name.log" 2>&1
  local code=$?
  if [ $code -eq 0 ]; then echo "  ✓ $name 通过"; else echo "  ✗ $name 失败 (exit $code) —— 见 $LOG/$name.log"; tail -20 "$LOG/$name.log"; fail=1; fi
  echo
}

run "doctor"     node lib/kits/.kits/kits.mjs doctor
# Kits 检出不在场时 Manifest 门禁必须报告 [upstream-unavailable] 并**明说没做上游比对**，
# 而不是失败、也不是假装通过。
run "manifest"   pnpm factory:manifest
# 注意：不要用 `bash -lc` —— 登录 shell 会带出 nvm 里的默认 Node（17），
# 于是 next typegen 会因为「Node >= 20.9 才支持」而失败，那不是本次要测的东西。
run "typecheck"  env CI=true ./node_modules/.bin/next typegen
run "typecheck-tsc" ./node_modules/.bin/tsc --noEmit
run "build"      env CI=true ./node_modules/.bin/next build

# server 由这一次 test run 自己起、自己停（端口守卫先跑）。不要在这里 pkill。
run "test"       env CI=true ./node_modules/.bin/playwright test

echo "════════════════════════════════════════════════════════"
if [ $fail -eq 0 ]; then echo "STANDALONE OK — Kits 仓库不存在时全部通过"; else echo "STANDALONE 失败 —— 见上面的 ✗"; fi
exit $fail
