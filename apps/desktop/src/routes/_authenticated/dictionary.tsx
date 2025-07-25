import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowDownAZ,
  Calendar,
  CalendarDays,
  Loader2,
  MoreVertical,
  Plus,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@acme/ui/components/ui/alert-dialog";
import { Button } from "@acme/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@acme/ui/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@acme/ui/components/ui/dropdown-menu";
import { Input } from "@acme/ui/components/ui/input";
import { Label } from "@acme/ui/components/ui/label";

import { useAddDictionary } from "~/features/dictionary/use-add-dictionary";
import { useDeleteDictionary } from "~/features/dictionary/use-delete-dictionary";
import { useGetDictionary } from "~/features/dictionary/use-get-dictionary";
import { useUpdateDictionary } from "~/features/dictionary/use-update-dictionary";

export const Route = createFileRoute("/_authenticated/dictionary")({
  component: DictionaryPage,
});

function DictionaryPage() {
  const {
    entries,
    count,
    maxEntries,
    isLoading,
    searchTerm,
    setSearchTerm,
    clearSearch,
    sortBy,
    setSortBy,
  } = useGetDictionary();

  const { addWord, isAdding } = useAddDictionary();
  const { updateWord, isUpdating } = useUpdateDictionary();
  const { deleteWord, isDeleting } = useDeleteDictionary();

  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newWord, setNewWord] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  const [editingEntry, setEditingEntry] = useState<{
    id: number;
    word: string;
  } | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deletingEntry, setDeletingEntry] = useState<{
    id: number;
    word: string;
  } | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleAddWord = async () => {
    if (!newWord.trim()) return;

    setAddError(null);

    try {
      await addWord({ word: newWord });
      toast.success("Word added to dictionary");
      setIsAddDialogOpen(false);
      setNewWord("");
      setAddError(null);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to add word";
      setAddError(errorMessage);
    }
  };

  const handleUpdateWord = async () => {
    if (!editingEntry?.word.trim()) return;

    setEditError(null);

    try {
      await updateWord({
        id: editingEntry.id,
        word: editingEntry.word,
      });
      toast.success("Word updated");
      setIsEditDialogOpen(false);
      setEditingEntry(null);
      setEditError(null);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update word";
      setEditError(errorMessage);
    }
  };

  const handleDeleteWord = async () => {
    if (!deletingEntry) return;

    try {
      await deleteWord({ id: deletingEntry.id });
      toast.success("Word deleted");
      setIsDeleteDialogOpen(false);
      setDeletingEntry(null);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete word";
      toast.error(errorMessage);
    }
  };

  const getSortIcon = () => {
    switch (sortBy) {
      case "alphabetical":
        return <ArrowDownAZ className="h-4 w-4" />;
      case "newest":
        return <CalendarDays className="h-4 w-4" />;
      case "oldest":
        return <Calendar className="h-4 w-4" />;
    }
  };

  const getSortLabel = () => {
    switch (sortBy) {
      case "alphabetical":
        return "A-Z";
      case "newest":
        return "Newest";
      case "oldest":
        return "Oldest";
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex h-10 items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Dictionary</h1>
        <div className="flex items-center gap-2">
          {/* Search */}
          {isSearchExpanded ? (
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  placeholder="Search words..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="ring-border/50 focus-visible:ring-ring w-64 border-transparent pr-8 pl-10 ring-1 focus-visible:border-transparent"
                  autoFocus
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSearch}
                    className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => {
                  setIsSearchExpanded(false);
                  clearSearch();
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setIsSearchExpanded(true)}
            >
              <Search className="h-4 w-4" />
            </Button>
          )}

          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1">
                {getSortIcon()}
                <span className="text-xs">{getSortLabel()}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSortBy("alphabetical")}>
                <ArrowDownAZ className="mr-2 h-4 w-4" />
                Alphabetical
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("newest")}>
                <CalendarDays className="mr-2 h-4 w-4" />
                Newest first
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("oldest")}>
                <Calendar className="mr-2 h-4 w-4" />
                Oldest first
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Add button */}
          <Button
            size="sm"
            onClick={() => {
              setIsAddDialogOpen(true);
              setAddError(null); // Clear any previous errors
            }}
            disabled={count >= maxEntries}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add word
          </Button>
        </div>
      </div>

      {/* Usage indicator */}
      <div className="text-muted-foreground text-sm">
        {count} of {maxEntries} words used
      </div>

      {/* Dictionary entries */}
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <p className="text-muted-foreground">
            {searchTerm
              ? "No words found matching your search"
              : "No words in your dictionary yet"}
          </p>
          {!searchTerm && (
            <p className="text-muted-foreground text-sm">
              Add commonly misheard words to improve transcription accuracy
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="group hover:bg-muted/50 flex items-center justify-between rounded-lg border p-3 transition-colors"
            >
              <span className="truncate pr-2">{entry.word}</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      setEditingEntry({ id: entry.id, word: entry.word });
                      setIsEditDialogOpen(true);
                      setEditError(null); // Clear any previous errors
                    }}
                  >
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setDeletingEntry({ id: entry.id, word: entry.word });
                      setIsDeleteDialogOpen(true);
                    }}
                    className="text-red-600 focus:text-red-600"
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      {/* Add dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to vocabulary</DialogTitle>
            <DialogDescription>
              Add a word that is commonly misheard in your transcriptions
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="new-word">Word</Label>
              <Input
                id="new-word"
                placeholder="Add a new word"
                value={newWord}
                onChange={(e) => {
                  setNewWord(e.target.value);
                  if (addError) setAddError(null); // Clear error when user types
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isAdding) {
                    handleAddWord();
                  }
                }}
                maxLength={60}
              />
              {addError && (
                <p className="mt-2 text-sm text-red-500">{addError}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                setNewWord("");
                setAddError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddWord}
              disabled={isAdding || !newWord.trim()}
            >
              {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add word
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit word</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-word">Word</Label>
              <Input
                id="edit-word"
                value={editingEntry?.word ?? ""}
                onChange={(e) => {
                  setEditingEntry(
                    editingEntry
                      ? { ...editingEntry, word: e.target.value }
                      : null,
                  );
                  if (editError) setEditError(null); // Clear error when user types
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isUpdating) {
                    handleUpdateWord();
                  }
                }}
                maxLength={60}
              />
              {editError && (
                <p className="mt-2 text-sm text-red-500">{editError}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setEditingEntry(null);
                setEditError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateWord}
              disabled={isUpdating || !editingEntry?.word.trim()}
            >
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete word?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deletingEntry?.word}" will be deleted permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setDeletingEntry(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteWord}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes, delete it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
