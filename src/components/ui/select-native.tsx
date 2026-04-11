'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';

// Compatibility wrapper around the Radix-based <Select>. Keeps the native-
// `<select>` API (`value`, `onChange(e)`, `<option>` children) so every call
// site — Header, FilterBar, GanttView, CalendarView — works unchanged, but
// renders the beautiful animated dropdown with rounded corners, soft
// shadow, and themed hover/selected states.
//
// Radix's Select does not accept empty-string item values, so we swap "" on
// the way in (to an internal __ALL__ sentinel) and swap back on the way out,
// which lets existing `value=""` / `onChange(e.target.value === "")` call
// sites keep working without modification.

const ALL_SENTINEL = '__ALL__';

interface SelectNativeProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

// Convert a React node from an <option>'s children into a plain string so
// <SelectValue> always has a displayable label (avoids showing raw JSX).
function nodeToText(node: React.ReactNode): string {
  if (node == null || node === false) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeToText).join('');
  if (React.isValidElement(node)) {
    const props = node.props as { children?: React.ReactNode };
    return nodeToText(props.children);
  }
  return '';
}

function SelectNative({
  className,
  children,
  value,
  defaultValue,
  onChange,
  disabled,
  name,
}: SelectNativeProps) {
  // Walk children once to build a parallel array of {value, label} items.
  // Skip non-<option> nodes (e.g. comments, whitespace).
  //
  // HTML <option> behavior: if `value` is omitted, the value defaults to the
  // element's text content. We mirror that so callers writing
  //   <option>{trade}</option>
  // work the same as
  //   <option value={trade}>{trade}</option>.
  // Without this fallback every plain-text option ends up with value="" and
  // collides with the placeholder ALL_SENTINEL.
  const items: { value: string; label: string }[] = [];
  const seen = new Set<string>();
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child) || child.type !== 'option') return;
    const p = child.props as React.OptionHTMLAttributes<HTMLOptionElement>;
    const label = nodeToText(p.children);
    // Explicit empty-string is the placeholder convention. `undefined`/null
    // means "no value prop was passed" → fall back to the text label.
    const explicit = p.value != null ? String(p.value) : undefined;
    const resolved = explicit ?? label;
    const finalValue = resolved === '' ? ALL_SENTINEL : resolved;
    if (seen.has(finalValue)) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[SelectNative] duplicate option value "${finalValue}" — dropping`);
      }
      return;
    }
    seen.add(finalValue);
    items.push({
      value: finalValue,
      label: label || (finalValue === ALL_SENTINEL ? 'All' : finalValue),
    });
  });

  // Map external "" to internal sentinel.
  const mappedValue = value === '' || value == null ? ALL_SENTINEL : String(value);
  const mappedDefault =
    defaultValue === '' || defaultValue == null ? undefined : String(defaultValue);

  const handleValueChange = (next: string) => {
    if (!onChange) return;
    const outgoing = next === ALL_SENTINEL ? '' : next;
    const fakeEvent = {
      target: { value: outgoing, name: name ?? '' },
      currentTarget: { value: outgoing, name: name ?? '' },
    } as unknown as React.ChangeEvent<HTMLSelectElement>;
    onChange(fakeEvent);
  };

  return (
    <Select
      value={mappedValue}
      defaultValue={mappedDefault}
      onValueChange={handleValueChange}
      disabled={disabled}
      name={name}
    >
      <SelectTrigger className={cn(className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((it) => (
          <SelectItem key={it.value} value={it.value}>
            {it.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export { SelectNative };
