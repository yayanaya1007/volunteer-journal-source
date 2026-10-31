export function wholeMinuteValue(value, now = new Date()) {
  return value || `${String(now.getHours()).padStart(2, '0')}:00`;
}

// Seed an empty native picker before it opens. Existing source/user times and
// the ability to choose any other minute remain unchanged.
export function WholeMinuteTimeInput({ React, ...props }) {
  const prepare = event => {
    const input = event.currentTarget;
    if (props.disabled || props.readOnly || props.value || input.value) return;
    input.value = wholeMinuteValue('');
    props.onChange?.({ target: input, currentTarget: input });
  };
  return React.createElement('input', { ...props, type: 'time',
    onPointerDown: event => { prepare(event); props.onPointerDown?.(event); },
    onFocus: event => { prepare(event); props.onFocus?.(event); } });
}
