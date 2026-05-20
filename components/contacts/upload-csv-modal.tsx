"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

export function UploadCSVModal({ onUpload }: { onUpload: (file: File) => void }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    multiple: false,
  });

  const handleUpload = () => {
    if (file) {
      onUpload(file);
      setFile(null);
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-zinc-200 text-black hover:bg-zinc-50">
          <Upload className="mr-2 h-4 w-4" />
          Upload CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="border-zinc-200 bg-white">
        <DialogHeader>
          <DialogTitle className="text-black">Upload Contacts CSV</DialogTitle>
          <DialogDescription className="text-zinc-500">
            Upload a CSV file with name and phone_number columns.
          </DialogDescription>
        </DialogHeader>
        <div
          {...getRootProps()}
          className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
            isDragActive ? "border-black bg-zinc-50" : "border-zinc-200"
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto h-8 w-8 text-zinc-400" />
          <p className="mt-2 text-sm text-zinc-600">
            {isDragActive ? "Drop the file here" : "Drag & drop a CSV file, or click to browse"}
          </p>
          <p className="mt-1 text-xs text-zinc-400">Requires name and phone_number columns</p>
        </div>
        {file && (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-sm font-medium text-black">{file.name}</p>
            <p className="text-xs text-zinc-500">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="border-zinc-200 text-black hover:bg-zinc-50"
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!file}
            className="bg-black text-white hover:bg-zinc-800 disabled:bg-zinc-200"
          >
            Upload
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
