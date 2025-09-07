"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { filtersNuqsParsers } from "@/utils/nuqs/nuqs-parser";
import { XIcon } from "lucide-react";
import { useQueryState } from "nuqs";
import { TagSupabase } from "@/types/supabase-compute";

type TagsFiltersListingProps = {
  tags: TagSupabase[];
};

export function TagsFiltersListing({ tags }: TagsFiltersListingProps) {
  const [tagsFilters, setTags] = useQueryState("tags", filtersNuqsParsers.tags);

  const onTagToggle = (tagId: string) => {
    setTags((prev) =>
      prev?.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...(prev ?? []), tagId]
    );
  };

  // Group tags by master tags
  const groupedTags = React.useMemo(() => {
    if (!tags || tags.length === 0) return { masterTags: [], subTags: {} };

    const masterTags: any[] = [];
    const subTags: { [key: string]: any[] } = {};

    // Check if master_tag_id field exists in the data
    const hasMasterTagId = tags.length > 0 && "master_tag_id" in tags[0];

    if (hasMasterTagId) {
      // Use database relationships
      tags.forEach((tag: any) => {
        if (!tag.master_tag_id) {
          // This is a master tag
          masterTags.push(tag);
          subTags[tag.id] = [];
        }
      });

      tags.forEach((tag: any) => {
        if (tag.master_tag_id && subTags[tag.master_tag_id]) {
          // This is a sub tag
          subTags[tag.master_tag_id].push(tag);
        }
      });
    } else {
      // Fallback: Create a simple "All Tags" category for now
      const allTagsCategory = {
        id: "all",
        title: "All Tags",
        created_at: new Date().toISOString(),
      };
      masterTags.push(allTagsCategory);
      subTags["all"] = tags;
    }

    return { masterTags, subTags };
  }, [tags]);

  console.log("TAGS", { tagsFilters, tags, groupedTags });

  return (
    <div className="sticky top-8">
      <div className="space-y-6">
        <h2 className="text-lg font-semibold">Filter by Tags</h2>

        {groupedTags.masterTags.map((masterTag: any) => (
          <div key={masterTag.id} className="space-y-3">
            {/* Master Tag Header */}
            <h3 className="text-sm font-medium text-muted-foreground border-b pb-1">
              {masterTag.title}
            </h3>

            {/* Sub Tags */}
            <div className="flex flex-wrap gap-2">
              {groupedTags.subTags[masterTag.id]?.map((tag: any) => (
                <label
                  key={tag.id}
                  className="flex items-center space-x-2 cursor-pointer"
                >
                  <Checkbox
                    checked={tagsFilters?.includes(tag.id)}
                    onChange={() => onTagToggle(tag.id)}
                  />
                  <Badge
                    variant={
                      tagsFilters?.includes(tag.id) ? "default" : "secondary"
                    }
                    className="cursor-pointer"
                  >
                    {tag.title}
                  </Badge>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Button
        onClick={() => setTags([])}
        variant="outline"
        size="sm"
        className="mt-4 w-full"
      >
        <XIcon className="w-4 h-4 mr-2" />
        Clear Filters
      </Button>
    </div>
  );
}
