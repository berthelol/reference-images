"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@/utils/orpc";

type UnvalidatedTag = {
  id: string;
  title: string | null;
  created_at: string;
  master_tag_id: string | null;
  master_title: string | null;
};

export default function AdminTagsPage() {
  const queryClient = useQueryClient();

  const { data: unvalidatedTags, isLoading, error } = useQuery({
    queryKey: ['unvalidated-tags'],
    queryFn: () => client.tags.getUnvalidated(),
  });

  const validateTagMutation = useMutation({
    mutationFn: (tagId: string) => client.tags.validate({ tagId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unvalidated-tags'] });
    },
  });

  const deleteTagMutation = useMutation({
    mutationFn: (tagId: string) => client.tags.delete({ tagId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unvalidated-tags'] });
    },
  });

  const handleValidateTag = async (tagId: string) => {
    try {
      await validateTagMutation.mutateAsync(tagId);
    } catch (error) {
      console.error("Failed to validate tag:", error);
      alert("Failed to validate tag. Please try again.");
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    if (!confirm("Are you sure you want to delete this tag? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteTagMutation.mutateAsync(tagId);
    } catch (error) {
      console.error("Failed to delete tag:", error);
      alert("Failed to delete tag. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <h1 className="text-3xl font-bold mb-8">Admin - Tag Validation</h1>
        <div className="text-center py-8">Loading unvalidated tags...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <h1 className="text-3xl font-bold mb-8">Admin - Tag Validation</h1>
        <div className="text-center py-8 text-red-600">
          Error loading tags: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-8">Admin - Tag Validation</h1>

      <div className="mb-4">
        <p className="text-gray-600">
          {unvalidatedTags?.length || 0} unvalidated tags found
        </p>
      </div>

      {!unvalidatedTags || unvalidatedTags.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <p className="text-green-800 font-semibold">All tags are validated!</p>
          <p className="text-green-600 text-sm mt-2">
            No unvalidated tags found in the system.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {unvalidatedTags.map((tag: UnvalidatedTag) => (
            <div
              key={tag.id}
              className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-4">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {tag.title || "Untitled Tag"}
                      </h3>
                      <p className="text-sm text-gray-500">
                        ID: {tag.id}
                      </p>
                      <p className="text-sm text-gray-500">
                        Created: {new Date(tag.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    {tag.master_tag_id && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-700 font-medium">
                          Master Tag:
                        </p>
                        <p className="text-sm text-blue-600">
                          {tag.master_title || "Untitled Master Tag"}
                        </p>
                        <p className="text-xs text-blue-500">
                          ID: {tag.master_tag_id}
                        </p>
                      </div>
                    )}

                    {!tag.master_tag_id && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <p className="text-sm text-gray-600">
                          No master tag
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleValidateTag(tag.id)}
                    disabled={validateTagMutation.isPending}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {validateTagMutation.isPending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Validating...</span>
                      </>
                    ) : (
                      <>
                        <span>✓</span>
                        <span>Validate</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleDeleteTag(tag.id)}
                    disabled={deleteTagMutation.isPending}
                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {deleteTagMutation.isPending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <>
                        <span>×</span>
                        <span>Delete</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}