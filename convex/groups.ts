import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const createGroup = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const groupId = await ctx.db.insert("groups", {
      name: args.name,
      description: args.description,
      createdBy: userId,
    });

    // Add creator as first member
    await ctx.db.insert("memberships", {
      groupId,
      userId,
      joinedAt: Date.now(),
    });

    return groupId;
  },
});

export const addMemberByEmail = mutation({
  args: {
    groupId: v.id("groups"),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if current user is a member of the group
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_group_and_user", (q) => 
        q.eq("groupId", args.groupId).eq("userId", userId)
      )
      .unique();

    if (!membership) {
      throw new Error("Not a member of this group");
    }

    // Find user by email
    const userToAdd = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .unique();

    if (!userToAdd) {
      throw new Error("User with this email not found");
    }

    // Check if user is already a member
    const existingMembership = await ctx.db
      .query("memberships")
      .withIndex("by_group_and_user", (q) => 
        q.eq("groupId", args.groupId).eq("userId", userToAdd._id)
      )
      .unique();

    if (existingMembership) {
      throw new Error("User is already a member of this group");
    }

    await ctx.db.insert("memberships", {
      groupId: args.groupId,
      userId: userToAdd._id,
      joinedAt: Date.now(),
    });

    return userToAdd._id;
  },
});

export const joinGroup = mutation({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if user is already a member
    const existingMembership = await ctx.db
      .query("memberships")
      .withIndex("by_group_and_user", (q) => 
        q.eq("groupId", args.groupId).eq("userId", userId)
      )
      .unique();

    if (existingMembership) {
      throw new Error("Already a member of this group");
    }

    await ctx.db.insert("memberships", {
      groupId: args.groupId,
      userId,
      joinedAt: Date.now(),
    });
  },
});

export const getUserGroups = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const groups = await Promise.all(
      memberships.map(async (membership) => {
        const group = await ctx.db.get(membership.groupId);
        return group;
      })
    );

    return groups.filter(Boolean);
  },
});

export const getGroupDetails = query({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if user is a member
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_group_and_user", (q) => 
        q.eq("groupId", args.groupId).eq("userId", userId)
      )
      .unique();

    if (!membership) {
      throw new Error("Not a member of this group");
    }

    const group = await ctx.db.get(args.groupId);
    if (!group) {
      throw new Error("Group not found");
    }

    // Get all members
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    const members = await Promise.all(
      memberships.map(async (membership) => {
        const user = await ctx.db.get(membership.userId);
        return {
          ...user,
          joinedAt: membership.joinedAt,
        };
      })
    );

    // Get all expenses
    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .order("desc")
      .collect();

    const expensesWithUsers = await Promise.all(
      expenses.map(async (expense) => {
        const paidByUser = await ctx.db.get(expense.paidBy);
        
        // Get splits for this expense
        const splits = await ctx.db
          .query("expenseSplits")
          .withIndex("by_expense", (q) => q.eq("expenseId", expense._id))
          .collect();

        const splitsWithUsers = await Promise.all(
          splits.map(async (split) => {
            const user = await ctx.db.get(split.userId);
            return {
              ...split,
              user,
            };
          })
        );

        return {
          ...expense,
          paidByUser,
          splits: splitsWithUsers,
        };
      })
    );

    // Get all payments
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .order("desc")
      .collect();

    const paymentsWithUsers = await Promise.all(
      payments.map(async (payment) => {
        const fromUser = await ctx.db.get(payment.fromUserId);
        const toUser = await ctx.db.get(payment.toUserId);
        return {
          ...payment,
          fromUser,
          toUser,
        };
      })
    );

    return {
      group,
      members,
      expenses: expensesWithUsers,
      payments: paymentsWithUsers,
    };
  },
});

export const getAllGroups = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("groups").collect();
  },
});
