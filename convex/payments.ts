import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const recordPayment = mutation({
  args: {
    groupId: v.id("groups"),
    toUserId: v.id("users"),
    amount: v.number(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    if (userId === args.toUserId) {
      throw new Error("Cannot pay yourself");
    }

    // Check if both users are members of the group
    const fromMembership = await ctx.db
      .query("memberships")
      .withIndex("by_group_and_user", (q) => 
        q.eq("groupId", args.groupId).eq("userId", userId)
      )
      .unique();

    const toMembership = await ctx.db
      .query("memberships")
      .withIndex("by_group_and_user", (q) => 
        q.eq("groupId", args.groupId).eq("userId", args.toUserId)
      )
      .unique();

    if (!fromMembership || !toMembership) {
      throw new Error("Both users must be members of the group");
    }

    if (args.amount <= 0) {
      throw new Error("Amount must be positive");
    }

    await ctx.db.insert("payments", {
      groupId: args.groupId,
      fromUserId: userId,
      toUserId: args.toUserId,
      amount: args.amount,
      description: args.description,
      date: Date.now(),
    });
  },
});
