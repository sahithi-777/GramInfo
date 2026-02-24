import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

async function requireAuth(ctx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Unauthorized");
  return userId;
}

export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    return await ctx.db.query("profiles").withIndex("by_user", (q) => q.eq("userId", userId)).unique();
  },
});

export const upsert = mutation({
  args: {
    fullName: v.string(),
    phone: v.string(),
    designation: v.string(),
    panchayatName: v.string(),
    villageName: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const existing = await ctx.db.query("profiles").withIndex("by_user", (q) => q.eq("userId", userId)).unique();
    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        fullName: args.fullName,
        phone: args.phone,
        designation: args.designation,
        panchayatName: args.panchayatName,
        villageName: args.villageName,
        updatedAt: now,
      });
      return { ok: true, mode: "updated" };
    }

    await ctx.db.insert("profiles", {
      userId,
      fullName: args.fullName,
      phone: args.phone,
      designation: args.designation,
      panchayatName: args.panchayatName,
      villageName: args.villageName,
      createdAt: now,
      updatedAt: now,
    });

    return { ok: true, mode: "created" };
  },
});
