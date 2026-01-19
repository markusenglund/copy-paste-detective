import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { uploadPdf } from "../api/client";

interface PdfDropzoneProps {
  articleId: number;
  onUploadSuccess: () => void;
}

export function PdfDropzone({
  articleId,
  onUploadSuccess,
}: PdfDropzoneProps): React.ReactElement {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setUploading(true);
      setError(null);

      try {
        await uploadPdf(articleId, file);
        onUploadSuccess();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [articleId, onUploadSuccess],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    multiple: false,
    disabled: uploading,
  });

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-md p-2 text-center cursor-pointer text-xs
        transition-colors duration-200 h-12 flex items-center justify-center
        ${isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"}
        ${uploading ? "opacity-50 cursor-not-allowed" : ""}
        ${error ? "border-red-500" : ""}
      `}
    >
      <input {...getInputProps()} />
      {error ? (
        <span className="text-red-500">{error}</span>
      ) : (
        <span className={isDragActive || uploading ? "text-blue-500" : "text-gray-500"}>
          Drop PDF
        </span>
      )}
    </div>
  );
}
