import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface GroupDetailsProps {
  groupId: Id<"groups">;
}

export function GroupDetails({ groupId }: GroupDetailsProps) {
  const groupDetails = useQuery(api.groups.getGroupDetails, { groupId });
  const balances = useQuery(api.balances.getGroupBalances, { groupId });
  const settlementSuggestions = useQuery(api.balances.getSettlementSuggestions, { groupId });
  const addExpense = useMutation(api.expenses.addExpense);
  const updateExpense = useMutation(api.expenses.updateExpense);
  const deleteExpense = useMutation(api.expenses.deleteExpense);
  const recordPayment = useMutation(api.payments.recordPayment);
  const addMemberByEmail = useMutation(api.groups.addMemberByEmail);
  const addMemberByPhone = useMutation(api.groups.addMemberByPhone);
  const addMemberByName = useMutation(api.groups.addMemberByName);
  const addMemberBySearch = useMutation(api.groups.addMemberBySearch);

  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [splitType, setSplitType] = useState<"equal" | "amount" | "percentage">("equal");
  const [customSplits, setCustomSplits] = useState<{ userId: Id<"users">; amount: string; percentage: string }[]>([]);
  const [paymentToUserId, setPaymentToUserId] = useState<Id<"users"> | "">("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDescription, setPaymentDescription] = useState("");

  // Member search states
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [searchType, setSearchType] = useState<"search" | "email" | "phone" | "name">("search");

  // Search users query
  const userSearchResults = useQuery(
    api.groups.searchUsers,
    searchType === "search" && searchTerm.length > 1 ? { searchTerm } : "skip"
  );

  useEffect(() => {
    if (userSearchResults) {
      setSearchResults(userSearchResults);
    }
  }, [userSearchResults]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseDescription.trim() || !expenseAmount) return;

    try {
      const amount = parseFloat(expenseAmount);
      let customSplitsData = undefined;

      if (splitType === "amount") {
        customSplitsData = customSplits
          .filter(split => parseFloat(split.amount) > 0)
          .map(split => ({
            userId: split.userId,
            amount: parseFloat(split.amount),
          }));

        const totalSplits = customSplitsData.reduce((sum, split) => sum + split.amount, 0);
        if (Math.abs(totalSplits - amount) > 0.01) {
          toast.error("Custom splits must sum to the total amount");
          return;
        }
      } else if (splitType === "percentage") {
        customSplitsData = customSplits
          .filter(split => parseFloat(split.percentage) > 0)
          .map(split => ({
            userId: split.userId,
            percentage: parseFloat(split.percentage),
          }));

        const totalPercentage = customSplitsData.reduce((sum, split) => sum + split.percentage, 0);
        if (Math.abs(totalPercentage - 100) > 0.01) {
          toast.error("Percentages must sum to 100%");
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

      resetExpenseForm();
      toast.success("Expense added successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to add expense");
    }
  };

  const handleUpdateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense || !expenseDescription.trim() || !expenseAmount) return;

    try {
      const amount = parseFloat(expenseAmount);
      let customSplitsData = undefined;

      if (splitType === "amount") {
        customSplitsData = customSplits
          .filter(split => parseFloat(split.amount) > 0)
          .map(split => ({
            userId: split.userId,
            amount: parseFloat(split.amount),
          }));

        const totalSplits = customSplitsData.reduce((sum, split) => sum + split.amount, 0);
        if (Math.abs(totalSplits - amount) > 0.01) {
          toast.error("Custom splits must sum to the total amount");
          return;
        }
      } else if (splitType === "percentage") {
        customSplitsData = customSplits
          .filter(split => parseFloat(split.percentage) > 0)
          .map(split => ({
            userId: split.userId,
            percentage: parseFloat(split.percentage),
          }));

        const totalPercentage = customSplitsData.reduce((sum, split) => sum + split.percentage, 0);
        if (Math.abs(totalPercentage - 100) > 0.01) {
          toast.error("Percentages must sum to 100%");
          return;
        }
      }

      await updateExpense({
        expenseId: editingExpense._id,
        description: expenseDescription,
        amount,
        splitType,
        customSplits: customSplitsData,
      });

      resetExpenseForm();
      toast.success("Expense updated successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to update expense");
    }
  };

  const handleDeleteExpense = async (expenseId: Id<"expenses">) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;

    try {
      await deleteExpense({ expenseId });
      toast.success("Expense deleted successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete expense");
    }
  };

  const handleEditExpense = (expense: any) => {
    setEditingExpense(expense);
    setExpenseDescription(expense.description);
    setExpenseAmount(expense.amount.toString());
    setSplitType(expense.splitType || "equal");

    if (expense.splits && expense.splits.length > 0) {
      const splits = expense.splits.map((split: any) => ({
        userId: split.userId,
        amount: split.amount.toString(),
        percentage: (split.percentage || 0).toString(),
      }));
      setCustomSplits(splits);
    } else {
      initializeCustomSplits();
    }

    setShowExpenseForm(true);
  };

  const resetExpenseForm = () => {
    setExpenseDescription("");
    setExpenseAmount("");
    setSplitType("equal");
    setCustomSplits([]);
    setShowExpenseForm(false);
    setEditingExpense(null);
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
    } catch (error: any) {
      toast.error(error.message || "Failed to record payment");
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (searchType === "search" && selectedUser) {
        await addMemberBySearch({
          groupId,
          userId: selectedUser._id,
        });
      } else if (searchType === "email" && searchTerm.trim()) {
        await addMemberByEmail({
          groupId,
          email: searchTerm.trim(),
        });
      } else if (searchType === "phone" && searchTerm.trim()) {
        await addMemberByPhone({
          groupId,
          phone: searchTerm.trim(),
        });
      } else if (searchType === "name" && searchTerm.trim()) {
        await addMemberByName({
          groupId,
          name: searchTerm.trim(),
        });
      } else {
        toast.error("Please select a user or enter valid contact information");
        return;
      }

      resetMemberForm();
      toast.success("Member added successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to add member");
    }
  };

  const resetMemberForm = () => {
    setSearchTerm("");
    setSearchResults([]);
    setSelectedUser(null);
    setShowAddMemberForm(false);
    setSearchType("search");
  };

  const initializeCustomSplits = () => {
    if (!groupDetails) return;
    const splits = groupDetails.members
      .filter(member => member && member._id)
      .map(member => ({
        userId: member._id!,
        amount: "",
        percentage: "",
      }));
    setCustomSplits(splits);
  };

  const updateSplitAmounts = (totalAmount: number) => {
    if (splitType === "percentage") {
      const newSplits = customSplits.map(split => ({
        ...split,
        amount: ((parseFloat(split.percentage) || 0) * totalAmount / 100).toFixed(2),
      }));
      setCustomSplits(newSplits);
    }
  };

  const updateSplitPercentages = (totalAmount: number) => {
    if (splitType === "amount" && totalAmount > 0) {
      const newSplits = customSplits.map(split => ({
        ...split,
        percentage: ((parseFloat(split.amount) || 0) / totalAmount * 100).toFixed(2),
      }));
      setCustomSplits(newSplits);
    }
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
              <label className="block text-sm font-medium mb-2">Search Method</label>
              <div className="flex gap-2 mb-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setSearchType("search");
                    setSearchTerm("");
                    setSelectedUser(null);
                  }}
                  className={`px-3 py-1 text-sm rounded ${
                    searchType === "search"
                      ? "bg-purple-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  Search Users
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSearchType("email");
                    setSearchTerm("");
                    setSelectedUser(null);
                  }}
                  className={`px-3 py-1 text-sm rounded ${
                    searchType === "email"
                      ? "bg-purple-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  By Email
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSearchType("name");
                    setSearchTerm("");
                    setSelectedUser(null);
                  }}
                  className={`px-3 py-1 text-sm rounded ${
                    searchType === "name"
                      ? "bg-purple-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  By Name
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSearchType("phone");
                    setSearchTerm("");
                    setSelectedUser(null);
                  }}
                  className={`px-3 py-1 text-sm rounded ${
                    searchType === "phone"
                      ? "bg-purple-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  By Phone
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                {searchType === "search" && "Search by name, email, or phone"}
                {searchType === "email" && "Email Address"}
                {searchType === "phone" && "Phone Number"}
                {searchType === "name" && "Full Name"}
              </label>
              <input
                type={searchType === "email" ? "email" : "text"}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setSelectedUser(null);
                }}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                placeholder={
                  searchType === "search" ? "Type to search users..." :
                  searchType === "email" ? "Enter email address" :
                  searchType === "name" ? "Enter full name" :
                  "Enter phone number"
                }
                required={searchType !== "search"}
              />
            </div>

            {searchType === "search" && searchResults.length > 0 && (
              <div className="border rounded max-h-48 overflow-y-auto">
                <div className="text-sm font-medium p-2 bg-gray-50 border-b">Search Results:</div>
                {searchResults.map((user) => (
                  <div
                    key={user._id}
                    onClick={() => setSelectedUser(user)}
                    className={`p-3 cursor-pointer hover:bg-gray-50 border-b last:border-b-0 ${
                      selectedUser?._id === user._id ? "bg-purple-50 border-purple-200" : ""
                    }`}
                  >
                    <div className="font-medium">{user.name || "No name"}</div>
                    <div className="text-sm text-gray-600">{user.email}</div>
                    {user.phone && (
                      <div className="text-sm text-gray-600">{user.phone}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {searchType === "search" && selectedUser && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded">
                <div className="text-sm font-medium text-purple-800">Selected User:</div>
                <div className="font-medium">{selectedUser.name || "No name"}</div>
                <div className="text-sm text-gray-600">{selectedUser.email}</div>
                {selectedUser.phone && (
                  <div className="text-sm text-gray-600">{selectedUser.phone}</div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={
                  (searchType === "search" && !selectedUser) ||
                  (searchType !== "search" && !searchTerm.trim())
                }
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Member
              </button>
              <button
                type="button"
                onClick={resetMemberForm}
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
          <h2 className="text-xl font-semibold mb-4">
            {editingExpense ? "Edit Expense" : "Add New Expense"}
          </h2>
          <form onSubmit={editingExpense ? handleUpdateExpense : handleAddExpense} className="space-y-4">
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
                onChange={(e) => {
                  setExpenseAmount(e.target.value);
                  const amount = parseFloat(e.target.value) || 0;
                  updateSplitAmounts(amount);
                }}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Split Type</label>
              <select
                value={splitType}
                onChange={(e) => {
                  setSplitType(e.target.value as "equal" | "amount" | "percentage");
                  if (e.target.value !== "equal") {
                    initializeCustomSplits();
                  }
                }}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="equal">Split Equally Among All Members</option>
                <option value="amount">Split by Amount</option>
                <option value="percentage">Split by Percentage</option>
              </select>
            </div>

            {(splitType === "amount" || splitType === "percentage") && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Custom Splits {splitType === "percentage" ? "(Percentages)" : "(Amounts)"}
                </label>
                <div className="space-y-2">
                  {customSplits.map((split, index) => {
                    const member = members.find(m => m && m._id === split.userId);
                    if (!member) return null;

                    return (
                      <div key={split.userId} className="flex items-center gap-2">
                        <span className="w-32 text-sm">{member.name || member.email}</span>
                        {splitType === "amount" ? (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={split.amount}
                            onChange={(e) => {
                              const newSplits = [...customSplits];
                              newSplits[index].amount = e.target.value;
                              setCustomSplits(newSplits);
                              updateSplitPercentages(parseFloat(expenseAmount) || 0);
                            }}
                            className="flex-1 px-3 py-1 border rounded focus:ring-2 focus:ring-blue-500"
                            placeholder="0.00"
                          />
                        ) : (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={split.percentage}
                            onChange={(e) => {
                              const newSplits = [...customSplits];
                              newSplits[index].percentage = e.target.value;
                              setCustomSplits(newSplits);
                              updateSplitAmounts(parseFloat(expenseAmount) || 0);
                            }}
                            className="flex-1 px-3 py-1 border rounded focus:ring-2 focus:ring-blue-500"
                            placeholder="0.00"
                          />
                        )}
                        {splitType === "percentage" && (
                          <span className="text-sm text-gray-600 w-16">
                            ${((parseFloat(split.percentage) || 0) * (parseFloat(expenseAmount) || 0) / 100).toFixed(2)}
                          </span>
                        )}
                        {splitType === "amount" && (
                          <span className="text-sm text-gray-600 w-16">
                            {((parseFloat(split.amount) || 0) / (parseFloat(expenseAmount) || 1) * 100).toFixed(1)}%
                          </span>
                        )}
                      </div>
                    );
                  })}
                  <div className="text-sm text-gray-600">
                    {splitType === "amount" ? (
                      <>Total: ${customSplits.reduce((sum, split) => sum + (parseFloat(split.amount) || 0), 0).toFixed(2)}</>
                    ) : (
                      <>Total: {customSplits.reduce((sum, split) => sum + (parseFloat(split.percentage) || 0), 0).toFixed(2)}%</>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {editingExpense ? "Update Expense" : "Add Expense"}
              </button>
              <button
                type="button"
                onClick={resetExpenseForm}
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
                {members.filter(member => member && member._id).map((member) => (
                  <option key={member._id} value={member._id}>
                    {member.name || member.email}
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
          <h2 className="text-xl font-semibold mb-4">Members & Balances ({members.length} members)</h2>
          <div className="space-y-3">
            {balances.map((balance) => (
              <div key={balance.user._id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <div className="font-medium">{balance.user.name || balance.user.email}</div>
                  <div className="text-sm text-gray-600">
                    {balance.user.email}
                    {balance.user.phone && ` • ${balance.user.phone}`}
                  </div>
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
                    {suggestion.from.name || suggestion.from.email} → {suggestion.to.name || suggestion.to.email}
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
                    <div className="flex-1">
                      <div className="font-medium">{expense.description}</div>
                      <div className="text-sm text-gray-600">
                        Paid by {expense.paidByUser?.name || expense.paidByUser?.email}
                      </div>
                      <div className="text-sm text-gray-500">
                        Split: {expense.splitType === "equal" ? "Equally" :
                               expense.splitType === "amount" ? "By Amount" :
                               expense.splitType === "percentage" ? "By Percentage" : "Custom"}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(expense.date).toLocaleDateString()}
                      </div>
                      {expense.splits && expense.splits.length > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          {expense.splits.map(split =>
                            `${split.user?.name || split.user?.email}: $${split.amount.toFixed(2)}${split.percentage ? ` (${split.percentage.toFixed(1)}%)` : ''}`
                          ).join(", ")}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="font-semibold text-blue-600">
                        ${expense.amount.toFixed(2)}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEditExpense(expense)}
                          className="px-2 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(expense._id)}
                          className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                        >
                          Delete
                        </button>
                      </div>
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
                        {payment.fromUser?.name || payment.fromUser?.email} → {payment.toUser?.name || payment.toUser?.email}
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
