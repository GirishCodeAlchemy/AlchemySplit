import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { useState } from "react";
import { Toaster } from "sonner";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { GroupDetails } from "./components/GroupDetails";
import { GroupList } from "./components/GroupList";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";

export default function App() {
  const [selectedGroupId, setSelectedGroupId] = useState<Id<"groups"> | null>(null);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex justify-between items-center border-b shadow-sm px-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-primary">Shared Expenses</h2>
          {selectedGroupId && (
            <button
              onClick={() => setSelectedGroupId(null)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              ← Back to Groups
            </button>
          )}
        </div>
        <SignOutButton />
      </header>
      <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          <Content
            selectedGroupId={selectedGroupId}
            setSelectedGroupId={setSelectedGroupId}
          />
        </div>
      </main>
      <Toaster />
    </div>
  );
}

function Content({
  selectedGroupId,
  setSelectedGroupId
}: {
  selectedGroupId: Id<"groups"> | null;
  setSelectedGroupId: (id: Id<"groups"> | null) => void;
}) {
  const loggedInUser = useQuery(api.auth.loggedInUser);

  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <Authenticated>
        {selectedGroupId ? (
          <GroupDetails groupId={selectedGroupId} />
        ) : (
          <GroupList onSelectGroup={setSelectedGroupId} />
        )}
      </Authenticated>

      <Unauthenticated>
        <div className="text-center">
          <h1 className="text-5xl font-bold text-primary mb-4">Shared Expenses</h1>
          <p className="text-xl text-secondary mb-8">Track group expenses and settle up easily</p>
          <SignInForm />
        </div>
      </Unauthenticated>
    </div>
  );
}
