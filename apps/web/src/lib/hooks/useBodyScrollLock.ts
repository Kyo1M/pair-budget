/**
 * モーダル表示時のbodyスクロール制御フック
 * 
 * モーダルが開いている間、背景のスクロールを無効化し、
 * モーダルが閉じた時にスクロールを復元します。
 */

'use client';

import { useEffect } from 'react';

/**
 * bodyスクロール制御フック
 * 
 * @param isLocked - スクロールをロックするかどうか
 */
export function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (isLocked) {
      // 現在のスクロール位置を保存
      const scrollY = window.scrollY;
      
      // bodyのスクロールを無効化
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      
      return () => {
        // スクロールを復元
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        
        // スクロール位置を復元
        window.scrollTo(0, scrollY);
      };
    }
  }, [isLocked]);
}
