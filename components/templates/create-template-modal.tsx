"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { WhatsAppPreview } from "./whatsapp-preview";

import { Plus, Sparkles, Wand2, X, ImageIcon, Type, MessageSquare } from "lucide-react";
import { toast } from "sonner";

function extractVariables(body: string): string[] {
  const matches = body.match(/\{\{(\w+)\}\}/g);
  if (!matches) return [];
  return Array.from(new Set(matches.map((m) => m.replace(/[{}]/g, ""))));
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function generateTemplate(prompt: string, imageBase64?: string): Promise<string> {
  // Calls the backend API so API keys stay secure in .env.local
  const res = await fetch("/api/generate-template", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, imageBase64 }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Generation failed");
  return data.result;
}

interface PrefillData {
  name: string;
  body: string;
  imageUrls?: string[];
}

interface CreateTemplateModalProps {
  onCreate: (name: string, body: string, imageUrls?: string[]) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  prefill?: PrefillData | null;
  isEditing?: boolean;
}

export function CreateTemplateModal({
  onCreate,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  prefill,
  isEditing = false,
}: CreateTemplateModalProps) {
  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen! : setInternalOpen;

  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [templateImages, setTemplateImages] = useState<string[]>([]);
  const [aiPrompt, setAiPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [aiImage, setAiImage] = useState<string | null>(null);

  const variables = useMemo(() => extractVariables(body), [body]);

  // Apply prefill when modal opens or prefill changes
  useEffect(() => {
    if (open && prefill) {
      setName(prefill.name);
      setBody(prefill.body);
      setTemplateImages(prefill.imageUrls || []);
      setAiPrompt("");
      setAiImage(null);
    }
  }, [open, prefill]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setName("");
      setBody("");
      setTemplateImages([]);
      setAiPrompt("");
      setAiImage(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !body.trim()) return;
    onCreate(name, body, templateImages.length > 0 ? templateImages : undefined);
    setName("");
    setBody("");
    setTemplateImages([]);
    setAiPrompt("");
    setAiImage(null);
    setOpen(false);
  };

  const handleGenerate = async () => {
    if (!aiPrompt.trim() && !aiImage) {
      toast.error("Please enter a prompt or upload an image first.");
      return;
    }
    setGenerating(true);
    try {
      const generated = await generateTemplate(aiPrompt, aiImage || undefined);
      setBody(generated);
      if (!name) {
        const autoName = generated.split(" ").slice(0, 4).join(" ") + "...";
        setName(autoName);
      }
      toast.success("Template generated! Review and edit before saving.");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate template.");
    } finally {
      setGenerating(false);
    }
  };

  const onDropTemplateImages = useCallback((acceptedFiles: File[]) => {
    const imageFiles = acceptedFiles.filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      toast.error("Please upload image files.");
      return;
    }
    Promise.all(imageFiles.map(fileToBase64)).then((base64s) => {
      setTemplateImages((prev) => [...prev, ...base64s]);
    });
  }, []);

  const onDropAiImage = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.");
      return;
    }
    fileToBase64(file).then((base64) => setAiImage(base64));
  }, []);

  const removeTemplateImage = (index: number) => {
    setTemplateImages((prev) => prev.filter((_, i) => i !== index));
  };

  const {
    getRootProps: getTemplateImageRootProps,
    getInputProps: getTemplateImageInputProps,
    isDragActive: isTemplateImageDragActive,
  } = useDropzone({ onDrop: onDropTemplateImages, accept: { "image/*": [] }, multiple: true });

  const {
    getRootProps: getAiImageRootProps,
    getInputProps: getAiImageInputProps,
    isDragActive: isAiImageDragActive,
  } = useDropzone({ onDrop: onDropAiImage, accept: { "image/*": [] }, multiple: false });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button className="bg-black text-white hover:bg-zinc-800">
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="border-zinc-200 bg-white sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-black">{isEditing ? "Edit Template" : "Create Template"}</DialogTitle>
          <DialogDescription className="text-zinc-500">
            Build a message template with variables, images, and AI assistance.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-5">
            {/* Left: Editor */}
            <div className="lg:col-span-3 space-y-6">

              {/* ── Section 1: Basic Info ── */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Type className="h-4 w-4 text-zinc-500" />
                  <h3 className="text-sm font-semibold text-black">Basic Info</h3>
                </div>
                <div className="space-y-2">
                  <Label className="text-black">Template Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Summer Sale Promo"
                    className="border-zinc-200 text-black focus-visible:ring-black"
                  />
                </div>
              </div>

              <Separator className="bg-zinc-100" />

              {/* ── Section 2: Template Media ── */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-zinc-500" />
                  <h3 className="text-sm font-semibold text-black">Template Media</h3>
                </div>

                {templateImages.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-zinc-500">
                      {templateImages.length} image{templateImages.length > 1 ? "s" : ""} uploaded
                      {templateImages.length >= 4 && " — carousel preview enabled"}
                    </p>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {templateImages.map((img, idx) => (
                        <div key={idx} className="relative shrink-0 h-20 w-20 rounded-lg border border-zinc-200 overflow-hidden">
                          <Image src={img} alt={`Upload ${idx + 1}`} fill className="object-cover" />
                          <button
                            type="button"
                            onClick={() => removeTemplateImage(idx)}
                            className="absolute top-0.5 right-0.5 rounded-full bg-black/60 p-0.5 text-white hover:bg-black"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div
                  {...getTemplateImageRootProps()}
                  className={`cursor-pointer rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
                    isTemplateImageDragActive
                      ? "border-black bg-zinc-100"
                      : "border-zinc-200 hover:border-zinc-400"
                  }`}
                >
                  <input {...getTemplateImageInputProps()} />
                  <ImageIcon className="mx-auto h-5 w-5 text-zinc-400" />
                  <p className="mt-1 text-xs text-zinc-500">
                    {isTemplateImageDragActive
                      ? "Drop images here..."
                      : "Drag & drop images, or click to browse"}
                  </p>
                  <p className="text-[10px] text-zinc-400">Upload 4+ images to enable carousel preview</p>
                </div>
              </div>

              <Separator className="bg-zinc-100" />

              {/* ── Section 3: Message Content ── */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-zinc-500" />
                  <h3 className="text-sm font-semibold text-black">Message Content</h3>
                </div>
                <div className="space-y-2">
                  <Label className="text-black">Message Body</Label>
                  <Textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Hi {{name}}, check out our summer sale! Get {{discount}} off until {{date}}."
                    rows={5}
                    className="border-zinc-200 text-black focus-visible:ring-black resize-none"
                  />
                  <div className="rounded-md bg-zinc-50 px-3 py-2 ring-1 ring-zinc-100">
                    <p className="text-xs text-zinc-500">
                      Use <code className="rounded bg-zinc-200 px-1 py-0.5 text-zinc-700 font-mono text-[10px]">{"{{variable}}"}</code> syntax for dynamic values.
                    </p>
                  </div>
                </div>

                {variables.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-black">Detected Variables</p>
                    <div className="flex flex-wrap gap-1">
                      {variables.map((v) => (
                        <span
                          key={v}
                          className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600"
                        >
                          {"{"}
                          {"{" + v + "}"}
                          {"}"}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Separator className="bg-zinc-100" />

              {/* ── Section 4: AI Assistant ── */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-zinc-500" />
                  <h3 className="text-sm font-semibold text-black">AI Assistant</h3>
                </div>

                {/* AI Image Upload */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-zinc-600">Upload product/clothing image for AI</Label>
                  {aiImage ? (
                    <div className="relative rounded-lg overflow-hidden border border-zinc-200 w-fit">
                      <Image
                        src={aiImage}
                        alt="AI reference"
                        width={200}
                        height={200}
                        className="object-cover max-h-40 w-auto"
                      />
                      <button
                        type="button"
                        onClick={() => setAiImage(null)}
                        className="absolute top-1 right-1 rounded-full bg-black/70 p-1 text-white hover:bg-black"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div
                      {...getAiImageRootProps()}
                      className={`cursor-pointer rounded-lg border-2 border-dashed p-3 text-center transition-colors ${
                        isAiImageDragActive
                          ? "border-black bg-zinc-100"
                          : "border-zinc-200 hover:border-zinc-400"
                      }`}
                    >
                      <input {...getAiImageInputProps()} />
                      <ImageIcon className="mx-auto h-4 w-4 text-zinc-400" />
                      <p className="mt-1 text-xs text-zinc-500">
                        {isAiImageDragActive
                          ? "Drop the image here..."
                          : "Drag & drop or click to upload"}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-zinc-600">Describe what you want</Label>
                  <Textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="e.g. 'A friendly promotional message for this summer collection'"
                    rows={3}
                    className="border-zinc-200 bg-white text-black focus-visible:ring-black resize-none text-sm"
                  />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGenerate}
                  disabled={generating}
                  className="w-full gap-2 border-zinc-200 text-black hover:bg-zinc-100"
                >
                  <Wand2 className="h-4 w-4" />
                  {generating ? "Generating..." : aiImage ? "Generate from Image" : "Generate Template"}
                </Button>

              </div>

            </div>

            {/* Right: Preview */}
            <div className="lg:col-span-2 flex flex-col">
              <Label className="text-black mb-2">Preview</Label>
              <div className="flex-1 rounded-xl bg-zinc-50 p-4 ring-1 ring-zinc-100 flex items-center justify-center min-h-[300px]">
                <WhatsAppPreview body={body} imageUrls={templateImages} />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="border-zinc-200 text-black hover:bg-zinc-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || !body.trim()}
              className="bg-black text-white hover:bg-zinc-800 disabled:bg-zinc-200"
            >
              {isEditing ? "Save Changes" : "Create Template"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
