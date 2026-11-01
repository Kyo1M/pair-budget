/** 読み込みが応答しない場合も、再試行できる状態に戻す。 */
export async function withTimeout<T>(promise: PromiseLike<T>, milliseconds = 10_000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('接続に時間がかかっています。もう一度お試しください。')), milliseconds);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
