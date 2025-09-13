"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { filtersNuqsParsers } from "@/utils/nuqs/nuqs-parser";
import { XIcon, Search } from "lucide-react";
import { useQueryState } from "nuqs";
import { TagSupabase } from "@/types/supabase-compute";
import { STANDARD_ASPECT_RATIOS } from "@/utils/data/aspect-ratios";

type TagsFiltersListingProps = {
  tags: TagSupabase[];
};

export function TagsFiltersListing({ tags }: TagsFiltersListingProps) {
  const [tagsFilters, setTags] = useQueryState("tags", filtersNuqsParsers.tags);
  const [aspectRatiosFilters, setAspectRatios] = useQueryState("aspectRatios", filtersNuqsParsers.aspectRatios);
  const [searchQuery, setSearchQuery] = React.useState("");

  const onTagToggle = (tagId: string) => {
    setTags((prev) =>
      prev?.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...(prev ?? []), tagId]
    );
  };

  const onAspectRatioToggle = (aspectRatio: string) => {
    setAspectRatios((prev) =>
      prev?.includes(aspectRatio)
        ? prev.filter((ratio) => ratio !== aspectRatio)
        : [...(prev ?? []), aspectRatio]
    );
  };

  // Group tags by master tags and apply search filter
  const groupedTags = React.useMemo(() => {
    if (!tags || tags.length === 0) return { masterTags: [], subTags: {} };

    // Filter tags by search query first
    const filteredTags = searchQuery
      ? tags.filter((tag) =>
          tag.title?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : tags;

    const masterTags: any[] = [];
    const subTags: { [key: string]: any[] } = {};

    // Check if master_tag_id field exists in the data
    const hasMasterTagId = tags.length > 0 && "master_tag_id" in tags[0];

    if (hasMasterTagId) {
      // Use database relationships
      const masterTagIds = new Set();

      // First pass: identify master tags that have matching sub-tags or match themselves
      filteredTags.forEach((tag: any) => {
        if (!tag.master_tag_id) {
          // This is a master tag that matches search
          masterTags.push(tag);
          subTags[tag.id] = [];
          masterTagIds.add(tag.id);
        } else if (tag.master_tag_id) {
          // This is a sub tag that matches search, include its master
          masterTagIds.add(tag.master_tag_id);
        }
      });

      // Add master tags that weren't directly matched but have matching sub-tags
      tags.forEach((tag: any) => {
        if (!tag.master_tag_id && masterTagIds.has(tag.id) && !masterTags.find(m => m.id === tag.id)) {
          masterTags.push(tag);
          subTags[tag.id] = [];
        }
      });

      // Second pass: populate sub-tags
      filteredTags.forEach((tag: any) => {
        if (tag.master_tag_id && subTags[tag.master_tag_id] !== undefined) {
          subTags[tag.master_tag_id].push(tag);
        }
      });

      // Filter out master tags that have no sub-tags and don't match search themselves
      const filteredMasterTags = masterTags.filter(masterTag => 
        subTags[masterTag.id].length > 0 || 
        !searchQuery || 
        masterTag.title?.toLowerCase().includes(searchQuery.toLowerCase())
      );

      return { masterTags: filteredMasterTags, subTags };
    } else {
      // Fallback: Create a simple "All Tags" category for now
      const allTagsCategory = {
        id: "all",
        title: "All Tags",
        created_at: new Date().toISOString(),
      };
      masterTags.push(allTagsCategory);
      subTags["all"] = filteredTags;

      return { masterTags, subTags };
    }
  }, [tags, searchQuery]);

  return (
    <div className="sticky top-8">
      <div className="space-y-6">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Filter by Tags</h2>
          
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search tags..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
            {searchQuery && (
              <Button
                variant="secondary"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setSearchQuery("")}
              >
                <XIcon className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Search Results Info */}
        {searchQuery && (
          <div className="text-xs text-muted-foreground">
            {groupedTags.masterTags.reduce((total, masterTag) =>
              total + (groupedTags.subTags[masterTag.id]?.length || 0), 0
            )} tags found
          </div>
        )}

        {/* Aspect Ratio Filters */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium border-b pb-1">
            Aspect Ratios
          </h3>
          <div className="flex flex-wrap gap-2">
            {STANDARD_ASPECT_RATIOS.map((ratio) => (
              <label
                key={ratio.name}
                className="flex items-center space-x-2 cursor-pointer"
              >
                <Checkbox
                  checked={aspectRatiosFilters?.includes(ratio.name)}
                  onChange={() => onAspectRatioToggle(ratio.name)}
                />
                <Badge
                  variant={
                    aspectRatiosFilters?.includes(ratio.name) ? "default" : "secondary"
                  }
                  className="cursor-pointer"
                >
                  {ratio.name}
                </Badge>
              </label>
            ))}
          </div>
        </div>

        {groupedTags.masterTags.map((masterTag: any) => (
          <div key={masterTag.id} className="space-y-3">
            {/* Master Tag Header */}
            <h3 className="text-sm font-medium border-b pb-1">
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
                    {`${tag.title} (${tag.time_used|| 0})`}
                  </Badge>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {(tagsFilters?.length || aspectRatiosFilters?.length || searchQuery) && (
        <Button
          onClick={() => {
            setTags([]);
            setAspectRatios([]);
            setSearchQuery("");
          }}
          variant="outline"
          size="sm"
          className="mt-4 w-full"
        >
          <XIcon className="w-4 h-4 mr-2" />
          Clear All
        </Button>
      )}
    </div>
  );
}
