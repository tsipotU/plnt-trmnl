class ScreenCache {
  private html: string | null = null;
  private lastPushTime: Date | null = null;

  set(html: string): void {
    this.html = html;
    this.lastPushTime = new Date();
  }

  get(): string | null {
    return this.html;
  }

  getLastPushTime(): Date | null {
    return this.lastPushTime;
  }

  clear(): void {
    this.html = null;
    this.lastPushTime = null;
  }
}

export const screenCache = new ScreenCache();
