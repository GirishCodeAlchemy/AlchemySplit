import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const addExpense = mutation({
  args: {
    groupId: v.id("groups"),
    description: v.string(),
    amount: v.number(),
    splitType: v.optional(v.union(v.literal("equal"), v.literal("amount"), v.literal("percentage"))),
    customSplits: v.optional(v.array(v.object({
      userId: v.id("users"),
      amount: v.optional(v.number()),
      percentage: v.optional(v.number()),
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
      const splitPercentage = 100 / memberships.length;

      for (const membership of memberships) {
        await ctx.db.insert("expenseSplits", {
          expenseId,
          userId: membership.userId,
          amount: splitAmount,
          percentage: splitPercentage,
        });
      }
    } else if (splitType === "amount" && args.customSplits) {
      // Validate custom splits sum to total amount
      const totalSplits = args.customSplits.reduce((sum, split) => sum + (split.amount || 0), 0);
      if (Math.abs(totalSplits - args.amount) > 0.01) {
        throw new Error("Custom splits must sum to the total amount");
      }

      for (const split of args.customSplits) {
        const percentage = ((split.amount || 0) / args.amount) * 100;
        await ctx.db.insert("expenseSplits", {
          expenseId,
          userId: split.userId,
          amount: split.amount || 0,
          percentage: percentage,
        });
      }
    } else if (splitType === "percentage" && args.customSplits) {
      // Validate percentages sum to 100
      const totalPercentage = args.customSplits.reduce((sum, split) => sum + (split.percentage || 0), 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        throw new Error("Percentages must sum to 100%");
      }

      for (const split of args.customSplits) {
        const amount = (args.amount * (split.percentage || 0)) / 100;
        await ctx.db.insert("expenseSplits", {
          expenseId,
          userId: split.userId,
          amount: amount,
          percentage: split.percentage || 0,
        });
      }
    }

    return expenseId;
  },
});

export const updateExpense = mutation({
  args: {
    expenseId: v.id("expenses"),
    description: v.string(),
    amount: v.number(),
    splitType: v.union(v.literal("equal"), v.literal("amount"), v.literal("percentage")),
    customSplits: v.optional(v.array(v.object({
      userId: v.id("users"),
      amount: v.optional(v.number()),
      percentage: v.optional(v.number()),
    }))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get the expense
    const expense = await ctx.db.get(args.expenseId);
    if (!expense) {
      throw new Error("Expense not found");
    }

    // Check if user is a member of the group
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", expense.groupId).eq("userId", userId)
      )
      .unique();

    if (!membership) {
      throw new Error("Not a member of this group");
    }

    if (args.amount <= 0) {
      throw new Error("Amount must be positive");
    }

    // Update the expense
    await ctx.db.patch(args.expenseId, {
      description: args.description,
      amount: args.amount,
      splitType: args.splitType,
    });

    // Delete existing splits
    const existingSplits = await ctx.db
      .query("expenseSplits")
      .withIndex("by_expense", (q) => q.eq("expenseId", args.expenseId))
      .collect();

    for (const split of existingSplits) {
      await ctx.db.delete(split._id);
    }

    // Create new splits based on split type
    if (args.splitType === "equal") {
      // Get all group members for equal split
      const memberships = await ctx.db
        .query("memberships")
        .withIndex("by_group", (q) => q.eq("groupId", expense.groupId))
        .collect();

      const splitAmount = args.amount / memberships.length;
      const splitPercentage = 100 / memberships.length;

      for (const membership of memberships) {
        await ctx.db.insert("expenseSplits", {
          expenseId: args.expenseId,
          userId: membership.userId,
          amount: splitAmount,
          percentage: splitPercentage,
        });
      }
    } else if (args.splitType === "amount" && args.customSplits) {
      // Validate custom splits sum to total amount
      const totalSplits = args.customSplits.reduce((sum, split) => sum + (split.amount || 0), 0);
      if (Math.abs(totalSplits - args.amount) > 0.01) {
        throw new Error("Custom splits must sum to the total amount");
      }

      for (const split of args.customSplits) {
        const percentage = ((split.amount || 0) / args.amount) * 100;
        await ctx.db.insert("expenseSplits", {
          expenseId: args.expenseId,
          userId: split.userId,
          amount: split.amount || 0,
          percentage: percentage,
        });
      }
    } else if (args.splitType === "percentage" && args.customSplits) {
      // Validate percentages sum to 100
      const totalPercentage = args.customSplits.reduce((sum, split) => sum + (split.percentage || 0), 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        throw new Error("Percentages must sum to 100%");
      }

      for (const split of args.customSplits) {
        const amount = (args.amount * (split.percentage || 0)) / 100;
        await ctx.db.insert("expenseSplits", {
          expenseId: args.expenseId,
          userId: split.userId,
          amount: amount,
          percentage: split.percentage || 0,
        });
      }
    }

    return args.expenseId;
  },
});

export const deleteExpense = mutation({
  args: {
    expenseId: v.id("expenses"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get the expense
    const expense = await ctx.db.get(args.expenseId);
    if (!expense) {
      throw new Error("Expense not found");
    }

    // Check if user is a member of the group
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", expense.groupId).eq("userId", userId)
      )
      .unique();

    if (!membership) {
      throw new Error("Not a member of this group");
    }

    // Delete all splits for this expense
    const splits = await ctx.db
      .query("expenseSplits")
      .withIndex("by_expense", (q) => q.eq("expenseId", args.expenseId))
      .collect();

    for (const split of splits) {
      await ctx.db.delete(split._id);
    }

    // Delete the expense
    await ctx.db.delete(args.expenseId);
  },
});
