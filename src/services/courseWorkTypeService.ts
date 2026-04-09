export const ALL_WORK_TYPES: any[] = [
    'EXAMEN',
    'INTERRO',
    'PROJET',
    'TD',
    'TP',
    'EXERCICES'
];

export const normalizeWorkTypes = (input?: unknown) => {
    const items: any[] = Array.isArray(input)
        ? input.map((item: any) =>
            typeof item === 'string' ? { type: item } : item
        )
        : [];

    const rawTypes = items.map((item) => item?.type).filter(Boolean);
    const requested = rawTypes.filter((type): type is any => !!type && ALL_WORK_TYPES.includes(type));
    
    if (rawTypes.length > 0 && requested.length !== rawTypes.length) {
        return {
            ok: false as const,
            error: "Type de travail invalide"
        };
    }

    const uniqueTypes = Array.from(new Set(requested));
    if (uniqueTypes.length === 0) {
        return {
            ok: true as const,
            items: [
                { type: 'EXAMEN', weightPercent: 50 },
                { type: 'INTERRO', weightPercent: 25 },
                { type: 'TP', weightPercent: 25 }
            ]
        };
    }

    const providedWeights = items.filter((item) => item?.weightPercent !== undefined);
    const hasAnyWeight = providedWeights.length > 0;

    if (hasAnyWeight) {
        const weightsByType = new Map<any, number>();
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
            items: [{ type: uniqueTypes[0], weightPercent: 100 }]
        };
    }

    const hasExam = uniqueTypes.includes('EXAMEN');
    if (hasExam) {
        const otherTypes = uniqueTypes.filter((type) => type !== 'EXAMEN');
        const otherWeight = otherTypes.length > 0 ? 50 / otherTypes.length : 0;
        return {
            ok: true as const,
            items: [
                { type: 'EXAMEN', weightPercent: 50 },
                ...otherTypes.map((type) => ({ type, weightPercent: otherWeight }))
            ]
        };
    }

    const equalWeight = 100 / uniqueTypes.length;
    return {
        ok: true as const,
        items: uniqueTypes.map((type) => ({ type, weightPercent: equalWeight }))
    };
};
