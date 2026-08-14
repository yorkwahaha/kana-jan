# AGENTS.md

本專案是《かなジャン！Kana Jan》的前端網頁原型。

## 技術棧

- Vite + React 19 + TypeScript
- 測試：Vitest
- 無後端、無 UI 框架；樣式在 `src/styles.css`

## 架構原則

- 規則在 `src/engine/`，不要把判定邏輯塞進 React 元件。
- 卡牌資料只放 `src/data/`，UI 只負責顯示。
- 電腦 AI 只透過 `decideAi()` 回傳 action，由 `reduce()` 套用。
- 亂數一律走 `src/engine/rng.ts`（測試需要可重現結果）。
- 音效／語音失敗時必須 fallback，不可卡住狀態機。

## 常用指令

```bash
npm run dev
npm test
npm run typecheck
npm run lint
npm run build
```

## 修改規則時

先補 `src/engine/*.test.ts`，再改 `yaku.ts` / `scoring.ts` / `game.ts`。
