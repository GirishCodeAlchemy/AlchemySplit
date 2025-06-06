import { v } from "convex/values";
import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getGroupBalances = query({
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

    // Get all members
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    // Get all expenses
    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    // Get all expense splits
    const allSplits = await Promise.all(
      expenses.map(async (expense) => {
        const splits = await ctx.db
          .query("expenseSplits")
          .withIndex("by_expense", (q) => q.eq("expenseId", expense._id))
          .collect();
        
        // If no splits exist (legacy expense), create equal splits
        if (splits.length === 0) {
          const splitAmount = expense.amount / memberships.length;
          return memberships.map(membership => ({
            expenseId: expense._id,
            userId: membership.userId,
            amount: splitAmount,
            paidBy: expense.paidBy,
            _id: `legacy-${expense._id}-${membership.userId}` as any,
            _creationTime: expense.date,
          }));
        }
        
        return splits.map(split => ({ ...split, expenseId: expense._id, paidBy: expense.paidBy }));
      })
    );
    const expenseSplits = allSplits.flat();

    // Get all payments
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    // Calculate balances for each member
    const balances = new Map();

    // Initialize balances
    for (const membership of memberships) {
      const user = await ctx.db.get(membership.userId);
      balances.set(membership.userId, {
        user,
        totalPaid: 0,
        totalOwed: 0,
        totalReceived: 0,
        netBalance: 0,
      });
    }

    // Add up what each person paid for expenses
    for (const expense of expenses) {
      const balance = balances.get(expense.paidBy);
      if (balance) {
        balance.totalPaid += expense.amount;
      }
    }

    // Add up what each person owes based on expense splits
    for (const split of expenseSplits) {
      const balance = balances.get(split.userId);
      if (balance) {
        balance.totalOwed += split.amount;
      }
    }

    // Add up payments received and made
    for (const payment of payments) {
      const fromBalance = balances.get(payment.fromUserId);
      const toBalance = balances.get(payment.toUserId);
      
      if (fromBalance) {
        fromBalance.totalPaid += payment.amount;
      }
      if (toBalance) {
        toBalance.totalReceived += payment.amount;
      }
    }

    // Calculate net balance (what they paid + received - what they owe)
    for (const [userId, balance] of balances) {
      balance.netBalance = balance.totalPaid + balance.totalReceived - balance.totalOwed;
    }

    return Array.from(balances.values());
  },
});

export const getSettlementSuggestions = query({
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

    // Get balances using the same logic as getGroupBalances
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    const allSplits = await Promise.all(
      expenses.map(async (expense) => {
        const splits = await ctx.db
          .query("expenseSplits")
          .withIndex("by_expense", (q) => q.eq("expenseId", expense._id))
          .collect();
        
        // If no splits exist (legacy expense), create equal splits
        if (splits.length === 0) {
          const splitAmount = expense.amount / memberships.length;
          return memberships.map(membership => ({
            expenseId: expense._id,
            userId: membership.userId,
            amount: splitAmount,
            paidBy: expense.paidBy,
            _id: `legacy-${expense._id}-${membership.userId}` as any,
            _creationTime: expense.date,
          }));
        }
        
        return splits.map(split => ({ ...split, expenseId: expense._id, paidBy: expense.paidBy }));
      })
    );
    const expenseSplits = allSplits.flat();

    const payments = await ctx.db
      .query("payments")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    const balances = new Map();

    for (const membership of memberships) {
      const user = await ctx.db.get(membership.userId);
      balances.set(membership.userId, {
        user,
        totalPaid: 0,
        totalOwed: 0,
        totalReceived: 0,
        netBalance: 0,
      });
    }

    for (const expense of expenses) {
      const balance = balances.get(expense.paidBy);
      if (balance) {
        balance.totalPaid += expense.amount;
      }
    }

    for (const split of expenseSplits) {
      const balance = balances.get(split.userId);
      if (balance) {
        balance.totalOwed += split.amount;
      }
    }

    for (const payment of payments) {
      const fromBalance = balances.get(payment.fromUserId);
      const toBalance = balances.get(payment.toUserId);
      
      if (fromBalance) {
        fromBalance.totalPaid += payment.amount;
      }
      if (toBalance) {
        toBalance.totalReceived += payment.amount;
      }
    }

    for (const [userId, balance] of balances) {
      balance.netBalance = balance.totalPaid + balance.totalReceived - balance.totalOwed;
    }

    const balanceArray = Array.from(balances.values());
    
    // Separate creditors and debtors
    const creditors = balanceArray.filter(b => b.netBalance > 0.01).sort((a, b) => b.netBalance - a.netBalance);
    const debtors = balanceArray.filter(b => b.netBalance < -0.01).sort((a, b) => a.netBalance - b.netBalance);
    
    const suggestions = [];
    let creditorIndex = 0;
    let debtorIndex = 0;
    
    while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
      const creditor = { ...creditors[creditorIndex] };
      const debtor = { ...debtors[debtorIndex] };
      
      const amount = Math.min(creditor.netBalance, Math.abs(debtor.netBalance));
      
      if (amount > 0.01) {
        suggestions.push({
          from: debtor.user,
          to: creditor.user,
          amount: amount,
        });
      }
      
      creditor.netBalance -= amount;
      debtor.netBalance += amount;
      
      if (creditor.netBalance < 0.01) creditorIndex++;
      if (debtor.netBalance > -0.01) debtorIndex++;
    }
    
    return suggestions;
  },
});
