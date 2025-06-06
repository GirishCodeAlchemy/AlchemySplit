import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const addExpense = mutation({
  args: {
    groupId: v.id("groups"),
    description: v.string(),
    amount: v.number(),
    splitType: v.optional(v.union(v.literal("equal"), v.literal("custom"))),
    customSplits: v.optional(v.array(v.object({
      userId: v.id("users"),
      amount: v.number(),
    }))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if user is a member of the group
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_group_and_user", (q) => 
        q.eq("groupId", args.groupId).eq("userId", userId)
      )
      .unique();

    if (!membership) {
      throw new Error("Not a member of this group");
    }

    if (args.amount <= 0) {
      throw new Error("Amount must be positive");
    }

    // Create the expense
    const splitType = args.splitType || "equal";
    const expenseId = await ctx.db.insert("expenses", {
      groupId: args.groupId,
      description: args.description,
      amount: args.amount,
      paidBy: userId,
      date: Date.now(),
      splitType: splitType,
    });

    // Create splits based on split type
    if (splitType === "equal") {
      // Get all group members for equal split
      const memberships = await ctx.db
        .query("memberships")
        .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
        .collect();

      const splitAmount = args.amount / memberships.length;

      for (const membership of memberships) {
        await ctx.db.insert("expenseSplits", {
          expenseId,
          userId: membership.userId,
          amount: splitAmount,
        });
      }
    } else if (splitType === "custom" && args.customSplits) {
      // Validate custom splits sum to total amount
      const totalSplits = args.customSplits.reduce((sum, split) => sum + split.amount, 0);
      if (Math.abs(totalSplits - args.amount) > 0.01) {
        throw new Error("Custom splits must sum to the total amount");
      }

      for (const split of args.customSplits) {
        await ctx.db.insert("expenseSplits", {
          expenseId,
          userId: split.userId,
          amount: split.amount,
        });
      }
    }

    return expenseId;
  },
});
