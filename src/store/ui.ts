/**
 * 全局 UI 状态管理（Nanostores）
 * 目标：保持对外 API 不变，但将重复的开关逻辑收敛到统一控制器。
 */

import { atom } from 'nanostores';

/**
 * 统一布尔状态控制器，避免每个状态都手写一组重复函数。
 */
function createBooleanState(initialValue: boolean) {
  const state = atom<boolean>(initialValue);

  return {
    state,
    open: () => state.set(true),
    close: () => state.set(false),
    toggle: () => state.set(!state.get()),
  };
}

const drawerState = createBooleanState(false);
const mobileMenuState = createBooleanState(false);
const modalState = createBooleanState(false);
const searchState = createBooleanState(false);

/** 移动抽屉开关状态 */
export const drawerOpen = drawerState.state;
/** 移动菜单开关状态 */
export const mobileMenuOpen = mobileMenuState.state;
/** 通用弹窗开关状态 */
export const modalOpen = modalState.state;
/** 搜索弹窗开关状态 */
export const searchOpen = searchState.state;

/** 代码全屏数据 */
export interface CodeBlockData {
  code: string;
  codeHTML: string;
  language: string;
  preClassName: string;
  preStyle: string;
  codeClassName: string;
}

export const codeFullscreenData = atom<CodeBlockData | null>(null);

/** Mermaid 全屏数据 */
export interface MermaidFullscreenData {
  svg: string;
  source: string;
}

export const mermaidFullscreenData = atom<MermaidFullscreenData | null>(null);

export function toggleDrawer(): void {
  drawerState.toggle();
}

export function openDrawer(): void {
  drawerState.open();
}

export function closeDrawer(): void {
  drawerState.close();
}

export function openMobileMenu(): void {
  mobileMenuState.open();
}

export function closeMobileMenu(): void {
  mobileMenuState.close();
}

export function toggleMobileMenu(): void {
  mobileMenuState.toggle();
}

export function openModal(): void {
  modalState.open();
}

export function closeModal(): void {
  modalState.close();
}

export function toggleModal(): void {
  modalState.toggle();
}

export function toggleSearch(): void {
  searchState.toggle();
}

export function openSearch(): void {
  searchState.open();
}

export function closeSearch(): void {
  searchState.close();
}

export function openCodeFullscreen(data: CodeBlockData): void {
  codeFullscreenData.set(data);
}

export function closeCodeFullscreen(): void {
  codeFullscreenData.set(null);
}

export function openMermaidFullscreen(data: MermaidFullscreenData): void {
  mermaidFullscreenData.set(data);
}

export function closeMermaidFullscreen(): void {
  mermaidFullscreenData.set(null);
}
