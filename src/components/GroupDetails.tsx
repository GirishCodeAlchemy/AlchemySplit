import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

interface GroupDetailsProps {
  groupId: Id<"groups">;
}

export function GroupDetails({ groupId }: GroupDetailsProps) {
  const groupDetails = useQuery(api.groups.getGroupDetails, { groupId });
  const balances = useQuery(api.balances.getGroupBalances, { groupId });
  const settlementSuggestions = useQuery(api.balances.getSettlementSuggestions, { groupId });
  const addExpense = useMutation(api.expenses.addExpense);
  const recordPayment = useMutation(api.payments.recordPayment);
  const addMemberByEmail = useMutation(api.groups.addMemberByEmail);

  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [splitType, setSplitType] = useState<"equal" | "custom">("equal");
  const [customSplits, setCustomSplits] = useState<{ userId: Id<"users">; amount: string }[]>([]);
  const [paymentToUserId, setPaymentToUserId] = useState<Id<"users"> | "">("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDescription, setPaymentDescription] = useState("");
  const [memberEmail, setMemberEmail] = useState("");

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseDescription.trim() || !expenseAmount) return;

    try {
      const amount = parseFloat(expenseAmount);
      let customSplitsData = undefined;

      if (splitType === "custom") {
        customSplitsData = customSplits.map(split => ({
          userId: split.userId,
          amount: parseFloat(split.amount) || 0,
        }));

        const totalSplits = customSplitsData.reduce((sum, split) => sum + split.amount, 0);
        if (Math.abs(totalSplits - amount) > 0.01) {
          toast.error("Custom splits must sum to the total amount");
          return;
        }
      }

      await addExpense({
        groupId,
        description: expenseDescription,
        amount,
        splitType,
        customSplits: customSplitsData,
      });
      
      setExpenseDescription("");
      setExpenseAmount("");
      setSplitType("equal");
      setCustomSplits([]);
      setShowExpenseForm(false);
      toast.success("Expense added successfully!");
    } catch (error) {
      toast.error("Failed to add expense");
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentToUserId || !paymentAmount) return;

    try {
      await recordPayment({
        groupId,
        toUserId: paymentToUserId as Id<"users">,
        amount: parseFloat(paymentAmount),
        description: paymentDescription || undefined,
      });
      setPaymentToUserId("");
      setPaymentAmount("");
      setPaymentDescription("");
      setShowPaymentForm(false);
      toast.success("Payment recorded successfully!");
    } catch (error) {
      toast.error("Failed to record payment");
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberEmail.trim()) return;

    try {
      await addMemberByEmail({
        groupId,
        email: memberEmail,
      });
      setMemberEmail("");
      setShowAddMemberForm(false);
      toast.success("Member added successfully!");
    } catch (error) {
      toast.error("Failed to add member");
    }
  };

  const initializeCustomSplits = () => {
    if (!groupDetails) return;
    const splits = groupDetails.members
      .filter(member => member._id)
      .map(member => ({
        userId: member._id!,
        amount: "",
      }));
    setCustomSplits(splits);
  };

  if (groupDetails === undefined || balances === undefined) {
    return (
      <div className="flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const { group, members, expenses, payments } = groupDetails;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow border">
        <h1 className="text-3xl font-bold mb-2">{group.name}</h1>
        {group.description && (
          <p className="text-gray-600 mb-4">{group.description}</p>
        )}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowExpenseForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Add Expense
          </button>
          <button
            onClick={() => setShowPaymentForm(true)}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Record Payment
          </button>
          <button
            onClick={() => setShowAddMemberForm(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            Add Member
          </button>
        </div>
      </div>

      {showAddMemberForm && (
        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-xl font-semibold mb-4">Add Member</h2>
          <form onSubmit={handleAddMember} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email Address</label>
              <input
                type="email"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                placeholder="Enter member's email"
                required
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Add Member
              </button>
              <button
                type="button"
                onClick={() => setShowAddMemberForm(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {showExpenseForm && (
        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-xl font-semibold mb-4">Add New Expense</h2>
          <form onSubmit={handleAddExpense} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <input
                type="text"
                value={expenseDescription}
                onChange={(e) => setExpenseDescription(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Amount ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Split Type</label>
              <select
                value={splitType}
                onChange={(e) => {
                  setSplitType(e.target.value as "equal" | "custom");
                  if (e.target.value === "custom") {
                    initializeCustomSplits();
                  }
                }}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="equal">Split Equally</option>
                <option value="custom">Custom Split</option>
              </select>
            </div>
            
            {splitType === "custom" && (
              <div>
                <label className="block text-sm font-medium mb-2">Custom Splits</label>
                <div className="space-y-2">
                  {customSplits.map((split, index) => {
                    const member = members.find(m => m._id === split.userId);
                    return (
                      <div key={split.userId} className="flex items-center gap-2">
                        <span className="w-32 text-sm">{member?.email}</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={split.amount}
                          onChange={(e) => {
                            const newSplits = [...customSplits];
                            newSplits[index].amount = e.target.value;
                            setCustomSplits(newSplits);
                          }}
                          className="flex-1 px-3 py-1 border rounded focus:ring-2 focus:ring-blue-500"
                          placeholder="0.00"
                        />
                      </div>
                    );
                  })}
                  <div className="text-sm text-gray-600">
                    Total: ${customSplits.reduce((sum, split) => sum + (parseFloat(split.amount) || 0), 0).toFixed(2)}
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Add Expense
              </button>
              <button
                type="button"
                onClick={() => setShowExpenseForm(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {showPaymentForm && (
        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-xl font-semibold mb-4">Record Payment</h2>
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Pay To</label>
              <select
                value={paymentToUserId}
                onChange={(e) => setPaymentToUserId(e.target.value as Id<"users"> | "")}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select member...</option>
                {members.map((member) => (
                  <option key={member._id} value={member._id}>
                    {member.email}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Amount ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description (optional)</label>
              <input
                type="text"
                value={paymentDescription}
                onChange={(e) => setPaymentDescription(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Record Payment
              </button>
              <button
                type="button"
                onClick={() => setShowPaymentForm(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Members and Balances */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-xl font-semibold mb-4">Members & Balances</h2>
          <div className="space-y-3">
            {balances.map((balance) => (
              <div key={balance.user._id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <div className="font-medium">{balance.user.email}</div>
                  <div className="text-sm text-gray-600">
                    Paid: ${balance.totalPaid.toFixed(2)} | 
                    Received: ${balance.totalReceived.toFixed(2)} | 
                    Owes: ${balance.totalOwed.toFixed(2)}
                  </div>
                </div>
                <div className={`font-semibold ${
                  balance.netBalance > 0 ? 'text-green-600' : 
                  balance.netBalance < 0 ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {balance.netBalance > 0 ? '+' : ''}${balance.netBalance.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Settlement Suggestions */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-xl font-semibold mb-4">Settlement Suggestions</h2>
          <div className="space-y-3">
            {settlementSuggestions && settlementSuggestions.length > 0 ? (
              settlementSuggestions.map((suggestion, index) => (
                <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <div className="font-medium text-yellow-800">
                    {suggestion.from.email} → {suggestion.to.email}
                  </div>
                  <div className="text-yellow-700">
                    ${suggestion.amount.toFixed(2)}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500">All settled up! 🎉</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Expenses */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-xl font-semibold mb-4">Recent Expenses</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {expenses.length === 0 ? (
              <p className="text-gray-500">No expenses yet</p>
            ) : (
              expenses.map((expense) => (
                <div key={expense._id} className="p-3 bg-gray-50 rounded">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{expense.description}</div>
                      <div className="text-sm text-gray-600">
                        Paid by {expense.paidByUser?.email}
                      </div>
                      <div className="text-sm text-gray-500">
                        Split: {expense.splitType === "equal" ? "Equally" : "Custom"}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(expense.date).toLocaleDateString()}
                      </div>
                      {expense.splits && expense.splits.length > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          {expense.splits.map(split => 
                            `${split.user?.email}: $${split.amount.toFixed(2)}`
                          ).join(", ")}
                        </div>
                      )}
                    </div>
                    <div className="font-semibold text-blue-600">
                      ${expense.amount.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Payments */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-xl font-semibold mb-4">Recent Payments</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {payments.length === 0 ? (
              <p className="text-gray-500">No payments yet</p>
            ) : (
              payments.map((payment) => (
                <div key={payment._id} className="p-3 bg-gray-50 rounded">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">
                        {payment.fromUser?.email} → {payment.toUser?.email}
                      </div>
                      {payment.description && (
                        <div className="text-sm text-gray-600">{payment.description}</div>
                      )}
                      <div className="text-sm text-gray-500">
                        {new Date(payment.date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="font-semibold text-green-600">
                      ${payment.amount.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
