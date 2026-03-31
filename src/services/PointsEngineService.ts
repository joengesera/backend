type PointItem = {
  score: number;
  maxScore: number;
  percentage?: number | null;
  workTypeLabel?: string | null;
  workType?: { type?: string | null } | null;
};

export class PointsEngineService {
  static normalizeToTwenty(score: number, maxScore: number) {
    if (!Number.isFinite(score) || !Number.isFinite(maxScore) || maxScore <= 0) return 0;
    return (score / maxScore) * 20;
  }

  static getTypeLabel(item: Pick<PointItem, 'workTypeLabel' | 'workType'>): string {
    return String(item.workTypeLabel || item.workType?.type || 'AUTRE').trim().toUpperCase();
  }

  private static getDefaultTypePools(autoItems: PointItem[], remainingPercent: number) {
    const types = Array.from(new Set(autoItems.map((i) => this.getTypeLabel(i))));
    const hasExam = types.includes('EXAMEN');
    const otherTypes = types.filter((type) => type !== 'EXAMEN');

    const pools = new Map<string, number>();
    const examPool = hasExam ? remainingPercent * 0.5 : 0;
    if (hasExam) pools.set('EXAMEN', examPool);

    const remainingPool = remainingPercent - examPool;
    if (otherTypes.length > 0) {
      const each = remainingPool / otherTypes.length;
      otherTypes.forEach((type) => pools.set(type, each));
    }

    return pools;
  }

  static calculatePercentageBasedAverage(items: PointItem[]) {
    if (items.length === 0) return 0;

    const manualItems = items.filter((i) => Number.isFinite(i.percentage));
    const autoItems = items.filter((i) => !Number.isFinite(i.percentage));

    const manualPercent = manualItems.reduce((sum, i) => sum + Number(i.percentage || 0), 0);
    const remainingPercent = Math.max(0, 100 - manualPercent);
    const typePools = this.getDefaultTypePools(autoItems, remainingPercent);

    const autoByType = new Map<string, PointItem[]>();
    autoItems.forEach((i) => {
      const type = this.getTypeLabel(i);
      if (!autoByType.has(type)) autoByType.set(type, []);
      autoByType.get(type)!.push(i);
    });

    let weightedSum = 0;
    let totalPercent = 0;

    for (const item of manualItems) {
      const p = Number(item.percentage || 0);
      weightedSum += this.normalizeToTwenty(item.score, item.maxScore) * p;
      totalPercent += p;
    }

    for (const [type, list] of autoByType.entries()) {
      const pool = typePools.get(type) || 0;
      if (pool <= 0 || list.length === 0) continue;
      const each = pool / list.length;
      for (const item of list) {
        weightedSum += this.normalizeToTwenty(item.score, item.maxScore) * each;
        totalPercent += each;
      }
    }

    if (totalPercent <= 0) {
      return items.reduce((acc, i) => acc + this.normalizeToTwenty(i.score, i.maxScore), 0) / items.length;
    }

    return weightedSum / totalPercent;
  }
}
