#!/usr/bin/env bash
# =============================================================================
# Standalone 验证 —— 模拟 prototype-kits 仓库不存在
#
#   bash .qa/standalone.sh
#
# 判据（全部必须在 Kits 仓库不可见时通过）：
#   kits doctor · pnpm typecheck · pnpm test(120) · pnpm build
#
# 任何异常都必须把目录恢复回去 —— 因此用 trap EXIT 而不是顺序语句。
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
# 注意：不要用 `bash -lc` —— 登录 shell 会带出 nvm 里的默认 Node（17），
# 于是 next typegen 会因为「Node >= 20.9 才支持」而失败，那不是本次要测的东西。
run "typecheck"  env CI=true ./node_modules/.bin/next typegen
run "typecheck-tsc" ./node_modules/.bin/tsc --noEmit
run "build"      env CI=true ./node_modules/.bin/next build

# 测试需要一个 dev server；自己在 3210 起，跑完就收。
echo "════ 启动 dev server (3210)"
( cd "$FINANCE" && CI=true nohup ./node_modules/.bin/next dev --port 3210 >"$LOG/devserver.log" 2>&1 & echo $! > "$LOG/dev.pid" )
sleep 12
if curl -sf -o /dev/null http://localhost:3210/finance; then echo "  ✓ dev server ready"; else echo "  ✗ dev server 未就绪"; fail=1; fi
echo

run "test" env FINANCE_REUSE=1 CI=true ./node_modules/.bin/playwright test

kill "$(cat "$LOG/dev.pid" 2>/dev/null)" 2>/dev/null || true
pkill -f "next dev --port 3210" 2>/dev/null || true

echo "════════════════════════════════════════════════════════"
if [ $fail -eq 0 ]; then echo "STANDALONE OK — Kits 仓库不存在时全部通过"; else echo "STANDALONE 失败 —— 见上面的 ✗"; fi
exit $fail
