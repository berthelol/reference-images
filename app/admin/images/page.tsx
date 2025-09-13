"use client";

import { useState } from "react";
import { client } from "@/utils/orpc";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";


export default function AdminPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [processResults, setProcessResults] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const selectedFiles = Array.from(e.target.files);
    
    // Filter out SVG and GIF files
    const validFiles = selectedFiles.filter((file) => {
      const fileType = file.type.toLowerCase();
      const fileName = file.name.toLowerCase();
      return !fileType.includes("svg") && 
             !fileType.includes("gif") && 
             !fileName.endsWith(".svg") && 
             !fileName.endsWith(".gif");
    });

    if (validFiles.length !== selectedFiles.length) {
      toast.warning(`${selectedFiles.length - validFiles.length} SVG/GIF files were filtered out`);
    }

    setFiles(validFiles);
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setUploadResults([]);

    try {
      const uploadPromises = files.map(async (file) => {
        // Generate unique filename with timestamp and original name
        const timestamp = Date.now();
        const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_"); // Sanitize filename
        const tempFileName = `temp/${timestamp}_${originalName}`;

        const supabase = createClient();
        // Upload to Supabase storage using client
        const { error } = await supabase.storage
          .from("medias")
          .upload(tempFileName, file, {
            contentType: file.type,
            upsert: false, // Don't overwrite existing files
          });

        if (error) {
          console.error("Upload error:", error);
          throw new Error(`Failed to upload ${file.name}: ${error.message}`);
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from("medias")
          .getPublicUrl(tempFileName);

        return publicUrl;
      });

      const urls = await Promise.all(uploadPromises);
      setUploadResults(urls);

      // Show success toast
      toast.success(`Successfully uploaded ${urls.length} images`);

      // Automatically trigger processing after upload
      await handleProcessImages(urls);

    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleProcessImages = async (imageUrls: string[]) => {
    setProcessing(true);
    setProcessResults(null);
    
    try {
      const result = await client.admin.processImages({ 
        imageUrls,
        model: "openai" 
      });
      setProcessResults(result);
    } catch (error) {
      console.error("Processing failed:", error);
      alert("Image processing failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Admin - Image Upload & Processing</h1>
      
      <div className="space-y-8">
        {/* File Selection */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
          <div className="text-center">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              id="file-input"
            />
            <label
              htmlFor="file-input"
              className="cursor-pointer inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Select Images
            </label>
            <p className="text-sm text-gray-500 mt-2">
              SVG and GIF files will be automatically filtered out
            </p>
          </div>
          
          {files.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Selected Files ({files.length}):</h3>
              <ul className="text-sm space-y-1 max-h-32 overflow-y-auto">
                {files.map((file, index) => (
                  <li key={index} className="text-gray-600">
                    {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Upload Button */}
        {files.length > 0 && (
          <button
            onClick={handleUpload}
            disabled={uploading || processing}
            className="w-full bg-green-600 text-white py-3 px-6 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? "Uploading..." : processing ? "Processing..." : `Upload & Process ${files.length} Images`}
          </button>
        )}

        {/* Upload Results */}
        {uploadResults.length > 0 && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Uploaded URLs:</h3>
            <ul className="text-sm space-y-1 max-h-32 overflow-y-auto">
              {uploadResults.map((url, index) => (
                <li key={index} className="text-blue-600 break-all">
                  {url}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Processing Results */}
        {processResults && (
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Processing Results:</h3>
            <div className="text-sm space-y-2">
              <p>Status: {processResults.success ? "Success" : "Failed"}</p>
              <p>Run ID: {processResults.runId}</p>
              <p>Message: {processResults.message}</p>
              
              <div className="mt-4 p-2 bg-blue-50 rounded">
                <p className="text-blue-800">
                  The image processing task has been triggered and is running in the background. 
                  You can monitor its progress using the Run ID above.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}