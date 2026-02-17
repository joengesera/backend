import { WorkType } from '@prisma/client';

type WorkTypeInput = {
    type: WorkType;
    weightPercent?: number;
};

export const ALL_WORK_TYPES: WorkType[] = [
    WorkType.EXAMEN,
    WorkType.INTERRO,
    WorkType.PROJET,
    WorkType.TD,
    WorkType.TP,
    WorkType.EXERCICES
];

export const normalizeWorkTypes = (input?: unknown) => {
    const items: WorkTypeInput[] = Array.isArray(input)
        ? input.map((item) =>
            typeof item === 'string' ? { type: item as WorkType } : (item as WorkTypeInput)
        )
        : [];

    const rawTypes = items.map((item) => item?.type).filter(Boolean);
    const requested = rawTypes.filter((type): type is WorkType => !!type && ALL_WORK_TYPES.includes(type as WorkType));
    if (rawTypes.length > 0 && requested.length !== rawTypes.length) {
        return {
            ok: false as const,
            error: "Type de travail invalide"
        };
    }

    const uniqueTypes = Array.from(new Set(requested));
    const hasExam = uniqueTypes.includes(WorkType.EXAMEN);
    if (uniqueTypes.length === 0) {
        return {
            ok: true as const,
            items: [{ type: WorkType.EXAMEN, weightPercent: 100 }]
        };
    }

    if (!hasExam) {
        return {
            ok: false as const,
            error: "Le type EXAMEN est obligatoire"
        };
    }

    const providedWeights = items.filter((item) => item?.weightPercent !== undefined);
    const hasAnyWeight = providedWeights.length > 0;

    if (hasAnyWeight) {
        const weightsByType = new Map<WorkType, number>();
        for (const item of items) {
            if (!item?.type || item.weightPercent === undefined) {
                return { ok: false as const, error: "Tous les types doivent avoir un pourcentage si un est fourni" };
            }
            if (!ALL_WORK_TYPES.includes(item.type)) {
                return { ok: false as const, error: "Type de travail invalide" };
            }
            weightsByType.set(item.type, item.weightPercent);
        }

        const missing = uniqueTypes.filter((type) => !weightsByType.has(type));
        if (missing.length > 0) {
            return { ok: false as const, error: "Tous les types doivent avoir un pourcentage" };
        }

        const total = uniqueTypes.reduce((sum, type) => sum + (weightsByType.get(type) || 0), 0);
        if (Math.abs(total - 100) > 0.01) {
            return { ok: false as const, error: "La somme des pourcentages doit être égale à 100" };
        }

        return {
            ok: true as const,
            items: uniqueTypes.map((type) => ({
                type,
                weightPercent: weightsByType.get(type) as number
            }))
        };
    }

    if (uniqueTypes.length === 1) {
        return {
            ok: true as const,
            items: [{ type: WorkType.EXAMEN, weightPercent: 100 }]
        };
    }

    const otherTypes = uniqueTypes.filter((type) => type !== WorkType.EXAMEN);
    const otherWeight = 50 / otherTypes.length;
    return {
        ok: true as const,
        items: [
            { type: WorkType.EXAMEN, weightPercent: 50 },
            ...otherTypes.map((type) => ({ type, weightPercent: otherWeight }))
        ]
    };
};

