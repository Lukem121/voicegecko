import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@acme/ui/components/ui/alert-dialog';
import { Button } from '@acme/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@acme/ui/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@acme/ui/components/ui/dropdown-menu';
import { Input } from '@acme/ui/components/ui/input';
import { Label } from '@acme/ui/components/ui/label';
import { createFileRoute } from '@tanstack/react-router';
import {
  ArrowDownAZ,
  Calendar,
  CalendarDays,
  Loader2,
  MoreVertical,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { useAddDictionary } from '~/features/dictionary/use-add-dictionary';
import { useDeleteDictionary } from '~/features/dictionary/use-delete-dictionary';
import { useGetDictionary } from '~/features/dictionary/use-get-dictionary';
import { useUpdateDictionary } from '~/features/dictionary/use-update-dictionary';

export const Route = createFileRoute('/_authenticated/dictionary')({
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
  const [newWord, setNewWord] = useState('');
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
    if (!newWord.trim()) { return; }

    setAddError(null);

    try {
      await addWord({ word: newWord });
      toast.success('Word added to dictionary');
      setIsAddDialogOpen(false);
      setNewWord('');
      setAddError(null);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to add word';
      setAddError(errorMessage);
    }
  };

  const handleUpdateWord = async () => {
    if (!editingEntry?.word.trim()) { return; }

    setEditError(null);

    try {
      await updateWord({
        id: editingEntry.id,
        word: editingEntry.word,
      });
      toast.success('Word updated');
      setIsEditDialogOpen(false);
      setEditingEntry(null);
      setEditError(null);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to update word';
      setEditError(errorMessage);
    }
  };

  const handleDeleteWord = async () => {
    if (!deletingEntry) { return; }

    try {
      await deleteWord({ id: deletingEntry.id });
      toast.success('Word deleted');
      setIsDeleteDialogOpen(false);
      setDeletingEntry(null);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to delete word';
      toast.error(errorMessage);
    }
  };

  const getSortIcon = () => {
    switch (sortBy) {
      case 'alphabetical':
        return <ArrowDownAZ className="h-4 w-4" />;
      case 'newest':
        return <CalendarDays className="h-4 w-4" />;
      case 'oldest':
        return <Calendar className="h-4 w-4" />;
    }
  };

  const getSortLabel = () => {
    switch (sortBy) {
      case 'alphabetical':
        return 'A-Z';
      case 'newest':
        return 'Newest';
      case 'oldest':
        return 'Oldest';
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex h-10 items-center justify-between">
        <h1 className="font-bold text-2xl tracking-tight">Dictionary</h1>
        <div className="flex items-center gap-2">
          {/* Search */}
          {isSearchExpanded ? (
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
                <Input
                  autoFocus
                  className="w-64 border-transparent pr-8 pl-10 ring-1 ring-border/50 focus-visible:border-transparent focus-visible:ring-ring"
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search words..."
                  value={searchTerm}
                />
                {searchTerm && (
                  <Button
                    className="-translate-y-1/2 absolute top-1/2 right-1 h-7 w-7 p-0"
                    onClick={clearSearch}
                    size="sm"
                    variant="ghost"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <Button
                className="h-8 w-8 p-0"
                onClick={() => {
                  setIsSearchExpanded(false);
                  clearSearch();
                }}
                size="sm"
                variant="ghost"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              className="h-8 w-8 p-0"
              onClick={() => setIsSearchExpanded(true)}
              size="sm"
              variant="ghost"
            >
              <Search className="h-4 w-4" />
            </Button>
          )}

          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gap-1" size="sm" variant="ghost">
                {getSortIcon()}
                <span className="text-xs">{getSortLabel()}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSortBy('alphabetical')}>
                <ArrowDownAZ className="mr-2 h-4 w-4" />
                Alphabetical
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('newest')}>
                <CalendarDays className="mr-2 h-4 w-4" />
                Newest first
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('oldest')}>
                <Calendar className="mr-2 h-4 w-4" />
                Oldest first
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Add button */}
          <Button
            disabled={count >= maxEntries}
            onClick={() => {
              setIsAddDialogOpen(true);
              setAddError(null); // Clear any previous errors
            }}
            size="sm"
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
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <p className="text-muted-foreground">
            {searchTerm
              ? 'No words found matching your search'
              : 'No words in your dictionary yet'}
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
              className="group flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
              key={entry.id}
            >
              <span className="truncate pr-2">{entry.word}</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    className="h-8 w-8 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                    size="sm"
                    variant="ghost"
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
                    className="text-red-600 focus:text-red-600"
                    onClick={() => {
                      setDeletingEntry({ id: entry.id, word: entry.word });
                      setIsDeleteDialogOpen(true);
                    }}
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
      <Dialog onOpenChange={setIsAddDialogOpen} open={isAddDialogOpen}>
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
                maxLength={60}
                onChange={(e) => {
                  setNewWord(e.target.value);
                  if (addError) { setAddError(null); // Clear error when user types
}
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isAdding) {
                    handleAddWord();
                  }
                }}
                placeholder="Add a new word"
                value={newWord}
              />
              {addError && (
                <p className="mt-2 text-red-500 text-sm">{addError}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setIsAddDialogOpen(false);
                setNewWord('');
                setAddError(null);
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={isAdding || !newWord.trim()}
              onClick={handleAddWord}
            >
              {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add word
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog onOpenChange={setIsEditDialogOpen} open={isEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit word</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-word">Word</Label>
              <Input
                id="edit-word"
                maxLength={60}
                onChange={(e) => {
                  setEditingEntry(
                    editingEntry
                      ? { ...editingEntry, word: e.target.value }
                      : null
                  );
                  if (editError) { setEditError(null); // Clear error when user types
}
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isUpdating) {
                    handleUpdateWord();
                  }
                }}
                value={editingEntry?.word ?? ''}
              />
              {editError && (
                <p className="mt-2 text-red-500 text-sm">{editError}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setIsEditDialogOpen(false);
                setEditingEntry(null);
                setEditError(null);
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={isUpdating || !editingEntry?.word.trim()}
              onClick={handleUpdateWord}
            >
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog
        onOpenChange={setIsDeleteDialogOpen}
        open={isDeleteDialogOpen}
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
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
              onClick={handleDeleteWord}
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
