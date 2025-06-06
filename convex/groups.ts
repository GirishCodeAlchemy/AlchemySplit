import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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

export const searchUsers = query({
  args: {
    searchTerm: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    if (!args.searchTerm.trim() || args.searchTerm.length < 2) {
      return [];
    }

    const searchTerm = args.searchTerm.toLowerCase().trim();

    // Get all users and filter them
    const allUsers = await ctx.db.query("users").collect();

    const matchingUsers = allUsers.filter(user => {
      if (!user) return false;

      // Search by email
      if (user.email && user.email.toLowerCase().includes(searchTerm)) {
        return true;
      }

      // Search by name
      if (user.name && user.name.toLowerCase().includes(searchTerm)) {
        return true;
      }

      // Search by phone (if exists)
      if (user.phone && user.phone.includes(searchTerm)) {
        return true;
      }

      return false;
    });

    // Limit results to prevent overwhelming UI
    return matchingUsers.slice(0, 10).map(user => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
    }));
  },
});

export const addMemberBySearch = mutation({
  args: {
    groupId: v.id("groups"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw new Error("Not authenticated");
    }

    // Check if current user is a member of the group
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", currentUserId)
      )
      .unique();

    if (!membership) {
      throw new Error("Not a member of this group");
    }

    // Check if the user exists
    const userToAdd = await ctx.db.get(args.userId);
    if (!userToAdd) {
      throw new Error("User not found");
    }

    // Check if user is already a member
    const existingMembership = await ctx.db
      .query("memberships")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", args.userId)
      )
      .unique();

    if (existingMembership) {
      throw new Error("User is already a member of this group");
    }

    await ctx.db.insert("memberships", {
      groupId: args.groupId,
      userId: args.userId,
      joinedAt: Date.now(),
    });

    return args.userId;
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
      .withIndex("email", (q) => q.eq("email", args.email.toLowerCase().trim()))
      .unique();

    if (!userToAdd) {
      throw new Error("User with this email not found. They may need to sign up first.");
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

export const addMemberByPhone = mutation({
  args: {
    groupId: v.id("groups"),
    phone: v.string(),
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

    // Find user by phone
    const userToAdd = await ctx.db
      .query("users")
      .withIndex("phone", (q) => q.eq("phone", args.phone.trim()))
      .unique();

    if (!userToAdd) {
      throw new Error("User with this phone number not found. They may need to sign up first.");
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

export const addMemberByName = mutation({
  args: {
    groupId: v.id("groups"),
    name: v.string(),
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

    // Find user by name (case insensitive)
    const allUsers = await ctx.db.query("users").collect();
    const userToAdd = allUsers.find(user =>
      user.name && user.name.toLowerCase().trim() === args.name.toLowerCase().trim()
    );

    if (!userToAdd) {
      throw new Error("User with this name not found. Try searching by email instead.");
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
      members: members.filter(Boolean), // Filter out any null users
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
