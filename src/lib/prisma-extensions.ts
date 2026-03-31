import { PrismaClient } from "@prisma/client";

/**
 * Prisma Extension to handle Soft Delete automatically
 * This will intercept find/update/delete operations for models that have a 'deletedAt' field.
 */
export const softDeleteExtension = (prisma: PrismaClient) => {
  return prisma.$extends({
    name: 'softDelete',
    query: {
      $allModels: {
        async delete({ model, args }) {
          // Instead of actual delete, we do an update
          return (prisma as any)[model].update({
            ...args,
            data: { deletedAt: new Date(), isDeleted: true },
          });
        },
        async deleteMany({ model, args }) {
          return (prisma as any)[model].updateMany({
            ...args,
            data: { deletedAt: new Date(), isDeleted: true },
          });
        },
        async findUnique({ model, args, query }) {
          if (args.where && !(args.where as any).isDeleted) {
            (args.where as any).isDeleted = false;
          }
          return query(args);
        },
        async findFirst({ model, args, query }) {
          if (args.where && !(args.where as any).isDeleted) {
            (args.where as any).isDeleted = false;
          }
          return query(args);
        },
        async findMany({ model, args, query }) {
          if (args.where && !(args.where as any).isDeleted) {
            (args.where as any).isDeleted = false;
          }
          return query(args);
        },
        async count({ model, args, query }) {
          if (args.where && !(args.where as any).isDeleted) {
            (args.where as any).isDeleted = false;
          }
          return query(args);
        },
      }
    }
  });
};
