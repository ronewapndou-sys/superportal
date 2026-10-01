import './ui.css';

export { Pill, type PillTone } from './Pill';
export { ToastProvider, useToast } from './Toast';
export { ModalProvider, useModal, type ModalAction, type ModalOptions } from './Modal';
export { CloseIcon, ChatIcon } from './icons';

/** Copy text to the clipboard, ignoring failures (demo only). */
export function copyText(text: string) {
  navigator.clipboard?.writeText(text).catch(() => {});
}
export { AreaChart, BarList, CHART_BLUE, CHART_RED, Sparkline, StackedColumns, TableToggle, UptimeStrip, type DayStatus } from './charts';
