'use client';

import { Button } from '@acme/ui/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@acme/ui/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@acme/ui/components/ui/popover';
import { cn } from '@acme/ui/lib/utils';
import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react';
import * as React from 'react';

interface ComboboxItem {
  value: string;
  label: string;
  keywords?: string[]; // Optional keywords for better search
}

interface ComboboxProps {
  items: ComboboxItem[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  disabled?: boolean;
  popoverClassName?: string;
  // Fuse.js options
  fuzzySearch?: boolean;
  threshold?: number; // 0.0 = exact match, 1.0 = match anything
}

export function Combobox({
  items,
  value,
  onValueChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  emptyText = 'No results found.',
  className,
  disabled = false,
  popoverClassName,
  fuzzySearch = true,
  threshold = 0.2, // Lower threshold for more lenient matching
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [internalValue, setInternalValue] = React.useState('');
  const [search, setSearch] = React.useState('');

  const currentValue = value ?? internalValue;
  const handleValueChange = (newValue: string) => {
    const finalValue = newValue === currentValue ? '' : newValue;
    if (onValueChange) {
      onValueChange(finalValue);
    } else {
      setInternalValue(finalValue);
    }
    setOpen(false);
    setSearch(''); // Clear search on selection
  };

  const selectedItem = items.find((item) => item.value === currentValue);

  // Filter items based on search
  const filteredItems = React.useMemo(() => {
    if (!(search && fuzzySearch)) {
      // If no search or fuzzy search disabled, use simple filter
      if (!search) return items;

      const searchLower = search.toLowerCase();
      return items.filter(
        (item) =>
          item.label.toLowerCase().includes(searchLower) ||
          item.value.toLowerCase().includes(searchLower) ||
          item.keywords?.some((k) => k.toLowerCase().includes(searchLower))
      );
    }

    // For fuzzy search, we'll prepare the data for Fuse.js-like scoring
    const searchLower = search.toLowerCase();
    const scored = items.map((item) => {
      // Search in label
      const labelScore = fuzzyMatch(searchLower, item.label.toLowerCase());

      // Search in value
      const valueScore = fuzzyMatch(searchLower, item.value.toLowerCase());

      // Search in keywords - check each keyword and take the best score
      const keywordScores = item.keywords?.map((k) =>
        fuzzyMatch(searchLower, k.toLowerCase())
      ) ?? [0];
      const keywordScore = Math.max(0, ...keywordScores);

      // Also check if it's a substring match (bonus points)
      const hasSubstring =
        item.label.toLowerCase().includes(searchLower) ||
        item.value.toLowerCase().includes(searchLower) ||
        item.keywords?.some((k) => k.toLowerCase().includes(searchLower));

      const bestScore = Math.max(labelScore, valueScore, keywordScore);
      // Give a boost if it's an exact substring match
      const finalScore = hasSubstring ? Math.max(bestScore, 0.8) : bestScore;

      return { item, score: finalScore };
    });

    // Filter by threshold and sort by score
    return scored
      .filter(({ score }) => score >= 1 - threshold)
      .sort((a, b) => b.score - a.score)
      .map(({ item }) => item);
  }, [items, search, fuzzySearch, threshold]);

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          aria-expanded={open}
          className={cn('justify-between', className)}
          disabled={disabled}
          role="combobox"
          variant="outline"
        >
          {selectedItem ? selectedItem.label : placeholder}
          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn('p-0', popoverClassName)}
        side="bottom"
      >
        <Command shouldFilter={false}>
          <CommandInput
            onValueChange={setSearch}
            placeholder={searchPlaceholder}
            value={search}
          />
          <CommandList>
            {filteredItems.length === 0 ? (
              <CommandEmpty>{emptyText}</CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredItems.map((item) => (
                  <CommandItem
                    key={item.value}
                    onSelect={handleValueChange}
                    value={item.value}
                  >
                    <CheckIcon
                      className={cn(
                        'mr-2 h-4 w-4',
                        currentValue === item.value
                          ? 'opacity-100'
                          : 'opacity-0'
                      )}
                    />
                    {item.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Simple fuzzy matching algorithm
function fuzzyMatch(pattern: string, text: string): number {
  if (!pattern) return 1;
  if (!text) return 0;

  let patternIdx = 0;
  let textIdx = 0;
  let score = 0;
  let consecutive = 0;
  let prevMatched = false;
  let firstMatchIdx = -1;

  while (textIdx < text.length && patternIdx < pattern.length) {
    if (pattern[patternIdx] === text[textIdx]) {
      if (firstMatchIdx === -1) firstMatchIdx = textIdx;
      score += 1 + consecutive;
      consecutive = prevMatched ? consecutive + 1 : 1;
      prevMatched = true;
      patternIdx++;
    } else {
      consecutive = 0;
      prevMatched = false;
    }
    textIdx++;
  }

  // Check if all pattern characters were matched
  if (patternIdx !== pattern.length) {
    return 0;
  }

  // Better scoring algorithm
  // 1. Base score for matching all characters
  let finalScore = 0.5;

  // 2. Bonus for consecutive matches
  finalScore += (score / pattern.length) * 0.2;

  // 3. Bonus for early matches (closer to start)
  if (firstMatchIdx !== -1) {
    finalScore += (1 - firstMatchIdx / text.length) * 0.2;
  }

  // 4. Bonus for shorter texts (more exact matches)
  finalScore += (pattern.length / text.length) * 0.1;

  return Math.min(finalScore, 1);
}

// Example usage:
export function ExampleCombobox() {
  const [value, setValue] = React.useState('');

  const frameworks = [
    { value: 'next.js', label: 'Next.js' },
    { value: 'sveltekit', label: 'SvelteKit' },
    { value: 'nuxt.js', label: 'Nuxt.js' },
    { value: 'remix', label: 'Remix' },
    { value: 'astro', label: 'Astro' },
  ];

  return (
    <Combobox
      className="w-[200px]"
      emptyText="No framework found."
      items={frameworks}
      onValueChange={setValue}
      placeholder="Select framework..."
      searchPlaceholder="Search framework..."
      value={value}
    />
  );
}
