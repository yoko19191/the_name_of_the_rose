'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const ROSE_NAME_NOTE = `"玫瑰的名字"是一个深刻的哲学隐喻,探讨符号与实在、语言与真理之间永恒的断裂。

概念的起源：
这个概念最早可追溯到12世纪修士克吕尼的伯纳德在其拉丁语长诗《论蔑视世界》末尾的名句:

"Stat rosa pristina nomine, nomina nuda tenemus."
"昔日的玫瑰只存在于它的名字之中,我们拥有的只是空洞的名字。"

1980年,意大利符号学家安伯托·艾可将这句诗作为其中世纪悬疑小说的书名,使这一概念广为人知。

核心哲学意涵："玫瑰的名字"揭示了三个哲学困境:

1. 唯名论的悲剧：当一朵美丽的玫瑰凋零、图书馆被焚毁、爱人逝去,这些具体实体便不复存在。留给后世的,仅仅是一个名字、一个符号。我们永远无法通过名字去真正复原或触及那个已经消逝的实体——语言掩盖了缺失,而非填补了缺失。

2. 符号的自我指涉：正如小说中那座迷宫般的图书馆,所有知识都是对他人的引用、反驳和注释。书谈论的不是生活,而是其他书。符号指向另一个符号,而非现实世界。这就像用词典查词:A词条用B词条解释,B词条用C词条解释,你永远跳不出"词语"的圈套去触碰真实。

3. "词杀死物"：这一论断由拉康明确提出,源自黑格尔和马拉美的思想:
取代：当我们用词语命名一个物体时,它原本鲜活、具体、不可名状的"实在性"就被符号取代了
缺席：词语之所以存在,正因物体"不在场"——说"玫瑰"时,并没有玫瑰在场
固化：词语把流动的生命凝固为静止的概念,如同把蝴蝶制成标本

美学启示：
"玫瑰"在人类历史中承载了太多意义(爱情、圣洁、纯洁、世俗...),以至于它几乎失去了一切具体意义,变成了一个近乎空洞的符号容器。这让每个人可以根据自己的理解,去赋予"玫瑰的名字"任何意义。
"玫瑰的名字"之所以悲伤而美丽,正在于它承认了这种永久的丧失。我们手握"名字",是为了哀悼那个已经缺席的"玫瑰"。`;

const EASTER_EGG_TEXT = '符号首先表现为对物的谋杀，所以真理必须成为一种必要的缺席。';
const EASTER_EGG_WINDOW_MS = 3000;
const EASTER_EGG_CLICKS = 5;

export function Header() {
  const titleClickTimestampsRef = useRef<number[]>([]);
  const hideTapProgressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tapAnimationKey, setTapAnimationKey] = useState(0);
  const [tapCount, setTapCount] = useState(0);
  const [isTapProgressVisible, setIsTapProgressVisible] = useState(false);
  const [isEasterEggOpen, setIsEasterEggOpen] = useState(false);

  useEffect(() => {
    return () => {
      if (hideTapProgressTimeoutRef.current) {
        clearTimeout(hideTapProgressTimeoutRef.current);
      }
    };
  }, []);

  const showTapFeedback = useCallback((count: number) => {
    setTapAnimationKey((prev) => prev + 1);
    setTapCount(count);
    setIsTapProgressVisible(true);

    if (hideTapProgressTimeoutRef.current) {
      clearTimeout(hideTapProgressTimeoutRef.current);
    }

    hideTapProgressTimeoutRef.current = setTimeout(() => {
      setIsTapProgressVisible(false);
    }, EASTER_EGG_WINDOW_MS);
  }, []);

  const handleTitleClick = useCallback(() => {
    const now = Date.now();
    const recentClicks = titleClickTimestampsRef.current.filter(
      (timestamp) => now - timestamp <= EASTER_EGG_WINDOW_MS
    );

    recentClicks.push(now);
    titleClickTimestampsRef.current = recentClicks;

    showTapFeedback(recentClicks.length);

    if (recentClicks.length >= EASTER_EGG_CLICKS) {
      setIsTapProgressVisible(false);
      setTapCount(0);
      setIsEasterEggOpen(true);
      titleClickTimestampsRef.current = [];
    }
  }, [showTapFeedback]);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-20 pointer-events-none">
        <div className="flex items-center justify-center py-4">
          <div className="animate-gentle-float">
            <div className="
              group relative
              pointer-events-auto
              bg-[var(--background)]/90 backdrop-blur-sm
              px-7 py-3.5 rounded-full
              border border-[var(--border)]
              shadow-lg hover:shadow-xl
              transition-shadow duration-300
              flex items-center gap-3
            ">
              {/* 玫瑰图标 */}
              <svg
                className="w-6 h-6 text-[var(--accent)]"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2C12 2 9.5 5 9.5 8C9.5 9.5 10 10.5 10.5 11C9 11.5 7 12 6 14C5 16 6 18 8 19C7 19.5 6.5 20.5 7 22C7 22 9 21 12 21C15 21 17 22 17 22C17.5 20.5 17 19.5 16 19C18 18 19 16 18 14C17 12 15 11.5 13.5 11C14 10.5 14.5 9.5 14.5 8C14.5 5 12 2 12 2Z" />
              </svg>

              <h1 className="
                text-[2.1rem] leading-none
                text-[var(--foreground)]
                fraktur-title
                select-none
              ">
                <button
                  type="button"
                  onClick={handleTitleClick}
                  className="cursor-pointer bg-transparent border-0 p-0 text-inherit"
                  aria-label="触发标题彩蛋"
                >
                  <span key={tapAnimationKey} className="inline-block animate-title-tap">
                    Il nome della rosa
                  </span>
                </button>
              </h1>

              <div
                className={`
                  absolute right-4 -top-2 z-10
                  rounded-full border border-[var(--border)]
                  bg-[var(--background)]/95 px-2 py-1
                  text-[11px] font-semibold tabular-nums text-[var(--accent)]
                  transition-all duration-200
                  ${isTapProgressVisible ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0'}
                `}
                aria-live="polite"
              >
                {tapCount}/{EASTER_EGG_CLICKS}
              </div>

              <div
                className="
                  absolute left-1/2 top-full h-4
                  w-[min(94vw,46rem)] -translate-x-1/2
                  invisible group-hover:visible
                  pointer-events-none group-hover:pointer-events-auto
                "
                aria-hidden="true"
              />

              <div
                className="
                  absolute left-1/2 top-full mt-3
                  w-[min(94vw,46rem)] -translate-x-1/2
                  rounded-xl border border-[var(--node-border)]
                  bg-[var(--node-bg)]/95 backdrop-blur-sm
                  px-5 py-4 shadow-xl
                  invisible opacity-0 translate-y-2
                  group-hover:visible group-hover:opacity-100 group-hover:translate-y-0
                  transition-all duration-250
                  pointer-events-none group-hover:pointer-events-auto
                "
                role="note"
                aria-label="标题出处与含义"
              >
                <div className="max-h-[62vh] overflow-y-auto pr-1 font-serif text-[13px] leading-relaxed text-[var(--primary)]">
                  <p className="whitespace-pre-line">{ROSE_NAME_NOTE}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {isEasterEggOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 pointer-events-auto animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="彩蛋语句"
          onClick={() => setIsEasterEggOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-2xl border border-[var(--node-border)] bg-[var(--node-bg)] px-6 py-6 shadow-2xl animate-easter-modal-in"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="font-serif text-lg leading-relaxed text-[var(--foreground)]">
              {EASTER_EGG_TEXT}
            </p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setIsEasterEggOpen(false)}
                className="rounded-md border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]"
              >
                合上书页
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
