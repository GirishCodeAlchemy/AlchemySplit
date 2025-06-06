import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface GroupListProps {
  onSelectGroup: (groupId: Id<"groups">) => void;
}

export function GroupList({ onSelectGroup }: GroupListProps) {
  const userGroups = useQuery(api.groups.getUserGroups);
  const allGroups = useQuery(api.groups.getAllGroups);
  const createGroup = useMutation(api.groups.createGroup);
  const joinGroup = useMutation(api.groups.joinGroup);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [selectedGroupToJoin, setSelectedGroupToJoin] = useState<Id<"groups"> | "">("");

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    try {
      await createGroup({
        name: newGroupName,
        description: newGroupDescription || undefined,
      });
      setNewGroupName("");
      setNewGroupDescription("");
      setShowCreateForm(false);
      toast.success("Group created successfully!");
    } catch (error) {
      toast.error("Failed to create group");
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroupToJoin) return;

    try {
      await joinGroup({ groupId: selectedGroupToJoin as Id<"groups"> });
      setSelectedGroupToJoin("");
      setShowJoinForm(false);
      toast.success("Joined group successfully!");
    } catch (error) {
      toast.error("Failed to join group");
    }
  };

  const availableGroups = allGroups?.filter(group =>
    !userGroups?.some(userGroup => userGroup?._id === group._id)
  ) || [];

  if (userGroups === undefined || allGroups === undefined) {
    return (
      <div className="flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Your Groups</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Create Group
          </button>
          <button
            onClick={() => setShowJoinForm(true)}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Join Group
          </button>
        </div>
      </div>

      {showCreateForm && (
        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-xl font-semibold mb-4">Create New Group</h2>
          <form onSubmit={handleCreateGroup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Group Name</label>
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description (optional)</label>
              <textarea
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {showJoinForm && (
        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-xl font-semibold mb-4">Join Existing Group</h2>
          <form onSubmit={handleJoinGroup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Select Group</label>
              <select
                value={selectedGroupToJoin}
                onChange={(e) => setSelectedGroupToJoin(e.target.value as Id<"groups"> | "")}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Choose a group...</option>
                {availableGroups.map((group) => (
                  <option key={group._id} value={group._id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Join
              </button>
              <button
                type="button"
                onClick={() => setShowJoinForm(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {userGroups.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            No groups yet. Create or join a group to get started!
          </div>
        ) : (
          userGroups.map((group) => (
            group && (
              <div
                key={group._id}
                onClick={() => onSelectGroup(group._id)}
                className="bg-white p-6 rounded-lg shadow border hover:shadow-md cursor-pointer transition-shadow"
              >
                <h3 className="text-xl font-semibold mb-2">{group.name}</h3>
                {group.description && (
                  <p className="text-gray-600 mb-4">{group.description}</p>
                )}
                <div className="text-sm text-gray-500">
                  Created {new Date(group._creationTime).toLocaleDateString()}
                </div>
              </div>
            )
          ))
        )}
      </div>
    </div>
  );
}
