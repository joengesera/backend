import { PointsEngineService } from "../PointsEngineService";

describe("PointsEngineService", () => {
    describe("normalizeToTwenty", () => {
        it("should normalize score correcty", () => {
            expect(PointsEngineService.normalizeToTwenty(10, 20)).toBe(10);
            expect(PointsEngineService.normalizeToTwenty(15, 20)).toBe(15);
            expect(PointsEngineService.normalizeToTwenty(5, 5)).toBe(20);
        });

        it("should return 0 for invalid maxScore", () => {
            expect(PointsEngineService.normalizeToTwenty(10, 0)).toBe(0);
            expect(PointsEngineService.normalizeToTwenty(10, -5)).toBe(0);
        });
    });

    describe("getTypeLabel", () => {
        it("should return workTypeLabel if present", () => {
            expect(PointsEngineService.getTypeLabel({ workTypeLabel: "Examen" })).toBe("EXAMEN");
        });

        it("should return workType.type if workTypeLabel is missing", () => {
            expect(PointsEngineService.getTypeLabel({ workType: { type: "TP" } })).toBe("TP");
        });

        it("should return AUTRE if both are missing", () => {
            expect(PointsEngineService.getTypeLabel({})).toBe("AUTRE");
        });
    });

    describe("calculatePercentageBasedAverage", () => {
        it("should calculate average with manual percentages", () => {
            const items = [
                { score: 10, maxScore: 20, percentage: 40 }, // 10/20 * 40% = 4
                { score: 20, maxScore: 20, percentage: 60 }  // 20/20 * 60% = 12
            ];
            expect(PointsEngineService.calculatePercentageBasedAverage(items)).toBe(16);
        });

        it("should distribute remaining percentage among automatic items", () => {
            const items = [
                { score: 10, maxScore: 20 }, // Should take 100% / 1 = 100%
            ];
            expect(PointsEngineService.calculatePercentageBasedAverage(items)).toBe(10);
        });

        it("should use default distribution with EXAMEN", () => {
            const items = [
                { score: 20, maxScore: 20, workTypeLabel: "EXAMEN" }, // Should take 50%
                { score: 10, maxScore: 20, workTypeLabel: "TP" }      // Should take 50%
            ];
            // EXAMEN: 20 * 0.5 = 10
            // TP: 10 * 0.5 = 5
            // Total: 15
            expect(PointsEngineService.calculatePercentageBasedAverage(items)).toBe(15);
        });
    });
});
