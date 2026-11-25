import { cn } from '@lib/utils';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import React, { useCallback, useState } from 'react';

export type OptionType<T extends string | number = string | number> = {
  label?: string;
  value: T;
  icon?: React.ComponentType<{ className?: string }>;
} | null;

type SegmentedProps<T extends string | number = string | number> = {
  options: OptionType<T>[]; // 选项
  defaultValue?: T; // 默认值
  onChange?: (value: T) => void;
  className?: string;
  indicateClass?: string;
  itemClass?: string;
  id?: string;
  label?: string;
  value?: T; // 受控
};

export const Segmented = <T extends string | number = string | number>({
  options,
  defaultValue,
  onChange,
  className,
  id,
  label: groupLabel,
  indicateClass,
  itemClass,
  value,
}: SegmentedProps<T>) => {
  const [uncontrolledValue, setUncontrolledValue] = useState<T>(
    () => (value ?? defaultValue ?? options[0]?.value ?? '') as T,
  );
  const shouldReduceMotion = useReducedMotion();

  const select = useCallback(
    (nextValue: T) => {
      if (value === undefined) {
        setUncontrolledValue(nextValue);
      }
      onChange?.(nextValue);
    },
    [onChange, value],
  );
  const currentValue = value ?? uncontrolledValue;
  return (
    <div
      id={id}
      role="group"
      aria-label={groupLabel}
      className={cn(
        'glass glass-flat flex w-fit gap-0.5 rounded-full p-1 text-xs font-semibold select-none',
        className,
      )}>
      {options.map((option) => {
        if (!option) return null;
        const { label, value, icon } = option;
        const selected = currentValue === value;
        return (
          <motion.button
            type="button"
            aria-label={label ?? String(value)}
            aria-pressed={selected}
            data-segment-value={String(value)}
            className={cn(
              'material-segment flex-center relative isolate gap-1.5 rounded-full px-3 py-1',
              itemClass,
            )}
            onClick={() => select(value)}
            key={value}
            layout={!shouldReduceMotion}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { type: 'spring', stiffness: 400, damping: 30 }
            }>
            {/* 图标 */}
            {icon && (
              <span className="flex-center shrink-0">
                {React.createElement(icon, { className: 'w-4 h-4' })}
              </span>
            )}

            {/* 文字标签 - 只在选中时显示 */}
            <AnimatePresence initial={false} mode="wait">
              {selected && label && (
                <motion.span
                  initial={
                    shouldReduceMotion ? undefined : { width: 0, opacity: 0 }
                  }
                  animate={{ width: 'auto', opacity: 1 }}
                  exit={
                    shouldReduceMotion ? undefined : { width: 0, opacity: 0 }
                  }
                  transition={
                    shouldReduceMotion
                      ? { duration: 0 }
                      : {
                          width: { duration: 0.2, ease: 'easeInOut' },
                          opacity: { duration: 0.15, ease: 'easeInOut' },
                        }
                  }
                  className="overflow-hidden whitespace-nowrap">
                  {label}
                </motion.span>
              )}
            </AnimatePresence>

            {/* 选中背景 */}
            {selected && (
              <motion.span
                layoutId={`segmented_selected_bg_${id ?? 'default'}`}
                className={cn(
                  'material-segment-indicator absolute inset-0 -z-10 rounded-full',
                  indicateClass,
                )}
                aria-hidden="true"
                transition={
                  shouldReduceMotion
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 400, damping: 30 }
                }
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
};

export default React.memo(Segmented);
