/**
 * 常時チャットの「1日」の区切り。
 * 深夜の会話を前日の続きとして扱いたいので、日付は午前4時に切り替わる。
 * ここでも「時刻を保存 → 日付はクライアントで導出」の方針を守り、
 * dayKey（"2026-07-26" 形式のローカル日付文字列）は createdAt から決定する。
 */

/** 1日の始まりの時刻（時）。この時刻より前は前日扱い */
export const DAY_ROLLOVER_HOUR = 4;

/** epoch ミリ秒が属する論理的な「日」のキー（ローカルタイムの YYYY-MM-DD） */
export function dayKeyOf(ts: number): string {
  // 4時ぶん巻き戻すと、0:00〜3:59 は前日のカレンダー日付に落ちる
  const d = new Date(ts - DAY_ROLLOVER_HOUR * 3600_000);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** dayKey が指す1日の開始時刻（その日の午前4時 00 分, ローカル） */
export function dayStartMs(dayKey: string): number {
  const [y, m, d] = dayKey.split('-').map(Number);
  return new Date(y, m - 1, d, DAY_ROLLOVER_HOUR, 0, 0, 0).getTime();
}

/** dayKey が指す1日の終了時刻（翌日の午前4時 = 次の日の開始） */
export function dayEndMs(dayKey: string): number {
  return dayStartMs(dayKey) + 24 * 3600_000;
}

/** 「7月26日(土)」形式のラベル */
export function formatDayLabel(dayKey: string): string {
  const start = dayStartMs(dayKey);
  return new Date(start).toLocaleDateString('ja-JP', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
}
