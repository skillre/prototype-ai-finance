"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { animate, motion } from "motion/react"
import { durations, easings } from "@/lib/motion-presets"

type AnimatedNumberProps = {
  /** Target value. Changes animate from the previous value. */
  value: number
  className?: string
  prefix?: string
  suffix?: string
  /** Animation duration in seconds. */
  duration?: number
  delay?: number
  /** Intl.NumberFormat options (maximumFractionDigits etc.). */
  formatOptions?: Intl.NumberFormatOptions
  /** Custom formatter — takes priority over formatOptions (e.g. seconds → "4m 38s"). */
  formatValue?: (value: number) => string
}

/**
 * Smoothly counts between numeric values using Motion's animation loop.
 * Money, percentages, counts — anything that benefits from a tween.
 */
export function AnimatedNumber({
  value,
  className,
  prefix = "",
  suffix = "",
  duration = durations.slow,
  delay = 0,
  formatOptions,
  formatValue,
}: AnimatedNumberProps) {
  const fromRef = useRef(0)
  const [display, setDisplay] = useState(() => (formatValue ?? formatNumber)(0, formatOptions))

  const formatter = useMemo(
    () => (next: number) =>
      formatValue ? formatValue(next) : formatNumber(next, formatOptions),
    [formatValue, formatOptions]
  )

  useEffect(() => {
    const from = fromRef.current
    fromRef.current = value
    const controls = animate(from, value, {
      duration,
      delay,
      ease: easings.outExpo,
      onUpdate: (latest) => setDisplay(formatter(latest)),
    })
    return () => controls.stop()
  }, [value, duration, delay, formatter])

  return (
    <motion.span className={className} aria-label={formatter(value)}>
      {prefix}
      {display}
      {suffix}
    </motion.span>
  )
}

function formatNumber(value: number, options?: Intl.NumberFormatOptions) {
  // 默认跟随产品语言（zh-CN）：金额、千分位与小数点都与其余文案一致。
  return new Intl.NumberFormat("zh-CN", options).format(value)
}

/** 秒数转中文时长：278 → "4分38秒"。 */
export function formatSeconds(value: number): string {
  const minutes = Math.floor(value / 60)
  const seconds = Math.round(value % 60)
  if (minutes === 0) return `${seconds}秒`
  if (seconds === 0) return `${minutes}分钟`
  return `${minutes}分${seconds}秒`
}